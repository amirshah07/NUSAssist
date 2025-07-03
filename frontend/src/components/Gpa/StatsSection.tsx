import { TrendingUp, BookOpen, Zap } from 'lucide-react';
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
        {/* Overall CAP Card */}
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-label">Overall CAP</span>
            <TrendingUp className="stat-icon stat-icon-orange" size={16} />
          </div>
          <p className="stat-value stat-value-primary">{calculateCAP(semesters)}</p>
          <p className="stat-subtitle">out of 5.00</p>
        </div>

        {/* Total MCs Card */}
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-label">Total MCs</span>
            <BookOpen className="stat-icon stat-icon-blue" size={16} />
          </div>
          <p className="stat-value">{calculateTotalMCs(semesters)}</p>
          <p className="stat-subtitle">modular credits</p>
        </div>

        {/* Graded MCs Card */}
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-label">Graded MCs</span>
            <Zap className="stat-icon stat-icon-purple" size={16} />
          </div>
          <p className="stat-value">{calculateGradedMCs(semesters)}</p>
          <p className="stat-subtitle">counting towards CAP</p>
        </div>
      </div>
    </div>
  );
}