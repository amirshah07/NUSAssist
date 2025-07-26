import { useState, useEffect } from 'react';
import { Calendar, MapPin, Users } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { TimetableService } from '../../services/timetableService';
import { getCurrentSemesterInfo } from './AcademicCalendar';
import './TodaySchedule.css';
import './ProgressCard.css';

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

const MODULE_COLORS = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4',
    '#84cc16', '#f97316', '#ec4899', '#6366f1', '#14b8a6', '#eab308'
];

function getColorForModule(moduleCode: string, moduleOrder?: { [moduleCode: string]: number }): string {
  if (moduleOrder && moduleOrder[moduleCode] !== undefined) {
    return MODULE_COLORS[moduleOrder[moduleCode] % MODULE_COLORS.length];
  }
  
  let hash = 0;
  for (let i = 0; i < moduleCode.length; i++) {
    hash = moduleCode.charCodeAt(i) + ((hash << 5) - hash);
  }
  return MODULE_COLORS[Math.abs(hash) % MODULE_COLORS.length];
}

export default function TodaySchedule() {
    const [todaySchedule, setTodaySchedule] = useState<ScheduleItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadTodaySchedule() {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    setLoading(false);
                    return;
                }
                const today = new Date();
                const semesterInfo = getCurrentSemesterInfo(today);
                if (!semesterInfo.semester || semesterInfo.week === 'recess' || semesterInfo.week === 'reading' || semesterInfo.week === 'exam') {
                    setTodaySchedule([]);
                    setLoading(false);
                    return;
                }
                const currentSemester = semesterInfo.semester === 1 ? 'sem1' : 'sem2';

                const timetableData = await TimetableService.loadUserTimetable(user.id, currentSemester);
                if (!timetableData || Object.keys(timetableData.modules).length === 0) {
                    setTodaySchedule([]);
                    setLoading(false);
                    return;
                }

                const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                const todayName = dayNames[today.getDay()];

                if (todayName === 'Saturday' || todayName === 'Sunday') {
                    setTodaySchedule([]);
                    setLoading(false);
                    return;
                }

                const todaysClasses: ScheduleItem[] = [];

                Object.entries(timetableData.modules).forEach(([moduleCode, moduleData]) => {
                    if (moduleData?.timetable) {
                        moduleData.timetable.forEach((lesson: any) => {
                            if (lesson.day === todayName) {
                                const formatTime = (time: string) => {
                                    const hour = parseInt(time.substring(0, 2));
                                    const minute = time.substring(3, 5) || '00';
                                    const ampm = hour >= 12 ? 'PM' : 'AM';
                                    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
                                    return `${displayHour}:${minute.padStart(2, '0')} ${ampm}`;
                                };

                                todaysClasses.push({
                                    time: `${formatTime(lesson.startTime)} - ${formatTime(lesson.endTime)}`,
                                    module: moduleCode,
                                    title: timetableData.ModuleTitleList[moduleCode] || '',
                                    type: lesson.lessonType,
                                    venue: lesson.venue,
                                    color: getColorForModule(moduleCode, timetableData.moduleOrder)
                                });
                            }
                        });
                    }
                });

                timetableData.customBlocks.forEach(block => {
                    if (block.days.includes(todayName)) {
                        const formatTime = (time: string) => {
                            const [hour, minute] = time.split(':');
                            const hourNum = parseInt(hour);
                            const ampm = hourNum >= 12 ? 'PM' : 'AM';
                            const displayHour = hourNum === 0 ? 12 : hourNum > 12 ? hourNum - 12 : hourNum;
                            return `${displayHour}:${minute.padStart(2, '0')} ${ampm}`;
                        };

                        todaysClasses.push({
                            time: `${formatTime(block.startTime)} - ${formatTime(block.endTime)}`,
                            module: block.eventName,
                            title: "",
                            type: 'Custom',
                            venue: 'Custom Event',
                            color: block.color
                        });
                    }
                });

                setTodaySchedule(todaysClasses);
            } catch (error) {
                console.error('Failed to load today\'s schedule:', error);
                setTodaySchedule([]);
            } finally {
                setLoading(false);
            }
        }

        loadTodaySchedule();
    }, []);

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
                {loading ? (
                    <div className="today-schedule-empty">
                        <Calendar size={48} />
                        <div className="loading-spinner"></div>
                    </div>
                ) : scheduleWithGaps.length > 0 ? (
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
                    </div>
                )}
            </div>
        </div>
    );
}