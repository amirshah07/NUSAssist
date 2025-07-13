import { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import { TimeUtils } from './TimeUtils';
import type { TimePreferenceData } from './types';
import './TimePreferenceGrid.css';

interface TimePreferenceGridProps {
  isOpen: boolean;
  onClose: () => void;
  onOptimize: (preferences: TimePreferenceData) => Promise<void>;
  initialTimePreferences?: TimePreferenceData;
  isOptimizing?: boolean;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const START_HOUR = 8;
const END_HOUR = 22;

export default function TimePreferenceGrid({
  isOpen,
  onClose,
  onOptimize,
  initialTimePreferences = {},
  isOptimizing = false
}: TimePreferenceGridProps) {
  const [preferences, setPreferences] = useState<TimePreferenceData>({});
  const [isDragging, setIsDragging] = useState(false);
  const [dragValue, setDragValue] = useState(true);
  const gridRef = useRef<HTMLDivElement>(null);

  const timeSlots = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => 
    `${(START_HOUR + i).toString().padStart(2, '0')}00`
  );

  useEffect(() => {
    if (Object.keys(initialTimePreferences).length > 0) {
      setPreferences(initialTimePreferences);
    } else {
      const initialPrefs: TimePreferenceData = {};
      DAYS.forEach(day => {
        initialPrefs[day] = {};
        timeSlots.forEach(time => {
          initialPrefs[day][time] = true;
        });
      });
      setPreferences(initialPrefs);
    }
  }, [initialTimePreferences]);

  function toggleTimeSlot(day: string, time: string, value?: boolean) {
    setPreferences(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [time]: value !== undefined ? value : !prev[day]?.[time]
      }
    }));
  }

  function handleMouseDown(day: string, time: string, event: React.MouseEvent) {
    if (isOptimizing) return;
    
    event.preventDefault();
    const newValue = !preferences[day]?.[time];
    
    setIsDragging(true);
    setDragValue(newValue);
    toggleTimeSlot(day, time, newValue);
  }

  function handleMouseEnter(day: string, time: string) {
    if (!isDragging || isOptimizing) return;
    toggleTimeSlot(day, time, dragValue);
  }

  function handleClick(day: string, time: string, event: React.MouseEvent) {
    if (isOptimizing || isDragging) return;
    event.preventDefault();
    toggleTimeSlot(day, time);
  }

  useEffect(() => {
    function handleMouseUp() {
      setIsDragging(false);
    }
    
    if (isDragging) {
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('mouseleave', handleMouseUp);
      
      return () => {
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('mouseleave', handleMouseUp);
      };
    }
  }, [isDragging]);

  function setAllSlots(value: boolean) {
    const newPreferences: TimePreferenceData = {};
    DAYS.forEach(day => {
      newPreferences[day] = {};
      timeSlots.forEach(time => {
        newPreferences[day][time] = value;
      });
    });
    setPreferences(newPreferences);
  }

  const selectedCount = DAYS.reduce((total, day) => 
    total + timeSlots.filter(time => preferences[day]?.[time]).length, 0
  );
  const totalSlots = DAYS.length * timeSlots.length;
  const blockedCount = totalSlots - selectedCount;

  async function handleOptimizeClick() {
    if (!isOptimizing) {
      await onOptimize(preferences);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container time-preference-modal-size" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Select Your Available Times</h3>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="time-preference-content">
          <div className="time-preference-header">
            <div className="grid-controls">
              <div className="selection-info">
                {selectedCount} available, {blockedCount} blocked
              </div>
              <div className="control-buttons">
                <button 
                  className="control-button"
                  onClick={() => setAllSlots(true)}
                  disabled={isOptimizing}
                >
                  All Available
                </button>
                <button 
                  className="control-button"
                  onClick={() => setAllSlots(false)}
                  disabled={isOptimizing}
                >
                  All Blocked
                </button>
              </div>
            </div>
          </div>

          <div className="grid-instructions">
            <p>Click and drag to select when you ARE available for classes. Green = available, Red = blocked.</p>
          </div>

          <div className="time-preference-grid" ref={gridRef}>
            <div className="grid-header">
              <div className="time-column-header">TIME</div>
              {DAYS.map(day => (
                <div key={day} className="day-header">
                  {day.substring(0, 3).toUpperCase()}
                </div>
              ))}
            </div>

            <div className="grid-body">
              {timeSlots.map(time => (
                <div key={time} className="time-row">
                  <div className="time-label">
                    {TimeUtils.formatDisplay(time)}
                  </div>
                  {DAYS.map(day => {
                    const isAvailable = preferences[day]?.[time] || false;
                    return (
                      <div
                        key={`${day}-${time}`}
                        className={`time-slot ${isAvailable ? 'available' : 'blocked'}`}
                        onMouseDown={(e) => handleMouseDown(day, time, e)}
                        onMouseEnter={() => handleMouseEnter(day, time)}
                        onClick={(e) => handleClick(day, time, e)}
                        style={{ cursor: isOptimizing ? 'not-allowed' : 'pointer' }}
                      >
                        <div className="slot-content">
                          <div className="selection-indicator">
                            {isAvailable ? '✓' : '✕'}
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
            <strong>Tip:</strong> Select times when you ARE available for classes. 
            The optimizer will try to schedule your classes during these green time slots.
          </div>

          <div className="optimize-section">
            <div className="optimize-button-container">
              <button className="btn btn-cancel" onClick={onClose}>
                Cancel
              </button>
              <button
                className={`btn btn-primary ${isOptimizing ? 'optimizing' : ''}`}
                onClick={handleOptimizeClick}
                disabled={isOptimizing}
              >
                {isOptimizing && <div className="spinner"></div>}
                <span>{isOptimizing ? 'Optimizing...' : 'Optimize'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}