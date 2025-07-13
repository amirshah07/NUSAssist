import { useState, useEffect } from 'react';
import { TrendingUp } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { TimetableService } from '../../services/timetableService';
import { getCurrentSemesterInfo, ACADEMIC_YEAR } from './AcademicCalendar';
import './SemesterCard.css';

interface Module {
    code: string;
    color: string;
}

const MODULE_COLORS = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4',
    '#84cc16', '#f97316', '#ec4899', '#6366f1', '#14b8a6', '#eab308'
];

function getColorForModule(moduleCode: string): string {
    let hash = 0;
    for (let i = 0; i < moduleCode.length; i++) {
        hash = moduleCode.charCodeAt(i) + ((hash << 5) - hash);
    }
    return MODULE_COLORS[Math.abs(hash) % MODULE_COLORS.length];
}

export default function SemesterCard() {
    const [currentModules, setCurrentModules] = useState<Module[]>([]);
    const [totalMCs, setTotalMCs] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadSemesterData() {
            try {
                // Get current user
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    setLoading(false);
                    return;
                }

                // Determine which semester to display
                const currentDate = new Date();
                let displaySemester: 'sem1' | 'sem2' = 'sem1';

                if (currentDate > ACADEMIC_YEAR.semester2.end && currentDate < ACADEMIC_YEAR.semester1.start) {
                    // After Semester 2 end and before next Semester 1 start - show upcoming Semester 1
                    displaySemester = 'sem1';
                } else if (currentDate >= ACADEMIC_YEAR.semester1.start && currentDate <= ACADEMIC_YEAR.semester1.end) {
                    // During Semester 1
                    displaySemester = 'sem1';
                } else {
                    // During or before Semester 2
                    displaySemester = 'sem2';
                }

                // Load timetable data
                const timetableData = await TimetableService.loadUserTimetable(user.id, displaySemester);
                if (!timetableData || Object.keys(timetableData.modules).length === 0) {
                    setCurrentModules([]);
                    setTotalMCs(0);
                    setLoading(false);
                    return;
                }

                // Transform to Module[] format and calculate MCs
                const modules: Module[] = [];
                let totalCredits = 0;

                Object.entries(timetableData.modules).forEach(([moduleCode]) => {
                    modules.push({
                        code: moduleCode,
                        color: getColorForModule(moduleCode)
                    });
                });

                setCurrentModules(modules);
                setTotalMCs(timetableData.TotalMcs);
            } catch (error) {
                console.error('Failed to load semester data:', error);
                setCurrentModules([]);
                setTotalMCs(0); 
            } finally {
                setLoading(false);
            }
        }

        loadSemesterData();
    }, []);

    const totalModules = currentModules.length;
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
                    {loading ? 'Loading...' : `${totalModules} modules | ${totalMCs} MCs`} {weekDisplay && ` | ${weekDisplay}`} 
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