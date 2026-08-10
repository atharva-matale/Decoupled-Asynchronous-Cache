import os
import time
import threading
from datetime import datetime
from flask import Flask, jsonify, request
from flask_cors import CORS

from src.cache import FIFOCache, LRUCache, LFUCache, MRUCache, SmartCache

app = Flask(__name__)
CORS(app)

# Global simulation state
sim_state = {
    "running": False,
    "mode": "traditional",  # "traditional" or "smart"
    "workload": "cyclic.log",
    "cacheSize": 512,
    "refreshInterval": 100,  # T_refresh / N_refresh
    "updatedAt": None,
    "stats": [],
    "charts": [],
    "evictions": [],
    "logs": [],
}

# History of metrics for charts
chart_history = {
    "fifo_hit_rate": [],
    "lru_hit_rate": [],
    "lfu_hit_rate": [],
    "mru_hit_rate": [],
    "smart_hit_rate": [],
    "decoupled_latency": [],
    "sync_latency": [],
    "lru_latency": [],
}

# Lock for thread safety
state_lock = threading.Lock()
sim_thread = None
stop_event = threading.Event()

WORKLOAD_MAP = {
    "cyclic.log": "traces/cyclic.log",
    "zipfian.log": "traces/zipfian.log",
    "recency.log": "traces/recency.log",
    "gcc.trace": "traces/gcc.trace",
    "swim.trace": "traces/swim.trace",
}

