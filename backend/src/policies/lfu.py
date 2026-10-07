from collections import OrderedDict, defaultdict
from src.policies.base import BaseCache


class LFUCache(BaseCache):
    """Least Frequently Used (LFU) cache eviction policy with LRU tie-breaker."""
    def __init__(self, capacity: int):
        super().__init__(capacity)
        self.cache = {}  # key -> True
        self.freq = {}   # key -> frequency count
        self.freq_lists = defaultdict(OrderedDict)  # freq -> OrderedDict of keys
        self.min_freq = 0

    def _update_frequency(self, key):
        freq = self.freq[key]
        # Remove from current frequency list
        del self.freq_lists[freq][key]
        
        # If the minimum frequency list is empty, update the min_freq pointer
        if not self.freq_lists[freq] and freq == self.min_freq:
            self.min_freq += 1

        new_freq = freq + 1
        self.freq[key] = new_freq
        self.freq_lists[new_freq][key] = True

    def access(self, key) -> bool:
        if key in self.cache:
            self.hits += 1
            self._update_frequency(key)
            return True
        else:
            self.misses += 1
            if len(self.cache) >= self.capacity:
                # Evict least frequently used. If there is a tie, evict the LRU (first key in the OrderedDict)
                evict_key, _ = self.freq_lists[self.min_freq].popitem(last=False)
                del self.cache[evict_key]
                del self.freq[evict_key]
                self.evictions += 1

            self.cache[key] = True
            self.freq[key] = 1
            self.freq_lists[1][key] = True
            self.min_freq = 1
            return False

    def get_contents(self) -> list:
        return list(self.cache.keys())
