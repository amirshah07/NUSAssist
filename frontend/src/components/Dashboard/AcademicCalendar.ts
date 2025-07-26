// When new academic year starts:
// 1. Update all dates in ACADEMIC_YEAR below
// 2. Update NEXT_AY_START constant

export interface WeekInfo {
  start: Date;
  end: Date;
  type: 'orientation' | 'regular' | 'recess' | 'reading' | 'exam';
}

export interface SemesterData {
  start: Date;
  end: Date;
  weeks: Map<string, WeekInfo>;
}

export interface AcademicYear {
  semester1: SemesterData;
  semester2: SemesterData;
  vacation: {
    winter: { start: Date; end: Date };
    summer: { start: Date; end: Date };
  };
}

// To update for new academic year, edit the dates below
export const ACADEMIC_YEAR: AcademicYear = {
  semester1: {
    start: new Date('2025-08-04'),
    end: new Date('2025-12-06'),
    weeks: new Map([
      ['0', { start: new Date('2025-08-04'), end: new Date('2025-08-10'), type: 'orientation' }],
      ['1', { start: new Date('2025-08-11'), end: new Date('2025-08-17'), type: 'regular' }],
      ['2', { start: new Date('2025-08-18'), end: new Date('2025-08-24'), type: 'regular' }],
      ['3', { start: new Date('2025-08-25'), end: new Date('2025-08-31'), type: 'regular' }],
      ['4', { start: new Date('2025-09-01'), end: new Date('2025-09-07'), type: 'regular' }],
      ['5', { start: new Date('2025-09-08'), end: new Date('2025-09-14'), type: 'regular' }],
      ['6', { start: new Date('2025-09-15'), end: new Date('2025-09-19'), type: 'regular' }],
      ['recess', { start: new Date('2025-09-20'), end: new Date('2025-09-28'), type: 'recess' }],
      ['7', { start: new Date('2025-09-29'), end: new Date('2025-10-05'), type: 'regular' }],
      ['8', { start: new Date('2025-10-06'), end: new Date('2025-10-12'), type: 'regular' }],
      ['9', { start: new Date('2025-10-13'), end: new Date('2025-10-19'), type: 'regular' }],
      ['10', { start: new Date('2025-10-20'), end: new Date('2025-10-26'), type: 'regular' }],
      ['11', { start: new Date('2025-10-27'), end: new Date('2025-11-02'), type: 'regular' }],
      ['12', { start: new Date('2025-11-03'), end: new Date('2025-11-09'), type: 'regular' }],
      ['13', { start: new Date('2025-11-10'), end: new Date('2025-11-14'), type: 'regular' }],
      ['reading', { start: new Date('2025-11-15'), end: new Date('2025-11-21'), type: 'reading' }],
      ['exam', { start: new Date('2025-11-22'), end: new Date('2025-12-06'), type: 'exam' }],
    ])
  },
  semester2: {
    start: new Date('2026-01-12'),
    end: new Date('2026-05-09'),
    weeks: new Map([
      ['1', { start: new Date('2026-01-12'), end: new Date('2026-01-18'), type: 'regular' }],
      ['2', { start: new Date('2026-01-19'), end: new Date('2026-01-25'), type: 'regular' }],
      ['3', { start: new Date('2026-01-26'), end: new Date('2026-02-01'), type: 'regular' }],
      ['4', { start: new Date('2026-02-02'), end: new Date('2026-02-08'), type: 'regular' }],
      ['5', { start: new Date('2026-02-09'), end: new Date('2026-02-15'), type: 'regular' }],
      ['6', { start: new Date('2026-02-16'), end: new Date('2026-02-20'), type: 'regular' }],
      ['recess', { start: new Date('2026-02-21'), end: new Date('2026-03-01'), type: 'recess' }],
      ['7', { start: new Date('2026-03-02'), end: new Date('2026-03-08'), type: 'regular' }],
      ['8', { start: new Date('2026-03-09'), end: new Date('2026-03-15'), type: 'regular' }],
      ['9', { start: new Date('2026-03-16'), end: new Date('2026-03-22'), type: 'regular' }],
      ['10', { start: new Date('2026-03-23'), end: new Date('2026-03-29'), type: 'regular' }],
      ['11', { start: new Date('2026-03-30'), end: new Date('2026-04-05'), type: 'regular' }],
      ['12', { start: new Date('2026-04-06'), end: new Date('2026-04-12'), type: 'regular' }],
      ['13', { start: new Date('2026-04-13'), end: new Date('2026-04-17'), type: 'regular' }],
      ['reading', { start: new Date('2026-04-18'), end: new Date('2026-04-24'), type: 'reading' }],
      ['exam', { start: new Date('2026-04-25'), end: new Date('2026-05-09'), type: 'exam' }],
    ])
  },
  vacation: {
    winter: { start: new Date('2025-12-07'), end: new Date('2026-01-11') },
    summer: { start: new Date('2026-05-10'), end: new Date('2026-08-02') }
  }
};

