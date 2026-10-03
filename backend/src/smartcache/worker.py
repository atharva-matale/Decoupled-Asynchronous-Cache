"""
Background Prediction Worker for SmartCache.

Runs in its own daemon thread.  Periodically:
    1. Takes a quick snapshot of the access log and cache keys.
    2. Extracts features (outside any cache lock).
    3. Runs model inference (outside any cache lock).
    4. Ranks cached keys by eviction priority.
    5. Atomically replaces the Kill List.

The cache controller NEVER waits for this worker.
"""
import time
import logging
import threading
from typing import Optional

import numpy as np

from src.smartcache.access_logger import AccessLogger
from src.smartcache.kill_list import KillList
from src.smartcache.feature_extractor import FeatureExtractor
from src.smartcache.predictor import PredictorInterface, HeuristicPredictor
from src.smartcache.metrics import SmartCacheMetrics

logger = logging.getLogger(__name__)


class BackgroundPredictionWorker:
    """Daemon thread that periodically refreshes the Kill List.

    Configuration knobs:
        refresh_interval  — seconds between prediction cycles
        history_window    — how many recent access events to use
        kill_list_size    — maximum length of the produced kill list
    """

    def __init__(
        self,
        access_logger: AccessLogger,
        kill_list: KillList,
        predictor: PredictorInterface,
        cache_snapshot_fn,
        metrics: SmartCacheMetrics,
        refresh_interval: float = 0.1,    # seconds
        history_window: int = 5000,
        kill_list_size: int = 0,          # 0 = use all cached keys
    ):
        self._logger = access_logger
        self._kill_list = kill_list
        self._predictor = predictor
        self._cache_snapshot_fn = cache_snapshot_fn  # callable → set of keys
        self._metrics = metrics

        self.refresh_interval = refresh_interval
        self.history_window = history_window
        self.kill_list_size = kill_list_size

        self._extractor = FeatureExtractor()

        self._thread: Optional[threading.Thread] = None
        self._stop_event = threading.Event()
        self._running = False

    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------
    def start(self) -> None:
        if self._running:
            return
        self._stop_event.clear()
        self._running = True
        self._thread = threading.Thread(target=self._run_loop, daemon=True)
        self._thread.start()
        logger.info("BackgroundPredictionWorker started (T_refresh=%.3fs)", self.refresh_interval)

    def stop(self, timeout: float = 2.0) -> None:
        self._stop_event.set()
        self._running = False
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=timeout)
        logger.info("BackgroundPredictionWorker stopped")

    @property
    def is_running(self) -> bool:
        return self._running and self._thread is not None and self._thread.is_alive()

    # ------------------------------------------------------------------
    # Main loop
    # ------------------------------------------------------------------
    def _run_loop(self) -> None:
        while not self._stop_event.is_set():
            try:
                self._refresh_cycle()
            except Exception as e:
                logger.error("Worker cycle error: %s", e, exc_info=True)
                self._metrics.record_worker_failure()

            # Sleep in small increments so we can react to stop quickly
            deadline = time.monotonic() + self.refresh_interval
            while time.monotonic() < deadline and not self._stop_event.is_set():
                time.sleep(min(0.05, deadline - time.monotonic()))

    def _refresh_cycle(self) -> None:
        t0 = time.monotonic()

        # 1. Quick snapshots — minimal time holding any lock
        history = self._logger.snapshot(last_n=self.history_window)
        cached_keys = self._cache_snapshot_fn()

        if not history or not cached_keys:
            return

        # 2. Feature extraction (no locks held)
        t_feat_start = time.monotonic()
        keys, features = self._extractor.extract(history, cached_keys)
        t_feat = time.monotonic() - t_feat_start

        if not keys:
            return

        # 3. Model inference (no locks held)
        t_inf_start = time.monotonic()
        try:
            proba = self._predictor.predict_reuse_probability(features)
        except Exception as e:
            logger.warning("Predictor failed: %s — using uniform scores", e)
            proba = np.full(len(keys), 0.5)
            self._metrics.record_worker_failure()
        t_inf = time.monotonic() - t_inf_start

        # 4. Rank: lowest reuse probability = highest eviction priority
        if len(proba) == 0:
            return
        order = np.argsort(proba)  # ascending probability
        new_kill_list = [keys[i] for i in order]

        if self.kill_list_size > 0:
            new_kill_list = new_kill_list[:self.kill_list_size]

        # 5. Atomic replacement
        self._kill_list.replace(new_kill_list)

        t_total = time.monotonic() - t0
        self._metrics.record_worker_cycle(t_feat, t_inf, t_total)

    # ------------------------------------------------------------------
    # Predictor hot-swap
    # ------------------------------------------------------------------
    def set_predictor(self, predictor: PredictorInterface) -> None:
        self._predictor = predictor
        logger.info("Worker predictor changed to %s", predictor.name)
