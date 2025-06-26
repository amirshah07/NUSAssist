import { useEffect, useState, useCallback } from 'react';
import { Calendar, Views, type View } from 'react-big-calendar';
import { dayjsLocalizer } from 'react-big-calendar';
import dayjs from 'dayjs';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './TimetableComponent.css';

const localizer = dayjsLocalizer(dayjs);

interface TimetableBlock {
  moduleCode: string;
  lessonType: string;
  classNo: string;
  day: string;
  startTime: string;
  endTime: string;
  venue: string;
  color: string;
  originalEntry?: any;
}

interface CalendarEvent {
  title: string;
  start: Date;
  end: Date;
  resource: string;
  moduleCode: string;
  lessonType: string;
  color: string;
  isAlternative?: boolean;
  venue: string;
  classNo: string;
}

interface SelectedModule {
  [moduleCode: string]: any;
}

interface TimetableComponentProps {
  selectedModules: SelectedModule;
  selectedSemester?: "sem1" | "sem2";
  onModulesUpdate?: (modules: SelectedModule) => void;
  isOptimized?: boolean;
}

interface AlternativeLessonState {
  moduleCode: string;
  lessonType: string;
  alternatives: TimetableBlock[];
}

const mapBlocksToEvents = (blocks: TimetableBlock[], alternativeState?: AlternativeLessonState | null) => {
  const dayToDate = {
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
  };

  return blocks.map((block) => {
    const start = new Date();
    const end = new Date();

    start.setDate(start.getDate() - start.getDay() + dayToDate[block.day as keyof typeof dayToDate]);
    end.setDate(end.getDate() - end.getDay() + dayToDate[block.day as keyof typeof dayToDate]);

    const [startHour, startMinute] = block.startTime.split(':').map(Number);
    const [endHour, endMinute] = block.endTime.split(':').map(Number);

    start.setHours(startHour, startMinute, 0, 0);
    end.setHours(endHour, endMinute, 0, 0);

    const isAlternative = alternativeState && 
      block.moduleCode === alternativeState.moduleCode && 
      block.lessonType === alternativeState.lessonType;

    return {
      title: `${block.moduleCode} (${block.lessonType})`,
      start,
      end,
      resource: `${block.venue} | Class ${block.classNo}`,
      moduleCode: block.moduleCode,
      lessonType: block.lessonType,
      color: isAlternative ? '#9C27B0' : block.color,
      isAlternative: !!isAlternative,
      venue: block.venue,
      classNo: block.classNo,
    };
  });
};

const getColorForLessonType = (lessonType: string): string => {
  switch (lessonType) {
    case 'Lecture':
      return '#4285F4';
    case 'Tutorial':
      return '#34A853';
    case 'Laboratory':
      return '#EA4335';
    case 'Recitation':
      return '#FBBC05';
    case 'Workshop':
      return '#9C27B0';
    case 'Seminar':
      return '#FF9800';
    default:
      return '#9E9E9E';
  }
};

