import { Calendar } from 'lucide-react';
import './UpcomingCard.css';

export default function UpcomingCard() {
    // This data will come from backend, dummy data for now
    const upcomingEvents = {
        recessWeek: 2,
        readingWeek: 5,
        finals: 6
    };

    return (
        <div className="upcoming-card">
            <h3 className="upcoming-card-title">
                <Calendar size={16} />
                Upcoming
            </h3>
            
            <div className="upcoming-card-content">
                <div className="upcoming-event">
                    <span className="upcoming-event-name">Recess Week</span>
                    <span className="upcoming-event-time upcoming-event-soon">
                        {upcomingEvents.recessWeek} weeks
                    </span>
                </div>
                
                <div className="upcoming-event">
                    <span className="upcoming-event-name">Reading Week</span>
                    <span className="upcoming-event-time">
                        {upcomingEvents.readingWeek} weeks
                    </span>
                </div>
                
                <div className="upcoming-event">
                    <span className="upcoming-event-name">Finals</span>
                    <span className="upcoming-event-time">
                        {upcomingEvents.finals} weeks
                    </span>
                </div>
            </div>
        </div>
    );
}