// NEXT ACADEMIC YEAR START DATE (Update when setting up new AY)
export const NEXT_AY_START = new Date('2026-08-03');

// Types for semester calculations
interface CurrentSemesterInfo {
  semester: 1 | 2 | null;
  week: string | null;
  displayWeek: string | null;
}

export interface UpcomingEvent {
  name: string;
  date: Date;
  weeksUntil: number;
}

export function getCurrentSemesterInfo(date: Date = new Date()): CurrentSemesterInfo {
  const ay = ACADEMIC_YEAR;
  
  // Check Semester 1
  if (date >= ay.semester1.start && date <= ay.semester1.end) {
    for (const [key, weekInfo] of ay.semester1.weeks) {
      if (date >= weekInfo.start && date <= weekInfo.end) {
        if (weekInfo.type === 'recess') return { semester: 1, week: 'recess', displayWeek: 'Recess Week' };
        if (weekInfo.type === 'reading') return { semester: 1, week: 'reading', displayWeek: 'Reading Week' };
        if (weekInfo.type === 'exam') return { semester: 1, week: 'exam', displayWeek: 'Exam Period' };
        return { semester: 1, week: key, displayWeek: `Week ${key}` };
      }
    }
  }
  
  // Check Semester 2
  if (date >= ay.semester2.start && date <= ay.semester2.end) {
    for (const [key, weekInfo] of ay.semester2.weeks) {
      if (date >= weekInfo.start && date <= weekInfo.end) {
        if (weekInfo.type === 'recess') return { semester: 2, week: 'recess', displayWeek: 'Recess Week' };
        if (weekInfo.type === 'reading') return { semester: 2, week: 'reading', displayWeek: 'Reading Week' };
        if (weekInfo.type === 'exam') return { semester: 2, week: 'exam', displayWeek: 'Exam Period' };
        return { semester: 2, week: key, displayWeek: `Week ${key}` };
      }
    }
  }
  
  // Vacation period
  return { semester: null, week: null, displayWeek: null };
}

export function getWeeksUntil(targetDate: Date, fromDate: Date = new Date()): number {
  const diffMs = targetDate.getTime() - fromDate.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const weeks = Math.ceil(diffDays / 7);
  return Math.max(0, weeks); 
}

export function getUpcomingEvents(date: Date = new Date()): UpcomingEvent[] {
  const ay = ACADEMIC_YEAR;
  const currentInfo = getCurrentSemesterInfo(date);
  const events: UpcomingEvent[] = [];
  
  // If currently in a semester, show upcoming events for that semester
  if (currentInfo.semester === 1) {
    const keyDates = [
      { name: 'Recess Week', date: ay.semester1.weeks.get('recess')!.start },
      { name: 'Reading Week', date: ay.semester1.weeks.get('reading')!.start },
      { name: 'Finals', date: ay.semester1.weeks.get('exam')!.start },
    ];
    
    // Add events that haven't passed yet
    keyDates.forEach(event => {
      if (event.date > date) {
        events.push({
          ...event,
          weeksUntil: getWeeksUntil(event.date, date)
        });
      }
    });
  } else if (currentInfo.semester === 2) {
    const keyDates = [
      { name: 'Recess Week', date: ay.semester2.weeks.get('recess')!.start },
      { name: 'Reading Week', date: ay.semester2.weeks.get('reading')!.start },
      { name: 'Finals', date: ay.semester2.weeks.get('exam')!.start },
    ];
    
    // Add events that haven't passed yet
    keyDates.forEach(event => {
      if (event.date > date) {
        events.push({
          ...event,
          weeksUntil: getWeeksUntil(event.date, date)
        });
      }
    });
  } else {
    // Not in a semester - show next semester start
    // Check if before Semester 1 starts
    if (date < ay.semester1.start) {
      events.push({
        name: 'Semester 1 starts',
        date: ay.semester1.start,
        weeksUntil: getWeeksUntil(ay.semester1.start, date)
      });
    } else if (date < ay.semester2.start) {
      // Between semesters (winter vacation)
      events.push({
        name: 'Semester 2 starts',
        date: ay.semester2.start,
        weeksUntil: getWeeksUntil(ay.semester2.start, date)
      });
    } else {
      // After Semester 2 (summer vacation)
      events.push({
        name: 'Semester 1 starts',
        date: NEXT_AY_START,
        weeksUntil: getWeeksUntil(NEXT_AY_START, date)
      });
    }
  }
  
  return events;
}