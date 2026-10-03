"""
Cache simulation engine.

Runs identical workloads through multiple cache policies and collects
comparable metrics.  Supports both traditional and SmartCache policies.
"""
import time
from typing import Dict, Iterable, List

from src.policies.base import BaseCache


class CacheSimulator:
    """Manages the simulation of cache policies on trace workloads."""

    def __init__(self, policies: Dict[str, BaseCache]):
        """
        Args:
            policies: A dictionary mapping policy name to BaseCache instance.
        """
        self.policies = policies
        self.total_requests = 0

    def run(self, keys: Iterable[str], report_interval: int = 100000) -> None:
        """Streams keys to all configured cache policies.

        Args:
            keys: An iterable stream of access keys.
            report_interval: Number of requests after which to print progress.
        """
        for key in keys:
            self.total_requests += 1
            for cache in self.policies.values():
                cache.access(key)

            if report_interval > 0 and self.total_requests % report_interval == 0:
                print(f"Processed {self.total_requests} requests...")

    def get_results(self) -> dict:
        """Returns the summary metrics for all ran policies."""
        results = {}
        for name, cache in self.policies.items():
            entry = {
                'capacity': cache.capacity,
                'total_requests': self.total_requests,
                'hits': cache.hits,
                'misses': cache.misses,
                'hit_rate': cache.hit_rate,
                'miss_rate': cache.miss_rate,
            }
            # If this is a SmartCachePolicy, include extra metrics
            if hasattr(cache, 'metrics'):
                lat = cache.metrics.get_latency_stats()
                wk = cache.metrics.get_worker_stats()
                entry.update({
                    'avg_latency_ms': lat.get('avg_ms', 0.0),
                    'p95_latency_ms': lat.get('p95_ms', 0.0),
                    'p99_latency_ms': lat.get('p99_ms', 0.0),
                    'throughput_rps': round(cache.metrics.throughput_rps, 1),
                    'evictions': cache.metrics.evictions,
                    'kill_list_evictions': cache.metrics.kill_list_evictions,
                    'fallback_evictions': cache.metrics.fallback_evictions,
                    'worker_inference_ms': wk.get('avg_inference_ms', 0.0),
                    'refresh_count': wk.get('refreshes', 0),
                    'kill_list_size': cache.kill_list.size,
                })
            results[name] = entry
        return results
