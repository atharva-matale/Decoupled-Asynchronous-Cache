import unittest
from src.cache import FIFOCache, LRUCache, LFUCache, MRUCache

class TestCachePolicies(unittest.TestCase):
    def test_fifo_cache(self):
        cache = FIFOCache(capacity=2)
        
        # Access A (Miss)
        self.assertFalse(cache.access("A"))
        # Access B (Miss)
        self.assertFalse(cache.access("B"))
        # Access A (Hit - does not update insertion order in FIFO)
        self.assertTrue(cache.access("A"))
        
        # Access C (Miss - evicts oldest, which is A)
        self.assertFalse(cache.access("C"))
        self.assertEqual(set(cache.get_contents()), {"B", "C"})
        
        # A should miss now
        self.assertFalse(cache.access("A"))
        self.assertEqual(cache.hits, 1)
        self.assertEqual(cache.misses, 4)

    def test_lru_cache(self):
        cache = LRUCache(capacity=2)
        
        # Access A (Miss)
        self.assertFalse(cache.access("A"))
        # Access B (Miss)
        self.assertFalse(cache.access("B"))
        # Access A (Hit - moves A to most recently used)
        self.assertTrue(cache.access("A"))
        
        # Access C (Miss - evicts LRU, which is B since A was recently hit)
        self.assertFalse(cache.access("C"))
        self.assertEqual(set(cache.get_contents()), {"A", "C"})
        
        # Access A (Hit - moves A to most recently used)
        self.assertTrue(cache.access("A"))
        
        # Access B (Miss - evicts C since A was recently hit)
        self.assertFalse(cache.access("B"))
        self.assertEqual(set(cache.get_contents()), {"A", "B"})
        
        # Access A (Hit)
        self.assertTrue(cache.access("A"))
        self.assertEqual(cache.hits, 3)
        self.assertEqual(cache.misses, 4)

    def test_lfu_cache(self):
        cache = LFUCache(capacity=2)
        
        # Access A (Miss, freq=1)
        self.assertFalse(cache.access("A"))
        # Access B (Miss, freq=1)
        self.assertFalse(cache.access("B"))
        # Access A (Hit, freq=2)
        self.assertTrue(cache.access("A"))
        
        # Access C (Miss - evicts least frequently used, which is B [freq=1] over A [freq=2])
        self.assertFalse(cache.access("C"))
        self.assertEqual(set(cache.get_contents()), {"A", "C"})
        self.assertEqual(cache.freq["C"], 1)
        self.assertEqual(cache.freq["A"], 2)

    def test_lfu_cache_tie_breaker(self):
        cache = LFUCache(capacity=2)
        
        # Insert A, B
        cache.access("A")
        cache.access("B")
        
        # Access A then B to give them equal frequency (2) but B is more recently used
        cache.access("A")
        cache.access("B")
        
        # Insert C - should evict A because it's LRU among the frequency=2 group
        cache.access("C")
        self.assertEqual(set(cache.get_contents()), {"B", "C"})

    def test_mru_cache(self):
        cache = MRUCache(capacity=2)
        
        # Access A (Miss)
        self.assertFalse(cache.access("A"))
        # Access B (Miss)
        self.assertFalse(cache.access("B"))
        # Access C (Miss - evicts MRU, which is B)
        self.assertFalse(cache.access("C"))
        self.assertEqual(set(cache.get_contents()), {"A", "C"})
        
        # Access A (Hit - A becomes MRU)
        self.assertTrue(cache.access("A"))
        # Access D (Miss - evicts MRU, which is A)
        self.assertFalse(cache.access("D"))
        self.assertEqual(set(cache.get_contents()), {"C", "D"})

    def test_lru_cyclic_collapse(self):
        """LRU under a cyclic workload of length K > capacity C must give 0% hit rate."""
        capacity = 3
        lru = LRUCache(capacity=capacity)
        
        # Cyclic workload: 0, 1, 2, 3, 0, 1, 2, 3... (length 4 > capacity 3)
        cyclic_pattern = ["0", "1", "2", "3"]
        
        # Run cyclic pattern multiple times
        for _ in range(5):
            for key in cyclic_pattern:
                lru.access(key)
                
        # Total requests: 20. Hit rate must be 0% (hits == 0)
        self.assertEqual(lru.hits, 0)
        self.assertEqual(lru.misses, 20)
        self.assertEqual(lru.hit_rate, 0.0)

if __name__ == "__main__":
    unittest.main()
