#!/usr/bin/env python3

import sys
import json
import argparse
from optimized_timetable_optimizer import TimetableOptimizer

def main():
    parser = argparse.ArgumentParser(description='Optimize university timetable')
    parser.add_argument('input_file', help='JSON file containing modules and constraints')
    parser.add_argument('-o', '--output', help='Output file (default: stdout)')
    parser.add_argument('-v', '--verbose', action='store_true', help='Verbose output')
    parser.add_argument('--locations', default='./venues.json', help='Locations file path')
    
    args = parser.parse_args()
    
    try:
        with open(args.input_file, 'r') as f:
            data = json.load(f)
        
        modules = data.get('modules', {})
        constraints = data.get('constraints', {})
        
        if args.verbose:
            print(f"Loaded {len(modules)} modules", file=sys.stderr)
            print(f"Constraints: {constraints}", file=sys.stderr)
        
        optimizer = TimetableOptimizer(args.locations)
        
        if args.verbose:
            print("Starting optimization...", file=sys.stderr)
        
        result = optimizer.optimize_timetable(modules, constraints)
        
        if args.verbose:
            print("Optimization complete", file=sys.stderr)
        
        output_data = json.dumps(result, indent=2)
        
        if args.output:
            with open(args.output, 'w') as f:
                f.write(output_data)
            if args.verbose:
                print(f"Results written to {args.output}", file=sys.stderr)
        else:
            print(output_data)
            
    except FileNotFoundError as e:
        print(f"Error: File not found - {e}", file=sys.stderr)
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON in input file - {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()