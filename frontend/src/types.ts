// need to fill up with all types of data used in page, after settling database
export interface TimetableBlock {
    moduleCode: string;
    lessonType: string;
    classNo: string;
    day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday';
    startTime: string; // "14:00"
    endTime: string;   // "16:00"
    venue?: string;
    color?: string; // optional hex or class
  }
  