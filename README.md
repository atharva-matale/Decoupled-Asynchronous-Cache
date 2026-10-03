# SmartCache: AI-Assisted, Zero-Latency Adaptive Cache Eviction

A decoupled, asynchronous machine learning framework that replaces classical cache replacement policies (FIFO, LRU, LFU, MRU) with dynamic pattern prediction — **without adding ML inference latency to the cache critical path**.

---

## 🎯 Key Engineering Contribution

The important contribution is **NOT merely using ML for caching**.

The key contribution is:

> **ML inference NEVER executes on the critical path of a cache GET/PUT operation.**

The cache continues operating normally even if:
- The ML worker is slow
- Model inference takes a long time
- The worker crashes
- The Kill List has not been refreshed yet

```
┌─────────────────────────────────────────────────────────────────┐
│                    CRITICAL PATH (< 0.01ms)                     │
│                                                                 │
│   REQUEST → O(1) Cache Lookup → Kill List Scan → RESPONSE      │
│                                                                 │
│                        ✕ NO WAIT FOR ML                         │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                 BACKGROUND WORKER (async)                       │
│                                                                 │
│   Access Log → Feature Extraction → ML Predictor → Kill List   │
│        ↑                                               │        │
│        └──────────── ↺ Periodic Refresh ←──────────────┘        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📂 Repository Structure

```
backend/
├── server.py                      # Flask API server
├── main.py                        # CLI benchmark runner
├── src/
│   ├── policies/                  # Cache eviction policies
│   │   ├── base.py                # BaseCache abstract class
│   │   ├── fifo.py                # First-In First-Out
│   │   ├── lru.py                 # Least Recently Used
│   │   ├── lfu.py                 # Least Frequently Used
│   │   ├── mru.py                 # Most Recently Used
│   │   └── smart_cache.py         # SmartCache (AI-assisted)
│   ├── smartcache/                # Decoupled ML engine
│   │   ├── access_logger.py       # Thread-safe ring buffer logger
│   │   ├── feature_extractor.py   # Per-key feature engineering
│   │   ├── predictor.py           # Heuristic + ML predictors
│   │   ├── kill_list.py           # Thread-safe eviction priority list
│   │   ├── worker.py              # Background prediction worker
│   │   └── metrics.py             # Instrumentation & latency tracking
│   ├── simulation/                # Simulation engine
│   │   ├── simulator.py           # Multi-policy simulator
│   │   └── workload_loader.py     # Trace file + synthetic workloads
│   └── cache.py                   # Legacy (preserved for compatibility)
├── models/
│   ├── smartcache_model.pkl       # Trained ML model
│   └── training_metrics.json      # Model evaluation results
├── scripts/
│   ├── train_model.py             # ML training pipeline
│   └── benchmark.py               # Multi-policy benchmark suite
├── results/                       # Benchmark output (JSON + CSV)
├── traces/                        # Workload trace files
│   ├── cyclic.log                 # Cyclic pattern (defeats LRU)
│   ├── zipfian.log                # Frequency-heavy access
│   ├── recency.log                # Temporal locality
│   ├── gcc.trace                  # Real compiler memory trace
│   └── swim.trace                 # Scientific workload trace
└── tests/
    ├── test_cache.py              # Original policy tests
    └── test_smartcache.py         # Comprehensive 31-test suite

frontend/
├── index.html
├── package.json
└── src/
    ├── App.jsx                    # Root dashboard component
    ├── main.jsx                   # Entry point
    ├── services/
    │   └── cacheApi.js            # REST API client
    ├── components/
    │   ├── ControlPanel.jsx       # Simulation controls
    │   ├── StatCard.jsx           # Metric display cards
    │   ├── MetricChart.jsx        # SVG line charts
    │   ├── EvictionHistory.jsx    # Eviction event table
    │   ├── LiveLogs.jsx           # Real-time log stream
    │   ├── SmartCachePanel.jsx    # AI engine status panel
    │   └── ArchitectureDiagram.jsx # Live pipeline visualization
    └── styles/                    # CSS modules
```

---

## 🚀 Getting Started

### Prerequisites

- Python 3.8+ with: `flask`, `flask-cors`, `scikit-learn`, `numpy`, `joblib`
- Node.js 16+ with npm

### 1. Install Backend Dependencies

```bash
cd backend
pip install flask flask-cors scikit-learn numpy joblib
```

### 2. Train the ML Model

```bash
python scripts/train_model.py
```

This will:
- Load all available trace files
- Generate training features from historical access patterns
- Train a HistGradientBoostingClassifier
- Save the model to `models/smartcache_model.pkl`
- Print accuracy, precision, recall, F1, and ROC-AUC

### 3. Start the Backend API

```bash
python server.py
```

Server starts at `http://localhost:8000`

### 4. Start the Frontend Dashboard

```bash
cd frontend
npm install
npm run dev
```

