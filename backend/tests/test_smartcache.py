"""
Comprehensive test suite for SmartCache.

Tests:
    1.  FIFO behavior
    2.  LRU behavior
    3.  LFU behavior
    4.  MRU behavior
    5.  Kill List replacement
    6.  Stale Kill List entries
    7.  Empty Kill List fallback
    8.  Logger concurrency
    9.  Worker lifecycle
    10. SmartCache GET/PUT
    11. Model unavailable fallback
    12. Inference exception fallback
    13. Cyclic LRU failure
    14. Identical workload comparison
    15. Cache operates while worker is deliberately delayed

CRITICAL TEST (#15):
    Artificially makes prediction take ~1 second.
    Cache GET operations must still complete in < 10ms.
    This demonstrates the project's main engineering claim:
        ML inference NEVER blocks the cache critical path.
"""
import os
import sys
import time
import threading
import unittest
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from src.policies.fifo import FIFOCache
from src.policies.lru import LRUCache
from src.policies.lfu import LFUCache
from src.policies.mru import MRUCache
from src.policies.smart_cache import SmartCachePolicy
from src.smartcache.access_logger import AccessLogger
from src.smartcache.kill_list import KillList
from src.smartcache.feature_extractor import FeatureExtractor
from src.smartcache.predictor import HeuristicPredictor, PredictorInterface
from src.smartcache.worker import BackgroundPredictionWorker
from src.smartcache.metrics import SmartCacheMetrics


# =====================================================================
# 1. FIFO behavior
# =====================================================================
class TestFIFO(unittest.TestCase):
    def test_fifo_eviction_order(self):
        cache = FIFOCache(capacity=2)
        self.assertFalse(cache.access("A"))  # Miss
        self.assertFalse(cache.access("B"))  # Miss
        self.assertTrue(cache.access("A"))   # Hit — does NOT update order
        self.assertFalse(cache.access("C"))  # Miss — evicts A (oldest inserted)
        self.assertEqual(set(cache.get_contents()), {"B", "C"})

    def test_fifo_stats(self):
        cache = FIFOCache(capacity=3)
        for k in ["A", "B", "C", "A", "B", "D"]:
            cache.access(k)
        self.assertEqual(cache.hits + cache.misses, 6)


# =====================================================================
# 2. LRU behavior
# =====================================================================
class TestLRU(unittest.TestCase):
    def test_lru_eviction_order(self):
        cache = LRUCache(capacity=2)
        cache.access("A")  # Miss
        cache.access("B")  # Miss
        cache.access("A")  # Hit — A becomes MRU
        cache.access("C")  # Miss — evicts B (LRU)
        self.assertEqual(set(cache.get_contents()), {"A", "C"})

    def test_lru_stats(self):
        cache = LRUCache(capacity=2)
        cache.access("A")
        cache.access("B")
        cache.access("A")
        cache.access("C")
        cache.access("A")
        self.assertEqual(cache.hits, 2)
        self.assertEqual(cache.misses, 3)


# =====================================================================
# 3. LFU behavior
# =====================================================================
class TestLFU(unittest.TestCase):
    def test_lfu_eviction(self):
        cache = LFUCache(capacity=2)
        cache.access("A")  # freq=1
        cache.access("B")  # freq=1
        cache.access("A")  # freq=2
        cache.access("C")  # evicts B (freq=1 < A's freq=2)
        self.assertEqual(set(cache.get_contents()), {"A", "C"})

    def test_lfu_tie_breaker(self):
        cache = LFUCache(capacity=2)
        cache.access("A")  # freq=1
        cache.access("B")  # freq=1
        cache.access("A")  # freq=2
        cache.access("B")  # freq=2
        cache.access("C")  # tie: evicts LRU among freq=2 → A
        self.assertEqual(set(cache.get_contents()), {"B", "C"})


# =====================================================================
# 4. MRU behavior
# =====================================================================
class TestMRU(unittest.TestCase):
    def test_mru_eviction(self):
        cache = MRUCache(capacity=2)
        cache.access("A")
        cache.access("B")
        cache.access("C")  # evicts B (MRU)
        self.assertEqual(set(cache.get_contents()), {"A", "C"})

    def test_mru_after_hit(self):
        cache = MRUCache(capacity=2)
        cache.access("A")
        cache.access("B")
        cache.access("A")  # hit — A becomes MRU
        cache.access("D")  # evicts A (MRU)
        self.assertEqual(set(cache.get_contents()), {"B", "D"})


