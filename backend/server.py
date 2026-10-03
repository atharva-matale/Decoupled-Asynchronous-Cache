"""
SmartCache Flask API Server.

Extends the existing dashboard endpoints with new SmartCache-specific
APIs while preserving backward compatibility with the React frontend.

Endpoints:
    GET  /api/health              — Server health check
    GET  /api/workloads           — List available trace files
    GET  /api/dashboard           — Live simulation snapshot (existing)
    POST /api/simulation/start    — Start simulation (existing, extended)
    POST /api/simulation/stop     — Stop simulation (existing)
    POST /api/simulation/reset    — Reset simulation (existing)
    GET  /api/simulation/status   — Detailed simulation status
    GET  /api/metrics             — Full instrumentation metrics
    GET  /api/smartcache/status   — SmartCache AI engine status
    POST /api/benchmark           — Run benchmark across policies
"""
import os
import sys
import time
import json
import threading
from datetime import datetime
from flask import Flask, jsonify, request
from flask_cors import CORS

from src.policies.fifo import FIFOCache
from src.policies.lru import LRUCache
from src.policies.lfu import LFUCache
from src.policies.mru import MRUCache
from src.policies.smart_cache import SmartCachePolicy
from src.simulation.workload_loader import WorkloadLoader

app = Flask(__name__)
CORS(app)

# =====================================================================
# Global simulation state
# =====================================================================
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
    "smartcache_status": None,
    "benchmark_results": None,
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

# Active SmartCachePolicy reference (for status queries)
active_smart_cache = None


