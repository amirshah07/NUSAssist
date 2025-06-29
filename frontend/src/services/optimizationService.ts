interface TimePreferenceData {
  [day: string]: {
    [time: string]: boolean;
  };
}

interface TimetableConstraints {
  preferredTimeSlots: TimePreferenceData;
}

interface SelectedModule {
  [moduleCode: string]: any;
}

interface OptimizedTimetable {
  [moduleCode: string]: {
    moduleCode: string;
    timetable: any[];
  };
}

export class OptimizationService {
  private static apiEndpoint = 'http://localhost:5001/api/optimize-timetable';

  static async optimizeTimetable(
    modules: SelectedModule,
    constraints: TimetableConstraints
  ): Promise<OptimizedTimetable> {
    try {
      const payload = {
        modules: JSON.parse(JSON.stringify(modules)),
        constraints: JSON.parse(JSON.stringify(constraints))
      };

      console.log('Sending optimization request to:', this.apiEndpoint);
      console.log('Payload:', payload);

      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errorText = '';
        try {
          errorText = await response.text();
          console.error('Backend response not OK:', response.status, errorText);
        } catch (e) {
          console.error('Failed to read error response:', e);
        }
        throw new Error(`Optimization failed: ${response.status} ${response.statusText}`);
      }

      const optimizedTimetable = await response.json();
      console.log('Backend optimization successful:', optimizedTimetable);

      return optimizedTimetable;
    } catch (error) {
      console.error('Error calling optimization service:', error);
      
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        console.warn('Backend server not reachable. Make sure server is running on port 5001');
      } else if (error instanceof Error && error.message.includes('500')) {
        console.error('Backend server error. Check server logs for details.');
      }
      
