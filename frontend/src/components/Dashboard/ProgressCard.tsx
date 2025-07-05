import { BookOpen } from 'lucide-react';
import { useSemesters } from '../../contexts/SemestersContext';
import { calculateTotalMCs } from '../../components/Gpa/GpaCalculations';
import { getNextSemester, getProgressPercentage } from './ProgressUtils';
import './ProgressCard.css';

export default function ProgressCard() {
    const { semesters, isLoading } = useSemesters();
    
    const completedMCs = calculateTotalMCs(semesters);
    const totalMCs = 160;
    const progressPercentage = getProgressPercentage(completedMCs);
    const nextSemester = getNextSemester(semesters);

    return (
        <div className="progress-card">
            <h3 className="progress-card-title">
                <BookOpen size={16} />
                Your Progress
            </h3>
            
            <div className="progress-card-content">
                {isLoading ? (
                    <div className="progress-loading">
                        <div className="loading-spinner"></div>
                    </div>
                ) : (
                    <>
                        <div className="progress-mc-section">
                            <div className="progress-mc-header">
                                <span className="progress-mc-label">MCs Completed</span>
                                <span className="progress-mc-value">
                                    {completedMCs}/{totalMCs} ({Math.round(progressPercentage)}%)
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
                            {nextSemester}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}