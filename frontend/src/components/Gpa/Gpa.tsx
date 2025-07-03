import { useState } from 'react';
import StatsSection from './StatsSection';
import AcademicHistory from './AcademicHistory';
import PlanningSection from './PlanningSection';
import type { Semester } from './GpaCalculations';
import './Gpa.css';

export default function Gpa() {
  // Initialize with sample data - replace with actual data from backend/localStorage
  const [semesters, setSemesters] = useState<Semester[]>([
    {
      id: 'Y1S1',
      name: 'Year 1 Semester 1',
      modules: [
        { code: 'CS1101S', name: 'Programming Methodology', mcs: 4, grade: 'A-', gradePoint: 4.5 },
        { code: 'CS1231S', name: 'Discrete Structures', mcs: 4, grade: 'B+', gradePoint: 4.0 },
        { code: 'MA1521', name: 'Calculus for Computing', mcs: 4, grade: 'A', gradePoint: 5.0 },
        { code: 'GEC1030', name: 'Metropolis', mcs: 4, grade: 'B+', gradePoint: 4.0 },
      ]
    },
    {
      id: 'Y1S2',
      name: 'Year 1 Semester 2',
      modules: [
        { code: 'CS2030S', name: 'Programming Methodology II', mcs: 4, grade: 'A', gradePoint: 5.0 },
        { code: 'CS2040S', name: 'Data Structures and Algorithms', mcs: 4, grade: 'A-', gradePoint: 4.5 },
        { code: 'MA1101R', name: 'Linear Algebra I', mcs: 4, grade: 'B+', gradePoint: 4.0 },
        { code: 'GEA1000', name: 'Quantitative Reasoning', mcs: 4, grade: 'CS', gradePoint: 0 },
      ]
    }
  ]);

  const handleSemestersChange = (newSemesters: Semester[]) => {
    setSemesters(newSemesters);
    // Here can save to localStorage or backend
    // localStorage.setItem('gpa-semesters', JSON.stringify(newSemesters));
  };

  return (
    <div className="gpa-container">
      <div className="gpa-content">

        <StatsSection semesters={semesters} />
        
        <AcademicHistory 
          semesters={semesters} 
          onSemestersChange={handleSemestersChange} 
        />
        
        <PlanningSection semesters={semesters} />
      </div>
    </div>
  );
}