      console.log('Using fallback optimization...');
      return this.mockOptimize(modules, constraints);
    }
  }

  private static async mockOptimize(
    modules: SelectedModule,
    constraints: TimetableConstraints
  ): Promise<OptimizedTimetable> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const optimized: OptimizedTimetable = {};

        const getLessonPreferenceScore = (lesson: any): number => {
          const lessonDay = lesson.day;
          const lessonStartTime = lesson.startTime;
          const lessonEndTime = lesson.endTime;
          
          let overlapMinutes = 0;
          let totalLessonMinutes = this.parseTimeToMinutes(lessonEndTime) - this.parseTimeToMinutes(lessonStartTime);
          
          const startMinutes = this.parseTimeToMinutes(lessonStartTime);
          const endMinutes = this.parseTimeToMinutes(lessonEndTime);
          
          for (let currentMinutes = startMinutes; currentMinutes < endMinutes; currentMinutes += 60) {
            const timeSlot = this.minutesToTimeSlot(currentMinutes);
            if (constraints.preferredTimeSlots[lessonDay]?.[timeSlot]) {
              overlapMinutes += Math.min(60, endMinutes - currentMinutes);
            }
          }
          
          const preferencePercentage = totalLessonMinutes > 0 ? (overlapMinutes / totalLessonMinutes) * 100 : 0;
          
          let bonusScore = 0;
          const commonTimes = ['0800', '0900', '1000', '1100', '1400', '1500', '1600'];
          if (commonTimes.includes(lessonStartTime)) {
            bonusScore += 10;
          }
          
          return preferencePercentage + bonusScore;
        };

        const lessonsOverlap = (lesson1: any, lesson2: any): boolean => {
          if (lesson1.day !== lesson2.day) return false;

          const start1 = this.parseTimeToMinutes(lesson1.startTime);
          const end1 = this.parseTimeToMinutes(lesson1.endTime);
          const start2 = this.parseTimeToMinutes(lesson2.startTime);
          const end2 = this.parseTimeToMinutes(lesson2.endTime);

          return (start1 < end2 && start2 < end1);
        };

        const allLessonOptions: Array<{
          moduleCode: string;
          lessonType: string;
          lesson: any;
          preferenceScore: number;
        }> = [];

        Object.entries(modules).forEach(([moduleCode, moduleData]) => {
          if (!moduleData?.timetable) return;

          const lessonTypeGroups: { [key: string]: any[] } = {};
          
          moduleData.timetable.forEach((lesson: any) => {
            if (!lessonTypeGroups[lesson.lessonType]) {
              lessonTypeGroups[lesson.lessonType] = [];
            }
            lessonTypeGroups[lesson.lessonType].push(lesson);
          });

          Object.entries(lessonTypeGroups).forEach(([lessonType, lessons]) => {
            lessons.forEach(lesson => {
              allLessonOptions.push({
                moduleCode,
                lessonType,
                lesson: JSON.parse(JSON.stringify(lesson)),
                preferenceScore: getLessonPreferenceScore(lesson)
              });
            });
          });
        });

        const moduleTypeCombinations: { [key: string]: Array<{
          moduleCode: string;
          lessonType: string;
          lesson: any;
          preferenceScore: number;
        }> } = {};

        allLessonOptions.forEach(option => {
          const combinationKey = `${option.moduleCode}_${option.lessonType}`;
          if (!moduleTypeCombinations[combinationKey]) {
            moduleTypeCombinations[combinationKey] = [];
          }
          moduleTypeCombinations[combinationKey].push(option);
        });

        Object.values(moduleTypeCombinations).forEach(group => {
          group.sort((a, b) => b.preferenceScore - a.preferenceScore);
        });

        const selectedLessons: Array<{
          moduleCode: string;
          lessonType: string;
          lesson: any;
          preferenceScore: number;
        }> = [];

        const unassignedCombinations: string[] = [];

        const sortedCombinations = Object.entries(moduleTypeCombinations)
          .sort(([, optionsA], [, optionsB]) => optionsB[0].preferenceScore - optionsA[0].preferenceScore);

        sortedCombinations.forEach(([combinationKey, options]) => {
          let lessonSelected = false;
          
          for (const option of options) {
            const hasOverlap = selectedLessons.some(selected => 
              lessonsOverlap(selected.lesson, option.lesson)
            );

            if (!hasOverlap) {
              selectedLessons.push(option);
              lessonSelected = true;
              break;
            }
          }
          
          if (!lessonSelected) {
            unassignedCombinations.push(combinationKey);
          }
        });

        if (unassignedCombinations.length > 0) {
          console.warn(`Could not assign ${unassignedCombinations.length} combinations without overlaps`);
          console.warn('Attempting minimal overlap assignment...');

          unassignedCombinations.forEach(combinationKey => {
            const options = moduleTypeCombinations[combinationKey];
            if (options.length > 0) {
              let bestOption = options[0];
              let minOverlapCount = Number.MAX_SAFE_INTEGER;

              for (const option of options) {
                const overlapCount = selectedLessons.filter(selected => 
                  lessonsOverlap(selected.lesson, option.lesson)
                ).length;

                if (overlapCount < minOverlapCount || 
                    (overlapCount === minOverlapCount && option.preferenceScore > bestOption.preferenceScore)) {
                  bestOption = option;
                  minOverlapCount = overlapCount;
                }
              }

              console.warn(`Forced selection with ${minOverlapCount} overlaps for ${combinationKey}`);
              selectedLessons.push(bestOption);
            }
          });
        }

        Object.keys(modules).forEach(moduleCode => {
          const moduleLessons = selectedLessons
            .filter(item => item.moduleCode === moduleCode)
            .map(item => item.lesson);

          optimized[moduleCode] = {
            moduleCode,
            timetable: moduleLessons
          };
        });

        const totalPreferenceScore = selectedLessons.reduce((sum, lesson) => sum + lesson.preferenceScore, 0);
        const overlapCount = this.countOverlaps(selectedLessons.map(item => item.lesson));
        
        console.log(`Mock optimization completed:`);
        console.log(`- Total preference score: ${totalPreferenceScore}`);
        console.log(`- Number of overlapping lessons: ${overlapCount}`);
        console.log(`- Stage 1 assignments: ${selectedLessons.length - unassignedCombinations.length}`);
        console.log(`- Stage 2 assignments: ${unassignedCombinations.length}`);

        resolve(optimized);
      }, 1500);
    });
  }

  private static countOverlaps(lessons: any[]): number {
    let overlapCount = 0;
    for (let i = 0; i < lessons.length; i++) {
      for (let j = i + 1; j < lessons.length; j++) {
        const lesson1 = lessons[i];
        const lesson2 = lessons[j];
        
        if (lesson1.day === lesson2.day) {
          const start1 = this.parseTimeToMinutes(lesson1.startTime);
          const end1 = this.parseTimeToMinutes(lesson1.endTime);
          const start2 = this.parseTimeToMinutes(lesson2.startTime);
          const end2 = this.parseTimeToMinutes(lesson2.endTime);
          
          if (start1 < end2 && start2 < end1) {
            overlapCount++;
          }
        }
      }
    }
    return overlapCount;
  }

  private static parseTimeToMinutes(timeString: string): number {
    const hour = parseInt(timeString.substring(0, 2));
    const minute = parseInt(timeString.substring(2, 4));
    return hour * 60 + minute;
  }

  private static minutesToTimeSlot(minutes: number): string {
    const hour = Math.floor(minutes / 60);
    const minute = minutes % 60;
    return `${hour.toString().padStart(2, '0')}${minute.toString().padStart(2, '0')}`;
  }

  static validateConstraints(constraints: TimetableConstraints): boolean {
    if (!constraints) return false;
    
    if (!constraints.preferredTimeSlots || typeof constraints.preferredTimeSlots !== 'object') {
      return false;
    }

    const hasAnySelection = Object.values(constraints.preferredTimeSlots).some(daySlots =>
      Object.values(daySlots).some(isSelected => isSelected === true)
    );

    return hasAnySelection;
  }

  static canOptimize(modules: SelectedModule): boolean {
    if (!modules || Object.keys(modules).length === 0) {
      return false;
    }

    return Object.values(modules).every(moduleData => 
      moduleData?.timetable && Array.isArray(moduleData.timetable) && moduleData.timetable.length > 0
    );
  }

  static hasUsefulConstraints(constraints: TimetableConstraints): boolean {
    if (!this.validateConstraints(constraints)) return false;
    
    let selectedSlotCount = 0;
    Object.values(constraints.preferredTimeSlots).forEach(daySlots => {
      Object.values(daySlots).forEach(isSelected => {
        if (isSelected) selectedSlotCount++;
      });
    });
    
    const totalSlots = 5 * 13;
    return selectedSlotCount >= Math.max(5, totalSlots * 0.1);
  }
}