# =====================================================================
# Simulation runner
# =====================================================================
def run_simulation_thread(mode, workload_name, capacity, N_refresh):
    global sim_state, chart_history, active_smart_cache

    try:
        keys = WorkloadLoader.load(workload_name, limit=2_000_000)
    except FileNotFoundError:
        with state_lock:
            sim_state["running"] = False
            sim_state["logs"].append({
                "time": datetime.now().strftime("%H:%M:%S"),
                "level": "error",
                "message": f"Trace file {workload_name} not found."
            })
        return

    if not keys:
        with state_lock:
            sim_state["running"] = False
            sim_state["logs"].append({
                "time": datetime.now().strftime("%H:%M:%S"),
                "level": "error",
                "message": f"Trace file {workload_name} is empty."
            })
        return

    # Reset chart histories
    for k in chart_history:
        chart_history[k] = []

    # Initialize policies
    if mode == "traditional":
        caches = {
            "FIFO": FIFOCache(capacity),
            "LRU": LRUCache(capacity),
            "LFU": LFUCache(capacity),
            "MRU": MRUCache(capacity),
        }
        active_smart_cache = None
    else:
        # Smart mode: SmartCache vs LRU baseline
        refresh_s = max(N_refresh * 0.001, 0.01)  # convert request-count to approximate seconds
        smart = SmartCachePolicy(
            capacity=capacity,
            refresh_interval=refresh_s,
            auto_start_worker=True,
        )
        caches = {
            "SMART": smart,
            "LRU": LRUCache(capacity),
        }
        active_smart_cache = smart

    total_keys = len(keys)
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

        chunk = keys[idx:idx + step_size]

        for i, key in enumerate(chunk):
            curr_idx = idx + i
            for name, cache in caches.items():
                is_hit = cache.access(key)

                # Record evictions for display
                if not is_hit and len(cache.get_contents()) >= cache.capacity:
                    if (mode == "smart" and name == "SMART") or (mode == "traditional"):
                        if name == "SMART":
                            reason = "Kill List eviction" if hasattr(cache, 'metrics') and cache.metrics.kill_list_evictions > cache.metrics.fallback_evictions else "LRU fallback"
                        else:
                            reason = f"{name} eviction"
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

        # Log BG Worker status for smart mode
        if mode == "smart" and hasattr(caches.get("SMART"), "metrics"):
            sc = caches["SMART"]
            wk = sc.metrics.get_worker_stats()
            if wk['refreshes'] > 0 and idx % (step_size * 5) == 0:
                with state_lock:
                    sim_state["logs"].insert(0, {
                        "time": datetime.now().strftime("%H:%M:%S"),
                        "level": "info",
                        "message": f"BG Worker: {wk['refreshes']} refreshes, Kill List size={sc.kill_list.size}, 0ms critical path overhead"
                    })

        # Progress logs
        log_interval = 100000 if total_keys >= 100000 else max(1000, total_keys // 10)
        for k_idx in range(idx + 1, idx + len(chunk) + 1):
            if k_idx % log_interval == 0 or k_idx == total_keys:
                with state_lock:
                    msg = f"Processed {k_idx:,} / {total_keys:,} requests..."
                    if not sim_state["logs"] or sim_state["logs"][0]["message"] != msg:
                        sim_state["logs"].insert(0, {
                            "time": datetime.now().strftime("%H:%M:%S"),
                            "level": "info",
                            "message": msg
                        })

        # ---- Update statistics and charts ----
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
                # Smart mode
                sc = caches["SMART"]
                smart_hr = round(sc.hit_rate * 100, 1)
                lru_hr = round(caches["LRU"].hit_rate * 100, 1)

                lru_lat = round(caches["LRU"].hit_rate * L_hit + (1 - caches["LRU"].hit_rate) * L_miss, 3)
                smart_lat = round(sc.hit_rate * L_hit + (1 - sc.hit_rate) * L_miss, 3)
                sync_lat = round(sc.hit_rate * L_hit + (1 - sc.hit_rate) * (L_miss + L_inference), 3)

                chart_history["smart_hit_rate"].append(smart_hr)
                chart_history["lru_hit_rate"].append(lru_hr)
                chart_history["decoupled_latency"].append(smart_lat)
                chart_history["sync_latency"].append(sync_lat)

                sc_status = sc.status()
                wk = sc.metrics.get_worker_stats()
                sc_lat = sc.metrics.get_latency_stats()

                diff_hr = round(smart_hr - lru_hr, 1)
                diff_sign = "+" if diff_hr >= 0 else ""

                sim_state["stats"] = [
                    {"label": "Smart Cache Hit Rate", "value": str(smart_hr), "unit": "%", "change": f"{diff_sign}{diff_hr}% vs LRU", "direction": "up" if diff_hr >= 0 else "down", "note": "AI Adaptive Eviction"},
                    {"label": "LRU Hit Rate (Baseline)", "value": str(lru_hr), "unit": "%", "change": "0.0%", "direction": "neutral", "note": "Traditional Policy"},
                    {"label": "Decoupled Latency", "value": f"{smart_lat:.2f}", "unit": "ms", "change": f"-{round(sync_lat - smart_lat, 1)}ms vs sync", "direction": "up", "note": "Zero critical-path AI overhead"},
                    {"label": "AI Critical Path", "value": "NO", "unit": "", "change": "DECOUPLED", "direction": "up", "note": f"Worker: {wk['refreshes']} refreshes"},
                ]

                sim_state["charts"] = [
                    {"title": "Smart Cache Hit Rate", "value": str(smart_hr), "unit": "%", "delta": "Smart Cache", "color": "#67e8b6", "values": list(chart_history["smart_hit_rate"][-30:]), "startLabel": start_label},
                    {"title": "LRU Hit Rate", "value": str(lru_hr), "unit": "%", "delta": "LRU Baseline", "color": "#60a5fa", "values": list(chart_history["lru_hit_rate"][-30:]), "startLabel": start_label},
                    {"title": "Decoupled Latency (ms)", "value": f"{smart_lat:.2f}", "unit": "ms", "delta": "Decoupled", "color": "#a78bfa", "values": list(chart_history["decoupled_latency"][-30:]), "startLabel": start_label},
                    {"title": "Sync ML Latency (ms)", "value": f"{sync_lat:.2f}", "unit": "ms", "delta": "If synchronous", "color": "#f472b6", "values": list(chart_history["sync_latency"][-30:]), "startLabel": start_label},
                ]

                sim_state["smartcache_status"] = sc_status

        time.sleep(sleep_interval)

    # Cleanup
    if mode == "smart" and "SMART" in caches:
        caches["SMART"].stop_worker()

    with state_lock:
        sim_state["running"] = False
        sim_state["logs"].insert(0, {
            "time": datetime.now().strftime("%H:%M:%S"),
            "level": "info",
            "message": "Simulation completed."
        })


# =====================================================================
# API Endpoints
# =====================================================================

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({
        "status": "ok",
        "timestamp": datetime.now().isoformat(),
        "version": "2.0.0",
    })


@app.route('/api/workloads', methods=['GET'])
def list_workloads():
    available = WorkloadLoader.available_workloads()
    return jsonify({"workloads": available})


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
        sim_state["workload"] = data.get("workload", "cyclic.log")
        sim_state["cacheSize"] = data.get("cacheSize", 512)
        sim_state["refreshInterval"] = data.get("refreshInterval", 100)
        sim_state["evictions"] = []
        sim_state["logs"] = []
        sim_state["smartcache_status"] = None

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
    global stop_event, active_smart_cache
    stop_event.set()
    if active_smart_cache:
        active_smart_cache.stop_worker()
        active_smart_cache = None
    with state_lock:
        sim_state["running"] = False
        sim_state["updatedAt"] = None
        sim_state["stats"] = []
        sim_state["charts"] = []
        sim_state["evictions"] = []
        sim_state["smartcache_status"] = None
        sim_state["logs"] = [
            {"time": datetime.now().strftime("%H:%M:%S"), "level": "info", "message": "Simulation state reset."}
        ]
    return jsonify({"status": "success", "message": "Simulation reset"})


@app.route('/api/simulation/status', methods=['GET'])
def simulation_status():
    with state_lock:
        status = {
            "running": sim_state["running"],
            "mode": sim_state["mode"],
            "workload": sim_state["workload"],
            "cacheSize": sim_state["cacheSize"],
            "refreshInterval": sim_state["refreshInterval"],
            "updatedAt": sim_state["updatedAt"],
            "stats_count": len(sim_state["stats"]),
            "logs_count": len(sim_state["logs"]),
        }
    return jsonify(status)


@app.route('/api/metrics', methods=['GET'])
def get_metrics():
    global active_smart_cache
    if active_smart_cache:
        return jsonify(active_smart_cache.metrics.summary())
    return jsonify({"message": "No active SmartCache instance"})


@app.route('/api/smartcache/status', methods=['GET'])
def smartcache_status():
    global active_smart_cache
    if active_smart_cache:
        return jsonify(active_smart_cache.status())
    return jsonify({
        "worker_running": False,
        "model": "None",
        "refresh_interval_ms": 0,
        "last_refresh_ms": 0,
        "kill_list_size": 0,
        "history_size": 0,
        "inference_latency_ms": 0,
        "fallback_evictions": 0,
        "ai_on_critical_path": False,
    })


@app.route('/api/benchmark', methods=['POST'])
def run_benchmark():
    """Run a quick benchmark across all policies for a given workload."""
    data = request.json or {}
    workload = data.get("workload", "cyclic.log")
    capacity = data.get("cacheSize", 64)
    limit = data.get("limit", 5000)

    try:
        keys_list = WorkloadLoader.load(workload, limit=limit)
    except FileNotFoundError:
        return jsonify({"status": "error", "message": f"Workload {workload} not found"}), 404

    if len(keys_list) < 10:
        return jsonify({"status": "error", "message": "Workload too short"}), 400

    results = []

    for policy_name, policy_cls in [
        ('FIFO', FIFOCache), ('LRU', LRUCache),
        ('LFU', LFUCache), ('MRU', MRUCache),
    ]:
        cache = policy_cls(capacity)
        t0 = time.perf_counter()
        for key in keys_list:
            cache.access(key)
        elapsed = time.perf_counter() - t0
        results.append({
            'policy': policy_name,
            'hit_rate': round(cache.hit_rate * 100, 2),
            'hits': cache.hits,
            'misses': cache.misses,
            'requests': len(keys_list),
            'avg_latency_ms': round(elapsed / len(keys_list) * 1000, 6),
            'throughput_rps': round(len(keys_list) / elapsed, 0) if elapsed > 0 else 0,
        })

    # SmartCache
    smart = SmartCachePolicy(capacity=capacity, refresh_interval=0.02, auto_start_worker=True)
    t0 = time.perf_counter()
    for key in keys_list:
        smart.access(key)
    elapsed = time.perf_counter() - t0
    time.sleep(0.1)
    smart.stop_worker()

    lat = smart.metrics.get_latency_stats()
    wk = smart.metrics.get_worker_stats()
    results.append({
        'policy': 'SmartCache',
        'hit_rate': round(smart.hit_rate * 100, 2),
        'hits': smart.hits,
        'misses': smart.misses,
        'requests': len(keys_list),
        'avg_latency_ms': lat.get('avg_ms', 0.0),
        'p95_latency_ms': lat.get('p95_ms', 0.0),
        'p99_latency_ms': lat.get('p99_ms', 0.0),
        'throughput_rps': round(smart.metrics.throughput_rps, 0),
        'fallback_evictions': smart.metrics.fallback_evictions,
        'kill_list_evictions': smart.metrics.kill_list_evictions,
        'worker_refreshes': wk.get('refreshes', 0),
        'worker_inference_ms': wk.get('avg_inference_ms', 0.0),
    })

    with state_lock:
        sim_state["benchmark_results"] = results

    return jsonify({"status": "success", "results": results})


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000, debug=False)
