import Loading from '../Loading/Loading';
import StatsSection from './StatsSection';
import AcademicHistory from './AcademicHistory';
import PlanningSection from './PlanningSection';
import { useSemesters } from '../../contexts/SemestersContext';
import './Gpa.css';

export default function Gpa() {
  const { semesters, isLoading, isSaving, updateSemesters, updateSemestersUIOnly } = useSemesters();

  if (isLoading || isSaving) {
    return <Loading />;
  }

  return (
    <div className="gpa-container">
      <div className="gpa-content">
        <StatsSection semesters={semesters} />
        
        <AcademicHistory 
          semesters={semesters} 
          onSemestersChange={updateSemesters}
          onUIOnlyUpdate={updateSemestersUIOnly}
        />
        
        <PlanningSection semesters={semesters} />
      </div>
    </div>
  );
}