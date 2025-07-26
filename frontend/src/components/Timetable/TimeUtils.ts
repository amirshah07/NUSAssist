export class TimeUtils {
  static normalize(timeStr: string): string {
    if (timeStr.includes(':')) return timeStr;
    return timeStr.length === 4 ? `${timeStr.slice(0, 2)}:${timeStr.slice(2)}` : timeStr;
  }

  static toMinutes(timeStr: string): number {
    const [hours, minutes] = this.normalize(timeStr).split(':').map(Number);
    return hours * 60 + minutes;
  }

  static formatDisplay(timeString: string): string {
    const hour = parseInt(timeString.substring(0, 2));
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:00 ${ampm}`;
  }

  static blocksOverlap(block1: any, block2: any): boolean {
    const start1 = this.toMinutes(block1.startTime);
    const end1 = this.toMinutes(block1.endTime);
    const start2 = this.toMinutes(block2.startTime);
    const end2 = this.toMinutes(block2.endTime);
    return start1 < end2 && start2 < end1;
  }
}