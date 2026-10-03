# Cache eviction policy implementations
from src.policies.fifo import FIFOCache
from src.policies.lru import LRUCache
from src.policies.lfu import LFUCache
from src.policies.mru import MRUCache
from src.policies.smart_cache import SmartCachePolicy

__all__ = ['FIFOCache', 'LRUCache', 'LFUCache', 'MRUCache', 'SmartCachePolicy']
