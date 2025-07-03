import { BookOpen } from 'lucide-react';
import './ProgressCard.css';

export default function ProgressCard() {
    // This data will come from backend, dummy data for now
    const completedMCs = 80;
    const totalMCs = 160;
    const currentYear = 2;
    const currentSemester = 2;
    
    const progressPercentage = (completedMCs / totalMCs) * 100;

    return (
        <div className="progress-card">
            <h3 className="progress-card-title">
                <BookOpen size={16} />
                Your Progress
            </h3>
            
            <div className="progress-card-content">
                <div className="progress-mc-section">
                    <div className="progress-mc-header">
                        <span className="progress-mc-label">MCs Completed</span>
                        <span className="progress-mc-value">
                            {completedMCs}/{totalMCs} ({progressPercentage}%)
                        </span>
                    </div>
                    
                    <div className="progress-bar-container">
                        <div 
                            className="progress-bar-fill" 
                            style={{ width: `${progressPercentage}%` }}
                        />
                    </div>
                </div>
                
                <div className="progress-year-info">
                    Year {currentYear} Semester {currentSemester}
                </div>
            </div>
        </div>
    );
}