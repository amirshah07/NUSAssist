import { supabase } from '../lib/supabaseClient';

interface TimePreferenceData {
  [day: string]: { [time: string]: boolean };
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
  private static apiEndpoint = import.meta.env.VITE_API_URL 
    ? `${import.meta.env.VITE_API_URL}/api/optimize-timetable`
    : import.meta.env.PROD 
      ? 'https://nusassist-backend-144873295069.us-central1.run.app/api/optimize-timetable'
      : 'http://localhost:8080/api/optimize-timetable';

  static async optimizeTimetable(
    currentModules: SelectedModule,
    constraints: { preferredTimeSlots: TimePreferenceData },
    semester: "sem1" | "sem2" = "sem1"
  ): Promise<OptimizedTimetable> {
    const moduleCodes = Object.keys(currentModules);
    if (!moduleCodes.length) throw new Error('No modules to optimize');

    try {
      const { data } = await supabase
        .from(semester)
        .select('moduleCode, semesterData')
        .in('moduleCode', moduleCodes);

      const freshModules: SelectedModule = {};
      data?.forEach(module => {
        if (module.semesterData) {
          freshModules[module.moduleCode] = module.semesterData;
        }
      });

      moduleCodes.forEach(code => {
        if (!freshModules[code] && currentModules[code]) {
          freshModules[code] = currentModules[code];
        }
      });

      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modules: freshModules, constraints }),
      });

      if (!response.ok) throw new Error(`Backend optimization failed: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.warn('Backend optimization failed, using fallback:', error);
      return this.fallbackOptimize(currentModules, constraints.preferredTimeSlots);
    }
  }

  private static fallbackOptimize(
    modules: SelectedModule,
    preferredTimeSlots: TimePreferenceData
  ): Promise<OptimizedTimetable> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const optimized: OptimizedTimetable = {};

        const getLessonScore = (lesson: any): number => {
          const { day, startTime, endTime } = lesson;
          const totalMinutes = this.toMinutes(endTime) - this.toMinutes(startTime);
          let overlapMinutes = 0;
          
          for (let mins = this.toMinutes(startTime); mins < this.toMinutes(endTime); mins += 60) {
            const slot = `${Math.floor(mins / 60).toString().padStart(2, '0')}00`;
            if (preferredTimeSlots[day]?.[slot]) {
              overlapMinutes += Math.min(60, this.toMinutes(endTime) - mins);
            }
          }
          
          const commonTimes = ['0800', '0900', '1000', '1100', '1400', '1500', '1600'];
          const bonus = commonTimes.includes(startTime) ? 10 : 0;
          return (overlapMinutes / totalMinutes) * 100 + bonus;
        };

        const hasOverlap = (lessons1: any[], lessons2: any[]): boolean => {
          return lessons1.some(l1 => 
            lessons2.some(l2 => 
              l1.day === l2.day && 
              this.toMinutes(l1.startTime) < this.toMinutes(l2.endTime) && 
              this.toMinutes(l2.startTime) < this.toMinutes(l1.endTime)
            )
          );
        };

        const allClassGroups: any[] = [];
        Object.entries(modules).forEach(([moduleCode, moduleData]) => {
          if (!moduleData?.timetable) return;

          const classGroups: { [key: string]: any[] } = {};
          moduleData.timetable.forEach((lesson: any) => {
            const key = `${lesson.lessonType}_${lesson.classNo}`;
            (classGroups[key] = classGroups[key] || []).push(lesson);
          });

          Object.entries(classGroups).forEach(([classKey, lessons]) => {
            const [lessonType, classNo] = classKey.split('_');
            allClassGroups.push({
              moduleCode,
              lessonType,
              classNo,
              lessons,
              score: lessons.reduce((sum, l) => sum + getLessonScore(l), 0) / lessons.length
            });
          });
        });

        allClassGroups.sort((a, b) => b.score - a.score);

        const selected: typeof allClassGroups = [];
        const moduleTypeCombos: { [key: string]: typeof allClassGroups } = {};
        
        allClassGroups.forEach(group => {
          const key = `${group.moduleCode}_${group.lessonType}`;
          (moduleTypeCombos[key] = moduleTypeCombos[key] || []).push(group);
        });

        Object.values(moduleTypeCombos).forEach(groups => {
          const bestGroup = groups.find(g => !selected.some(s => hasOverlap(s.lessons, g.lessons))) || groups[0];
          if (bestGroup) selected.push(bestGroup);
        });

        Object.keys(modules).forEach(moduleCode => {
          const moduleClasses = selected.filter(g => g.moduleCode === moduleCode);
          optimized[moduleCode] = {
            moduleCode,
            timetable: moduleClasses.flatMap(g => g.lessons)
          };
        });

        resolve(optimized);
      }, 1500);
    });
  }

  private static toMinutes(time: string): number {
    const hour = parseInt(time.substring(0, 2));
    const minute = parseInt(time.substring(2, 4));
    return hour * 60 + minute;
  }

  static canOptimize(modules: SelectedModule): boolean {
    return Object.keys(modules).length > 0 && 
           Object.values(modules).every(m => m?.timetable?.length > 0);
  }
}