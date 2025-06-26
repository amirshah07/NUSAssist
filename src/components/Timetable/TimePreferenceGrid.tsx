import { useState, useCallback, useRef, useEffect } from 'react';
import './TimePreferenceGrid.css';

interface TimeSlot {
  day: string;
  time: string;
  isPreferred: boolean;
}

interface TimePreferenceData {
  [day: string]: {
    [time: string]: boolean;
  };
}

interface TimePreferenceGridProps {
  onPreferencesChange: (preferences: TimePreferenceData) => void;
  disabled?: boolean;
}

const TimePreferenceGrid = ({ onPreferencesChange, disabled = false }: TimePreferenceGridProps) => {
  const [preferences, setPreferences] = useState<TimePreferenceData>({});
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState<'select' | 'deselect'>('select');
  const gridRef = useRef<HTMLDivElement>(null);

  // Time configuration - changed to 1-hour blocks
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const startHour = 7;
  const endHour = 19;
  const timeSlotDuration = 60; // Changed to 60 minutes (1 hour)

  // Generate time slots - now generates hourly slots
  const generateTimeSlots = useCallback(() => {
    const slots: string[] = [];
    for (let hour = startHour; hour < endHour; hour++) {
      // Only create slots at the top of each hour
      const timeString = `${hour.toString().padStart(2, '0')}00`;
      slots.push(timeString);
    }
    return slots;
  }, [startHour, endHour]);

  const timeSlots = generateTimeSlots();

  // Initialize preferences with all slots set to false
  useEffect(() => {
    const initialPreferences: TimePreferenceData = {};
    days.forEach(day => {
      initialPreferences[day] = {};
      timeSlots.forEach(time => {
        initialPreferences[day][time] = false;
      });
    });
    setPreferences(initialPreferences);
    onPreferencesChange(initialPreferences);
  }, []);

  // Helper function to format time for display
  const formatTimeForDisplay = (timeString: string): string => {
    const hour = parseInt(timeString.substring(0, 2));
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:00 ${ampm}`;
  };

  // Toggle a single time slot
  const toggleTimeSlot = useCallback((day: string, time: string, forceValue?: boolean) => {
    setPreferences(currentPreferences => {
      const newPreferences = { ...currentPreferences };
      if (!newPreferences[day]) {
        newPreferences[day] = {};
      }
      
      const currentValue = newPreferences[day][time] || false;
      const newValue = forceValue !== undefined ? forceValue : !currentValue;
      newPreferences[day][time] = newValue;
      
      onPreferencesChange(newPreferences);
      return newPreferences;
    });
  }, [onPreferencesChange]);

  // Handle mouse down on a time slot
  const handleMouseDown = useCallback((day: string, time: string, event: React.MouseEvent) => {
    if (disabled) return;
    
    event.preventDefault();
    event.stopPropagation();
    
    console.log('Mouse down on:', day, time); // Debug log
    
    setIsDragging(true);
    
    const currentValue = preferences[day]?.[time] || false;
    const newMode = currentValue ? 'deselect' : 'select';
    setDragMode(newMode);
    
    toggleTimeSlot(day, time, newMode === 'select');
  }, [disabled, preferences, toggleTimeSlot]);

  // Handle mouse enter while dragging
  const handleMouseEnter = useCallback((day: string, time: string, event: React.MouseEvent) => {
    if (!isDragging || disabled) return;
    
    event.preventDefault();
    console.log('Mouse enter while dragging:', day, time); // Debug log
    
    const shouldSelect = dragMode === 'select';
    toggleTimeSlot(day, time, shouldSelect);
  }, [isDragging, disabled, dragMode, toggleTimeSlot]);

  // Handle single click (for touch devices and simple clicks)
  const handleClick = useCallback((day: string, time: string, event: React.MouseEvent) => {
    if (disabled || isDragging) return;
    
    event.preventDefault();
    event.stopPropagation();
    
    console.log('Click on:', day, time); // Debug log
    toggleTimeSlot(day, time);
  }, [disabled, isDragging, toggleTimeSlot]);

  // Handle mouse up anywhere
  const handleMouseUp = useCallback((event: MouseEvent) => {
    console.log('Mouse up - stopping drag'); // Debug log
    setIsDragging(false);
  }, []);

  // Add global mouse up listener
  useEffect(() => {
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mouseleave', handleMouseUp);
    
    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mouseleave', handleMouseUp);
    };
  }, [handleMouseUp]);

  // Handle context menu (right click)
  const handleContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
  }, []);

  // Clear all selections
  const clearAllSelections = useCallback(() => {
    const clearedPreferences: TimePreferenceData = {};
    days.forEach(day => {
      clearedPreferences[day] = {};
      timeSlots.forEach(time => {
        clearedPreferences[day][time] = false;
      });
    });
    setPreferences(clearedPreferences);
    onPreferencesChange(clearedPreferences);
  }, [days, timeSlots, onPreferencesChange]);

  // Select all slots
  const selectAllSlots = useCallback(() => {
    const allSelectedPreferences: TimePreferenceData = {};
    days.forEach(day => {
      allSelectedPreferences[day] = {};
      timeSlots.forEach(time => {
        allSelectedPreferences[day][time] = true;
      });
    });
    setPreferences(allSelectedPreferences);
    onPreferencesChange(allSelectedPreferences);
  }, [days, timeSlots, onPreferencesChange]);

  // Count selected slots
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

  const selectedCount = getSelectedCount();
  const totalSlots = days.length * timeSlots.length;

  return (
    <div className={`time-preference-container ${disabled ? 'disabled' : ''}`}>
      <div className="time-preference-header">
        <h3>When are you available for classes?</h3>
        <div className="grid-controls">
          <div className="selection-info">
            {selectedCount} of {totalSlots} time slots selected
          </div>
          <div className="control-buttons">
            <button 
              className="control-button clear-button"
              onClick={clearAllSelections}
              disabled={disabled || selectedCount === 0}
            >
              Clear All
            </button>
            <button 
              className="control-button select-all-button"
              onClick={selectAllSlots}
              disabled={disabled || selectedCount === totalSlots}
            >
              Select All
            </button>
          </div>
        </div>
      </div>

      <div className="grid-instructions">
        <p>Click and drag to select your preferred class times (1-hour blocks). The optimizer will try to schedule your classes within these time slots.</p>
      </div>

      <div 
        className="time-preference-grid"
        ref={gridRef}
        onContextMenu={handleContextMenu}
      >
        {/* Header row with days */}
        <div className="grid-header">
          <div className="time-column-header">Time</div>
          {days.map(day => (
            <div key={day} className="day-header">
              {day.substring(0, 3)}
            </div>
          ))}
        </div>

        {/* Time rows */}
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
                    className={`time-slot ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging' : ''}`}
                    onMouseDown={(e) => handleMouseDown(day, time, e)}
                    onMouseEnter={(e) => handleMouseEnter(day, time, e)}
                    onClick={(e) => handleClick(day, time, e)}
                    data-day={day}
                    data-time={time}
                    style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
                  >
                    <div className="slot-content">
                      {isSelected && <div className="selection-indicator">✓</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="grid-footer">
        <div className="usage-hint">
          <strong>Tip:</strong> Select more time slots for better optimization results. 
          Each block represents a 1-hour period. The system will prioritize scheduling classes within your selected times.
        </div>
        <div className="debug-info" style={{ fontSize: '0.8rem', color: '#666', marginTop: '8px' }}>
          Debug: Selected {selectedCount} slots, Dragging: {isDragging ? 'Yes' : 'No'}
        </div>
      </div>
    </div>
  );
};

export default TimePreferenceGrid;