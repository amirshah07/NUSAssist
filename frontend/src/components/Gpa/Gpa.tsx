import { useState, useEffect } from 'react';
import Loading from '../Loading/Loading';
import StatsSection from './StatsSection';
import AcademicHistory from './AcademicHistory';
import PlanningSection from './PlanningSection';
import { loadUserSemesters, saveUserSemesters } from './GpaUtils';
import type { Semester } from './GpaCalculations';
import './Gpa.css';

export default function Gpa() {
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Load semesters on mount
  useEffect(() => {
    loadUserSemesters()
      .then(loadedSemesters => {
        setSemesters(loadedSemesters);
      })
      .catch(err => {
        console.error('Error loading semesters:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const handleSemestersChange = async (newSemesters: Semester[]) => {
    setSemesters(newSemesters);
    
    try {
      setIsSaving(true);
      await saveUserSemesters(newSemesters);
    } catch (err) {
      console.error('Error saving semesters:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUIOnlyUpdate = (newSemesters: Semester[]) => {
    setSemesters(newSemesters);
  };

  if (isLoading || isSaving) {
    return <Loading />;
  }

  return (
    <div className="gpa-container">
      <div className="gpa-content">
        <StatsSection semesters={semesters} />
        
        <AcademicHistory 
          semesters={semesters} 
          onSemestersChange={handleSemestersChange}
          onUIOnlyUpdate={handleUIOnlyUpdate}
        />
        
        <PlanningSection semesters={semesters} />
      </div>
    </div>
  );
}