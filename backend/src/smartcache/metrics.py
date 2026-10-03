"""
SmartCache instrumentation and metrics.

Collects wall-clock timings for cache operations, worker cycles,
and latency histograms — all without affecting the critical path.
"""
import time
import threading
from collections import deque


class SmartCacheMetrics:
    """Light-weight metrics collector for SmartCache instrumentation.

    Thread-safe.  Only cheap operations on the critical path
    (incrementing counters), heavier stats computed lazily.
    """

    def __init__(self, latency_window: int = 5000):
        self._lock = threading.Lock()
        self._latency_window = latency_window

        # --- Critical-path counters (incremented on every access) ---
        self.requests = 0
        self.hits = 0
        self.misses = 0
        self.evictions = 0
        self.fallback_evictions = 0
        self.kill_list_evictions = 0

        # --- Latency samples (ring buffer) ---
        self._access_latencies = deque(maxlen=latency_window)  # seconds

        # --- Worker counters ---
        self.worker_refreshes = 0
        self.worker_failures = 0
        self._worker_inference_times = deque(maxlen=200)  # seconds
        self._worker_feature_times = deque(maxlen=200)
        self._worker_total_times = deque(maxlen=200)

        # Events dropped by logger
        self.logger_events_dropped = 0

        # Throughput tracking
        self._start_time = time.monotonic()

    # ------------------------------------------------------------------
    # Critical-path recording (called inside cache GET/PUT)
    # ------------------------------------------------------------------
    def record_access(self, hit: bool, latency_s: float) -> None:
        with self._lock:
            self.requests += 1
            if hit:
                self.hits += 1
            else:
                self.misses += 1
            self._access_latencies.append(latency_s)

    def record_eviction(self, from_kill_list: bool) -> None:
        with self._lock:
            self.evictions += 1
            if from_kill_list:
                self.kill_list_evictions += 1
            else:
                self.fallback_evictions += 1

    # ------------------------------------------------------------------
    # Worker recording (called by background thread)
    # ------------------------------------------------------------------
    def record_worker_cycle(self, feature_s: float, inference_s: float, total_s: float) -> None:
        with self._lock:
            self.worker_refreshes += 1
            self._worker_feature_times.append(feature_s)
            self._worker_inference_times.append(inference_s)
            self._worker_total_times.append(total_s)

    def record_worker_failure(self) -> None:
        with self._lock:
            self.worker_failures += 1

    # ------------------------------------------------------------------
    # Computed statistics
    # ------------------------------------------------------------------
    @property
    def hit_rate(self) -> float:
        total = self.hits + self.misses
        return self.hits / total if total > 0 else 0.0

    @property
    def throughput_rps(self) -> float:
        elapsed = time.monotonic() - self._start_time
        return self.requests / elapsed if elapsed > 0 else 0.0

    def _percentile(self, data, p: float) -> float:
        if not data:
            return 0.0
        s = sorted(data)
        idx = int(len(s) * p / 100.0)
        idx = min(idx, len(s) - 1)
        return s[idx]

    def get_latency_stats(self) -> dict:
        """Return latency statistics in milliseconds."""
        with self._lock:
            samples = list(self._access_latencies)
        if not samples:
            return {'avg_ms': 0.0, 'median_ms': 0.0, 'p95_ms': 0.0, 'p99_ms': 0.0}
        avg = sum(samples) / len(samples)
        return {
            'avg_ms': round(avg * 1000, 4),
            'median_ms': round(self._percentile(samples, 50) * 1000, 4),
            'p95_ms': round(self._percentile(samples, 95) * 1000, 4),
            'p99_ms': round(self._percentile(samples, 99) * 1000, 4),
        }

    def get_worker_stats(self) -> dict:
        with self._lock:
            inf = list(self._worker_inference_times)
            feat = list(self._worker_feature_times)
            total = list(self._worker_total_times)
        def _avg(lst):
            return round(sum(lst) / len(lst) * 1000, 3) if lst else 0.0
        return {
            'refreshes': self.worker_refreshes,
            'failures': self.worker_failures,
            'avg_inference_ms': _avg(inf),
            'avg_feature_ms': _avg(feat),
            'avg_total_ms': _avg(total),
            'last_inference_ms': round(inf[-1] * 1000, 3) if inf else 0.0,
        }

    def summary(self) -> dict:
        lat = self.get_latency_stats()
        wk = self.get_worker_stats()
        return {
            'requests': self.requests,
            'hits': self.hits,
            'misses': self.misses,
            'hit_rate': round(self.hit_rate * 100, 2),
            'evictions': self.evictions,
            'kill_list_evictions': self.kill_list_evictions,
            'fallback_evictions': self.fallback_evictions,
            'throughput_rps': round(self.throughput_rps, 1),
            'latency': lat,
            'worker': wk,
            'logger_events_dropped': self.logger_events_dropped,
            'ai_on_critical_path': False,
        }

    def reset(self):
        with self._lock:
            self.requests = 0
            self.hits = 0
            self.misses = 0
            self.evictions = 0
            self.fallback_evictions = 0
            self.kill_list_evictions = 0
            self._access_latencies.clear()
            self.worker_refreshes = 0
            self.worker_failures = 0
            self._worker_inference_times.clear()
            self._worker_feature_times.clear()
            self._worker_total_times.clear()
            self.logger_events_dropped = 0
            self._start_time = time.monotonic()
