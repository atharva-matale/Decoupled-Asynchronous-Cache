"""
Thread-safe, bounded, non-blocking access logger for SmartCache.

Every cache request emits a lightweight event into a bounded ring buffer.
The logger NEVER performs model inference, disk I/O, or any expensive
computation—it only appends to an in-memory deque.

Designed to be called on the cache critical path with O(1) overhead.
"""
import threading
import time
from collections import deque


class AccessEvent:
    """Lightweight record of a single cache access."""
    __slots__ = ('sequence_number', 'timestamp', 'key', 'hit')

    def __init__(self, sequence_number: int, timestamp: float, key: str, hit: bool):
        self.sequence_number = sequence_number
        self.timestamp = timestamp
        self.key = key
        self.hit = hit

    def to_dict(self) -> dict:
        return {
            'sequence_number': self.sequence_number,
            'timestamp': self.timestamp,
            'key': self.key,
            'hit': self.hit,
        }


class AccessLogger:
    """
    Bounded, thread-safe, non-blocking access logger.

    Uses a fixed-capacity deque as a ring buffer.  When the buffer is full,
    the oldest event is silently dropped and the drop counter is incremented.

    The background worker takes point-in-time *snapshots* of the buffer
    without holding the lock for more than a memcpy.
    """

    def __init__(self, max_size: int = 50_000):
        self._max_size = max_size
        self._buffer = deque(maxlen=max_size)
        self._lock = threading.Lock()
        self._seq = 0
        self._dropped = 0       # events dropped because buffer was full
        self._total_logged = 0  # total events ever logged

    # ------------------------------------------------------------------
    # Critical-path method — called inside GET/PUT
    # ------------------------------------------------------------------
    def log(self, key: str, hit: bool) -> None:
        """
        Record an access event.  O(1), non-blocking for the deque path.
        If the deque is at capacity the oldest event is silently evicted.
        """
        with self._lock:
            self._seq += 1
            self._total_logged += 1
            # deque(maxlen=N) silently drops the oldest when appending past N
            if len(self._buffer) >= self._max_size:
                self._dropped += 1
            self._buffer.append(
                AccessEvent(self._seq, time.monotonic(), key, hit)
            )

    # ------------------------------------------------------------------
    # Background-worker methods — called outside the critical path
    # ------------------------------------------------------------------
    def snapshot(self, last_n: int = 0) -> list:
        """
        Return a *copy* of the most recent events as a list of AccessEvent.

        The lock is held only for the shallow copy; no deep serialisation
        is performed while locked.

        Args:
            last_n: if > 0, return only the most recent N events.
        """
        with self._lock:
            if last_n > 0:
                # islice from the right is O(last_n) on a deque
                items = list(self._buffer)[-last_n:]
            else:
                items = list(self._buffer)
        return items

    @property
    def size(self) -> int:
        return len(self._buffer)

    @property
    def total_logged(self) -> int:
        return self._total_logged

    @property
    def dropped(self) -> int:
        return self._dropped

    def clear(self):
        with self._lock:
            self._buffer.clear()
            self._seq = 0
            self._dropped = 0
            self._total_logged = 0
