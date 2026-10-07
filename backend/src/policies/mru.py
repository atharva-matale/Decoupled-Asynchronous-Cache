from collections import OrderedDict
from src.policies.base import BaseCache


class MRUCache(BaseCache):
    """Most Recently Used (MRU) cache eviction policy."""
    def __init__(self, capacity: int):
        super().__init__(capacity)
        self.cache = OrderedDict()

    def access(self, key) -> bool:
        if key in self.cache:
            self.hits += 1
            # Move accessed key to the end to mark it as most recently used
            self.cache.move_to_end(key)
            return True
        else:
            self.misses += 1
            if len(self.cache) >= self.capacity:
                # Evict the most recently used item (the last item in OrderedDict)
                self.cache.popitem(last=True)
                self.evictions += 1
            self.cache[key] = True
            return False

    def get_contents(self) -> list:
        return list(self.cache.keys())
