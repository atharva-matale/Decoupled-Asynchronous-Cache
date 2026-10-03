import os
from typing import Dict, Iterable, Union
from src.cache import BaseCache

def parse_trace_file(file_path: str, key_column: int = 0, delimiter: str = None) -> Iterable[str]:
    """
    Parses a trace file line by line to yield access keys.
    Avoids loading the entire trace into memory.
    
    Args:
        file_path: Absolute path to the log/trace file.
        key_column: The index (0-based) of the column containing the key/address.
        delimiter: Optional separator character. If None, it will auto-detect
                   commas, tabs, or default to arbitrary whitespace splitting.
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Trace file not found: {file_path}")

    with open(file_path, 'r', encoding='utf-8') as f:
        # Check first line to auto-detect delimiter if not provided
        first_line = f.readline()
        f.seek(0)
        
        if not first_line:
            return

        if delimiter is None:
            if ',' in first_line:
                delimiter = ','
            elif '\t' in first_line:
                delimiter = '\t'
            else:
                delimiter = None  # whitespace split

        for line_num, line in enumerate(f, 1):
            line = line.strip()
            # Ignore empty lines and comments
            if not line or line.startswith('#') or line.startswith('//'):
                continue
            
            if delimiter:
                parts = line.split(delimiter)
            else:
                parts = line.split()

            if not parts:
                continue

            if key_column < len(parts):
                yield parts[key_column].strip()
            else:
                # Fallback to the whole line if the column index is out of range
                yield line


class CacheSimulator:
    """Manages the simulation of cache policies on trace workloads."""
    def __init__(self, policies: Dict[str, BaseCache]):
        """
        Args:
            policies: A dictionary mapping policy name to BaseCache instance.
        """
        self.policies = policies
        self.total_requests = 0

    def run(self, keys: Iterable[str], report_interval: int = 100000):
        """
        Streams keys to all configured cache policies.
        
        Args:
            keys: An iterable stream of access keys.
            report_interval: Number of requests after which to print progress.
        """
        for key in keys:
            self.total_requests += 1
            for cache in self.policies.values():
                cache.access(key)
                
            if report_interval > 0 and self.total_requests % report_interval == 0:
                print(f"Processed {self.total_requests} requests...")

    def get_results(self) -> dict:
        """Returns the summary metrics for all ran policies."""
        return {
            name: {
                "capacity": cache.capacity,
                "total_requests": self.total_requests,
                "hits": cache.hits,
                "misses": cache.misses,
                "hit_rate": cache.hit_rate,
                "miss_rate": cache.miss_rate,
            }
            for name, cache in self.policies.items()
        }
