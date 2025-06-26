import { useState, useCallback } from 'react';
import CombinedSearchTimePreference from '../../components/Timetable/CombinedSearchTimePreference';
import TimetableComponent from '../../components/Timetable/Timetable';
import { OptimizationService } from '../../services/optimizationService';
import './TimetablePage.css';

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

export default function TimetablePage() {
  const [selectedModules, setSelectedModules] = useState<SelectedModule>({});
  const [optimizedModules, setOptimizedModules] = useState<SelectedModule>({});
  const [currentSemester, setCurrentSemester] = useState<"sem1" | "sem2">("sem1");
  const [constraints, setConstraints] = useState<TimetableConstraints>({
    preferredTimeSlots: {}
  });
  const [isOptimized, setIsOptimized] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const handleModulesUpdate = useCallback((modules: SelectedModule) => {
    setSelectedModules(modules);
    setIsOptimized(false);
    setOptimizedModules({});
    // Don't minimize when modules change - user might want to adjust
  }, []);

  const handleTimePreferencesChange = useCallback((timePreferences: TimePreferenceData) => {
    setConstraints({ preferredTimeSlots: timePreferences });
    setIsOptimized(false);
  }, []);

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
      // Automatically minimize after successful optimization
      setIsMinimized(true);
    } catch (error) {
      console.error('Optimization failed:', error);
    } finally {
      setIsOptimizing(false);
    }
  }, [selectedModules, constraints]);

  const handleOptimizedModulesUpdate = useCallback((modules: SelectedModule) => {
    setOptimizedModules(modules);
  }, []);

  const handleResetOptimization = useCallback(() => {
    setIsOptimized(false);
    setOptimizedModules({});
    setIsMinimized(false); // Expand when resetting
  }, []);

  const handleToggleMinimize = useCallback(() => {
    setIsMinimized(prev => !prev);
  }, []);

  const handleSemesterChange = useCallback((semester: "sem1" | "sem2") => {
    setCurrentSemester(semester);
    setSelectedModules({});
    setOptimizedModules({});
    setIsOptimized(false);
    setIsMinimized(false);
  }, []);

  const hasModules = Object.keys(selectedModules).length > 0;
  const canOptimize = hasModules && OptimizationService.canOptimize(selectedModules);
  const hasUsefulConstraints = OptimizationService.hasUsefulConstraints(constraints);

  return (
    <div className="timetable-page">
      <CombinedSearchTimePreference
        onModulesUpdate={handleModulesUpdate}
        onTimePreferencesChange={handleTimePreferencesChange}
        onOptimize={handleOptimize}
        disabled={isOptimizing}
        hasModules={canOptimize && hasUsefulConstraints}
        isOptimized={isOptimized}
        isOptimizing={isOptimizing}
        onResetOptimization={handleResetOptimization}
        isMinimized={isMinimized}
        onToggleMinimize={handleToggleMinimize}
      />

      {/* Warning when constraints are insufficient */}
      {hasModules && !hasUsefulConstraints && !isMinimized && (
        <div className="constraint-warning">
          <div className="warning-message">
            Please select more time slots in your availability to enable optimization.
            Select time slots when you're available for classes.
          </div>
        </div>
      )}

      {/* Optimization overlay */}
      {isOptimizing && (
        <div className="optimizing-overlay">
          <div className="optimizing-spinner"></div>
          <div>Optimizing your timetable...</div>
          <div className="optimization-details">
            Analyzing {Object.keys(selectedModules).length} modules with your time preferences
          </div>
        </div>
      )}

      {/* Main timetable display */}
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