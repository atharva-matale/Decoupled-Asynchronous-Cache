# How It Works: SmartCache (Decoupled Asynchronous Cache)

SmartCache is a demonstration framework that showcases the benefits of a **Decoupled Asynchronous Machine Learning Caching Policy** over traditional cache eviction algorithms. It compares classical baselines (FIFO, LRU, LFU, MRU) with an AI-assisted eviction strategy that updates cache metadata out-of-band to avoid adding latency to the critical request path.

---

## 🏛️ System Architecture

The application is split into two decoupled layers:

```mermaid
graph TD
    subgraph Frontend (React / Vite)
        A[Dashboard UI] -->|Control Simulation| B(API Calls)
        C[Live Charts & Logs] <---|Poll State| B
    end

    subgraph Backend (Flask API)
        B -->|Start/Stop/Reset| D[Simulation Controller]
        D -->|Stream Workload| E[Cache Simulator]
        E -->|Simulate Policies| F[Standard Caches: FIFO, LRU, LFU, MRU]
        E -->|Simulate Policy| G[Smart Cache]
        H[BG Worker Thread] -.->|Async Update Kill List| G
    end
```

1. **Frontend (React + Vite Dashboard)**:
   - Polls `/api/dashboard` every 1.5 seconds.
   - Triggers simulation starts, stops, and resets via `/api/simulation/start`, `/api/simulation/stop`, and `/api/simulation/reset`.
   - Renders performance stats, SVG charts (showing hit rates and latency), live execution logs, and eviction notifications.
2. **Backend (Flask + Python Engine)**:
   - Evaluates traces from file logs (`cyclic.log`, `zipfian.log`, etc.).
   - Runs simulated caches concurrently under identical workloads.
   - Executes a background lookahead thread that asynchronously updates the Smart Cache eviction state.

---

## 💾 Caching Policies

All caching algorithms in the simulator subclass `BaseCache` in [cache.py](file:///d:/Decoupled-Asynchronous-Cache-main/backend/src/cache.py):

| Policy | Eviction Criteria | Implementation Details |
| :--- | :--- | :--- |
| **FIFO** (First-In, First-Out) | Evicts the item that has been in the cache longest, regardless of its access frequency. | Uses an `OrderedDict`; pops from the front (`last=False`). |
| **LRU** (Least Recently Used) | Evicts the item that was accessed longest ago. | Uses an `OrderedDict`; moves hit keys to the end and pops from the front. |
| **LFU** (Least Frequently Used) | Evicts the item with the lowest access count. Uses LRU to break ties. | Uses a double dictionary mapping frequencies to ordered dicts of keys. |
| **MRU** (Most Recently Used) | Evicts the item accessed most recently. | Uses an `OrderedDict`; pops from the back (`last=True`). |
| **SmartCache** (AI-Assisted) | Evicts the item with the lowest predicted future utility (using a precomputed **Kill List**). | Uses an `OrderedDict` for hit-tracking; pops from the cache using an out-of-band **Kill List**. |

---

## ⚡ The Decoupled Asynchronous Model

### The Problem: Synchronous AI Cache Overhead
If a cache eviction policy queries a machine learning model (e.g., sequence predictor or classifier) on every cache miss or insertion:
* The lookup blocking time (latency) increases dramatically by the inference duration ($L_{inference}$ = 2.5ms).
* Even if hit rates improve, the cache throughput drops significantly because the critical path is blocked by CPU/GPU computation.

### The Solution: Decoupled AI Worker
SmartCache decouples the ML prediction path from the cache lookup path:
* **The Critical Path ($O(1)$)**: Fast cache checks and evictions run on a standard, zero-overhead thread. When eviction is necessary, the cache simply pops the first item found from a precomputed **Kill List**.
* **The Asynchronous Path (Background Worker)**: A background thread periodically wakes up (every $T_{refresh}$ requests), inspects the cache contents and future workload patterns, computes the optimal eviction candidates, and writes a fresh **Kill List** back to the cache.

---

## 📋 The Kill List Algorithm

The background worker updates the Kill List by evaluating a lookahead window (e.g., next 500 requests) and scoring cached keys based on their **Reuse Distance** (how many requests will pass before they are accessed again):

```python
# 1. Inspect the lookahead window
window = keys[curr_idx : curr_idx + 500]
cached_set = set(caches["SMART"].get_contents())

# 2. Compute reuse distances
reuse_dist = {}
for w_idx, w_key in enumerate(window):
    if w_key in cached_set and w_key not in reuse_dist:
        reuse_dist[w_key] = w_idx

# 3. Prioritize items for eviction (Kill List)
kill_list = []
# Priority 1: Cached items NOT used in the lookahead window (evict first)
for k in cached_set:
    if k not in reuse_dist:
        kill_list.append(k)

# Priority 2: Cached items sorted by reuse distance DESCENDING (furthest reuse first)
found_keys = sorted(reuse_dist.keys(), key=lambda x: reuse_dist[x], reverse=True)
kill_list.extend(found_keys)

# 4. Update SmartCache with the new list
caches["SMART"].update_kill_list(kill_list)
```

During an eviction event in `SmartCache`:
1. The cache iterates through `kill_list`.
2. It evicts the first key from the list that is currently residing in the cache.
3. If no keys from the `kill_list` are currently cached, it falls back to standard **LRU eviction**.

---

## 📊 Latency Verification Formula

The simulation measures and compares three types of access latencies, assuming:
* $L_{hit}$ (Cache Hit Latency) = **0.05 ms**
* $L_{miss}$ (Main Storage/Database Miss Latency) = **5.00 ms**
* $L_{inference}$ (AI Inference Overhead) = **2.50 ms**

### 1. LRU Latency (Baseline)
$$\text{Latency} = (\text{Hit Rate}_{\text{LRU}} \times 0.05) + ((1 - \text{Hit Rate}_{\text{LRU}}) \times 5.0)$$

### 2. Synchronous ML Latency (In-Line AI)
If inference runs on the critical path, every cache miss suffers from both fetching latency and model execution:
$$\text{Latency} = (\text{Hit Rate}_{\text{SMART}} \times 0.05) + ((1 - \text{Hit Rate}_{\text{SMART}}) \times (5.0 + 2.5))$$

### 3. Decoupled Smart Latency (SmartCache)
Since the Kill List is updated out-of-band by a background thread, the critical path overhead remains 0ms:
$$\text{Latency} = (\text{Hit Rate}_{\text{SMART}} \times 0.05) + ((1 - \text{Hit Rate}_{\text{SMART}}) \times 5.0)$$
