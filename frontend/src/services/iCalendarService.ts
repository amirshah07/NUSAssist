import { ACADEMIC_YEAR } from '../components/Dashboard/AcademicCalendar';
import type { SelectedModule, CustomTimeBlock } from '../components/Timetable/types';

export class ICalendarService {
  private static formatDate(date: Date): string {
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  }

  private static escapeText(text: string): string {
    return text.replace(/[,;\\]/g, '\\$&').replace(/\n/g, '\\n');
  }

  private static getWeekDates(weekNumber: number | string, semester: 1 | 2): Date[] {
    const semesterData = semester === 1 ? ACADEMIC_YEAR.semester1 : ACADEMIC_YEAR.semester2;
    const weekInfo = semesterData.weeks.get(weekNumber.toString());
    
    if (!weekInfo) return [];
    
    const dates: Date[] = [];
    const currentDate = new Date(weekInfo.start);
    const endDate = new Date(weekInfo.end);
    
    while (currentDate <= endDate) {
      dates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return dates;
  }

  private static getDayIndex(day: string): number {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days.indexOf(day);
  }

  private static createEvent(
    summary: string,
    location: string,
    startDate: Date,
    startTime: string,
    endTime: string,
    description?: string
  ): string {
    const eventStart = new Date(startDate);
    const [startHour, startMin] = [parseInt(startTime.slice(0, 2)), parseInt(startTime.slice(2, 4))];
    eventStart.setHours(startHour, startMin, 0, 0);
    
    const eventEnd = new Date(startDate);
    const [endHour, endMin] = [parseInt(endTime.slice(0, 2)), parseInt(endTime.slice(2, 4))];
    eventEnd.setHours(endHour, endMin, 0, 0);
    
    const uid = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}@nusassist`;
    
    let event = 'BEGIN:VEVENT\r\n';
    event += `UID:${uid}\r\n`;
    event += `DTSTAMP:${this.formatDate(new Date())}\r\n`;
    event += `DTSTART:${this.formatDate(eventStart)}\r\n`;
    event += `DTEND:${this.formatDate(eventEnd)}\r\n`;
    event += `SUMMARY:${this.escapeText(summary)}\r\n`;
    if (location) event += `LOCATION:${this.escapeText(location)}\r\n`;
    if (description) event += `DESCRIPTION:${this.escapeText(description)}\r\n`;
    event += 'END:VEVENT\r\n';
    
    return event;
  }

  private static createRecurringEvent(
    summary: string,
    location: string,
    day: string,
    startTime: string,
    endTime: string,
    semester: 1 | 2,
    description?: string
  ): string {
    const semesterData = semester === 1 ? ACADEMIC_YEAR.semester1 : ACADEMIC_YEAR.semester2;
    const dayIndex = this.getDayIndex(day);
    
    const firstDate = new Date(semesterData.start);
    while (firstDate.getDay() !== dayIndex) {
      firstDate.setDate(firstDate.getDate() + 1);
    }
    
    const eventStart = new Date(firstDate);
    const [startHour, startMin] = startTime.includes(':') 
      ? startTime.split(':').map(Number)
      : [parseInt(startTime.slice(0, 2)), parseInt(startTime.slice(2, 4))];
    eventStart.setHours(startHour, startMin, 0, 0);
    
    const eventEnd = new Date(firstDate);
    const [endHour, endMin] = endTime.includes(':')
      ? endTime.split(':').map(Number)
      : [parseInt(endTime.slice(0, 2)), parseInt(endTime.slice(2, 4))];
    eventEnd.setHours(endHour, endMin, 0, 0);
    
    const untilDate = new Date(semesterData.end);
    untilDate.setDate(untilDate.getDate() + 1);
    
    const uid = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}@nusassist`;
    
    let event = 'BEGIN:VEVENT\r\n';
    event += `UID:${uid}\r\n`;
    event += `DTSTAMP:${this.formatDate(new Date())}\r\n`;
    event += `DTSTART:${this.formatDate(eventStart)}\r\n`;
    event += `DTEND:${this.formatDate(eventEnd)}\r\n`;
    event += `SUMMARY:${this.escapeText(summary)}\r\n`;
    if (location) event += `LOCATION:${this.escapeText(location)}\r\n`;
    if (description) event += `DESCRIPTION:${this.escapeText(description)}\r\n`;
    event += `RRULE:FREQ=WEEKLY;UNTIL=${this.formatDate(untilDate)}\r\n`;
    event += 'END:VEVENT\r\n';
    
    return event;
  }

  static generateICalendar(
    modules: SelectedModule,
    customBlocks: CustomTimeBlock[],
    semester: "sem1" | "sem2"
  ): string {
    let calendar = 'BEGIN:VCALENDAR\r\n';
    calendar += 'VERSION:2.0\r\n';
    calendar += 'PRODID:-//NUSAssist//Timetable Export//EN\r\n';
    calendar += 'CALSCALE:GREGORIAN\r\n';
    calendar += 'METHOD:PUBLISH\r\n';
    calendar += `X-WR-CALNAME:NUS ${semester === 'sem1' ? 'Semester 1' : 'Semester 2'} Timetable\r\n`;
    calendar += 'X-WR-TIMEZONE:Asia/Singapore\r\n';
    
    const semesterNum = semester === 'sem1' ? 1 : 2;
    
    Object.entries(modules).forEach(([moduleCode, moduleData]) => {
      if (!moduleData?.timetable) return;
      
      moduleData.timetable.forEach((lesson: any) => {
        const summary = `${moduleCode} ${lesson.lessonType}`;
        const description = `Class: ${lesson.classNo}`;
        
        if (lesson.weeks && lesson.weeks.length > 0) {
          lesson.weeks.forEach((week: number) => {
            const weekDates = this.getWeekDates(week, semesterNum);
            const dayIndex = this.getDayIndex(lesson.day);
            const lessonDate = weekDates.find(date => date.getDay() === dayIndex);
            
            if (lessonDate) {
              calendar += this.createEvent(
                summary,
                lesson.venue || '',
                lessonDate,
                lesson.startTime,
                lesson.endTime,
                description
              );
            }
          });
        }
      });
    });
    
    customBlocks.forEach(block => {
      block.days.forEach(day => {
        calendar += this.createRecurringEvent(
          block.eventName,
          '',
          day,
          block.startTime,
          block.endTime,
          semesterNum,
          'Custom event'
        );
      });
    });
    
    calendar += 'END:VCALENDAR\r\n';
    
    return calendar;
  }

  static downloadICalendar(content: string, filename: string): void {
    const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  }
}