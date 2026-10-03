from collections import OrderedDict
from src.policies.base import BaseCache


class FIFOCache(BaseCache):
    """First-In, First-Out (FIFO) cache eviction policy."""
    def __init__(self, capacity: int):
        super().__init__(capacity)
        # Using OrderedDict to preserve insertion order and facilitate O(1) checks
        self.cache = OrderedDict()

    def access(self, key) -> bool:
        if key in self.cache:
            self.hits += 1
            return True
        else:
            self.misses += 1
            if len(self.cache) >= self.capacity:
                # Evict the oldest item (first inserted, which is the first item in OrderedDict)
                self.cache.popitem(last=False)
            self.cache[key] = True
            return False

    def get_contents(self) -> list:
        return list(self.cache.keys())