const TimetableComponent = ({ 
  selectedModules, 
  selectedSemester = "sem1", 
  onModulesUpdate,
  isOptimized = false 
}: TimetableComponentProps) => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [view, setView] = useState<View>(Views.WEEK);
  const [date, setDate] = useState<Date>(new Date());
  const [lessonTypeFilter, setLessonTypeFilter] = useState<string>('');
  const [availableLessonTypes, setAvailableLessonTypes] = useState<string[]>([]);
  const [originalModules, setOriginalModules] = useState<SelectedModule>({});
  const [showingAlternatives, setShowingAlternatives] = useState<AlternativeLessonState | null>(null);

  // Custom event component to show module, lesson type, class number and venue
  const CustomEvent = ({ event }: { event: CalendarEvent }) => (
    <div className="custom-event">
      <div className="event-title">{event.moduleCode}</div>
      <div className="event-subtitle">{event.lessonType}</div>
      <div className="event-details">
        <div className="event-class">Class {event.classNo}</div>
        <div className="event-venue">{event.venue}</div>
      </div>
    </div>
  );

  const onViewChange = useCallback((newView: View) => {
    setView(newView);
  }, []);

  const onNavigate = useCallback((newDate: Date) => {
    setDate(newDate);
  }, []);

  // Store original modules for lesson switching when optimized
  useEffect(() => {
    if (!isOptimized && Object.keys(selectedModules).length > 0) {
      setOriginalModules(selectedModules);
    }
  }, [selectedModules, isOptimized]);

  const getUniqueLessonBlocks = (modules: SelectedModule, includeAlternatives = false) => {
    let allBlocks: TimetableBlock[] = [];
    let lessonTypes: Set<string> = new Set();

    Object.entries(modules).forEach(([moduleCode, moduleData]) => {
      if (!moduleData?.timetable) return;

      let timetableEntries = moduleData.timetable;
      
      if (!isOptimized && !includeAlternatives) {
        // For non-optimized, group by lesson type and pick first one for each type
        const timetableEntriesMap = new Map();
        moduleData.timetable.forEach((entry: any) => {
          if (lessonTypeFilter && entry.lessonType !== lessonTypeFilter) return;
          
          if (!timetableEntriesMap.has(entry.lessonType)) {
            timetableEntriesMap.set(entry.lessonType, entry);
          }
          lessonTypes.add(entry.lessonType);
        });
        timetableEntries = Array.from(timetableEntriesMap.values());
      } else {
        // For optimized or when showing alternatives, respect filter but include all lessons
        timetableEntries = moduleData.timetable.filter((entry: any) => {
          lessonTypes.add(entry.lessonType);
          return !lessonTypeFilter || entry.lessonType === lessonTypeFilter;
        });
      }

      const moduleBlocks = timetableEntries.map((entry: any) => {
        const formatTime = (timeStr: string) => {
          if (timeStr.length === 4) {
            return `${timeStr.slice(0, 2)}:${timeStr.slice(2)}`;
          }
          return timeStr;
        };

        const block = {
          moduleCode,
          lessonType: entry.lessonType,
          classNo: entry.classNo,
          day: entry.day,
          startTime: formatTime(entry.startTime),
          endTime: formatTime(entry.endTime),
          venue: entry.venue,
          color: getColorForLessonType(entry.lessonType),
          originalEntry: entry
        };

        return block;
      });

      allBlocks.push(...moduleBlocks);
    });

    setAvailableLessonTypes(Array.from(lessonTypes));
    return allBlocks;
  };

  const getAllAlternativesForLesson = (moduleCode: string, lessonType: string): TimetableBlock[] => {
    const sourceModules = isOptimized && Object.keys(originalModules).length > 0 
      ? originalModules 
      : selectedModules;
    
    const alternatives: TimetableBlock[] = [];
    const semesterData = sourceModules[moduleCode];
    
    if (semesterData?.timetable) {
      semesterData.timetable.forEach((entry: any) => {
        if (entry.lessonType === lessonType) {
          const formatTime = (timeStr: string) => {
            if (timeStr.length === 4) {
              return `${timeStr.slice(0, 2)}:${timeStr.slice(2)}`;
            }
            return timeStr;
          };

          alternatives.push({
            moduleCode,
            lessonType: entry.lessonType,
            classNo: entry.classNo,
            day: entry.day,
            startTime: formatTime(entry.startTime),
            endTime: formatTime(entry.endTime),
            venue: entry.venue,
            color: getColorForLessonType(entry.lessonType),
            originalEntry: entry
          });
        }
      });
    }
    
    return alternatives;
  };

  const handleEventClick = (event: CalendarEvent) => {
    if (event.isAlternative && showingAlternatives) {
      // User clicked on an alternative lesson - select it
      handleAlternativeSelection(event);
    } else if (!event.isAlternative) {
      // User clicked on a regular lesson - show alternatives
      showAlternativesForLesson(event.moduleCode, event.lessonType);
    }
  };

  const showAlternativesForLesson = (moduleCode: string, lessonType: string) => {
    const alternatives = getAllAlternativesForLesson(moduleCode, lessonType);
    
    if (alternatives.length <= 1) {
      console.log('No alternatives available for this lesson');
      return;
    }

    console.log(`Showing ${alternatives.length} alternatives for ${moduleCode} ${lessonType}`);
    
    setShowingAlternatives({
      moduleCode,
      lessonType,
      alternatives
    });
  };

  const handleAlternativeSelection = (selectedEvent: CalendarEvent) => {
    if (!showingAlternatives) return;

    const { moduleCode, lessonType } = showingAlternatives;
    
    // Find the selected alternative lesson block
    const selectedAlternative = showingAlternatives.alternatives.find(alt => {
      const eventDay = dayjs(selectedEvent.start).format('dddd');
      const eventStartTime = dayjs(selectedEvent.start).format('HH:mm');
      
      return alt.day === eventDay && alt.startTime === eventStartTime;
    });

    if (!selectedAlternative) {
      console.error('Could not find selected alternative');
      return;
    }

    console.log(`Selected alternative: ${selectedAlternative.day} ${selectedAlternative.startTime}`);

    // Update the modules
    const updatedModules = { ...selectedModules };
    const currentTimetable = [...updatedModules[moduleCode].timetable];

    // Remove existing entries for this lesson type
    const newTimetable = currentTimetable.filter((e: any) => e.lessonType !== lessonType);

    // Add the selected alternative
    newTimetable.push(selectedAlternative.originalEntry);

    updatedModules[moduleCode] = {
      ...updatedModules[moduleCode],
      timetable: newTimetable
    };

    // Call parent update
    if (onModulesUpdate) {
      onModulesUpdate(updatedModules);
    }

    // Clear the alternatives view
    setShowingAlternatives(null);
  };

  const handleBackgroundClick = () => {
    // Clear alternatives when clicking on empty space
    if (showingAlternatives) {
      setShowingAlternatives(null);
    }
  };

  const eventStyleGetter = (event: CalendarEvent) => {
    let backgroundColor = event.color;
    let borderColor = event.color;
    let opacity = 1;

    if (showingAlternatives) {
      if (event.isAlternative) {
        // Alternative lessons are highlighted
        backgroundColor = '#9C27B0';
        borderColor = '#7B1FA2';
        opacity = 0.9;
      } else if (event.moduleCode === showingAlternatives.moduleCode && 
                event.lessonType === showingAlternatives.lessonType) {
        // Current selected lesson is dimmed
        opacity = 0.4;
      } else {
        // Other lessons are dimmed
        opacity = 0.3;
      }
    }

    return {
      style: {
        backgroundColor,
        borderColor,
        opacity,
        color: 'white',
        borderRadius: '4px',
        border: `2px solid ${borderColor}`,
        padding: '2px 6px',
        fontSize: '0.75rem',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      },
    };
  };

  // Calendar display hours - Full 24 hours (12am to 12am)
  const minTime = new Date();
  minTime.setHours(0, 0, 0); // 12:00 AM (midnight)

  const maxTime = new Date();
  maxTime.setHours(23, 59, 59); // 11:59 PM

  // Process selected modules into calendar events
  useEffect(() => {
    if (!selectedModules || Object.keys(selectedModules).length === 0) {
      setEvents([]);
      setAvailableLessonTypes([]);
      setShowingAlternatives(null);
      return;
    }

    let blocks = getUniqueLessonBlocks(selectedModules);
    
    // If showing alternatives, add them to the display
    if (showingAlternatives) {
      blocks = [...blocks, ...showingAlternatives.alternatives];
    }

    setEvents(mapBlocksToEvents(blocks, showingAlternatives || undefined));
  }, [selectedModules, lessonTypeFilter, isOptimized, showingAlternatives]);

  return (
    <div style={{ height: '100vh', padding: 16 }}>
      {/* Timetable controls */}
      <div className="timetable-controls">
        <div className="semester-info">
          <span>
            {isOptimized ? 'Optimized timetable' : 'Manual timetable'} for {selectedSemester} (24 Hours)
          </span>
        </div>

        {availableLessonTypes.length > 0 && (
          <div className="input-group">
            <label htmlFor="lessonTypeFilter">Filter by lesson type:</label>
            <select
              id="lessonTypeFilter"
              value={lessonTypeFilter}
              onChange={(e) => setLessonTypeFilter(e.target.value)}
            >
              <option value="">All lesson types</option>
              {availableLessonTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
        )}

        {Object.keys(selectedModules).length > 0 && (
          <div className="modules-info">
            <span>Modules: {Object.keys(selectedModules).join(', ')}</span>
          </div>
        )}

        {showingAlternatives && (
          <div className="alternatives-info">
            <span>Showing alternatives for {showingAlternatives.moduleCode} {showingAlternatives.lessonType}</span>
            <button 
              className="cancel-alternatives"
              onClick={() => setShowingAlternatives(null)}
            >
              Cancel
            </button>
          </div>
        )}

        {isOptimized && !showingAlternatives && (
          <div className="optimization-badge">
            <span className="badge">✨ Optimized</span>
          </div>
        )}
      </div>

      {/* Instructions */}
      {showingAlternatives && (
        <div className="alternatives-instructions">
          <p>
            <strong>Click on a purple alternative lesson</strong> to switch to that time slot.
            Click "Cancel" or on empty space to stop viewing alternatives.
          </p>
        </div>
      )}

      {/* Main calendar */}
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        views={[Views.DAY, Views.WEEK, Views.MONTH, Views.AGENDA]}
        defaultView={view}
        onView={onViewChange}
        date={date}
        onNavigate={onNavigate}
        style={{ height: 'calc(100% - 120px)' }}
        eventPropGetter={eventStyleGetter}
        min={minTime}
        max={maxTime}
        dayLayoutAlgorithm="no-overlap"
        toolbar={true}
        onSelectEvent={handleEventClick}
        onSelectSlot={handleBackgroundClick}
        selectable={true}
        components={{
          event: CustomEvent,
        }}
      />

      {/* Show message if no modules selected */}
      {Object.keys(selectedModules).length === 0 && (
        <div className="no-modules-message">
          <p>No modules selected yet. Use the search bar to add modules to your timetable.</p>
        </div>
      )}
    </div>
  );
};

export default TimetableComponent;