"""
SmartCache Benchmark Suite.

Runs FIFO, LRU, LFU, MRU, and SmartCache through identical workloads
at multiple cache capacities and records results.

Usage:
    python scripts/benchmark.py
    python scripts/benchmark.py --output results.json
    python scripts/benchmark.py --workloads cyclic.log zipfian.log --capacities 32 64 128
"""
import os
import sys
import json
import time
import argparse
import csv

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from src.policies.fifo import FIFOCache
from src.policies.lru import LRUCache
from src.policies.lfu import LFUCache
from src.policies.mru import MRUCache
from src.policies.smart_cache import SmartCachePolicy
from src.simulation.workload_loader import WorkloadLoader


def benchmark_single(
    workload_name: str,
    keys: list,
    cache_capacity: int,
    refresh_interval: float = 0.05,
) -> list:
    """Run all 5 policies on the same workload and cache size.

    Returns a list of result dicts.
    """
    results = []
    total = len(keys)

    # ---- Traditional policies ----
    for policy_name, policy_cls in [
        ('FIFO', FIFOCache),
        ('LRU', LRUCache),
        ('LFU', LFUCache),
        ('MRU', MRUCache),
    ]:
        cache = policy_cls(cache_capacity)
        t0 = time.perf_counter()
        for key in keys:
            cache.access(key)
        elapsed = time.perf_counter() - t0

        results.append({
            'policy': policy_name,
            'workload': workload_name,
            'cache_size': cache_capacity,
            'requests': total,
            'hits': cache.hits,
            'misses': cache.misses,
            'hit_rate': round(cache.hit_rate * 100, 3),
            'avg_latency_ms': round(elapsed / total * 1000, 6),
            'p95_latency_ms': 0.0,
            'p99_latency_ms': 0.0,
            'throughput_rps': round(total / elapsed, 1) if elapsed > 0 else 0.0,
            'evictions': max(0, total - cache.hits - cache_capacity),
        })

    # ---- SmartCache ----
    smart = SmartCachePolicy(
        capacity=cache_capacity,
        refresh_interval=refresh_interval,
        auto_start_worker=True,
    )

    t0 = time.perf_counter()
    for key in keys:
        smart.access(key)
    elapsed = time.perf_counter() - t0

    # Give worker a moment to finish last cycle
    time.sleep(0.15)
    smart.stop_worker()

    lat = smart.metrics.get_latency_stats()
    wk = smart.metrics.get_worker_stats()

    results.append({
        'policy': 'SmartCache',
        'workload': workload_name,
        'cache_size': cache_capacity,
        'requests': total,
        'hits': smart.hits,
        'misses': smart.misses,
        'hit_rate': round(smart.hit_rate * 100, 3),
        'avg_latency_ms': lat.get('avg_ms', 0.0),
        'p95_latency_ms': lat.get('p95_ms', 0.0),
        'p99_latency_ms': lat.get('p99_ms', 0.0),
        'throughput_rps': round(smart.metrics.throughput_rps, 1),
        'evictions': smart.metrics.evictions,
        'worker_inference_ms': wk.get('avg_inference_ms', 0.0),
        'refresh_count': wk.get('refreshes', 0),
        'fallback_evictions': smart.metrics.fallback_evictions,
        'kill_list_evictions': smart.metrics.kill_list_evictions,
        'kill_list_size': smart.kill_list.size,
    })

    return results


def print_results_table(results: list) -> None:
    """Pretty-print benchmark results."""
    print()
    header = f"{'Policy':<12} {'Workload':<14} {'Cap':>5} {'Reqs':>8} {'Hits':>8} {'Miss':>8} {'Hit%':>8} {'Lat(ms)':>10} {'RPS':>10}"
    print(header)
    print("-" * len(header))
    for r in results:
        print(
            f"{r['policy']:<12} {r['workload']:<14} {r['cache_size']:>5} "
            f"{r['requests']:>8} {r['hits']:>8} {r['misses']:>8} "
            f"{r['hit_rate']:>7.2f}% {r['avg_latency_ms']:>10.4f} "
            f"{r['throughput_rps']:>10.0f}"
        )
    print()


def main():
    parser = argparse.ArgumentParser(description="SmartCache Benchmark Suite")
    parser.add_argument('--workloads', nargs='+', default=None,
                        help='Workload names to benchmark (default: all available)')
    parser.add_argument('--capacities', nargs='+', type=int, default=[10, 25, 50, 100],
                        help='Cache capacities to test')
    parser.add_argument('--limit', type=int, default=5000,
                        help='Max trace entries per workload (0=unlimited)')
    parser.add_argument('--output', type=str, default=None,
                        help='Output JSON file path')
    parser.add_argument('--csv', type=str, default=None,
                        help='Output CSV file path')
    parser.add_argument('--refresh', type=float, default=0.05,
                        help='SmartCache worker refresh interval in seconds')
    args = parser.parse_args()

    print("=" * 70)
    print("  SmartCache Benchmark Suite")
    print("=" * 70)

    workload_names = args.workloads or WorkloadLoader.available_workloads()
    capacities = args.capacities

    print(f"  Workloads:  {workload_names}")
    print(f"  Capacities: {capacities}")
    print(f"  Trace limit: {args.limit or 'unlimited'}")
    print()

    all_results = []

    for wname in workload_names:
        try:
            keys = WorkloadLoader.load(wname, limit=args.limit)
        except FileNotFoundError:
            print(f"  SKIP: {wname} not found")
            continue

        if len(keys) < 100:
            print(f"  SKIP: {wname} too short ({len(keys)} keys)")
            continue

        for cap in capacities:
            print(f"  Running: {wname} (cap={cap}, {len(keys)} keys)...")
            results = benchmark_single(wname, keys, cap, refresh_interval=args.refresh)
            all_results.extend(results)
            print_results_table(results)

    # Save results
    if args.output:
        output_path = args.output
    else:
        results_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'results')
        os.makedirs(results_dir, exist_ok=True)
        output_path = os.path.join(results_dir, 'benchmark_results.json')

    with open(output_path, 'w') as f:
        json.dump(all_results, f, indent=2)
    print(f"  Results saved to: {output_path}")

    if args.csv:
        csv_path = args.csv
    else:
        results_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'results')
        os.makedirs(results_dir, exist_ok=True)
        csv_path = os.path.join(results_dir, 'benchmark_results.csv')

    if all_results:
        fieldnames = list(all_results[0].keys())
        # Ensure consistent columns across all results
        for r in all_results:
            for k in r:
                if k not in fieldnames:
                    fieldnames.append(k)

        with open(csv_path, 'w', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction='ignore')
            writer.writeheader()
            writer.writerows(all_results)
        print(f"  CSV saved to:     {csv_path}")

    print("\n" + "=" * 70)
    print("  Benchmark Complete!")
    print("=" * 70)


if __name__ == '__main__':
    main()