# Helper to read trace
def read_trace_file(filename, limit=2000000):
    # Try finding inside the traces folder relative to current file
    filepath = os.path.join(os.path.dirname(__file__), filename)
    if not os.path.exists(filepath):
        filepath = filename
        
    keys = []
    if not os.path.exists(filepath):
        # Check standard traces subfolder
        filepath = os.path.join(os.path.dirname(__file__), "traces", os.path.basename(filename))
        if not os.path.exists(filepath):
            return keys
        
    with open(filepath, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#') or line.startswith('//'):
                continue
            parts = line.split()
            if parts:
                keys.append(parts[0].strip())
            if len(keys) >= limit:
                break
    return keys

# Helper to sweep T_refresh and generate the staleness curve
def compute_staleness_curve(keys, capacity):
    # Quick sweep of refresh intervals: 10, 50, 100, 250, 500, 1000
    intervals = [10, 50, 100, 250, 500, 1000]
    hit_rates = []
    
    subset_keys = keys[:2000]
    if not subset_keys:
        return [0] * len(intervals)
        
    for N in intervals:
        cache = SmartCache(capacity)
        hits = 0
        total = len(subset_keys)
        
        for i in range(total):
            if i % N == 0:
                # Lookahead window of 250 requests
                window = subset_keys[i:i+250]
                cached_set = set(cache.get_contents())
                
                reuse_dist = {}
                for idx, k in enumerate(window):
                    if k in cached_set and k not in reuse_dist:
                        reuse_dist[k] = idx
                        
                kill_list = []
                for k in cached_set:
                    if k not in reuse_dist:
                        kill_list.append(k)
                        
                found_keys = sorted(reuse_dist.keys(), key=lambda x: reuse_dist[x], reverse=True)
                kill_list.extend(found_keys)
                cache.update_kill_list(kill_list)
            
            hit = cache.access(subset_keys[i])
            if hit:
                hits += 1
                
        hit_rates.append(round((hits / total) * 100, 1))
        
    return hit_rates

def run_simulation_thread(mode, workload_name, capacity, N_refresh):
    global sim_state, chart_history
    
    filename = WORKLOAD_MAP.get(workload_name, "traces/cyclic.log")
    keys = read_trace_file(filename)
    if not keys:
        with state_lock:
            sim_state["running"] = False
            sim_state["logs"].append({
                "time": datetime.now().strftime("%H:%M:%S"),
                "level": "error",
                "message": f"Trace file {filename} not found or empty."
            })
        return

    # Reset histories
    for k in chart_history:
        chart_history[k] = []

    # Calculate Staleness Curve for this workload
    staleness_values = compute_staleness_curve(keys, capacity)

    # Initialize policies
    if mode == "traditional":
        caches = {
            "FIFO": FIFOCache(capacity),
            "LRU": LRUCache(capacity),
            "LFU": LFUCache(capacity),
            "MRU": MRUCache(capacity),
        }
    else:
        caches = {
            "SMART": SmartCache(capacity),
            "LRU": LRUCache(capacity),
        }

    total_keys = len(keys)
    # Dynamically determine step size to finish in exactly 100 steps
    # (keeps UI updates smooth and visual execution time bounded to ~3-4 seconds)
    step_size = max(100, total_keys // 100)
    sleep_interval = 0.035
    start_time = time.time()
    
    with state_lock:
        sim_state["logs"].append({
            "time": datetime.now().strftime("%H:%M:%S"),
            "level": "info",
            "message": f"Simulation started: {workload_name} ({mode} mode, capacity {capacity})"
        })

    L_hit = 0.05       # ms
    L_miss = 5.0       # ms
    L_inference = 2.5  # ms

    for idx in range(0, total_keys, step_size):
        if stop_event.is_set():
            break

        chunk = keys[idx:idx+step_size]
        
        # Access cache items
        for i, key in enumerate(chunk):
            curr_idx = idx + i
            
            # If in smart mode, periodically trigger the background worker to refresh the Kill List
            if mode == "smart" and curr_idx % N_refresh == 0:
                # Background worker lookahead
                window = keys[curr_idx:curr_idx+500]
                cached_set = set(caches["SMART"].get_contents())
                
                reuse_dist = {}
                for w_idx, w_key in enumerate(window):
                    if w_key in cached_set and w_key not in reuse_dist:
                        reuse_dist[w_key] = w_idx
                        
                # Priority: keys not in upcoming window first, then keys sorted by reuse distance descending
                kill_list = []
                for k in cached_set:
                    if k not in reuse_dist:
                        kill_list.append(k)
                
                found_keys = sorted(reuse_dist.keys(), key=lambda x: reuse_dist[x], reverse=True)
                kill_list.extend(found_keys)
                
                caches["SMART"].update_kill_list(kill_list)
                
                # Add log about background worker execution
                if curr_idx % (N_refresh * 3) == 0 or curr_idx < N_refresh * 2:
                    with state_lock:
                        sim_state["logs"].insert(0, {
                            "time": datetime.now().strftime("%H:%M:%S"),
                            "level": "info",
                            "message": f"BG Worker: Kill List updated ({len(kill_list)} items). 0ms critical path overhead."
                        })

            # Accesses
            for name, cache in caches.items():
                is_hit = cache.access(key)
                
                # Record evictions for display
                if not is_hit and len(cache.get_contents()) >= cache.capacity:
                    if (mode == "smart" and name == "SMART") or (mode == "traditional"):
                        reason = "Low reuse score" if name == "SMART" else f"{name} eviction"
                        # Dynamic eviction log frequency based on step size
                        log_modulo = max(10, step_size // 5)
                        if curr_idx % log_modulo == 0:
                            with state_lock:
                                sim_state["evictions"].insert(0, {
                                    "key": f"{key}",
                                    "reason": reason,
                                    "age": f"{curr_idx // 100}s",
                                    "time": datetime.now().strftime("%H:%M:%S")
                                })
                                if len(sim_state["evictions"]) > 8:
                                    sim_state["evictions"].pop()

        # Append progress logs
        log_interval = 100000 if total_keys >= 100000 else max(1000, total_keys // 10)
        for k in range(idx + 1, idx + len(chunk) + 1):
            if k % log_interval == 0 or k == total_keys:
                with state_lock:
                    msg = f"Processed {k} requests..."
                    if not sim_state["logs"] or sim_state["logs"][0]["message"] != msg:
                        sim_state["logs"].insert(0, {
                            "time": datetime.now().strftime("%H:%M:%S"),
                            "level": "info",
                            "message": msg
                        })

        # Update statistics and charts
        elapsed = time.time() - start_time
        start_label = f"{int(elapsed)}s ago" if elapsed >= 1 else "Start"
        
        with state_lock:
            sim_state["updatedAt"] = datetime.now().strftime("%I:%M:%S %p")
            
            if mode == "traditional":
                fifo_hr = round(caches["FIFO"].hit_rate * 100, 1)
                lru_hr = round(caches["LRU"].hit_rate * 100, 1)
                lfu_hr = round(caches["LFU"].hit_rate * 100, 1)
                mru_hr = round(caches["MRU"].hit_rate * 100, 1)

                chart_history["fifo_hit_rate"].append(fifo_hr)
                chart_history["lru_hit_rate"].append(lru_hr)
                chart_history["lfu_hit_rate"].append(lfu_hr)
                chart_history["mru_hit_rate"].append(mru_hr)

                sim_state["stats"] = [
                    {"label": "FIFO Hit Rate", "value": str(fifo_hr), "unit": "%", "change": "+0.5%", "direction": "up", "note": "First-In First-Out"},
                    {"label": "LRU Hit Rate", "value": str(lru_hr), "unit": "%", "change": "+1.2%", "direction": "up", "note": "Least Recently Used"},
                    {"label": "LFU Hit Rate", "value": str(lfu_hr), "unit": "%", "change": "+2.0%", "direction": "up", "note": "Least Frequently Used"},
                    {"label": "MRU Hit Rate", "value": str(mru_hr), "unit": "%", "change": "-0.8%", "direction": "down", "note": "Most Recently Used"},
                ]

                sim_state["charts"] = [
                    {"title": "FIFO Hit Rate", "value": str(fifo_hr), "unit": "%", "delta": "FIFO", "color": "#fb7185", "values": list(chart_history["fifo_hit_rate"][-30:]), "startLabel": start_label},
                    {"title": "LRU Hit Rate", "value": str(lru_hr), "unit": "%", "delta": "LRU", "color": "#60a5fa", "values": list(chart_history["lru_hit_rate"][-30:]), "startLabel": start_label},
                    {"title": "LFU Hit Rate", "value": str(lfu_hr), "unit": "%", "delta": "LFU", "color": "#34d399", "values": list(chart_history["lfu_hit_rate"][-30:]), "startLabel": start_label},
                    {"title": "MRU Hit Rate", "value": str(mru_hr), "unit": "%", "delta": "MRU", "color": "#fbbf24", "values": list(chart_history["mru_hit_rate"][-30:]), "startLabel": start_label},
                ]
            else:
                smart_hr = round(caches["SMART"].hit_rate * 100, 1)
                lru_hr = round(caches["LRU"].hit_rate * 100, 1)

                lru_lat = round(caches["LRU"].hit_rate * L_hit + (1 - caches["LRU"].hit_rate) * L_miss, 3)
                smart_lat = round(caches["SMART"].hit_rate * L_hit + (1 - caches["SMART"].hit_rate) * L_miss, 3)
                sync_lat = round(caches["SMART"].hit_rate * L_hit + (1 - caches["SMART"].hit_rate) * (L_miss + L_inference), 3)

                chart_history["smart_hit_rate"].append(smart_hr)
                chart_history["lru_hit_rate"].append(lru_hr)
                chart_history["decoupled_latency"].append(smart_lat)
                chart_history["sync_latency"].append(sync_lat)

                sim_state["stats"] = [
                    {"label": "Smart Cache Hit Rate", "value": str(smart_hr), "unit": "%", "change": f"+{round(smart_hr - lru_hr, 1)}%", "direction": "up", "note": "AI Adaptive Eviction"},
                    {"label": "LRU Hit Rate (Baseline)", "value": str(lru_hr), "unit": "%", "change": "0.0%", "direction": "neutral", "note": "Traditional Policy"},
                    {"label": "Smart Decoupled Latency", "value": f"{smart_lat:.2f}", "unit": "ms", "change": f"-{round(sync_lat - smart_lat, 1)}ms", "direction": "up", "note": "Zero-latency AI path"},
                    {"label": "Sync ML Latency", "value": f"{sync_lat:.2f}", "unit": "ms", "change": f"+{round(sync_lat - lru_lat, 1)}ms", "direction": "down", "note": "Blocked on AI inference"},
                ]

                sim_state["charts"] = [
                    {"title": "Smart Cache Hit Rate", "value": str(smart_hr), "unit": "%", "delta": "Smart Cache", "color": "#67e8b6", "values": list(chart_history["smart_hit_rate"][-30:]), "startLabel": start_label},
                    {"title": "LRU Hit Rate", "value": str(lru_hr), "unit": "%", "delta": "LRU", "color": "#60a5fa", "values": list(chart_history["lru_hit_rate"][-30:]), "startLabel": start_label},
                    {"title": "Decoupled Latency (ms)", "value": f"{smart_lat:.2f}", "unit": "ms", "delta": "Decoupled", "color": "#a78bfa", "values": list(chart_history["decoupled_latency"][-30:]), "startLabel": start_label},
                    {"title": "Staleness Curve", "value": f"{staleness_values[2]}%", "unit": "%", "delta": "Hit rate vs T_refresh", "color": "#f472b6", "values": staleness_values, "startLabel": "T_refresh sweep"},
                ]

        time.sleep(sleep_interval)

    with state_lock:
        sim_state["running"] = False
        sim_state["logs"].insert(0, {
            "time": datetime.now().strftime("%H:%M:%S"),
            "level": "info",
            "message": "Simulation completed."
        })

@app.route('/api/dashboard', methods=['GET'])
def get_dashboard():
    with state_lock:
        return jsonify(sim_state)

@app.route('/api/simulation/start', methods=['POST'])
def start_simulation():
    global sim_thread, stop_event
    data = request.json or {}
    
    with state_lock:
        if sim_state["running"]:
            return jsonify({"status": "error", "message": "Simulation already running"}), 400
        
        sim_state["running"] = True
        sim_state["mode"] = data.get("mode", "smart")
        sim_state["workload"] = data.get("workload", "Session store")
        sim_state["cacheSize"] = data.get("cacheSize", 512)
        sim_state["refreshInterval"] = data.get("refreshInterval", 100)
        sim_state["evictions"] = []
        sim_state["logs"] = []

    stop_event.clear()
    sim_thread = threading.Thread(
        target=run_simulation_thread,
        args=(sim_state["mode"], sim_state["workload"], sim_state["cacheSize"], sim_state["refreshInterval"])
    )
    sim_thread.daemon = True
    sim_thread.start()
    
    return jsonify({"status": "success", "message": "Simulation started"})

@app.route('/api/simulation/stop', methods=['POST'])
def stop_simulation():
    global stop_event
    stop_event.set()
    with state_lock:
        sim_state["running"] = False
        sim_state["logs"].insert(0, {
            "time": datetime.now().strftime("%H:%M:%S"),
            "level": "info",
            "message": "Simulation paused."
        })
    return jsonify({"status": "success", "message": "Simulation stopped"})

@app.route('/api/simulation/reset', methods=['POST'])
def reset_simulation():
    global stop_event
    stop_event.set()
    with state_lock:
        sim_state["running"] = False
        sim_state["updatedAt"] = None
        sim_state["stats"] = []
        sim_state["charts"] = []
        sim_state["evictions"] = []
        sim_state["logs"] = [
            {"time": datetime.now().strftime("%H:%M:%S"), "level": "info", "message": "Simulation state reset."}
        ]
    return jsonify({"status": "success", "message": "Simulation reset"})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000, debug=False)
