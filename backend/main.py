import sys
import argparse
from src.cache import FIFOCache, LRUCache, LFUCache, MRUCache
from src.simulator import CacheSimulator, parse_trace_file

def print_results_table(results: dict):
    """Prints simulation results in a clean ASCII table."""
    headers = [
        "Policy", 
        "Capacity", 
        "Total Req", 
        "Hits", 
        "Misses", 
        "Hit Rate", 
        "Miss Rate"
    ]
    
    # Define widths for table columns
    widths = [12, 10, 12, 10, 10, 12, 12]
    
    # Create the row template and separator
    row_fmt = " | ".join(f"{{:<{w}}}" for w in widths)
    row_fmt_right = " | ".join(
        f"{{:<{widths[0]}}}" if i == 0 else
        f"{{:>{widths[i]}}}" 
        for i in range(len(widths))
    )
    separator = "-+-".join("-" * w for w in widths)
    
    print("\n" + "=" * len(separator))
    print(" CACHE SIMULATION RESULTS SUMMARY")
    print("=" * len(separator))
    print(row_fmt.format(*headers))
    print(separator)
    
    for name, stats in results.items():
        hit_rate_pct = f"{stats['hit_rate'] * 100:.3f}%"
        miss_rate_pct = f"{stats['miss_rate'] * 100:.3f}%"
        
        row_values = [
            name,
            str(stats['capacity']),
            f"{stats['total_requests']:,}",
            f"{stats['hits']:,}",
            f"{stats['misses']:,}",
            hit_rate_pct,
            miss_rate_pct
        ]
        print(row_fmt_right.format(*row_values))
    print("=" * len(separator) + "\n")


def main():
    parser = argparse.ArgumentParser(
        description="Traditional Cache Simulator Benchmarking Suite (Phase 1)"
    )
    parser.add_argument(
        "--trace", 
        type=str, 
        required=True, 
        help="Path to the trace log file containing access patterns"
    )
    parser.add_argument(
        "--capacity", 
        type=int, 
        default=1000, 
        help="Cache capacity / size (default: 1000)"
    )
    parser.add_argument(
        "--policy", 
        type=str, 
        default="all", 
        choices=["fifo", "lru", "lfu", "mru", "all"],
        help="Eviction policy to simulate (default: all)"
    )
    parser.add_argument(
        "--col", 
        type=int, 
        default=0, 
        help="0-based index of the column containing the request key (default: 0)"
    )
    parser.add_argument(
        "--delim", 
        type=str, 
        default=None, 
        help="Separator character (auto-detected by default)"
    )
    parser.add_argument(
        "--report-interval", 
        type=int, 
        default=100000, 
        help="Report progress every N requests (default: 100000, 0 to disable)"
    )
    
    args = parser.parse_args()

    # Initialize cache instances based on user selection
    policies = {}
    
    def add_policy(name, cls):
        try:
            policies[name] = cls(args.capacity)
        except Exception as e:
            print(f"Error initializing policy {name}: {e}", file=sys.stderr)
            sys.exit(1)

    if args.policy == "all" or args.policy == "fifo":
        add_policy("FIFO", FIFOCache)
    if args.policy == "all" or args.policy == "lru":
        add_policy("LRU", LRUCache)
    if args.policy == "all" or args.policy == "lfu":
        add_policy("LFU", LFUCache)
    if args.policy == "all" or args.policy == "mru":
        add_policy("MRU", MRUCache)

    # Initialize simulator
    simulator = CacheSimulator(policies)

    print(f"Starting simulation on trace: {args.trace}")
    print(f"Cache Capacity: {args.capacity}")
    print(f"Simulating Policies: {', '.join(policies.keys())}")
    print("-" * 50)

    try:
        # Get stream of keys from the trace file
        keys_stream = parse_trace_file(
            file_path=args.trace, 
            key_column=args.col, 
            delimiter=args.delim
        )
        
        # Run simulation
        simulator.run(keys_stream, report_interval=args.report_interval)
        
        # Output results
        results = simulator.get_results()
        print_results_table(results)
        
    except FileNotFoundError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
    except PermissionError:
        print(f"Error: Permission denied accessing file: {args.trace}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"An unexpected error occurred during simulation: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
