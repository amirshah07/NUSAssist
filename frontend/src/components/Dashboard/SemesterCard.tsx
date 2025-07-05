import { TrendingUp } from 'lucide-react';
import { getCurrentSemesterInfo } from './AcademicCalendar';
import './SemesterCard.css';

interface Module {
    code: string;
    color: string;
}

export default function SemesterCard() {
    // This data will come from backend, dummy data for now
    const currentModules: Module[] = [
        { code: 'CS2103T', color: '#10b981' },
        { code: 'CS2106', color: '#3b82f6' },
        { code: 'CS3230', color: '#a855f7' },
        { code: 'GEA1000', color: '#eab308' },
        { code: 'CFG1002', color: '#ef4444' }
    ];
    
    const totalModules = currentModules.length; // This data will come from backend, dummy data for now
    const totalMCs = 20;  // This data will come from backend, dummy data for now


    const listClassName = totalModules > 5 ? 'semester-modules-list two-columns' : 'semester-modules-list'; 
    const semesterInfo = getCurrentSemesterInfo();
    const weekDisplay = semesterInfo.displayWeek;
    return (
        <div className="semester-card">
            <h3 className="semester-card-title">
                <TrendingUp size={16} />
                This Semester
            </h3>
            
            <div className="semester-card-content">
                <div className="semester-summary">
                    {/* week not rendered on holiday */}
                    {totalModules} modules | {totalMCs} MCs {weekDisplay && ` | ${weekDisplay}`} 
                </div>
                
                <ul className={listClassName}>
                    {currentModules.map((module, index) => (
                        <li key={index} className="semester-module-item">
                            <div 
                                className="semester-module-dot" 
                                style={{ backgroundColor: module.color }}
                            />
                            <span className="semester-module-code">{module.code}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}