Open **[http://localhost:5173](http://localhost:5173)** in your browser.

---

## 📊 Running Benchmarks

```bash
cd backend
python scripts/benchmark.py
```

Options:
```bash
python scripts/benchmark.py --workloads cyclic.log zipfian.log gcc.trace --capacities 10 25 50 100 --limit 5000
```

Results are saved to `results/benchmark_results.json` and `results/benchmark_results.csv`.

---

## 🧪 Running Tests

```bash
cd backend
python -m unittest discover -s tests -v
```

The test suite includes 37 tests covering:
- All 5 cache policies (FIFO, LRU, LFU, MRU, SmartCache)
- Kill List replacement and stale entry handling
- Empty Kill List fallback to LRU
- Logger thread safety under concurrent writes
- Worker lifecycle (start/stop)
- Model-unavailable fallback
- Inference exception recovery
- Cyclic LRU failure demonstration
- Identical workload comparison across all policies
- **CRITICAL: Cache operates while ML worker is deliberately delayed 1 second**

---

## 🔧 Architecture: How the Kill List Works

### The Problem
Traditional ML-augmented caches call `model.predict()` on every cache miss.
This adds inference latency (2–50ms) directly to the critical path.

### Our Solution: Decoupled Asynchronous Prediction

1. **Access Logger** — Every cache access appends a lightweight event to a bounded ring buffer (O(1), ~0.001ms)
2. **Background Worker** — A daemon thread periodically:
   - Snapshots the access log (quick memcpy)
   - Extracts 10 features per cached key (recency, frequency, inter-arrival, reuse distance, etc.)
   - Runs model inference to predict reuse probability
   - Atomically replaces the Kill List
3. **Kill List** — An ordered list of cache keys ranked by eviction priority (lowest reuse probability first)
4. **Eviction** — On a cache miss requiring eviction, the cache scans the Kill List for the first valid victim. If none found, falls back to LRU.

### Why This Works
- The cache controller **never calls** `model.predict()`
- The cache controller **never waits** for the background worker
- Even if the worker crashes, the cache continues with LRU fallback
- The Kill List is updated atomically via pointer swap

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/workloads` | List available trace files |
| `GET` | `/api/dashboard` | Live simulation snapshot |
| `POST` | `/api/simulation/start` | Start simulation |
| `POST` | `/api/simulation/stop` | Stop simulation |
| `POST` | `/api/simulation/reset` | Reset simulation state |
| `GET` | `/api/simulation/status` | Simulation status |
| `GET` | `/api/metrics` | SmartCache instrumentation |
| `GET` | `/api/smartcache/status` | AI engine status |
| `POST` | `/api/benchmark` | Run policy benchmark |

### SmartCache Status Response

```json
{
  "worker_running": true,
  "model": "MLPredictor(HistGradientBoostingClassifier)",
  "refresh_interval_ms": 100.0,
  "last_refresh_ms": 12.5,
  "kill_list_size": 512,
  "history_size": 15000,
  "inference_latency_ms": 8.3,
  "fallback_evictions": 42,
  "kill_list_evictions": 4580,
  "ai_on_critical_path": false
}
```

---

## 📈 Benchmark Methodology

All benchmarks follow these scientific constraints:
- **Identical traces** — All 5 policies process the exact same request sequence
- **Same cache capacity** — Each comparison uses identical cache sizes
- **No artificial delays** — Traditional policies are not artificially slowed
- **No hardcoding** — SmartCache is not tuned for any specific trace
- **No future access** — Features use only past information; future access is used only for offline training labels
- **Deterministic seeds** — Random seeds are fixed for reproducibility
- **Real results** — If SmartCache loses on a workload, the actual result is reported

---

## 📋 Features Used for Prediction

| # | Feature | Description |
|---|---------|-------------|
| 1 | `recency` | Requests since last access |
| 2 | `frequency` | Total accesses in the window |
| 3 | `global_frequency` | All-time access count |
| 4 | `inter_arrival_mean` | Mean gap between consecutive accesses |
| 5 | `inter_arrival_var` | Variance of inter-arrival gaps |
| 6 | `reuse_distance` | Distinct keys accessed since last access |
| 7 | `recent_window_freq` | Accesses in the last 200 events |
| 8 | `cache_age` | Requests since key first entered cache |
| 9 | `frequency_trend` | Frequency change between window halves |
| 10 | `access_density` | Frequency / window size (normalized) |

---

## 🏗️ Workload Benchmarks

Available traces:
- `cyclic.log` — Reveals LRU's pathological 0% hit-rate failure
- `zipfian.log` — Frequency-heavy (Zipf distribution) access patterns
- `recency.log` — Recent-history biased access patterns
- `gcc.trace` — Real-world compiler memory trace
- `swim.trace` — Scientific system memory trace

---

## 📜 License

Academic / research project for B.Tech major project.
