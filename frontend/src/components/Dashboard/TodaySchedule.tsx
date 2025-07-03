import { Calendar, MapPin, Users } from 'lucide-react';
import './TodaySchedule.css';

interface ScheduleItem {
    time: string;
    module: string;
    title: string;
    type: string;
    venue: string;
    color: string;
}

interface FreeTimeSlot {
    time: string;
    isFreeTime: true;
}

type FullScheduleItem = ScheduleItem | FreeTimeSlot;

export default function TodaySchedule() {
    // This data will come from backend, dummy data for now
    const todaySchedule: ScheduleItem[] = [
        { 
            time: '8:00 AM - 10:00 AM', 
            module: 'CS2103T', 
            title: 'Software Engineering', 
            type: 'Lecture', 
            venue: 'COM1-0210', 
            color: '#10b981' 
        },
        { 
            time: '10:00 AM - 12:00 PM', 
            module: 'CS2106', 
            title: 'Operating Systems', 
            type: 'Tutorial', 
            venue: 'LT19', 
            color: '#3b82f6' 
        },
        { 
            time: '2:00 PM - 4:00 PM', 
            module: 'CS3230', 
            title: 'Algorithms', 
            type: 'Lab', 
            venue: 'COM1-0201', 
            color: '#a855f7' 
        }
    ];

    // Helper function to parse time string to minutes from midnight
    const parseTime = (timeStr: string): number => {
        const [time, period] = timeStr.trim().split(' ');
        let [hours, minutes] = time.split(':').map(Number);
        
        if (period === 'PM' && hours !== 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;
        
        return hours * 60 + minutes;
    };

    // Generate schedule with free time gaps
    const generateScheduleWithGaps = (schedule: ScheduleItem[]): FullScheduleItem[] => {
        if (schedule.length === 0) return [];
        
        // Sort schedule by start time
        const sortedSchedule = [...schedule].sort((a, b) => {
            const aStart = parseTime(a.time.split(' - ')[0]);
            const bStart = parseTime(b.time.split(' - ')[0]);
            return aStart - bStart;
        });
        
        const fullSchedule: FullScheduleItem[] = [];
        
        for (let i = 0; i < sortedSchedule.length; i++) {
            const currentClass = sortedSchedule[i];
            const currentEnd = currentClass.time.split(' - ')[1];
            
            // Add the current class
            fullSchedule.push(currentClass);
            
            // Check if there's a next class
            if (i < sortedSchedule.length - 1) {
                const nextClass = sortedSchedule[i + 1];
                const nextStart = nextClass.time.split(' - ')[0];
                
                const currentEndMinutes = parseTime(currentEnd);
                const nextStartMinutes = parseTime(nextStart);
                
                // If there's a gap, add free time
                if (nextStartMinutes > currentEndMinutes) {
                    fullSchedule.push({
                        time: `${currentEnd} - ${nextStart}`,
                        isFreeTime: true
                    });
                }
            }
        }
        
        return fullSchedule;
    };

    const scheduleWithGaps = generateScheduleWithGaps(todaySchedule);

    const currentTime = new Date();
    const formattedDate = currentTime.toLocaleDateString('en-SG', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });

    const isFreeTime = (item: FullScheduleItem): item is FreeTimeSlot => {
        return 'isFreeTime' in item && item.isFreeTime === true;
    };

    return (
        <div className="today-schedule">
            <div className="today-schedule-header">
                <h2 className="today-schedule-title">
                    <Calendar size={18} />
                    Today's Schedule
                </h2>
                <span className="today-schedule-date">{formattedDate}</span>
            </div>

            <div className="today-schedule-list">
                {scheduleWithGaps.length > 0 ? (
                    scheduleWithGaps.map((item, index) => (
                        <div key={index} className="today-schedule-item">
                            <div className="today-schedule-time">
                                {item.time}
                            </div>
                            
                            {isFreeTime(item) ? (
                                <div className="today-schedule-card today-schedule-free-time">
                                    <p>Free time</p>
                                </div>
                            ) : (
                                <div 
                                    className="today-schedule-card" 
                                    style={{ borderLeftColor: item.color }}
                                >
                                    <h3 className="today-schedule-module">{item.module}</h3>
                                    <p className="today-schedule-module-title">{item.title}</p>
                                    <div className="today-schedule-details">
                                        <span className="today-schedule-detail">
                                            <MapPin size={12} />
                                            {item.venue}
                                        </span>
                                        <span className="today-schedule-detail">
                                            <Users size={12} />
                                            {item.type}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                ) : (
                    <div className="today-schedule-empty">
                        <Calendar size={48} />
                        <p>No classes scheduled for today</p>
                        <button className="today-schedule-create-btn">
                            Create your timetable →
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}