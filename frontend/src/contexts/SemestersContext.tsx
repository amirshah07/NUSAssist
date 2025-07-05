import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { loadUserSemesters, saveUserSemesters } from '../components/Gpa/GpaUtils';
import type { Semester } from '../components/Gpa/GpaCalculations';

interface SemestersContextType {
  semesters: Semester[];
  isLoading: boolean;
  isSaving: boolean;
  updateSemesters: (newSemesters: Semester[]) => Promise<void>;
  updateSemestersUIOnly: (newSemesters: Semester[]) => void;
  refreshSemesters: () => Promise<void>;
}

const SemestersContext = createContext<SemestersContextType | undefined>(undefined);

export function SemestersProvider({ children }: { children: ReactNode }) {
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Load semesters on mount
  const refreshSemesters = async () => {
    try {
      setIsLoading(true);
      const loadedSemesters = await loadUserSemesters();
      setSemesters(loadedSemesters);
    } catch (err) {
      console.error('Error loading semesters:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshSemesters();
  }, []);

  // Update semesters and save to database
  const updateSemesters = async (newSemesters: Semester[]) => {
    setSemesters(newSemesters);
    
    try {
      setIsSaving(true);
      await saveUserSemesters(newSemesters);
    } catch (err) {
      console.error('Error saving semesters:', err);
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  // Update semesters UI only (for show/hide grade toggle)
  const updateSemestersUIOnly = (newSemesters: Semester[]) => {
    setSemesters(newSemesters);
  };

  const value = {
    semesters,
    isLoading,
    isSaving,
    updateSemesters,
    updateSemestersUIOnly,
    refreshSemesters
  };

  return (
    <SemestersContext.Provider value={value}>
      {children}
    </SemestersContext.Provider>
  );
}

export function useSemesters() {
  const context = useContext(SemestersContext);
  if (context === undefined) {
    throw new Error('useSemesters must be used within a SemestersProvider');
  }
  return context;
}