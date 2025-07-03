import './Dashboard.css';
import TodaySchedule from './TodaySchedule';
import ProgressCard from './ProgressCard';
import SemesterCard from './SemesterCard';
import UpcomingCard from './UpcomingCard';

export default function Dashboard() {
    return (
        <div className="dashboard-container">
            <div className="dashboard-grid">
                <div className="dashboard-schedule-section">
                    <TodaySchedule />
                </div>
                
                <div className="dashboard-stats-section">
                    <ProgressCard />
                    <SemesterCard />
                    <UpcomingCard />
                </div>
            </div>
        </div>
    );
}