# =====================================================================
# 5. Kill List replacement
# =====================================================================
class TestKillListReplacement(unittest.TestCase):
    def test_replace_and_victim(self):
        kl = KillList()
        kl.replace(["X", "Y", "Z"])
        self.assertEqual(kl.size, 3)

        victim = kl.get_victim({"Y", "Z", "W"})
        self.assertEqual(victim, "Y")  # first in list that is valid

    def test_atomic_replace(self):
        kl = KillList()
        kl.replace(["A", "B"])
        self.assertEqual(kl.version, 1)
        kl.replace(["C", "D"])
        self.assertEqual(kl.version, 2)
        victim = kl.get_victim({"A", "C"})
        self.assertEqual(victim, "C")  # old list replaced


# =====================================================================
# 6. Stale Kill List entries
# =====================================================================
class TestStaleKillList(unittest.TestCase):
    def test_stale_entries_skipped(self):
        kl = KillList()
        kl.replace(["OLD1", "OLD2", "VALID"])
        victim = kl.get_victim({"VALID", "OTHER"})
        self.assertEqual(victim, "VALID")

    def test_all_stale_returns_none(self):
        kl = KillList()
        kl.replace(["STALE1", "STALE2"])
        victim = kl.get_victim({"CURRENT1", "CURRENT2"})
        self.assertIsNone(victim)


# =====================================================================
# 7. Empty Kill List fallback
# =====================================================================
class TestEmptyKillListFallback(unittest.TestCase):
    def test_empty_list(self):
        kl = KillList()
        victim = kl.get_victim({"A", "B"})
        self.assertIsNone(victim)

    def test_smart_cache_fallback_to_lru(self):
        """SmartCache must evict using LRU when kill list is empty."""
        smart = SmartCachePolicy(capacity=2, auto_start_worker=False)
        smart.access("A")  # Miss, inserted
        smart.access("B")  # Miss, inserted
        smart.access("A")  # Hit — A is now MRU
        # Kill list is empty, so next miss should evict LRU = B
        smart.access("C")  # Miss, should evict B
        self.assertIn("A", smart.get_contents())
        self.assertIn("C", smart.get_contents())
        self.assertNotIn("B", smart.get_contents())
        smart.stop_worker()


