import { TrendingUp, BookOpen, BookOpenCheck } from 'lucide-react';
import { calculateCAP, calculateTotalMCs, calculateGradedMCs } from './GpaCalculations';
import type { Semester } from './GpaCalculations';
import './StatsSection.css';

interface StatsSectionProps {
  semesters: Semester[];
}

export default function StatsSection({ semesters }: StatsSectionProps) {
  return (
    <div className="stats-section">
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-label">OVERALL GPA</span>
            <TrendingUp className="stat-icon stat-icon-orange" size={16} />
          </div>
          <p className="stat-value stat-value-primary">{calculateCAP(semesters)}</p>
          <p className="stat-subtitle">out of 5.00</p>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-label">TOTAL MCs</span>
            <BookOpen className="stat-icon stat-icon-blue" size={16} />
          </div>
          <p className="stat-value">{calculateTotalMCs(semesters)}</p>
          <p className="stat-subtitle">modular credits</p>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-label">GRADED MCs</span>
            <BookOpenCheck className="stat-icon stat-icon-green" size={16} />
          </div>
          <p className="stat-value">{calculateGradedMCs(semesters)}</p>
          <p className="stat-subtitle">counting towards GPA</p>
        </div>
      </div>
    </div>
  );
}