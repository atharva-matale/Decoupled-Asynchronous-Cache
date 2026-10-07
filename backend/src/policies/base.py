from collections import OrderedDict


class BaseCache:
    """Base class for cache simulation."""
    def __init__(self, capacity: int):
        if capacity <= 0:
            raise ValueError("Cache capacity must be greater than 0")
        self.capacity = capacity
        self.hits = 0
        self.misses = 0
        self.evictions = 0
        self.evictions = 0

    def access(self, key) -> bool:
        """
        Accesses a key in the cache.
        Returns True if hit, False if miss (and handles eviction/insertion).
        """
        raise NotImplementedError("Subclasses must implement access()")

    def get_contents(self) -> list:
        """Returns a list of keys currently in the cache."""
        raise NotImplementedError("Subclasses must implement get_contents()")

    @property
    def hit_rate(self) -> float:
        total = self.hits + self.misses
        return self.hits / total if total > 0 else 0.0

    @property
    def miss_rate(self) -> float:
        total = self.hits + self.misses
        return self.misses / total if total > 0 else 0.0

    def reset_stats(self):
        self.hits = 0
        self.misses = 0
        self.evictions = 0
        self.evictions = 0