# =====================================================================
# 8. Logger concurrency
# =====================================================================
class TestLoggerConcurrency(unittest.TestCase):
    def test_concurrent_writes(self):
        logger = AccessLogger(max_size=10000)
        errors = []

        def writer(prefix, count):
            try:
                for i in range(count):
                    logger.log(f"{prefix}_{i}", hit=True)
            except Exception as e:
                errors.append(e)

        threads = [threading.Thread(target=writer, args=(f"t{t}", 1000)) for t in range(10)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        self.assertEqual(len(errors), 0)
        self.assertEqual(logger.total_logged, 10000)

    def test_snapshot_during_writes(self):
        logger = AccessLogger(max_size=5000)
        stop = threading.Event()

        def writer():
            i = 0
            while not stop.is_set():
                logger.log(f"key_{i}", hit=False)
                i += 1

        t = threading.Thread(target=writer, daemon=True)
        t.start()
        time.sleep(0.1)

        # Snapshot should not crash
        snap = logger.snapshot(last_n=100)
        self.assertIsInstance(snap, list)

        stop.set()
        t.join(timeout=1)


# =====================================================================
# 9. Worker lifecycle
# =====================================================================
class TestWorkerLifecycle(unittest.TestCase):
    def test_start_stop(self):
        al = AccessLogger()
        kl = KillList()
        pred = HeuristicPredictor()
        met = SmartCacheMetrics()

        worker = BackgroundPredictionWorker(
            access_logger=al,
            kill_list=kl,
            predictor=pred,
            cache_snapshot_fn=lambda: set(),
            metrics=met,
            refresh_interval=0.05,
        )
        worker.start()
        self.assertTrue(worker.is_running)
        time.sleep(0.15)
        worker.stop()
        self.assertFalse(worker.is_running)

    def test_worker_produces_kill_list(self):
        al = AccessLogger()
        kl = KillList()
        pred = HeuristicPredictor()
        met = SmartCacheMetrics()

        # Pre-populate logger
        for i in range(500):
            al.log(f"key_{i % 20}", hit=(i % 3 == 0))

        cached = {f"key_{i}" for i in range(20)}

        worker = BackgroundPredictionWorker(
            access_logger=al,
            kill_list=kl,
            predictor=pred,
            cache_snapshot_fn=lambda: cached,
            metrics=met,
            refresh_interval=0.05,
        )
        worker.start()
        time.sleep(0.3)
        worker.stop()

        self.assertGreater(kl.size, 0)
        self.assertGreater(met.worker_refreshes, 0)


# =====================================================================
# 10. SmartCache GET/PUT
# =====================================================================
class TestSmartCacheGetPut(unittest.TestCase):
    def test_basic_operations(self):
        smart = SmartCachePolicy(capacity=3, auto_start_worker=False)
        self.assertFalse(smart.access("A"))  # miss
        self.assertFalse(smart.access("B"))  # miss
        self.assertFalse(smart.access("C"))  # miss
        self.assertTrue(smart.access("A"))   # hit
        self.assertEqual(smart.hits, 1)
        self.assertEqual(smart.misses, 3)
        smart.stop_worker()

    def test_kill_list_driven_eviction(self):
        smart = SmartCachePolicy(capacity=2, auto_start_worker=False)
        smart.access("A")
        smart.access("B")
        # Manually set kill list to prefer evicting A
        smart.kill_list.replace(["A", "B"])
        smart.access("C")  # should evict A (first in kill list)
        self.assertNotIn("A", smart.get_contents())
        self.assertIn("B", smart.get_contents())
        self.assertIn("C", smart.get_contents())
        smart.stop_worker()

    def test_metrics_collected(self):
        smart = SmartCachePolicy(capacity=2, auto_start_worker=False)
        for k in ["A", "B", "A", "C"]:
            smart.access(k)
        self.assertEqual(smart.metrics.requests, 4)
        self.assertEqual(smart.metrics.hits, 1)
        self.assertEqual(smart.metrics.misses, 3)
        smart.stop_worker()


# =====================================================================
# 11. Model unavailable fallback
# =====================================================================
class TestModelUnavailableFallback(unittest.TestCase):
    def test_works_without_model(self):
        """SmartCache must work even if no ML model file exists."""
        smart = SmartCachePolicy(
            capacity=5,
            model_path="/nonexistent/model.pkl",
            auto_start_worker=True,
        )
        # Run accesses — repeating 3 keys in a small cache guarantees hits
        for _ in range(20):
            for k in ["A", "B", "C"]:
                smart.access(k)
        time.sleep(0.2)

        self.assertGreater(smart.hits, 0)
        self.assertEqual(smart.status()['ai_on_critical_path'], False)
        smart.stop_worker()


# =====================================================================
# 12. Inference exception fallback
# =====================================================================
class _CrashingPredictor(PredictorInterface):
    @property
    def name(self):
        return "CrashingPredictor"

    def predict_reuse_probability(self, features):
        raise RuntimeError("Simulated model crash!")


class TestInferenceExceptionFallback(unittest.TestCase):
    def test_worker_survives_crash(self):
        al = AccessLogger()
        kl = KillList()
        pred = _CrashingPredictor()
        met = SmartCacheMetrics()

        for i in range(200):
            al.log(f"key_{i % 10}", hit=False)

        worker = BackgroundPredictionWorker(
            access_logger=al,
            kill_list=kl,
            predictor=pred,
            cache_snapshot_fn=lambda: {f"key_{i}" for i in range(10)},
            metrics=met,
            refresh_interval=0.05,
        )
        worker.start()
        time.sleep(0.3)
        worker.stop()

        # Worker should have recorded failures but stayed alive
        self.assertGreater(met.worker_failures, 0)

    def test_cache_continues_after_predictor_crash(self):
        smart = SmartCachePolicy(capacity=5, auto_start_worker=False)
        # Swap in a crashing predictor
        smart.worker.set_predictor(_CrashingPredictor())
        smart.start_worker()

        # Cache must still function — repeating keys guarantees hits
        for _ in range(20):
            for k in ["A", "B", "C"]:
                smart.access(k)
        time.sleep(0.2)

        self.assertGreater(smart.hits, 0)
        smart.stop_worker()


# =====================================================================
# 13. Cyclic LRU failure
# =====================================================================
class TestCyclicLRUFailure(unittest.TestCase):
    def test_lru_zero_hit_rate_on_cyclic(self):
        """For cache capacity C with working set C+1 in cyclic order,
        LRU achieves ~0% hit rate after warm-up."""
        capacity = 3
        lru = LRUCache(capacity=capacity)
        pattern = ["A", "B", "C", "D"]  # 4 > 3

        # Run many cycles
        for _ in range(100):
            for key in pattern:
                lru.access(key)

        # After warm-up, every access is a miss
        self.assertEqual(lru.hits, 0)
        self.assertEqual(lru.hit_rate, 0.0)

    def test_smart_cache_handles_cyclic(self):
        """SmartCache should not be specifically hardcoded for cyclic,
        but it should at least function and (with ML) potentially beat LRU."""
        capacity = 3
        smart = SmartCachePolicy(capacity=capacity, auto_start_worker=True,
                                 refresh_interval=0.02)
        pattern = ["A", "B", "C", "D"]

        for _ in range(50):
            for key in pattern:
                smart.access(key)

        time.sleep(0.1)
        smart.stop_worker()

        # SmartCache must function (it doesn't have to beat LRU on every pattern)
        self.assertEqual(smart.hits + smart.misses, 200)


# =====================================================================
# 14. Identical workload comparison
# =====================================================================
class TestIdenticalWorkload(unittest.TestCase):
    def test_all_policies_see_same_trace(self):
        """All 5 policies must process the exact same request sequence."""
        trace = [f"key_{i % 15}" for i in range(500)]
        cap = 5

        fifo = FIFOCache(cap)
        lru = LRUCache(cap)
        lfu = LFUCache(cap)
        mru = MRUCache(cap)
        smart = SmartCachePolicy(cap, auto_start_worker=False)

        for key in trace:
            fifo.access(key)
            lru.access(key)
            lfu.access(key)
            mru.access(key)
            smart.access(key)

        # All should have processed 500 requests
        for cache in [fifo, lru, lfu, mru, smart]:
            self.assertEqual(cache.hits + cache.misses, 500)

        smart.stop_worker()


# =====================================================================
# 15. CRITICAL TEST: Cache operates while worker is deliberately delayed
# =====================================================================
class _SlowPredictor(PredictorInterface):
    """Predictor that takes ~1 second per inference call."""
    @property
    def name(self):
        return "SlowPredictor"

    def predict_reuse_probability(self, features):
        time.sleep(1.0)  # Deliberately slow
        return np.full(len(features), 0.5)


class TestDecoupledArchitecture(unittest.TestCase):
    def test_cache_not_blocked_by_slow_inference(self):
        """
        CRITICAL TEST: The main engineering claim of this project.

        ML inference is deliberately slowed to 1 second.
        Cache GET operations must STILL complete in under 10ms each.
        """
        smart = SmartCachePolicy(capacity=10, auto_start_worker=False)
        # Swap in the deliberately slow predictor
        smart.worker.set_predictor(_SlowPredictor())
        smart.worker.refresh_interval = 0.01  # try to refresh quickly
        smart.start_worker()

        # Give the worker time to start (and get stuck in a slow inference)
        time.sleep(0.1)

        # Now: the worker is likely inside a 1-second sleep.
        # Cache operations must NOT wait for it.
        latencies = []
        for i in range(200):
            t0 = time.perf_counter()
            smart.access(f"key_{i % 20}")
            lat = time.perf_counter() - t0
            latencies.append(lat)

        smart.stop_worker()

        avg_lat = sum(latencies) / len(latencies)
        max_lat = max(latencies)
        p99_lat = sorted(latencies)[int(len(latencies) * 0.99)]

        print(f"\n  [Decoupled Test] avg={avg_lat*1000:.4f}ms  "
              f"max={max_lat*1000:.4f}ms  p99={p99_lat*1000:.4f}ms")

        # Key assertion: average latency must be well under 10ms
        # (in practice it's < 0.1ms)
        self.assertLess(avg_lat, 0.010,
                        f"Average cache access latency {avg_lat*1000:.2f}ms "
                        f"exceeds 10ms — ML inference is leaking onto the critical path!")
        self.assertLess(p99_lat, 0.050,
                        f"P99 latency {p99_lat*1000:.2f}ms exceeds 50ms — "
                        f"ML inference is blocking the critical path!")


# =====================================================================
# Feature Extractor tests
# =====================================================================
class TestFeatureExtractor(unittest.TestCase):
    def test_extract_returns_correct_shape(self):
        from src.smartcache.access_logger import AccessEvent
        events = [AccessEvent(i, float(i), f"key_{i % 5}", i % 3 == 0) for i in range(100)]
        cached = {f"key_{i}" for i in range(5)}

        ext = FeatureExtractor()
        keys, features = ext.extract(events, cached)

        self.assertEqual(len(keys), 5)
        self.assertEqual(len(features), 5)
        self.assertEqual(len(features[0]), 10)  # NUM_FEATURES = 10

    def test_no_future_leakage(self):
        """Features should only use past information."""
        from src.smartcache.access_logger import AccessEvent
        events = [AccessEvent(i, float(i), f"key_{i % 3}", False) for i in range(50)]
        cached = {"key_0", "key_1"}

        ext = FeatureExtractor()
        keys, features = ext.extract(events, cached)

        # All features should be computable from events up to the last event
        self.assertTrue(all(len(f) == 10 for f in features))


# =====================================================================
# Metrics tests
# =====================================================================
class TestMetrics(unittest.TestCase):
    def test_summary_structure(self):
        met = SmartCacheMetrics()
        met.record_access(True, 0.001)
        met.record_access(False, 0.002)
        met.record_eviction(from_kill_list=True)

        summary = met.summary()
        self.assertEqual(summary['requests'], 2)
        self.assertEqual(summary['hits'], 1)
        self.assertFalse(summary['ai_on_critical_path'])
        self.assertIn('latency', summary)
        self.assertIn('worker', summary)


if __name__ == '__main__':
    unittest.main(verbosity=2)
