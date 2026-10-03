"""
SmartCachePolicy — AI-assisted, zero-latency adaptive cache eviction.

Architecture invariant:
    The GET/PUT critical path NEVER calls model.predict().
    It only:
        1. O(1) hash-map lookup
        2. O(k) kill-list scan for victim selection
        3. O(1) logger append

    ML inference happens exclusively in the BackgroundPredictionWorker.
"""
import time
import os
import threading
from collections import OrderedDict
from typing import Optional

from src.policies.base import BaseCache
from src.smartcache.access_logger import AccessLogger
from src.smartcache.kill_list import KillList
from src.smartcache.feature_extractor import FeatureExtractor
from src.smartcache.predictor import HeuristicPredictor, MLPredictor, PredictorInterface
from src.smartcache.worker import BackgroundPredictionWorker
from src.smartcache.metrics import SmartCacheMetrics


# Default model path (relative to backend/)
_DEFAULT_MODEL_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
    'models', 'smartcache_model.pkl'
)


class SmartCachePolicy(BaseCache):
    """Full SmartCache with decoupled asynchronous ML-based eviction.

    On the critical path (access method):
        • O(1) dict lookup
        • Cheap logger.log() call
        • Pre-computed kill-list scan for eviction victim
        • LRU fallback if kill list has no valid candidate

    The background worker (separate thread) periodically:
        • Snapshots the access log
        • Extracts features
        • Runs model inference
        • Atomically replaces the kill list

    Parameters:
        capacity:          cache size in slots
        refresh_interval:  seconds between background worker cycles
        history_window:    recent events the worker uses for features
        model_path:        path to a trained scikit-learn model (.pkl)
        auto_start_worker: start the background worker on init
    """

    def __init__(
        self,
        capacity: int,
        refresh_interval: float = 0.1,
        history_window: int = 5000,
        model_path: str = None,
        auto_start_worker: bool = True,
    ):
        super().__init__(capacity)

        # Cache storage + LRU ordering (for fallback eviction)
        self.cache = OrderedDict()

        # --- SmartCache components ---
        self.access_logger = AccessLogger(max_size=50_000)
        self.kill_list = KillList()
        self.metrics = SmartCacheMetrics()

        # Choose predictor
        mp = model_path or _DEFAULT_MODEL_PATH
        self._ml_predictor = MLPredictor(mp)
        self._heuristic_predictor = HeuristicPredictor()

        if self._ml_predictor.is_ready:
            self._active_predictor: PredictorInterface = self._ml_predictor
        else:
            self._active_predictor = self._heuristic_predictor

        # Background worker
        self.worker = BackgroundPredictionWorker(
            access_logger=self.access_logger,
            kill_list=self.kill_list,
            predictor=self._active_predictor,
            cache_snapshot_fn=self._snapshot_keys,
            metrics=self.metrics,
            refresh_interval=refresh_interval,
            history_window=history_window,
        )

        self._worker_started = False
        if auto_start_worker:
            self.start_worker()

    # ------------------------------------------------------------------
    # Worker lifecycle
    # ------------------------------------------------------------------
    def start_worker(self) -> None:
        if not self._worker_started:
            self.worker.start()
            self._worker_started = True

    def stop_worker(self) -> None:
        self.worker.stop()
        self._worker_started = False

    # ------------------------------------------------------------------
    # Cache critical path — NO model.predict() here
    # ------------------------------------------------------------------
    def access(self, key) -> bool:
        """Process a cache request.

        Returns True on hit, False on miss.
        NEVER blocks on ML inference.
        """
        t0 = time.monotonic()

        hit = key in self.cache
        if hit:
            self.hits += 1
            self.cache.move_to_end(key)  # maintain LRU order for fallback
        else:
            self.misses += 1
            if len(self.cache) >= self.capacity:
                self._evict()
            self.cache[key] = True

        # Cheap O(1) log append — the ONLY interaction with the ML pipeline
        self.access_logger.log(key, hit)

        lat = time.monotonic() - t0
        self.metrics.record_access(hit, lat)
        return hit

    def _evict(self) -> Optional[str]:
        """Select and remove a victim key from the cache.

        1. Consult the precomputed Kill List.
        2. If no valid victim, fall back to LRU.
        """
        victim = self.kill_list.get_victim(set(self.cache.keys()))

        if victim is not None:
            del self.cache[victim]
            self.metrics.record_eviction(from_kill_list=True)
        else:
            # LRU fallback
            if self.cache:
                victim, _ = self.cache.popitem(last=False)
                self.metrics.record_eviction(from_kill_list=False)
        return victim

    # ------------------------------------------------------------------
    # Snapshot for background worker (quick copy under implicit GIL)
    # ------------------------------------------------------------------
    def _snapshot_keys(self):
        return set(self.cache.keys())

    def get_contents(self) -> list:
        return list(self.cache.keys())

    # ------------------------------------------------------------------
    # Status / diagnostics
    # ------------------------------------------------------------------
    def status(self) -> dict:
        wk = self.metrics.get_worker_stats()
        return {
            'worker_running': self.worker.is_running,
            'model': self._active_predictor.name,
            'refresh_interval_ms': round(self.worker.refresh_interval * 1000, 1),
            'last_refresh_ms': wk.get('last_inference_ms', 0.0),
            'kill_list_size': self.kill_list.size,
            'kill_list_version': self.kill_list.version,
            'history_size': self.access_logger.size,
            'inference_latency_ms': wk.get('avg_inference_ms', 0.0),
            'fallback_evictions': self.metrics.fallback_evictions,
            'kill_list_evictions': self.metrics.kill_list_evictions,
            'ai_on_critical_path': False,
            'worker_refreshes': wk.get('refreshes', 0),
            'worker_failures': wk.get('failures', 0),
            'logger_events_dropped': self.access_logger.dropped,
        }

    def reset_stats(self):
        super().reset_stats()
        self.metrics.reset()
        self.access_logger.clear()
        self.kill_list.clear()
