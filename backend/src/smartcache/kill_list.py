"""
Thread-safe Kill List for SmartCache.

The Kill List is an ordered sequence of cache keys ranked by
*ascending* probability of near-future reuse.  The first valid entry
is the preferred eviction victim.

Updates are atomic: the background worker computes a new list and
calls `replace()`, which swaps the reference in a single pointer
assignment under a lightweight lock.

Cache reads (get_victim) never wait for model inference; they simply
iterate the current list and skip stale entries.
"""
import threading
from typing import Optional, Set, List


class KillList:
    """Precomputed eviction-priority list — the bridge between the ML
    background worker and the cache controller.

    Thread safety contract:
        • `replace()`    — called by the background worker
        • `get_victim()` — called on the cache critical path
    Both are protected by the same lock but the critical sections are
    extremely short (pointer swap / linear scan of a small list).
    """

    def __init__(self):
        self._list: List[str] = []
        self._lock = threading.Lock()
        self._version = 0          # monotonically increasing generation counter

    def replace(self, new_list: List[str]) -> None:
        """Atomically replace the entire kill list.

        Called by the background worker after a new prediction round.
        """
        with self._lock:
            self._list = list(new_list)  # defensive copy
            self._version += 1

    def get_victim(self, valid_keys: Set[str]) -> Optional[str]:
        """Return the highest-priority victim that is currently in the cache.

        Iterates the kill list front-to-back and returns the first key
        found in *valid_keys*.  Stale entries are silently skipped.

        Returns None if no valid victim is found (caller should use
        the fallback eviction policy).
        """
        with self._lock:
            current = self._list   # reference copy under lock

        # Iterate outside the lock — the list object is immutable between
        # replace() calls so this is safe.
        for key in current:
            if key in valid_keys:
                return key
        return None

    @property
    def size(self) -> int:
        return len(self._list)

    @property
    def version(self) -> int:
        return self._version

    def snapshot(self) -> List[str]:
        """Return a shallow copy of the current list (for diagnostics)."""
        with self._lock:
            return list(self._list)

    def clear(self):
        with self._lock:
            self._list = []
            self._version = 0
