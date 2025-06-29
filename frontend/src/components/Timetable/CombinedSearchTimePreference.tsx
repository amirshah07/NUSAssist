import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import './CombinedSearchTimePreference.css';

interface ModuleData {
  moduleCode: string;
  semesterData: any;
}

interface SelectedModule {
  [moduleCode: string]: any;
}

interface TimePreferenceData {
  [day: string]: {
    [time: string]: boolean;
  };
}
//


interface CombinedSearchTimePreferenceProps {
  onModulesUpdate?: (modules: SelectedModule) => void;
  onTimePreferencesChange: (preferences: TimePreferenceData) => void;
  onOptimize: () => Promise<void>;
  onSemesterChange?: (semester: "sem1" | "sem2") => void;
  currentSemester?: "sem1" | "sem2";
  initialModules?: SelectedModule;
  initialTimePreferences?: TimePreferenceData;
  disabled?: boolean;
  hasModules?: boolean;
  isOptimized?: boolean;
  isOptimizing?: boolean;
  onResetOptimization?: () => void;
  isMinimized?: boolean;
  onToggleMinimize?: () => void;
}

export default function CombinedSearchTimePreference({
  onModulesUpdate,
  onTimePreferencesChange,
  onOptimize,
  onSemesterChange,
  currentSemester = "sem1",
  initialModules = {},
  initialTimePreferences = {},
  disabled = false, 
  isOptimized = false,
  isOptimizing = false,
  onResetOptimization,
  isMinimized = false,
  onToggleMinimize
}: CombinedSearchTimePreferenceProps) {
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ModuleData[]>([]);
  const [selectedModules, setSelectedModules] = useState<SelectedModule>(initialModules);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  // Time preference state
  const [preferences, setPreferences] = useState<TimePreferenceData>(initialTimePreferences);
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState<'select' | 'deselect'>('select');

  // Refs
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  // Time configuration
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const startHour = 8;
  const endHour = 21;

  const generateTimeSlots = useCallback(() => {
    const slots: string[] = [];
    for (let hour = startHour; hour < endHour; hour++) {
      const timeString = `${hour.toString().padStart(2, '0')}00`;
      slots.push(timeString);
    }
    return slots;
  }, [startHour, endHour]);

  const timeSlots = generateTimeSlots();

  // Initialize preferences with all slots selected by default
  useEffect(() => {
    if (Object.keys(initialTimePreferences).length > 0) {
      setPreferences(initialTimePreferences);
      onTimePreferencesChange(initialTimePreferences);
    } else {
      const initialPreferences: TimePreferenceData = {};
      days.forEach(day => {
        initialPreferences[day] = {};
        timeSlots.forEach(time => {
          initialPreferences[day][time] = true;
        });
      });
      setPreferences(initialPreferences);
      onTimePreferencesChange(initialPreferences);
    }
  }, []);

  // Sync with external state changes
  useEffect(() => {
    setSelectedModules(initialModules);
  }, [initialModules]);

  useEffect(() => {
    if (Object.keys(initialTimePreferences).length > 0) {
      setPreferences(initialTimePreferences);
    }
  }, [initialTimePreferences]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Pass selected modules to parent
  useEffect(() => {
    if (onModulesUpdate) {
      onModulesUpdate(selectedModules);
    }
  }, [selectedModules, onModulesUpdate]);

  const handleSearchChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    setHighlightedIndex(-1);

    if (query.trim() === "") {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    // Ensure we use the latest semester value
    const tableName = currentSemester;
    console.log(`Searching in ${tableName} table for: ${query}`);

    try {
      // Small delay to ensure state consistency
      await new Promise(resolve => setTimeout(resolve, 50));

      const { data, error } = await supabase
        .from(tableName)
        .select("moduleCode, semesterData")
        .ilike("moduleCode", `%${query}%`)
        .limit(10);

      if (error) {
        console.error("Error fetching modules:", error.message);
        console.error("Table:", tableName, "Query:", query);
        console.error("Full error:", error);
        setSearchResults([]);
        setShowDropdown(false);
      } else {
        console.log(`Found ${data?.length || 0} results in ${tableName}:`, data);
        setSearchResults(data || []);
        setShowDropdown(data && data.length > 0);
      }
    } catch (error) {
      console.error("Search failed:", error);
      setSearchResults([]);
      setShowDropdown(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || searchResults.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < searchResults.length - 1 ? prev + 1 : 0
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : searchResults.length - 1
        );
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0) {
          selectModule(searchResults[highlightedIndex]);
        }
        break;
      case "Escape":
        setShowDropdown(false);
        setHighlightedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  const selectModule = (module: ModuleData) => {
    if (selectedModules[module.moduleCode]) {
      console.log("Module already selected:", module.moduleCode);
      return;
    }

    console.log("Selecting module:", module.moduleCode, "for semester:", currentSemester);

    setSelectedModules(prev => ({
      ...prev,
      [module.moduleCode]: module.semesterData
    }));

    setSearchQuery("");
    setSearchResults([]);
    setShowDropdown(false);
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  };

  const removeModule = (moduleCode: string) => {
    setSelectedModules(prev => {
      const updated = { ...prev };
      delete updated[moduleCode];
      return updated;
    });
  };

  const handleSemesterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSemester = e.target.value as "sem1" | "sem2";
    console.log(`Changing semester from ${currentSemester} to ${newSemester}`);
    
    // Clear search state immediately to prevent confusion
    setSearchQuery("");
    setSearchResults([]);
    setShowDropdown(false);
    setHighlightedIndex(-1);
    
    // Call parent's semester change handler
    if (onSemesterChange) {
      onSemesterChange(newSemester);
    }
  };

  // Time preference functions
  const formatTimeForDisplay = (timeString: string): string => {
    const hour = parseInt(timeString.substring(0, 2));
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:00 ${ampm}`;
  };

  const toggleTimeSlot = useCallback((day: string, time: string, forceValue?: boolean) => {
    setPreferences(currentPreferences => {
      const newPreferences = { ...currentPreferences };
      if (!newPreferences[day]) {
        newPreferences[day] = {};
      }
      
      const currentValue = newPreferences[day][time] || false;
      const newValue = forceValue !== undefined ? forceValue : !currentValue;
      newPreferences[day][time] = newValue;
      
      onTimePreferencesChange(newPreferences);
      return newPreferences;
    });
  }, [onTimePreferencesChange]);

  const handleMouseDown = useCallback((day: string, time: string, event: React.MouseEvent) => {
    if (disabled) return;
    
    event.preventDefault();
    event.stopPropagation();
    
    setIsDragging(true);
    
    const currentValue = preferences[day]?.[time] || false;
    const newMode = currentValue ? 'deselect' : 'select';
    setDragMode(newMode);
    
    toggleTimeSlot(day, time, newMode === 'select');
  }, [disabled, preferences, toggleTimeSlot]);

  const handleMouseEnter = useCallback((day: string, time: string, event: React.MouseEvent) => {
    if (!isDragging || disabled) return;
    
    event.preventDefault();
    
    const shouldSelect = dragMode === 'select';
    toggleTimeSlot(day, time, shouldSelect);
  }, [isDragging, disabled, dragMode, toggleTimeSlot]);

  const handleClick = useCallback((day: string, time: string, event: React.MouseEvent) => {
    if (disabled || isDragging) return;
    
    event.preventDefault();
    event.stopPropagation();
    
    toggleTimeSlot(day, time);
  }, [disabled, isDragging, toggleTimeSlot]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mouseleave', handleMouseUp);
    
    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mouseleave', handleMouseUp);
    };
  }, [handleMouseUp]);

  const clearAllSelections = useCallback(() => {
    const clearedPreferences: TimePreferenceData = {};
    days.forEach(day => {
      clearedPreferences[day] = {};
      timeSlots.forEach(time => {
        clearedPreferences[day][time] = false;
      });
    });
    setPreferences(clearedPreferences);
    onTimePreferencesChange(clearedPreferences);
  }, [days, timeSlots, onTimePreferencesChange]);

  const selectAllSlots = useCallback(() => {
    const allSelectedPreferences: TimePreferenceData = {};
    days.forEach(day => {
      allSelectedPreferences[day] = {};
      timeSlots.forEach(time => {
        allSelectedPreferences[day][time] = true;
      });
    });
    setPreferences(allSelectedPreferences);
    onTimePreferencesChange(allSelectedPreferences);
  }, [days, timeSlots, onTimePreferencesChange]);

  const getSelectedCount = useCallback(() => {
    let count = 0;
    days.forEach(day => {
      timeSlots.forEach(time => {
        if (preferences[day]?.[time]) {
          count++;
        }
      });
    });
    return count;
  }, [days, timeSlots, preferences]);

  // Calculate derived values
  const modulesExist = Object.keys(selectedModules).length > 0;
  const selectedCount = getSelectedCount();
  const totalSlots = days.length * timeSlots.length;
  const hasUsefulConstraints = selectedCount >= Math.max(5, totalSlots * 0.1);

  const handleOptimizeClick = async () => {
    if (disabled || !modulesExist || isOptimizing || !hasUsefulConstraints) return;
    
    try {
      await onOptimize();
    } catch (error) {
      console.error('Optimization failed:', error);
    }
  };

  const handleContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
  }, []);

  if (isMinimized) {
    return (
      <div className="combined-search-minimized">
        <div className="minimized-content">
          <div className="minimized-info">
            <span className="modules-count">{Object.keys(selectedModules).length} modules</span>
            <span className="slots-count">{totalSlots - selectedCount} time slots blocked</span>
            {isOptimized && <span className="optimized-badge">✨ Optimized</span>}
          </div>
          <div className="minimized-controls">
            {isOptimized && onResetOptimization && (
              <button className="reset-button" onClick={onResetOptimization}>
                Reset
              </button>
            )}
            <button className="expand-button" onClick={onToggleMinimize}>
              Expand
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`combined-search-container ${disabled ? 'disabled' : ''}`}>
      <div className="combined-header">
        <h1>Plan Your Timetable</h1>
        {onToggleMinimize && (
          <button className="minimize-button" onClick={onToggleMinimize}>
            ×
          </button>
        )}
      </div>

      {/* Search Section */}
      <div className="search-section">
        <div className="semester-selector">
          <label htmlFor="semester-select">Planning for:</label>
          <select 
            id="semester-select"
            value={currentSemester} 
            onChange={handleSemesterChange}
            className="semester-dropdown"
          >
            <option value="sem1">Semester 1</option>
            <option value="sem2">Semester 2</option>
          </select>
        </div>

        {Object.keys(selectedModules).length > 0 && (
          <div className="selected-modules">
            <h3>Selected modules for {currentSemester}:</h3>
            <div className="module-tags">
              {Object.keys(selectedModules).map(moduleCode => (
                <span key={moduleCode} className="module-tag">
                  {moduleCode}
                  <button
                    type="button"
                    onClick={() => removeModule(moduleCode)}
                    className="remove-btn"
                    aria-label={`Remove ${moduleCode}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="input-container" ref={dropdownRef}>
          <input
            ref={inputRef}
            type="text"
            placeholder={`Search ${currentSemester} modules by code`}
            value={searchQuery}
            onChange={handleSearchChange}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (searchResults.length > 0) {
                setShowDropdown(true);
              }
            }}
            autoComplete="off"
          />

          {showDropdown && searchResults.length > 0 && (
            <div className="dropdown">
              {searchResults.map((result, index) => (
                <div
                  key={result.moduleCode}
                  className={`dropdown-item ${index === highlightedIndex ? 'highlighted' : ''} ${
                    selectedModules[result.moduleCode] ? 'already-selected' : ''
                  }`}
                  onClick={() => selectModule(result)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                >
                  <span className="module-code">{result.moduleCode}</span>
                  {selectedModules[result.moduleCode] && (
                    <span className="selected-indicator">✓ already added</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {showDropdown && searchQuery && searchResults.length === 0 && (
            <div className="dropdown">
              <div className="dropdown-item no-results">
                No modules found for "{searchQuery}" in {currentSemester}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Time Preference Section */}
      {modulesExist && (
        <div className="time-preference-section">
          <div className="time-preference-header">
            <h3>When are you NOT available for classes?</h3>
            <div className="grid-controls">
              <div className="selection-info">
                {totalSlots - selectedCount} of {totalSlots} time slots blocked (8AM-9PM)
              </div>
              <div className="control-buttons">
                <button 
                  className="control-button clear-button"
                  onClick={selectAllSlots}
                  disabled={disabled || selectedCount === totalSlots}
                >
                  Available All Times
                </button>
                <button 
                  className="control-button select-all-button"
                  onClick={clearAllSelections}
                  disabled={disabled || selectedCount === 0}
                >
                  Block All Times
                </button>
              </div>
            </div>
          </div>

          <div className="grid-instructions">
            <p>Click and drag to block times when you're NOT available for classes. Green = available, Red = blocked.</p>
          </div>

          <div 
            className="time-preference-grid"
            ref={gridRef}
            onContextMenu={handleContextMenu}
          >
            <div className="grid-header">
              <div className="time-column-header">Time</div>
              {days.map(day => (
                <div key={day} className="day-header">
                  {day.substring(0, 3)}
                </div>
              ))}
            </div>

            <div className="grid-body">
              {timeSlots.map(time => (
                <div key={time} className="time-row">
                  <div className="time-label">
                    {formatTimeForDisplay(time)}
                  </div>
                  {days.map(day => {
                    const isSelected = preferences[day]?.[time] || false;
                    return (
                      <div
                        key={`${day}-${time}`}
                        className={`time-slot ${isSelected ? 'available' : 'blocked'} ${isDragging ? 'dragging' : ''}`}
                        onMouseDown={(e) => handleMouseDown(day, time, e)}
                        onMouseEnter={(e) => handleMouseEnter(day, time, e)}
                        onClick={(e) => handleClick(day, time, e)}
                        data-day={day}
                        data-time={time}
                        style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
                      >
                        <div className="slot-content">
                          <div className="selection-indicator">
                            {isSelected ? '✓' : '✕'}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          <div className="usage-hint">
            <strong>Tip:</strong> Block times when you're NOT available for classes. 
            Green slots = available, Red slots = blocked. The optimizer will avoid scheduling classes during blocked times.
          </div>
        </div>
      )}

      {/* Optimize Section */}
      {modulesExist && (
        <div className="optimize-section">
          <div className="optimize-button-container">
            <button
              className={`optimize-button ${!hasUsefulConstraints || isOptimizing ? 'disabled' : ''} ${isOptimizing ? 'optimizing' : ''}`}
              onClick={handleOptimizeClick}
              disabled={!hasUsefulConstraints || isOptimizing}
            >
              {isOptimizing && <div className="spinner"></div>}
              <span>
                {isOptimizing ? 'Optimizing...' : 'Optimize Timetable'}
              </span>
            </button>
            
            {!hasUsefulConstraints && (
              <p className="helper-text">
                Please select more time slots to enable optimization. 
                You need at least {Math.max(5, Math.ceil(totalSlots * 0.1))} slots selected.
              </p>
            )}
          </div>

          {isOptimized && onResetOptimization && (
            <div className="optimization-status">
              <div className="status-message">
                Timetable optimized based on your time preferences!
              </div>
              <button 
                className="reset-button"
                onClick={onResetOptimization}
              >
                Reset to Original
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}