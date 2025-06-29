import json
import math
import sys
from typing import Dict, List, Any, Optional
from ortools.sat.python import cp_model

class TimetableOptimizer:
    def __init__(self, locations_file: str = './venues.json'):
        try:
            with open(locations_file, 'r') as f:
                self.locations = json.load(f)
            print(f"Loaded {len(self.locations)} venue locations from {locations_file}", file=sys.stderr)
        except FileNotFoundError:
            print(f"Warning: {locations_file} not found. Using default locations.", file=sys.stderr)
            self.locations = {}
        except Exception as e:
            print(f"Error loading venues file: {e}", file=sys.stderr)
            self.locations = {}
            
        self._distance_cache = {}
        self._precompute_distances()

    def _precompute_distances(self):
        if not self.locations:
            print("No venue data available, skipping distance computation", file=sys.stderr)
            return
            
        venues = list(self.locations.keys())
        print(f"Pre-computing distances for {len(venues)} venues...", file=sys.stderr)
        
        for i, venue1 in enumerate(venues):
            for j, venue2 in enumerate(venues):
                if i <= j:
                    if venue1 == venue2:
                        distance = 0
                    else:
                        try:
                            distance = self._get_venue_distance(venue1, venue2)
                        except Exception as e:
                            print(f"Error calculating distance between {venue1} and {venue2}: {e}", file=sys.stderr)
                            distance = 500
                    
                    self._distance_cache[(venue1, venue2)] = distance
                    self._distance_cache[(venue2, venue1)] = distance
        
        print(f"Distance matrix computed with {len(self._distance_cache)} entries", file=sys.stderr)

    def _get_venue_distance(self, venue1: str, venue2: str) -> float:
        if venue1 not in self.locations or venue2 not in self.locations:
            return 1000
            
        venue1_data = self.locations[venue1]
        venue2_data = self.locations[venue2]
        
        loc1 = None
        loc2 = None
        
        if 'location' in venue1_data:
            loc1 = venue1_data['location']
        elif 'coordinates' in venue1_data:
            loc1 = venue1_data['coordinates']
        elif 'x' in venue1_data and 'y' in venue1_data:
            loc1 = {'x': venue1_data['x'], 'y': venue1_data['y']}
        
        if 'location' in venue2_data:
            loc2 = venue2_data['location']
        elif 'coordinates' in venue2_data:
            loc2 = venue2_data['coordinates']
        elif 'x' in venue2_data and 'y' in venue2_data:
            loc2 = {'x': venue2_data['x'], 'y': venue2_data['y']}
        
        if not loc1 or not loc2:
            return 500
        
        try:
            lon1 = loc1.get('x', 0)
            lat1 = loc1.get('y', 0)
            lon2 = loc2.get('x', 0)
            lat2 = loc2.get('y', 0)
            
            return self._haversine_distance(lat1, lon1, lat2, lon2)
        except Exception as e:
            print(f"Error extracting coordinates: {e}", file=sys.stderr)
            return 500

    def calculate_distance(self, venue1: str, venue2: str) -> float:
        cache_key = (venue1, venue2)
        if cache_key in self._distance_cache:
            return self._distance_cache[cache_key]
        if venue1 not in self.locations or venue2 not in self.locations:
            return 1000
        if venue1 == venue2:
            return 0
        distance = self._get_venue_distance(venue1, venue2)
        self._distance_cache[(venue1, venue2)] = distance
        self._distance_cache[(venue2, venue1)] = distance
        return distance
    
    def _haversine_distance(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        try:
            R = 6371000
            lat1_rad = math.radians(float(lat1))
            lon1_rad = math.radians(float(lon1))
            lat2_rad = math.radians(float(lat2))
            lon2_rad = math.radians(float(lon2))
            dlat = lat2_rad - lat1_rad
            dlon = lon2_rad - lon1_rad
            a = (math.sin(dlat / 2) ** 2 + 
                 math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon / 2) ** 2)
            c = 2 * math.asin(math.sqrt(a))
            distance = R * c
            return distance
        except Exception as e:
            print(f"Error in haversine calculation: {e}", file=sys.stderr)
            return 500

    def time_to_minutes(self, time_str: str) -> int:
        """Convert time string to minutes with error handling"""
        try:
            if len(time_str) == 4:
                time_str = f"{time_str[:2]}:{time_str[2:]}"
            return int(time_str[:2]) * 60 + int(time_str[3:])
        except (ValueError, IndexError) as e:
            print(f"Error parsing time {time_str}: {e}", file=sys.stderr)
            return 0

    def minutes_to_time(self, minutes: int) -> str:
        """Convert minutes to time string"""
        try:
            return f"{minutes // 60:02d}:{minutes % 60:02d}"
        except Exception:
            return "00:00"

    def calculate_time_preference_penalty(self, lesson: Dict[str, Any], preferred_time_slots: Dict[str, Dict[str, bool]]) -> int:   
        # Calculate penalty for lessons that fall in blocked time slots.
        # Returns 0 for fully available time, higher values for blocked times.
        try:
            lesson_day = lesson.get("day", "")
            lesson_start_time = lesson.get("startTime", "0000")
            lesson_end_time = lesson.get("endTime", "0000")
            
            lesson_start = self.time_to_minutes(lesson_start_time)
            lesson_end = self.time_to_minutes(lesson_end_time)
            
            day_preferences = preferred_time_slots.get(lesson_day, {})
            
            blocked_minutes = 0
            total_lesson_minutes = lesson_end - lesson_start
            
            if total_lesson_minutes <= 0:
                return 1000  # Heavy penalty for invalid lessons
            current_time = lesson_start
            while current_time < lesson_end:
                hours = current_time // 60
                time_slot = f"{hours:02d}00"
                
                if not day_preferences.get(time_slot, True):  # Default to available if not specified
                    slot_end = current_time + 60
                    actual_blocked = min(slot_end, lesson_end) - current_time
                    blocked_minutes += actual_blocked
                
                current_time += 60
            
            # Calculate penalty percentage (0-100, higher is worse)
            penalty_percentage = (blocked_minutes / total_lesson_minutes) * 100
            return int(penalty_percentage)
            
        except Exception as e:
            print(f"Error calculating time penalty: {e}", file=sys.stderr)
            return 50  # Medium penalty for error cases

    def calculate_travel_time(self, lesson1: Dict[str, Any], lesson2: Dict[str, Any]) -> float:
        if lesson1["day"] != lesson2["day"]:
            return 0  # no travel needed on different days
        
        venue1 = lesson1.get("venue", "")
        venue2 = lesson2.get("venue", "")
        
        if venue1 == venue2:
            return 0  
        distance_meters = self.calculate_distance(venue1, venue2)
        walking_speed_mps = 1.4  # 1.4 m/s = ~5 km/h walking speed
        travel_time_minutes = (distance_meters / walking_speed_mps) / 60
        
        return travel_time_minutes + 2  # Add 2 minutes buffer

    def optimize_timetable(self, modules: Dict[str, Any], constraints: Dict[str, Any]) -> Dict[str, Any]:
        try:
            model = cp_model.CpModel()
            
            preferred_time_slots = constraints.get("preferredTimeSlots", {})
            
            all_lessons = []
            for module_code, data in modules.items():
                if 'timetable' not in data or not data['timetable']:
                    continue
                    
                for lesson in data["timetable"]:
                    lesson_copy = lesson.copy()
                    lesson_copy["moduleCode"] = module_code
                    all_lessons.append(lesson_copy)
            
            if not all_lessons:
                print("No lessons found in modules", file=sys.stderr)
                return modules
            
            print(f"Processing {len(all_lessons)} total lessons", file=sys.stderr)
            lesson_vars = {}
            for i, lesson in enumerate(all_lessons):
                lesson_id = f"{lesson['moduleCode']}_{lesson['lessonType']}_{lesson['classNo']}_{i}"
                lesson_vars[lesson_id] = model.NewBoolVar(lesson_id)
            
            # CONSTRAINT 1: Exactly one lesson per module per lesson type (HARD)
            for module_code, data in modules.items():
                if 'timetable' not in data or not data['timetable']:
                    continue
                    
                lesson_types = set()
                for lesson in data["timetable"]:
                    lesson_types.add(lesson["lessonType"])
                
                for lesson_type in lesson_types:
                    lesson_options = []
                    for i, lesson in enumerate(all_lessons):
                        if (lesson["moduleCode"] == module_code and 
                            lesson["lessonType"] == lesson_type):
                            lesson_id = f"{lesson['moduleCode']}_{lesson['lessonType']}_{lesson['classNo']}_{i}"
                            lesson_options.append(lesson_vars[lesson_id])
                    
                    if lesson_options:
                        model.AddExactlyOne(lesson_options)
            
            # CONSTRAINT 2: No time overlaps (HARD)
            overlapping_pairs = []
            for i, lesson1 in enumerate(all_lessons):
                for j, lesson2 in enumerate(all_lessons):
                    if i >= j or lesson1["day"] != lesson2["day"]:
                        continue
                    
                    start1 = self.time_to_minutes(lesson1["startTime"])
                    end1 = self.time_to_minutes(lesson1["endTime"])
                    start2 = self.time_to_minutes(lesson2["startTime"])
                    end2 = self.time_to_minutes(lesson2["endTime"])
                    
                    if (start1 < end2 and start2 < end1):
                        lesson1_id = f"{lesson1['moduleCode']}_{lesson1['lessonType']}_{lesson1['classNo']}_{i}"
                        lesson2_id = f"{lesson2['moduleCode']}_{lesson2['lessonType']}_{lesson2['classNo']}_{j}"
                        overlapping_pairs.append((lesson1_id, lesson2_id))
            
            print(f"Found {len(overlapping_pairs)} overlapping pairs", file=sys.stderr)
            
            for lesson1_id, lesson2_id in overlapping_pairs:
                model.Add(lesson_vars[lesson1_id] + lesson_vars[lesson2_id] <= 1)
            
            # CONSTRAINT 3: Travel time constraints (SOFT via objective)
            travel_penalty_pairs = []
            for i, lesson1 in enumerate(all_lessons):
                for j, lesson2 in enumerate(all_lessons):
                    if i >= j or lesson1["day"] != lesson2["day"]:
                        continue
                    
                    start1 = self.time_to_minutes(lesson1["startTime"])
                    end1 = self.time_to_minutes(lesson1["endTime"])
                    start2 = self.time_to_minutes(lesson2["startTime"])
                    end2 = self.time_to_minutes(lesson2["endTime"])
                    
                    # Check if lessons are back-to-back and require travel
                    time_gap = start2 - end1
                    if 0 <= time_gap <= 30:  # Up to 30 minutes gap
                        travel_time = self.calculate_travel_time(lesson1, lesson2)
                        if travel_time > time_gap:
                            lesson1_id = f"{lesson1['moduleCode']}_{lesson1['lessonType']}_{lesson1['classNo']}_{i}"
                            lesson2_id = f"{lesson2['moduleCode']}_{lesson2['lessonType']}_{lesson2['classNo']}_{j}"
                            penalty = int((travel_time - time_gap) * 10)  # Scale penalty
                            travel_penalty_pairs.append((lesson1_id, lesson2_id, penalty))
            
            print(f"Found {len(travel_penalty_pairs)} potential travel issues", file=sys.stderr)
            
            # OBJECTIVE: Minimize time preference violations (PRIMARY)
            objective_terms = []
            
            # 1. TIME PREFERENCE PENALTIES (HIGHEST PRIORITY)
            time_preference_weight = 10000  # Very high weight
            for i, lesson in enumerate(all_lessons):
                lesson_id = f"{lesson['moduleCode']}_{lesson['lessonType']}_{lesson['classNo']}_{i}"
                time_penalty = self.calculate_time_preference_penalty(lesson, preferred_time_slots)
                
                if time_penalty > 0:
                    # Minimize penalty (subtract from objective)
                    objective_terms.append(lesson_vars[lesson_id] * (-time_penalty * time_preference_weight))
            
            # 2. TRAVEL TIME PENALTIES (MEDIUM PRIORITY)
            travel_weight = 100
            for lesson1_id, lesson2_id, penalty in travel_penalty_pairs:
                # Create variable for when both lessons are selected
                both_selected = model.NewBoolVar(f"travel_{lesson1_id}_{lesson2_id}")
                model.Add(both_selected >= lesson_vars[lesson1_id] + lesson_vars[lesson2_id] - 1)
                objective_terms.append(both_selected * (-penalty * travel_weight))
            
            # 3. PREFERENCE FOR COMMON TIME SLOTS (LOW PRIORITY)
            common_time_weight = 10
            common_start_times = [480, 540, 600, 660, 840, 900, 960, 1020]  # 8AM, 9AM, 10AM, 11AM, 2PM, 3PM, 4PM, 5PM
            for i, lesson in enumerate(all_lessons):
                lesson_id = f"{lesson['moduleCode']}_{lesson['lessonType']}_{lesson['classNo']}_{i}"
                start_time = self.time_to_minutes(lesson["startTime"])
                
                if start_time in common_start_times:
                    objective_terms.append(lesson_vars[lesson_id] * common_time_weight)
            
            # 4. MINIMIZE GAPS BETWEEN CLASSES (LOW PRIORITY)
            gap_weight = 5
            daily_lessons = {}
            for i, lesson in enumerate(all_lessons):
                day = lesson["day"]
                if day not in daily_lessons:
                    daily_lessons[day] = []
                lesson_id = f"{lesson['moduleCode']}_{lesson['lessonType']}_{lesson['classNo']}_{i}"
                daily_lessons[day].append((lesson_id, self.time_to_minutes(lesson["startTime"])))
            
            # Bonus for consecutive lessons
            for day, day_lessons in daily_lessons.items():
                day_lessons.sort(key=lambda x: x[1])  # Sort by start time
                for i in range(len(day_lessons) - 1):
                    lesson1_id, time1 = day_lessons[i]
                    lesson2_id, time2 = day_lessons[i + 1]
                    
                    # If lessons are 1-2 hours apart, give small bonus
                    time_diff = time2 - time1
                    if 60 <= time_diff <= 120:
                        consecutive_var = model.NewBoolVar(f"consecutive_{lesson1_id}_{lesson2_id}")
                        model.Add(consecutive_var >= lesson_vars[lesson1_id] + lesson_vars[lesson2_id] - 1)
                        objective_terms.append(consecutive_var * gap_weight)
            
            # Set objective to maximize (minimize negative penalties)
            if objective_terms:
                model.Maximize(sum(objective_terms))
            
            # Solve with increased time limit for better solutions
            solver = cp_model.CpSolver()
            solver.parameters.max_time_in_seconds = 120.0  # 2 minutes
            solver.parameters.num_search_workers = 4  # Use multiple threads
            status = solver.Solve(model)
            
            # Extract solution
            optimized_modules = {}
            if status in [cp_model.OPTIMAL, cp_model.FEASIBLE]:
                total_time_penalty = 0
                total_travel_penalty = 0
                selected_lessons_count = 0
                
                for module_code, data in modules.items():
                    if 'timetable' not in data or not data['timetable']:
                        optimized_modules[module_code] = data
                        continue
                        
                    optimized_modules[module_code] = {
                        "moduleCode": module_code,
                        "timetable": []
                    }
                    
                    for i, lesson in enumerate(all_lessons):
                        if lesson["moduleCode"] != module_code:
                            continue
                            
                        lesson_id = f"{lesson['moduleCode']}_{lesson['lessonType']}_{lesson['classNo']}_{i}"
                        if lesson_id in lesson_vars and solver.Value(lesson_vars[lesson_id]):
                            clean_lesson = {k: v for k, v in lesson.items() if k != "moduleCode"}
                            optimized_modules[module_code]["timetable"].append(clean_lesson)
                            
                            # Calculate statistics
                            time_penalty = self.calculate_time_preference_penalty(lesson, preferred_time_slots)
                            total_time_penalty += time_penalty
                            selected_lessons_count += 1
                
                # Calculate travel penalties for selected lessons
                for lesson1_id, lesson2_id, penalty in travel_penalty_pairs:
                    if (lesson1_id in lesson_vars and lesson2_id in lesson_vars and 
                        solver.Value(lesson_vars[lesson1_id]) and solver.Value(lesson_vars[lesson2_id])):
                        total_travel_penalty += penalty
                
                avg_time_penalty = total_time_penalty / selected_lessons_count if selected_lessons_count > 0 else 0
                
                print(f"Optimization complete: {selected_lessons_count} lessons selected", file=sys.stderr)
                print(f"Average time preference penalty: {avg_time_penalty:.1f}% (lower is better)", file=sys.stderr)
                print(f"Total travel penalty: {total_travel_penalty}", file=sys.stderr)
                print(f"Solution status: {'OPTIMAL' if status == cp_model.OPTIMAL else 'FEASIBLE'}", file=sys.stderr)
                
            else:
                print(f"Optimization failed with status: {status}", file=sys.stderr)
                return modules
            
            return optimized_modules
            
        except Exception as e:
            print(f"Error in optimize_timetable: {e}", file=sys.stderr)
            import traceback
            traceback.print_exc(file=sys.stderr)
            return modules

