#!/usr/bin/env python3

import sys
import json
import argparse
import traceback
from optimized_timetable_optimizer import TimetableOptimizer

def main():
    parser = argparse.ArgumentParser(description='Optimize university timetable')
    parser.add_argument('input_file', help='JSON file containing modules and constraints')
    parser.add_argument('-o', '--output', help='Output file (default: stdout)')
    parser.add_argument('-v', '--verbose', action='store_true', help='Verbose output')
    parser.add_argument('--locations', default='./venues.json', help='Locations file path')
    
    args = parser.parse_args()
    
    try:
        # Read input file
        try:
            with open(args.input_file, 'r') as f:
                data = json.load(f)
        except FileNotFoundError:
            print(f"Error: Input file {args.input_file} not found", file=sys.stderr)
            sys.exit(1)
        except json.JSONDecodeError as e:
            print(f"Error: Invalid JSON in input file - {e}", file=sys.stderr)
            sys.exit(1)
        
        # Extract modules and constraints
        modules = data.get('modules', {})
        constraints = data.get('constraints', {})
        
        if args.verbose:
            print(f"Loaded {len(modules)} modules", file=sys.stderr)
            print(f"Constraints: {constraints}", file=sys.stderr)
        
        # Validate input data
        if not modules:
            print("Error: No modules found in input data", file=sys.stderr)
            sys.exit(1)
        
        if not constraints:
            print("Error: No constraints found in input data", file=sys.stderr)
            sys.exit(1)
        
        # Initialize optimizer
        try:
            optimizer = TimetableOptimizer(args.locations)
        except Exception as e:
            print(f"Error initializing optimizer: {e}", file=sys.stderr)
            if args.verbose:
                traceback.print_exc(file=sys.stderr)
            sys.exit(1)
        
        if args.verbose:
            print("Starting optimization...", file=sys.stderr)
        
        # Run optimization
        try:
            result = optimizer.optimize_timetable(modules, constraints)
        except Exception as e:
            print(f"Error during optimization: {e}", file=sys.stderr)
            if args.verbose:
                traceback.print_exc(file=sys.stderr)
            sys.exit(1)
        
        if args.verbose:
            print("Optimization complete", file=sys.stderr)
        
        # Prepare output
        try:
            output_data = json.dumps(result, indent=2)
        except Exception as e:
            print(f"Error serializing result: {e}", file=sys.stderr)
            sys.exit(1)
        
        # Write output
        if args.output:
            try:
                with open(args.output, 'w') as f:
                    f.write(output_data)
                if args.verbose:
                    print(f"Results written to {args.output}", file=sys.stderr)
            except Exception as e:
                print(f"Error writing to output file: {e}", file=sys.stderr)
                sys.exit(1)
        else:
            # Output to stdout
            print(output_data)
            
    except KeyboardInterrupt:
        print("Optimization interrupted by user", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Unexpected error: {e}", file=sys.stderr)
        if args.verbose:
            traceback.print_exc(file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()