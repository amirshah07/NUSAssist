import { useEffect, useState } from 'react';
import { Calendar, Views } from 'react-big-calendar';
import { dayjsLocalizer } from 'react-big-calendar';
import dayjs from 'dayjs';
import { supabase } from '../../lib/supabaseClient';
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

const getColorForModule = (moduleCode: string): string => {
  const moduleColors = [
    '#3b82f6', // Blue
    '#10b981', // Emerald  
    '#f59e0b', // Amber
    '#ef4444', // Red
    '#8b5cf6', // Violet
    '#06b6d4', // Cyan
    '#84cc16', // Lime
    '#f97316', // Orange
    '#ec4899', // Pink
    '#6366f1', // Indigo
    '#14b8a6', // Teal
    '#eab308', // Yellow
  ];
  

  let hash = 0;
  for (let i = 0; i < moduleCode.length; i++) {
    hash = moduleCode.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return moduleColors[Math.abs(hash) % moduleColors.length];
};

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
      color: isAlternative ? '#7c3aed' : block.color, // Purple for alternatives
      isAlternative: !!isAlternative,
      venue: block.venue,
      classNo: block.classNo,
    };
  });
};

const TimetableComponent = ({ 
  selectedModules, 
  selectedSemester = "sem1", 
  onModulesUpdate,
  isOptimized = false 
}: TimetableComponentProps) => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [lessonTypeFilter, setLessonTypeFilter] = useState<string>('');
  const [availableLessonTypes, setAvailableLessonTypes] = useState<string[]>([]);
  const [showingAlternatives, setShowingAlternatives] = useState<AlternativeLessonState | null>(null);
  const [isLoadingAlternatives, setIsLoadingAlternatives] = useState(false);

  // Custom event component
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

  const getUniqueLessonBlocks = (modules: SelectedModule, includeAlternatives = false) => {
    let allBlocks: TimetableBlock[] = [];
    let lessonTypes: Set<string> = new Set();

    Object.entries(modules).forEach(([moduleCode, moduleData]) => {
      if (!moduleData?.timetable) return;

      let timetableEntries = moduleData.timetable;
      
      if (!isOptimized && !includeAlternatives) {
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

        return {
          moduleCode,
          lessonType: entry.lessonType,
          classNo: entry.classNo,
          day: entry.day,
          startTime: formatTime(entry.startTime),
          endTime: formatTime(entry.endTime),
          venue: entry.venue,
          color: getColorForModule(moduleCode),
          originalEntry: entry
        };
      });

      allBlocks.push(...moduleBlocks);
    });

    setAvailableLessonTypes(Array.from(lessonTypes));
    return allBlocks;
  };

  // Fetch alternatives directly from database
  const fetchAlternativesFromDatabase = async (moduleCode: string, lessonType: string): Promise<TimetableBlock[]> => {
    try {
      setIsLoadingAlternatives(true);
      
      const { data, error } = await supabase
        .from(selectedSemester)
        .select('semesterData')
        .eq('moduleCode', moduleCode)
        .single();

      if (error) {
        console.error('Error fetching module data:', error);
        return [];
      }

      if (!data?.semesterData?.timetable) {
        console.warn('No timetable data found for module:', moduleCode);
        return [];
      }

      const alternatives: TimetableBlock[] = [];
      
      data.semesterData.timetable.forEach((entry: any) => {
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
            color: getColorForModule(moduleCode),
            originalEntry: entry
          });
        }
      });

      console.log(`Found ${alternatives.length} alternatives for ${moduleCode} ${lessonType}`);
      return alternatives;
      
    } catch (error) {
      console.error('Failed to fetch alternatives:', error);
      return [];
    } finally {
      setIsLoadingAlternatives(false);
    }
  };

  const handleEventClick = async (event: CalendarEvent) => {
    if (isLoadingAlternatives) {
      console.log('Already loading alternatives, please wait...');
      return;
    }

    if (event.isAlternative && showingAlternatives) {
      handleAlternativeSelection(event);
    } else if (!event.isAlternative) {
      await showAlternativesForLesson(event.moduleCode, event.lessonType);
    }
  };

  const showAlternativesForLesson = async (moduleCode: string, lessonType: string) => {
    console.log(`Fetching alternatives for ${moduleCode} ${lessonType} from database...`);
    
    const alternatives = await fetchAlternativesFromDatabase(moduleCode, lessonType);
    
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

    const updatedModules = { ...selectedModules };
    const currentTimetable = [...updatedModules[moduleCode].timetable];

    // Remove the old lesson and add the new one
    const newTimetable = currentTimetable.filter((e: any) => e.lessonType !== lessonType);
    newTimetable.push(selectedAlternative.originalEntry);

    updatedModules[moduleCode] = {
      ...updatedModules[moduleCode],
      timetable: newTimetable
    };

    if (onModulesUpdate) {
      onModulesUpdate(updatedModules);
    }

    setShowingAlternatives(null);
  };

  const handleBackgroundClick = () => {
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
        backgroundColor = '#7c3aed';
        borderColor = '#6d28d9';
        opacity = 0.95;
      } else if (event.moduleCode === showingAlternatives.moduleCode && 
                event.lessonType === showingAlternatives.lessonType) {
        opacity = 0.4;
      } else {
        opacity = 0.3;
      }
    }

    return {
      style: {
        backgroundColor,
        borderColor,
        opacity,
        color: 'white',
        borderRadius: '8px',
        border: `2px solid ${borderColor}`,
        padding: '4px 8px',
        fontSize: '0.85rem',
        cursor: isLoadingAlternatives ? 'wait' : 'pointer',
        transition: 'all 0.2s ease',
      },
    };
  };

  // Fixed time range - 8AM to 9PM in 1-hour intervals
  const minTime = new Date();
  minTime.setHours(8, 0, 0);

  const maxTime = new Date();
  maxTime.setHours(21, 0, 0);

  useEffect(() => {
    if (!selectedModules || Object.keys(selectedModules).length === 0) {
      setEvents([]);
      setAvailableLessonTypes([]);
      setShowingAlternatives(null);
      return;
    }

    let blocks = getUniqueLessonBlocks(selectedModules);
    
    if (showingAlternatives) {
      blocks = [...blocks, ...showingAlternatives.alternatives];
    }

    setEvents(mapBlocksToEvents(blocks, showingAlternatives || undefined));
  }, [selectedModules, lessonTypeFilter, isOptimized, showingAlternatives]);

  return (
    <div className="timetable-wrapper">
      {/* Controls */}
      <div className="timetable-controls">
        <div className="control-group">
          <span className="semester-info">
            {isOptimized ? 'Optimized' : 'Manual'} timetable for {selectedSemester}
          </span>
        </div>

        {availableLessonTypes.length > 0 && (
          <div className="control-group">
            <label htmlFor="lessonTypeFilter">Filter lessons:</label>
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
          <div className="control-group">
            <span className="modules-info">
              {Object.keys(selectedModules).length} modules: {Object.keys(selectedModules).join(', ')}
            </span>
          </div>
        )}

        {showingAlternatives && (
          <div className="alternatives-info">
            <span>
              {isLoadingAlternatives ? 
                'Loading alternatives...' : 
                `Viewing alternatives for ${showingAlternatives.moduleCode} ${showingAlternatives.lessonType}`
              }
            </span>
            <button 
              className="cancel-alternatives"
              onClick={() => setShowingAlternatives(null)}
              disabled={isLoadingAlternatives}
            >
              Cancel
            </button>
          </div>
        )}

        {isOptimized && !showingAlternatives && (
          <div className="control-group">
            <div className="optimization-badge">
              <span className="badge">✨ Optimized</span>
            </div>
          </div>
        )}
      </div>

      {/* Alternative instructions */}
      {showingAlternatives && !isLoadingAlternatives && (
        <div className="alternatives-instructions">
          <p>
            <strong>Click on a purple lesson</strong> to switch to that time slot.
            Click "Cancel" to stop viewing alternatives.
          </p>
        </div>
      )}

      {/* Calendar */}
      {Object.keys(selectedModules).length > 0 ? (
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          views={[Views.WEEK]}
          defaultView={Views.WEEK}
          toolbar={false}
          style={{ height: '100%', flex: 1 }}
          eventPropGetter={eventStyleGetter}
          min={minTime}
          max={maxTime}
          step={60}
          timeslots={1}
          showMultiDayTimes={false}
          dayLayoutAlgorithm="no-overlap"
          onSelectEvent={handleEventClick}
          onSelectSlot={handleBackgroundClick}
          selectable={true}
          components={{
            event: CustomEvent,
          }}
          formats={{
            timeGutterFormat: (date: Date) => dayjs(date).format('HH:mm'),
            dayHeaderFormat: (date: Date) => dayjs(date).format('ddd'),
          }}
        />
      ) : (
        <div className="no-modules-message">
          <p>No modules selected. Add modules using the search above to view your timetable.</p>
        </div>
      )}
    </div>
  );
};

export default TimetableComponent;