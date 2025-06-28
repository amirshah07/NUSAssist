import { useState, useCallback, useEffect } from 'react';
import CombinedSearchTimePreference from './CombinedSearchTimePreference';
import TimetableComponent from './TimetableComponent';
import { OptimizationService } from '../../services/optimizationService';
import { TimetableService } from '../../services/timetableService';
import { supabase } from '../../lib/supabaseClient';
import Loading from '../Loading/Loading';

interface SelectedModule {
  [moduleCode: string]: any;
}

interface TimePreferenceData {
  [day: string]: {
    [time: string]: boolean;
  };
}

interface TimetableConstraints {
  preferredTimeSlots: TimePreferenceData;
}

export default function Timetable() {
  const [user, setUser] = useState<any>(null);
  const [selectedModules, setSelectedModules] = useState<SelectedModule>({});
  const [optimizedModules, setOptimizedModules] = useState<SelectedModule>({});
  const [currentSemester, setCurrentSemester] = useState<"sem1" | "sem2">("sem1");
  const [constraints, setConstraints] = useState<TimetableConstraints>({
    preferredTimeSlots: {}
  });
  const [isOptimized, setIsOptimized] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Get current user on mount
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    
    getUser();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    
    return () => subscription.unsubscribe();
  }, []);

  // Load user data when user is available
  useEffect(() => {
    const loadUserData = async () => {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      
      try {
        // Get user's current semester
        const userSemester = await TimetableService.getUserCurrentSemester(user.id);
        setCurrentSemester(userSemester);

        // Load timetable for current semester
        const timetableData = await TimetableService.loadUserTimetable(user.id, userSemester);
        
        if (timetableData) {
          setSelectedModules(timetableData.modules);
          setConstraints({ preferredTimeSlots: timetableData.timePreferences });
          setIsOptimized(timetableData.isOptimized);
          setIsMinimized(true); // Minimize if data exists
          
          if (timetableData.isOptimized) {
            setOptimizedModules(timetableData.modules);
          }
        } else {
          // No saved data, reset to defaults
          setSelectedModules({});
          setOptimizedModules({});
          setConstraints({ preferredTimeSlots: {} });
          setIsOptimized(false);
          setIsMinimized(false);
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUserData();
  }, [user?.id]);

  // Auto-save changes with debouncing
  useEffect(() => {
    const saveChanges = async () => {
      if (!user?.id || !hasUnsavedChanges) return;
      
      const modulesToSave = isOptimized ? optimizedModules : selectedModules;
      
      await TimetableService.saveUserTimetable(
        user.id,
        currentSemester,
        modulesToSave,
        constraints.preferredTimeSlots,
        isOptimized
      );
      
      setHasUnsavedChanges(false);
    };

    const debounceTimer = setTimeout(saveChanges, 500);
    return () => clearTimeout(debounceTimer);
  }, [selectedModules, optimizedModules, constraints, isOptimized, currentSemester, hasUnsavedChanges, user?.id]);

  const handleModulesUpdate = useCallback((modules: SelectedModule) => {
    setSelectedModules(modules);
    setIsOptimized(false);
    setOptimizedModules({});
    setHasUnsavedChanges(true);
  }, []);

  const handleTimePreferencesChange = useCallback((timePreferences: TimePreferenceData) => {
    setConstraints({ preferredTimeSlots: timePreferences });
    setIsOptimized(false);
    setHasUnsavedChanges(true);
  }, []);

  const handleSemesterChange = useCallback(async (newSemester: "sem1" | "sem2") => {
    if (!user?.id || newSemester === currentSemester) return;

    setIsLoading(true);
    
    try {
      // Save current semester data before switching
      const currentModules = isOptimized ? optimizedModules : selectedModules;
      await TimetableService.saveUserTimetable(
        user.id,
        currentSemester,
        currentModules,
        constraints.preferredTimeSlots,
        isOptimized
      );

      // Update current semester preference
      await TimetableService.updateUserCurrentSemester(user.id, newSemester);
      setCurrentSemester(newSemester);

      // Load data for new semester
      const timetableData = await TimetableService.loadUserTimetable(user.id, newSemester);
      
      if (timetableData) {
        setSelectedModules(timetableData.modules);
        setConstraints({ preferredTimeSlots: timetableData.timePreferences });
        setIsOptimized(timetableData.isOptimized);
        setIsMinimized(true);
        
        if (timetableData.isOptimized) {
          setOptimizedModules(timetableData.modules);
        } else {
          setOptimizedModules({});
        }
      } else {
        // No saved data for new semester
        setSelectedModules({});
        setOptimizedModules({});
        setConstraints({ preferredTimeSlots: {} });
        setIsOptimized(false);
        setIsMinimized(false);
      }
      
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Error switching semester:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, currentSemester, selectedModules, optimizedModules, constraints, isOptimized]);

  const handleOptimize = useCallback(async () => {
    if (!OptimizationService.canOptimize(selectedModules)) {
      console.error('Cannot optimize: insufficient module data');
      return;
    }

    if (!OptimizationService.validateConstraints(constraints)) {
      console.error('Invalid constraints: no time slots selected');
      return;
    }

    setIsOptimizing(true);
    
    try {
      console.log('Starting optimization with time preferences:', constraints);
      
      const optimizedTimetable = await OptimizationService.optimizeTimetable(
        selectedModules,
        constraints
      );
      
      console.log('Optimization completed:', optimizedTimetable);
      
      setOptimizedModules(optimizedTimetable);
      setIsOptimized(true);
      setIsMinimized(true);
      setHasUnsavedChanges(true);
    } catch (error) {
      console.error('Optimization failed:', error);
    } finally {
      setIsOptimizing(false);
    }
  }, [selectedModules, constraints]);

  const handleOptimizedModulesUpdate = useCallback((modules: SelectedModule) => {
    setOptimizedModules(modules);
    setHasUnsavedChanges(true);
  }, []);

  const handleResetOptimization = useCallback(() => {
    setIsOptimized(false);
    setOptimizedModules({});
    setIsMinimized(false);
    setHasUnsavedChanges(true);
  }, []);

  const handleToggleMinimize = useCallback(() => {
    setIsMinimized(prev => !prev);
  }, []);

  const hasModules = Object.keys(selectedModules).length > 0;
  const canOptimize = hasModules && OptimizationService.canOptimize(selectedModules);
  const hasUsefulConstraints = OptimizationService.hasUsefulConstraints(constraints);

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div className="timetable-page">
      <CombinedSearchTimePreference
        onModulesUpdate={handleModulesUpdate}
        onTimePreferencesChange={handleTimePreferencesChange}
        onOptimize={handleOptimize}
        onSemesterChange={handleSemesterChange}
        currentSemester={currentSemester}
        initialModules={selectedModules}
        initialTimePreferences={constraints.preferredTimeSlots}
        disabled={isOptimizing}
        hasModules={canOptimize && hasUsefulConstraints}
        isOptimized={isOptimized}
        isOptimizing={isOptimizing}
        onResetOptimization={handleResetOptimization}
        isMinimized={isMinimized}
        onToggleMinimize={handleToggleMinimize}
      />

      {hasModules && !hasUsefulConstraints && !isMinimized && (
        <div className="constraint-warning">
          <div className="warning-message">
            Please select more time slots in your availability to enable optimization.
            Select time slots when you're available for classes.
          </div>
        </div>
      )}

      {isOptimizing && (
        <div className="optimizing-overlay">
          <div className="optimizing-spinner"></div>
          <div>Optimizing your timetable...</div>
          <div className="optimization-details">
            Analyzing {Object.keys(selectedModules).length} modules with your time preferences
          </div>
        </div>
      )}

      <div className="timetable-section">
        <TimetableComponent 
          selectedModules={isOptimized ? optimizedModules : selectedModules}
          selectedSemester={currentSemester}
          onModulesUpdate={isOptimized ? handleOptimizedModulesUpdate : undefined}
          isOptimized={isOptimized}
        />
      </div>
    </div>
  );
}