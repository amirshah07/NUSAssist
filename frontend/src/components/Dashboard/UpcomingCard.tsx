import { Calendar } from 'lucide-react';
import { useSemesters } from '../../contexts/SemestersContext';
import { calculateTotalMCs } from '../../components/Gpa/GpaCalculations';
import { getUpcomingEvents } from './AcademicCalendar';
import './UpcomingCard.css';

export default function UpcomingCard() {
    const { semesters } = useSemesters();
    const totalMCs = calculateTotalMCs(semesters);
    
    // Check if graduated
    if (totalMCs >= 160) {
        return (
            <div className="upcoming-card">
                <h3 className="upcoming-card-title">
                    <Calendar size={16} />
                    Upcoming
                </h3>
                
                <div className="upcoming-card-content">
                    {/* Empty state for graduated users */}
                </div>
            </div>
        );
    }
    
    // Get upcoming events
    const upcomingEvents = getUpcomingEvents();

    return (
        <div className="upcoming-card">
            <h3 className="upcoming-card-title">
                <Calendar size={16} />
                Upcoming
            </h3>
            
            <div className="upcoming-card-content">
                {
                    upcomingEvents.map((event, index) => (
                        <div key={index} className="upcoming-event">
                            <span className="upcoming-event-name">{event.name}</span>
                            <span className={`upcoming-event-time ${event.weeksUntil <= 2 ? 'upcoming-event-soon' : ''}`}>
                                {event.weeksUntil} week{event.weeksUntil !== 1 ? 's' : ''}
                            </span>
                        </div>))
                }
            </div>
        </div>
    );
}