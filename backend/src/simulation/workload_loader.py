"""
Workload / trace loading utilities for SmartCache.

Supports:
    • Line-based trace files (one key per line, or multi-column)
    • Automatic delimiter detection (whitespace, comma, tab)
    • Streaming (generator) and bulk loading
    • Built-in synthetic workload generators
"""
import os
from typing import Iterable, List, Optional

# Resolve the traces directory relative to this file
_TRACES_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
    'traces'
)

WORKLOAD_MAP = {
    'cyclic.log': os.path.join(_TRACES_DIR, 'cyclic.log'),
    'zipfian.log': os.path.join(_TRACES_DIR, 'zipfian.log'),
    'recency.log': os.path.join(_TRACES_DIR, 'recency.log'),
    'gcc.trace': os.path.join(_TRACES_DIR, 'gcc.trace'),
    'swim.trace': os.path.join(_TRACES_DIR, 'swim.trace'),
    'Product catalogue': os.path.join(_TRACES_DIR, 'cyclic.log'),
    'News feed': os.path.join(_TRACES_DIR, 'zipfian.log'),
    'Session store': os.path.join(_TRACES_DIR, 'recency.log'),
    'Read-heavy API': os.path.join(_TRACES_DIR, 'gcc.trace'),
    'Scientific Benchmark': os.path.join(_TRACES_DIR, 'swim.trace'),
}


class WorkloadLoader:
    """Unified trace file loading with auto-detection."""

    @staticmethod
    def available_workloads() -> List[str]:
        """Return names of available workloads."""
        return [name for name, path in WORKLOAD_MAP.items() if os.path.exists(path)]

    @staticmethod
    def resolve_path(name_or_path: str) -> str:
        """Resolve a workload name (e.g. 'cyclic.log') to its absolute path."""
        if name_or_path in WORKLOAD_MAP:
            return WORKLOAD_MAP[name_or_path]
        if os.path.exists(name_or_path):
            return name_or_path
        # Try inside traces dir
        candidate = os.path.join(_TRACES_DIR, os.path.basename(name_or_path))
        if os.path.exists(candidate):
            return candidate
        raise FileNotFoundError(f"Trace file not found: {name_or_path}")

    @staticmethod
    def stream(
        name_or_path: str,
        key_column: int = 0,
        delimiter: Optional[str] = None,
        limit: int = 0,
    ) -> Iterable[str]:
        """Yield access keys from a trace file (streaming, low memory).

        Args:
            name_or_path: workload name or file path
            key_column:   0-based column index for the request key
            delimiter:    column separator (auto-detected if None)
            limit:        max keys to yield (0 = unlimited)
        """
        filepath = WorkloadLoader.resolve_path(name_or_path)
        count = 0

        with open(filepath, 'r', encoding='utf-8') as f:
            # Auto-detect delimiter from first line
            first_line = f.readline()
            f.seek(0)

            if delimiter is None:
                if ',' in first_line:
                    delimiter = ','
                elif '\t' in first_line:
                    delimiter = '\t'
                else:
                    delimiter = None  # whitespace split

            for line in f:
                line = line.strip()
                if not line or line.startswith('#') or line.startswith('//'):
                    continue

                parts = line.split(delimiter) if delimiter else line.split()
                if not parts:
                    continue

                key = parts[key_column].strip() if key_column < len(parts) else line
                yield key
                count += 1
                if limit > 0 and count >= limit:
                    return

    @staticmethod
    def load(name_or_path: str, limit: int = 0, **kwargs) -> List[str]:
        """Load an entire trace into a list (for benchmarks / training)."""
        return list(WorkloadLoader.stream(name_or_path, limit=limit, **kwargs))

    # ------------------------------------------------------------------
    # Synthetic workload generators
    # ------------------------------------------------------------------
    @staticmethod
    def generate_cyclic(working_set: int, repetitions: int) -> List[str]:
        """Generate a cyclic access pattern that defeats LRU.

        If working_set > cache_capacity, LRU achieves ~0% hit rate.
        """
        pattern = [f"key_{i}" for i in range(working_set)]
        return pattern * repetitions

    @staticmethod
    def generate_zipfian(num_keys: int, length: int, alpha: float = 1.0, seed: int = 42) -> List[str]:
        """Generate a Zipfian access pattern."""
        import numpy as np
        rng = np.random.default_rng(seed)
        ranks = np.arange(1, num_keys + 1, dtype=np.float64)
        weights = 1.0 / np.power(ranks, alpha)
        weights /= weights.sum()
        indices = rng.choice(num_keys, size=length, p=weights)
        return [f"key_{i}" for i in indices]

    @staticmethod
    def generate_mixed(num_keys: int, length: int, seed: int = 42) -> List[str]:
        """Generate a mixed workload combining hot, warm, and cold keys."""
        import numpy as np
        rng = np.random.default_rng(seed)
        keys = []
        hot_keys = [f"hot_{i}" for i in range(max(1, num_keys // 10))]
        warm_keys = [f"warm_{i}" for i in range(max(1, num_keys // 3))]
        cold_keys = [f"cold_{i}" for i in range(num_keys)]

        for _ in range(length):
            r = rng.random()
            if r < 0.6:
                keys.append(rng.choice(hot_keys))
            elif r < 0.85:
                keys.append(rng.choice(warm_keys))
            else:
                keys.append(rng.choice(cold_keys))
        return keys
