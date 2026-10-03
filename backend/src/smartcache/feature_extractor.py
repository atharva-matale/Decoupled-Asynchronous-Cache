"""
Feature extraction for SmartCache ML predictor.

Generates per-key features from the access history snapshot.
ALL features are derived from *past* accesses only — no future leakage.

Features per cached key:
    0. recency            — requests since last access
    1. frequency          — accesses in the recent window
    2. global_frequency   — total accesses ever observed
    3. inter_arrival_mean — mean gap between consecutive accesses
    4. inter_arrival_var  — variance of inter-arrival gaps
    5. reuse_distance     — number of distinct keys accessed since last access
    6. recent_window_freq — accesses in the last `short_window` events
    7. cache_age          — requests since the key first entered cache
    8. frequency_trend    — change in access frequency between two half-windows
    9. access_density     — frequency / window_size (normalized)
"""
import math
from collections import defaultdict
from typing import List, Dict, Tuple, Set

# Feature vector length
NUM_FEATURES = 10
FEATURE_NAMES = [
    'recency', 'frequency', 'global_frequency',
    'inter_arrival_mean', 'inter_arrival_var',
    'reuse_distance', 'recent_window_freq',
    'cache_age', 'frequency_trend', 'access_density',
]


class FeatureExtractor:
    """Builds feature vectors from a snapshot of access events.

    This class is instantiated by the background worker and operates
    entirely outside the cache critical path.
    """

    def __init__(self, short_window: int = 200):
        self.short_window = short_window

    def extract(
        self,
        events: list,
        cached_keys: Set[str],
    ) -> Tuple[List[str], List[List[float]]]:
        """Build feature vectors for every key currently in the cache.

        Args:
            events: list of AccessEvent ordered oldest → newest.
            cached_keys: set of keys currently in the cache.

        Returns:
            (keys, feature_matrix)  — parallel lists.
        """
        if not events or not cached_keys:
            return [], []

        n = len(events)
        half = n // 2

        # --- Single pass: build per-key statistics -----------------------
        global_freq: Dict[str, int] = defaultdict(int)
        positions: Dict[str, List[int]] = defaultdict(list)  # positions list
        first_seen: Dict[str, int] = {}
        recent_freq: Dict[str, int] = defaultdict(int)
        half1_freq: Dict[str, int] = defaultdict(int)
        half2_freq: Dict[str, int] = defaultdict(int)
        short_freq: Dict[str, int] = defaultdict(int)

        short_start = max(0, n - self.short_window)

        for i, ev in enumerate(events):
            k = ev.key
            global_freq[k] += 1
            positions[k].append(i)
            if k not in first_seen:
                first_seen[k] = i
            if i >= short_start:
                short_freq[k] += 1
            if i < half:
                half1_freq[k] += 1
            else:
                half2_freq[k] += 1

        # Reuse distance: count of distinct keys since last access of each key
        last_pos: Dict[str, int] = {}
        reuse_dist: Dict[str, int] = {}
        for i, ev in enumerate(events):
            last_pos[ev.key] = i
        # For each cached key, count distinct keys accessed after its last access
        for key in cached_keys:
            if key in last_pos:
                lp = last_pos[key]
                distinct = set()
                for j in range(lp + 1, n):
                    distinct.add(events[j].key)
                reuse_dist[key] = len(distinct)
            else:
                reuse_dist[key] = n  # never seen → max distance

        # --- Build feature vectors for each cached key -------------------
        keys_out = []
        features_out = []

        for key in cached_keys:
            recency = (n - 1 - last_pos[key]) if key in last_pos else n
            freq = global_freq.get(key, 0)
            gf = freq  # same as global_frequency in our window

            pos_list = positions.get(key, [])
            if len(pos_list) >= 2:
                gaps = [pos_list[j] - pos_list[j - 1] for j in range(1, len(pos_list))]
                ia_mean = sum(gaps) / len(gaps)
                ia_var = sum((g - ia_mean) ** 2 for g in gaps) / len(gaps)
            else:
                ia_mean = float(n)
                ia_var = 0.0

            rd = reuse_dist.get(key, n)
            rwf = short_freq.get(key, 0)
            cage = (n - first_seen[key]) if key in first_seen else 0

            h1 = half1_freq.get(key, 0)
            h2 = half2_freq.get(key, 0)
            trend = h2 - h1  # positive = getting hotter

            density = freq / max(n, 1)

            vec = [
                float(recency),
                float(freq),
                float(gf),
                ia_mean,
                ia_var,
                float(rd),
                float(rwf),
                float(cage),
                float(trend),
                density,
            ]
            keys_out.append(key)
            features_out.append(vec)

        return keys_out, features_out

    @staticmethod
    def extract_training_examples(
        events: list,
        cache_capacity: int,
        horizon: int = 200,
        sample_interval: int = 50,
    ) -> Tuple[List[List[float]], List[int]]:
        """Generate (features, labels) pairs for offline training.

        At every `sample_interval`-th event we snapshot a simulated LRU
        cache state, extract features for each cached key, and label
        each key with whether it will be accessed within the next
        `horizon` events (1 = reused, 0 = not reused).

        Uses only *past* information for features; future info is
        used *only* for the label (supervised signal).
        """
        from src.policies.lru import LRUCache

        n = len(events)
        if n < horizon + cache_capacity:
            return [], []

        X_all = []
        y_all = []
        cache = LRUCache(cache_capacity)
        extractor = FeatureExtractor()

        for i in range(n - horizon):
            cache.access(events[i].key)

            if i < cache_capacity:
                continue  # warm up the cache first
            if i % sample_interval != 0:
                continue

            cached = set(cache.get_contents())
            if not cached:
                continue

            # Use history up to position i
            history = events[:i + 1]
            keys, features = extractor.extract(history, cached)

            # Labels: will the key appear in events[i+1 : i+1+horizon]?
            future_set = set(ev.key for ev in events[i + 1: i + 1 + horizon])

            for k, fvec in zip(keys, features):
                label = 1 if k in future_set else 0
                X_all.append(fvec)
                y_all.append(label)

        return X_all, y_all
