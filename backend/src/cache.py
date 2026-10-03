from collections import OrderedDict, defaultdict

class BaseCache:
    """Base class for cache simulation."""
    def __init__(self, capacity: int):
        if capacity <= 0:
            raise ValueError("Cache capacity must be greater than 0")
        self.capacity = capacity
        self.hits = 0
        self.misses = 0

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


class LRUCache(BaseCache):
    """Least Recently Used (LRU) cache eviction policy."""
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
                # Evict the least recently used item (first item in OrderedDict)
                self.cache.popitem(last=False)
            self.cache[key] = True
            return False

    def get_contents(self) -> list:
        return list(self.cache.keys())


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

            self.cache[key] = True
            self.freq[key] = 1
            self.freq_lists[1][key] = True
            self.min_freq = 1
            return False

    def get_contents(self) -> list:
        return list(self.cache.keys())


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
            self.cache[key] = True
            return False

    def get_contents(self) -> list:
        return list(self.cache.keys())


class SmartCache(BaseCache):
    """Smart Cache eviction policy using a precomputed Kill List."""
    def __init__(self, capacity: int):
        super().__init__(capacity)
        self.cache = OrderedDict()  # Tracks contents and fallback LRU order
        self.kill_list = []         # Precomputed eviction candidate keys (ordered: front = evict first)
        self.access_log = []        # Record of recent accesses for the logger

    def access(self, key) -> bool:
        # Check hit or miss
        hit = key in self.cache
        if hit:
            self.hits += 1
            # Move to end for fallback LRU tracking
            self.cache.move_to_end(key)
        else:
            self.misses += 1
            if len(self.cache) >= self.capacity:
                self.evict()
            self.cache[key] = True

        self.access_log.append(key)
        return hit

    def evict(self) -> str:
        # O(1) eviction logic using the Kill List
        evict_key = None
        
        # Check elements in the kill list in order. Evict the first one that is currently in our cache.
        for key in self.kill_list:
            if key in self.cache:
                evict_key = key
                break
                
        # Fallback to LRU if no key from kill list is in the cache
        if evict_key is None:
            # OrderedDict.popitem(last=False) pops the oldest (LRU) item
            if self.cache:
                evict_key, _ = self.cache.popitem(last=False)
        else:
            # Remove the chosen key from the cache
            del self.cache[evict_key]
            
        return evict_key

    def get_contents(self) -> list:
        return list(self.cache.keys())

    def update_kill_list(self, kill_list: list):
        """Updates the precomputed kill list from the background worker."""
        self.kill_list = list(kill_list)

