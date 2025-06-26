import json
import math
from typing import Dict, List, Any, Optional
from ortools.sat.python import cp_model

class TimetableOptimizer:
    def __init__(self, locations_file: str = './venues.json'):
        try:
            with open(locations_file, 'r') as f:
                self.locations = json.load(f)
            print(f"Loaded {len(self.locations)} venue locations from {locations_file}")
        except FileNotFoundError:
            print(f"Warning: {locations_file} not found. Using default locations.")
            self.locations = {}
            
        self._distance_cache = {}
        self._precompute_distances()

    def _precompute_distances(self):
        venues = list(self.locations.keys())
        print(f"Pre-computing distances for {len(venues)} venues...")
        
        for i, venue1 in enumerate(venues):
            for j, venue2 in enumerate(venues):
                if i <= j:
                    if venue1 == venue2:
                        distance = 0
                    else:
                        loc1 = self.locations[venue1]["location"]
                        loc2 = self.locations[venue2]["location"]
                        distance = self._haversine_distance(
                            loc1["y"], loc1["x"], loc2["y"], loc2["x"]
                        )
                    
                    self._distance_cache[(venue1, venue2)] = distance
                    self._distance_cache[(venue2, venue1)] = distance
        
        print(f"Distance matrix computed with {len(self._distance_cache)} entries")

    def calculate_distance(self, venue1: str, venue2: str) -> float:
        cache_key = (venue1, venue2)
        if cache_key in self._distance_cache:
            return self._distance_cache[cache_key]
        
        if venue1 not in self.locations or venue2 not in self.locations:
            print(f"Warning: Unknown venue(s): {venue1}, {venue2}")
            return 1000
        
        if venue1 == venue2:
            return 0
        
        loc1 = self.locations[venue1]["location"]
        loc2 = self.locations[venue2]["location"]
        
        lon1, lat1 = loc1["x"], loc1["y"]
        lon2, lat2 = loc2["x"], loc2["y"]
        
        distance = self._haversine_distance(lat1, lon1, lat2, lon2)
        
        self._distance_cache[(venue1, venue2)] = distance
        self._distance_cache[(venue2, venue1)] = distance
        
        return distance
    
    def _haversine_distance(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        R = 6371000
        
        lat1_rad = math.radians(lat1)
        lon1_rad = math.radians(lon1)
        lat2_rad = math.radians(lat2)
        lon2_rad = math.radians(lon2)
        
        dlat = lat2_rad - lat1_rad
        dlon = lon2_rad - lon1_rad
        
        a = (math.sin(dlat / 2) ** 2 + 
             math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon / 2) ** 2)
        c = 2 * math.asin(math.sqrt(a))
        
        distance = R * c
        return distance

    def time_to_minutes(self, time_str: str) -> int:
        if len(time_str) == 4:
            time_str = f"{time_str[:2]}:{time_str[2:]}"
        return int(time_str[:2]) * 60 + int(time_str[3:])

    def minutes_to_time(self, minutes: int) -> str:
        return f"{minutes // 60:02d}:{minutes % 60:02d}"

    def calculate_lesson_preference_score(self, lesson: Dict[str, Any], preferred_time_slots: Dict[str, Dict[str, bool]]) -> int:
        """Calculate how well a lesson fits into the user's preferred time slots (now 1-hour blocks)."""
        lesson_day = lesson["day"]
        lesson_start = self.time_to_minutes(lesson["startTime"])
        lesson_end = self.time_to_minutes(lesson["endTime"])
        
        # Get the day preferences, default to empty if day not found
        day_preferences = preferred_time_slots.get(lesson_day, {})
        
        # Check overlap with preferred time slots (1-hour intervals)
        overlap_minutes = 0
        total_lesson_minutes = lesson_end - lesson_start
        
        # Check each hour during the lesson
        current_time = lesson_start
        while current_time < lesson_end:
            # Convert current time to time slot string (HHMM format, only hours)
            hours = current_time // 60
            time_slot = f"{hours:02d}00"
            
            # Check if this time slot is preferred
            if day_preferences.get(time_slot, False):
                # Calculate overlap for this 1-hour slot
                slot_end = current_time + 60
                actual_overlap = min(slot_end, lesson_end) - current_time
                overlap_minutes += actual_overlap
            
            current_time += 60
        
        # Calculate preference percentage (0-100)
        if total_lesson_minutes > 0:
            preference_percentage = (overlap_minutes / total_lesson_minutes) * 100
        else:
            preference_percentage = 0
            
        return int(preference_percentage)

    def optimize_timetable(self, modules: Dict[str, Any], constraints: Dict[str, Any]) -> Dict[str, Any]:
        model = cp_model.CpModel()
        
        # Extract preferred time slots from constraints
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
            return modules
        
        # Create decision variables for each lesson
        lesson_vars = {}
        for i, lesson in enumerate(all_lessons):
            lesson_id = f"{lesson['moduleCode']}_{lesson['lessonType']}_{lesson['classNo']}_{i}"
            lesson_vars[lesson_id] = model.NewBoolVar(lesson_id)
        
        # Hard constraint: exactly one lesson per module per lesson type
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
        
        # Collect overlap and proximity constraints
        overlapping_pairs = []
        proximity_constraints = []
        
        for i, lesson1 in enumerate(all_lessons):
            for j, lesson2 in enumerate(all_lessons):
                if i >= j or lesson1["day"] != lesson2["day"]:
                    continue
                
                lesson1_id = f"{lesson1['moduleCode']}_{lesson1['lessonType']}_{lesson1['classNo']}_{i}"
                lesson2_id = f"{lesson2['moduleCode']}_{lesson2['lessonType']}_{lesson2['classNo']}_{j}"
                
                start1 = self.time_to_minutes(lesson1["startTime"])
                end1 = self.time_to_minutes(lesson1["endTime"])
                start2 = self.time_to_minutes(lesson2["startTime"])
                end2 = self.time_to_minutes(lesson2["endTime"])
                
                # Check for time overlap
                if (start1 < end2 and start2 < end1):
                    overlapping_pairs.append((lesson1_id, lesson2_id))
                else:
                    # Check proximity constraints for back-to-back classes
                    distance_meters = self.calculate_distance(lesson1["venue"], lesson2["venue"])
                    walking_speed_per_minute = 83.33  # meters per minute (5 km/h)
                    travel_time_minutes = distance_meters / walking_speed_per_minute
                    buffer_time = 2  # minutes
                    total_travel_time = travel_time_minutes + buffer_time
                    
                    time_gap = start2 - end1
                    max_walking_time = 10  # minutes
                    
                    # If classes are consecutive but impossible to reach in time
                    if 0 < time_gap < total_travel_time and total_travel_time > max_walking_time:
                        proximity_constraints.append((lesson1_id, lesson2_id))
        
        print(f"Found {len(overlapping_pairs)} overlapping pairs and {len(proximity_constraints)} proximity constraints")
        
        # Strategy 1: Try to find non-overlapping solution with maximum preferences
        print("Strategy 1: Attempting non-overlapping solution with maximum preferences...")
        
        # Add no-overlap constraints
        for lesson1_id, lesson2_id in overlapping_pairs:
            model.Add(lesson_vars[lesson1_id] + lesson_vars[lesson2_id] <= 1)
        
        # Add proximity constraints
        for lesson1_id, lesson2_id in proximity_constraints:
            model.Add(lesson_vars[lesson1_id] + lesson_vars[lesson2_id] <= 1)
        
        # Create objective: maximize preference scores
        objective_terms = []
        
        # Primary objective: maximize lessons in preferred time slots (high weight)
        for i, lesson in enumerate(all_lessons):
            lesson_id = f"{lesson['moduleCode']}_{lesson['lessonType']}_{lesson['classNo']}_{i}"
            preference_score = self.calculate_lesson_preference_score(lesson, preferred_time_slots)
            
            if preference_score > 0:
                # Give very high weight to preference scores
                objective_terms.append(lesson_vars[lesson_id] * preference_score * 100)
        
        # Secondary objectives with lower weights
        common_start_times = [420, 480, 540, 600, 660, 840, 900, 960, 1020]  # Common class times
        for i, lesson in enumerate(all_lessons):
            lesson_id = f"{lesson['moduleCode']}_{lesson['lessonType']}_{lesson['classNo']}_{i}"
            start_time = self.time_to_minutes(lesson["startTime"])
            
            if start_time in common_start_times:
                objective_terms.append(lesson_vars[lesson_id] * 10)
        
        # Set the objective
        if objective_terms:
            model.Maximize(sum(objective_terms))
        
        # Try to solve the model
        solver = cp_model.CpSolver()
        solver.parameters.max_time_in_seconds = 30.0
        status = solver.Solve(model)
        
        # Strategy 2: If no solution found, try with relaxed proximity constraints
        if status not in [cp_model.OPTIMAL, cp_model.FEASIBLE]:
            print("Strategy 2: Relaxing proximity constraints, keeping no-overlap...")
            
            # Create new model with only overlap constraints
            model2 = cp_model.CpModel()
            lesson_vars2 = {}
            for i, lesson in enumerate(all_lessons):
                lesson_id = f"{lesson['moduleCode']}_{lesson['lessonType']}_{lesson['classNo']}_{i}"
                lesson_vars2[lesson_id] = model2.NewBoolVar(lesson_id)
            
            # Add mandatory constraints (one per module-type)
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
                            lesson_options.append(lesson_vars2[lesson_id])
                    
                    if lesson_options:
                        model2.AddExactlyOne(lesson_options)
            
            # Add only overlap constraints
            for lesson1_id, lesson2_id in overlapping_pairs:
                model2.Add(lesson_vars2[lesson1_id] + lesson_vars2[lesson2_id] <= 1)
            
            # Same objective with preference focus
            objective_terms2 = []
            for i, lesson in enumerate(all_lessons):
                lesson_id = f"{lesson['moduleCode']}_{lesson['lessonType']}_{lesson['classNo']}_{i}"
                preference_score = self.calculate_lesson_preference_score(lesson, preferred_time_slots)
                
                if preference_score > 0:
                    objective_terms2.append(lesson_vars2[lesson_id] * preference_score * 100)
            
            for i, lesson in enumerate(all_lessons):
                lesson_id = f"{lesson['moduleCode']}_{lesson['lessonType']}_{lesson['classNo']}_{i}"
                start_time = self.time_to_minutes(lesson["startTime"])
                
                if start_time in common_start_times:
                    objective_terms2.append(lesson_vars2[lesson_id] * 10)
            
            if objective_terms2:
                model2.Maximize(sum(objective_terms2))
            
            status = solver.Solve(model2)
            lesson_vars = lesson_vars2
            
            if status in [cp_model.OPTIMAL, cp_model.FEASIBLE]:
                print("Found solution without proximity constraints")
        
        # Strategy 3: Last resort - allow minimal overlaps with heavy penalties
        if status not in [cp_model.OPTIMAL, cp_model.FEASIBLE]:
            print("Strategy 3: Allowing minimal overlaps as last resort...")
            
            model3 = cp_model.CpModel()
            lesson_vars3 = {}
            for i, lesson in enumerate(all_lessons):
                lesson_id = f"{lesson['moduleCode']}_{lesson['lessonType']}_{lesson['classNo']}_{i}"
                lesson_vars3[lesson_id] = model3.NewBoolVar(lesson_id)
            
            # Add mandatory constraints (one per module-type)
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
                            lesson_options.append(lesson_vars3[lesson_id])
                    
                    if lesson_options:
                        model3.AddExactlyOne(lesson_options)
            
            # Create penalty variables for overlaps
            overlap_penalty_vars = []
            for lesson1_id, lesson2_id in overlapping_pairs:
                overlap_var = model3.NewBoolVar(f"overlap_{lesson1_id}_{lesson2_id}")
                model3.Add(overlap_var >= lesson_vars3[lesson1_id] + lesson_vars3[lesson2_id] - 1)
                overlap_penalty_vars.append(overlap_var)
            
            # Objective: maximize preferences while heavily penalizing overlaps
            objective_terms3 = []
            
            # Preference terms (high weight)
            for i, lesson in enumerate(all_lessons):
                lesson_id = f"{lesson['moduleCode']}_{lesson['lessonType']}_{lesson['classNo']}_{i}"
                preference_score = self.calculate_lesson_preference_score(lesson, preferred_time_slots)
                
                if preference_score > 0:
                    objective_terms3.append(lesson_vars3[lesson_id] * preference_score * 50)
            
            # Heavily penalize overlaps
            for overlap_var in overlap_penalty_vars:
                objective_terms3.append(overlap_var * (-10000))
            
            # Common times bonus (low weight)
            for i, lesson in enumerate(all_lessons):
                lesson_id = f"{lesson['moduleCode']}_{lesson['lessonType']}_{lesson['classNo']}_{i}"
                start_time = self.time_to_minutes(lesson["startTime"])
                
                if start_time in common_start_times:
                    objective_terms3.append(lesson_vars3[lesson_id] * 5)
            
            if objective_terms3:
                model3.Maximize(sum(objective_terms3))
            
            status = solver.Solve(model3)
            lesson_vars = lesson_vars3
            
            if status in [cp_model.OPTIMAL, cp_model.FEASIBLE]:
                print("Found solution with minimal overlaps")
            else:
                print("No solution found even with overlaps allowed")
        else:
            print("Found non-overlapping solution with preferences optimized")
        
        # Extract the solution
        optimized_modules = {}
        if status in [cp_model.OPTIMAL, cp_model.FEASIBLE]:
            total_preference_score = 0
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
                        preference_score = self.calculate_lesson_preference_score(lesson, preferred_time_slots)
                        total_preference_score += preference_score
                        selected_lessons_count += 1
            
            # Print optimization results
            avg_preference_score = total_preference_score / selected_lessons_count if selected_lessons_count > 0 else 0
            print(f"Optimization complete: {selected_lessons_count} lessons selected")
            print(f"Average preference score: {avg_preference_score:.1f}%")
            
        else:
            print(f"Optimization failed with status: {status}")
            return modules
        
        return optimized_modules

def main():
    sample_modules = {
        "CS2103T": {
            "timetable": [
                {
                    "lessonType": "Lecture",
                    "classNo": "1",
                    "day": "Friday",
                    "startTime": "1400",
                    "endTime": "1600",
                    "venue": "LT17"
                },
                {
                    "lessonType": "Tutorial",
                    "classNo": "T01",
                    "day": "Wednesday",
                    "startTime": "0900",
                    "endTime": "1000",
                    "venue": "COM1-0201"
                }
            ]
        }
    }
    
    sample_constraints = {
        "preferredTimeSlots": {
            "Monday": {"0900": True, "1000": True, "1100": True},
            "Wednesday": {"0900": True, "1000": True},
            "Friday": {"1400": True, "1500": True}
        }
    }
    
    optimizer = TimetableOptimizer()
    result = optimizer.optimize_timetable(sample_modules, sample_constraints)
    print(json.dumps(result, indent=2))

if __name__ == "__main__":
    main()