import {useState, useMemo } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { TimeUtils } from './TimeUtils';
import ConfirmModal from '../ConfirmModal/ConfirmModal';
import type { TimetableBlock, ModuleBlock, CustomBlock, SelectedModule, CustomTimeBlock } from './types';
import './CustomTimetableComponent.css';
import { X } from 'lucide-react';

interface CustomTimetableComponentProps {
  selectedModules: SelectedModule;
  customBlocks: CustomTimeBlock[];
  selectedSemester?: "sem1" | "sem2";
  onModulesUpdate?: (modules: SelectedModule) => void;
  onDeleteCustomBlock?: (blockId: string) => void;
  isOptimized?: boolean;
  moduleOrder?: { [moduleCode: string]: number };
  viewMode?: 'horizontal' | 'vertical';
}

interface AlternativeLessonState {
  moduleCode: string;
  lessonType: string;
  classNo: string;
  alternatives: TimetableBlock[][];
}

const MODULE_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4',
  '#84cc16', '#f97316', '#ec4899', '#6366f1', '#14b8a6', '#eab308'
];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const START_HOUR = 7;
const END_HOUR = 22;

function getColorForModule(moduleCode: string, moduleOrder?: { [moduleCode: string]: number }): string {
  if (moduleOrder && moduleOrder[moduleCode] !== undefined) {
    return MODULE_COLORS[moduleOrder[moduleCode] % MODULE_COLORS.length];
  }
  
  let hash = 0;
  for (let i = 0; i < moduleCode.length; i++) {
    hash = moduleCode.charCodeAt(i) + ((hash << 5) - hash);
  }
  return MODULE_COLORS[Math.abs(hash) % MODULE_COLORS.length];
}

function adjustColorBrightness(color: string, factor: number): string {
  const hex = color.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
 
  const newR = Math.min(255, Math.max(0, Math.round(r * factor)));
  const newG = Math.min(255, Math.max(0, Math.round(g * factor)));
  const newB = Math.min(255, Math.max(0, Math.round(b * factor)));
  
  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
}

const CustomTimetableComponent = ({ 
  selectedModules, 
  customBlocks,
  selectedSemester = "sem1", 
  onModulesUpdate,
  onDeleteCustomBlock,
  isOptimized = false,
  moduleOrder,
  viewMode = 'horizontal'
}: CustomTimetableComponentProps) => {
  const [showingAlternatives, setShowingAlternatives] = useState<AlternativeLessonState | null>(null);
  const [isLoadingAlternatives, setIsLoadingAlternatives] = useState(false);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{ isOpen: boolean; blockId: string; eventName: string }>({
    isOpen: false,
    blockId: '',
    eventName: ''
  });
  const [moreBlocksModal, setMoreBlocksModal] = useState<{ isOpen: boolean; blocks: TimetableBlock[] }>({
    isOpen: false,
    blocks: []
  });

  const timeSlots = useMemo(() => 
    Array.from({ length: END_HOUR - START_HOUR }, (_, i) => 
      `${(START_HOUR + i).toString().padStart(2, '0')}00`
    ), []
  );

  function processModuleTimetable(modules: SelectedModule): ModuleBlock[] {
    const result: ModuleBlock[] = [];
    
    Object.entries(modules).forEach(([moduleCode, moduleData]) => {
      if (!moduleData?.timetable) return;

      if (!isOptimized) {
        const lessonTypeGroups: { [lessonType: string]: any[] } = {};
        
        moduleData.timetable.forEach((entry: any) => {
          (lessonTypeGroups[entry.lessonType] = lessonTypeGroups[entry.lessonType] || []).push(entry);
        });

        Object.entries(lessonTypeGroups).forEach(([, lessons]) => {
          const classByNo: { [classNo: string]: any[] } = {};
          lessons.forEach(lesson => {
            (classByNo[lesson.classNo] = classByNo[lesson.classNo] || []).push(lesson);
          });

          const sortedClassNos = Object.keys(classByNo).sort();
          if (sortedClassNos.length > 0) {
            classByNo[sortedClassNos[0]].forEach(entry => {
              result.push({
                type: 'module',
                moduleCode,
                lessonType: entry.lessonType,
                classNo: entry.classNo,
                day: entry.day,
                startTime: TimeUtils.normalize(entry.startTime),
                endTime: TimeUtils.normalize(entry.endTime),
                venue: entry.venue,
                color: getColorForModule(moduleCode, moduleOrder),
                originalEntry: entry
              });
            });
          }
        });
      } else {
        moduleData.timetable.forEach((entry: any) => {
          result.push({
            type: 'module',
            moduleCode,
            lessonType: entry.lessonType,
            classNo: entry.classNo,
            day: entry.day,
            startTime: TimeUtils.normalize(entry.startTime),
            endTime: TimeUtils.normalize(entry.endTime),
            venue: entry.venue,
            color: getColorForModule(moduleCode, moduleOrder),
            originalEntry: entry
          });
        });
      }
    });

    return result;
  }

  function convertCustomBlocks(blocks: CustomTimeBlock[]): CustomBlock[] {
    return blocks.flatMap(block => 
      block.days.map(day => ({
        type: 'custom' as const,
        id: block.id || '',
        eventName: block.eventName,
        day,
        startTime: block.startTime,
        endTime: block.endTime,
        color: block.color
      }))
    );
  }

  async function fetchAlternatives(moduleCode: string, lessonType: string): Promise<TimetableBlock[][]> {
    try {
      setIsLoadingAlternatives(true);
      
      const { data, error } = await supabase
        .from(selectedSemester)
        .select('semesterData')
        .eq('moduleCode', moduleCode)
        .single();

      if (error || !data?.semesterData?.timetable) return [];

      const classGroups: { [classNo: string]: TimetableBlock[] } = {};
      
      data.semesterData.timetable.forEach((entry: any) => {
        if (entry.lessonType === lessonType) {
          (classGroups[entry.classNo] = classGroups[entry.classNo] || []).push({
            type: 'module',
            moduleCode,
            lessonType: entry.lessonType,
            classNo: entry.classNo,
            day: entry.day,
            startTime: TimeUtils.normalize(entry.startTime),
            endTime: TimeUtils.normalize(entry.endTime),
            venue: entry.venue,
            color: getColorForModule(moduleCode, moduleOrder),
            originalEntry: entry
          });
        }
      });

      return Object.values(classGroups);
    } finally {
      setIsLoadingAlternatives(false);
    }
  }

  async function handleBlockClick(block: TimetableBlock, event: React.MouseEvent) {
    if (isLoadingAlternatives) return;

    if (block.type === 'custom') {
      event.preventDefault();
      event.stopPropagation();
      
      if (block.id) {
        setDeleteConfirmModal({
          isOpen: true,
          blockId: block.id,
          eventName: block.eventName
        });
      }
      return;
    }

    if (showingAlternatives?.moduleCode === block.moduleCode && 
        showingAlternatives?.lessonType === block.lessonType) {
      handleAlternativeSelection(block);
    } else {
      const alternatives = await fetchAlternatives(block.moduleCode, block.lessonType);
      
      if (alternatives.length > 1) {
        setShowingAlternatives({
          moduleCode: block.moduleCode,
          lessonType: block.lessonType,
          classNo: block.classNo,
          alternatives
        });
      }
    }
  }

  function handleAlternativeSelection(selectedBlock: TimetableBlock) {
    if (!showingAlternatives || !onModulesUpdate || selectedBlock.type !== 'module') return;

    const { moduleCode, lessonType } = showingAlternatives;
    const updatedModules = { ...selectedModules };
    const currentTimetable = [...updatedModules[moduleCode].timetable];

    const newTimetable = currentTimetable.filter((e: any) => e.lessonType !== lessonType);
    
    const selectedClassGroup = showingAlternatives.alternatives.find(group => 
      group.some(lesson => lesson.type === 'module' && lesson.classNo === selectedBlock.classNo)
    );

    if (selectedClassGroup) {
      selectedClassGroup.forEach(lesson => {
        if (lesson.type === 'module') {
          newTimetable.push(lesson.originalEntry);
        }
      });
    }

    updatedModules[moduleCode] = {
      ...updatedModules[moduleCode],
      timetable: newTimetable
    };

    onModulesUpdate(updatedModules);
    setShowingAlternatives(null);
  }

  function handleDeleteCustomBlock() {
    if (!onDeleteCustomBlock || !deleteConfirmModal.blockId) return;
    onDeleteCustomBlock(deleteConfirmModal.blockId);
    setDeleteConfirmModal({ isOpen: false, blockId: '', eventName: '' });
  }

  function getBlocksForTimeSlot(day: string, timeSlot: string) {
    const slotStart = TimeUtils.toMinutes(timeSlot);
    const allBlocks = [...timetableBlocks];
    
    const blocksStartingInSlot = allBlocks.filter(block => {
      if (block.day !== day) return false;
      const blockStart = TimeUtils.toMinutes(block.startTime);
      return Math.floor(blockStart / 60) * 60 === slotStart;
    });

    if (blocksStartingInSlot.length === 0) return [];

    const allOverlappingBlocks = new Set<TimetableBlock>();
    
    blocksStartingInSlot.forEach(startingBlock => {
      allOverlappingBlocks.add(startingBlock);
      
      allBlocks.forEach(otherBlock => {
        if (otherBlock.day === day && TimeUtils.blocksOverlap(startingBlock, otherBlock)) {
          allOverlappingBlocks.add(otherBlock);
        }
      });
    });

    const overlappingGroups: TimetableBlock[][] = [];
    const processed = new Set<TimetableBlock>();

    Array.from(allOverlappingBlocks).forEach(block => {
      if (processed.has(block)) return;

      const group = [block];
      processed.add(block);

      Array.from(allOverlappingBlocks).forEach(otherBlock => {
        if (!processed.has(otherBlock) && TimeUtils.blocksOverlap(block, otherBlock)) {
          group.push(otherBlock);
          processed.add(otherBlock);
        }
      });

      overlappingGroups.push(group);
    });

    const result: Array<{ block: TimetableBlock; position: any } | { type: 'more'; count: number; position: any; blocks: TimetableBlock[]; color: string }> = [];

    overlappingGroups.forEach(group => {
      group.sort((a, b) => TimeUtils.toMinutes(a.startTime) - TimeUtils.toMinutes(b.startTime));

      const maxVisibleBlocks = 3;
      const visibleBlocks = group.slice(0, maxVisibleBlocks);
      const hiddenBlocks = group.slice(maxVisibleBlocks);

      visibleBlocks.forEach((block, index) => {
        const blockStart = TimeUtils.toMinutes(block.startTime);
        const blockStartHour = Math.floor(blockStart / 60) * 60;
        
        if (blockStartHour !== slotStart) return;

        const blockEnd = TimeUtils.toMinutes(block.endTime);
        const blockDurationMinutes = blockEnd - blockStart;
        const blockHeightPx = (blockDurationMinutes / 60) * 60;
        const offsetMinutes = blockStart - slotStart;
        const offsetPx = (offsetMinutes / 60) * 60;
        const totalWidth = group.length > maxVisibleBlocks ? 75 : 100;
        const width = totalWidth / visibleBlocks.length;
        const left = index * width;

        result.push({
          block,
          position: {
            top: `${offsetPx}px`,
            left: `${left}%`,
            width: `${width}%`,
            height: `${blockHeightPx}px`,
            minHeight: '30px'
          }
        });
      });

      if (hiddenBlocks.length > 0) {
        const firstBlock = visibleBlocks[0];
        const blockStart = TimeUtils.toMinutes(firstBlock.startTime);
        const blockEnd = TimeUtils.toMinutes(firstBlock.endTime);
        const blockDurationMinutes = blockEnd - blockStart;
        const blockHeightPx = (blockDurationMinutes / 60) * 60;
        const offsetMinutes = blockStart - slotStart;
        const offsetPx = (offsetMinutes / 60) * 60;

        const firstHiddenBlock = hiddenBlocks[0];
        const moreIndicatorColor = firstHiddenBlock.type === 'module' 
          ? adjustColorBrightness(getColorForModule(firstHiddenBlock.moduleCode, moduleOrder), 0.7)
          : '#7c3aed';

        result.push({
          type: 'more',
          count: hiddenBlocks.length,
          blocks: hiddenBlocks,
          color: moreIndicatorColor,
          position: {
            top: `${offsetPx}px`,
            left: '75%',
            width: '25%',
            height: `${blockHeightPx}px`,
            minHeight: '30px'
          }
        });
      }
    });

    return result;
  }

  function isAlternativeBlock(block: TimetableBlock): boolean {
    if (!showingAlternatives || block.type !== 'module') return false;
    
    return showingAlternatives.alternatives.some(classGroup =>
      classGroup.some(lesson => 
        lesson.type === 'module' &&
        lesson.moduleCode === block.moduleCode &&
        lesson.lessonType === block.lessonType &&
        lesson.classNo === block.classNo &&
        lesson.day === block.day &&
        lesson.startTime === block.startTime
      )
    );
  }

  function getBlockColor(block: TimetableBlock, showingAlternatives: AlternativeLessonState | null): string {
    if (block.type !== 'module') return block.color;
    
    const baseColor = getColorForModule(block.moduleCode, moduleOrder);
    
    if (!showingAlternatives || 
        showingAlternatives.moduleCode !== block.moduleCode || 
        showingAlternatives.lessonType !== block.lessonType) {
      return baseColor;
    }
    
    const isCurrentSelection = showingAlternatives.classNo === block.classNo;
    const isAlternative = isAlternativeBlock(block);
    
    if (isCurrentSelection) {
      return adjustColorBrightness(baseColor, 1.2); 
    } else if (isAlternative) {
      return adjustColorBrightness(baseColor, 0.7); 
    }
    
    return baseColor;
  }

  const timetableBlocks = useMemo(() => {
    const moduleBlocks = processModuleTimetable(selectedModules);
    
    if (showingAlternatives) {
      showingAlternatives.alternatives.forEach(classGroup => {
        classGroup.forEach(lesson => {
          if (lesson.type === 'module') {
            const isCurrentSelection = moduleBlocks.some(existing =>
              existing.moduleCode === lesson.moduleCode &&
              existing.lessonType === lesson.lessonType &&
              existing.classNo === lesson.classNo &&
              existing.day === lesson.day &&
              existing.startTime === lesson.startTime
            );
            
            if (!isCurrentSelection) {
              moduleBlocks.push({ ...lesson });
            }
          }
        });
      });
    }

    return [...moduleBlocks, ...convertCustomBlocks(customBlocks)];
  }, [selectedModules, customBlocks, showingAlternatives, isOptimized, moduleOrder]);

  return (
  <>
    <div className={`custom-timetable-wrapper ${viewMode}`}>
      {showingAlternatives && (
        <div className="alternatives-info"></div>
      )}

      <div className="custom-timetable-grid">
        <div className="timetable-header">
          <div className="time-header">Time</div>
          {DAYS.map(day => (
            <div key={day} className="day-header">{day}</div>
          ))}
        </div>

        <div className="timetable-body">
          {timeSlots.map(timeSlot => (
            <div key={timeSlot} className="time-row">
              <div className="time-cell">{TimeUtils.formatDisplay(timeSlot)}</div>
              {DAYS.map(day => {
                const blocksInSlot = getBlocksForTimeSlot(day, timeSlot);
                return (
                  <div key={`${day}-${timeSlot}`} className="timetable-cell">
                    {blocksInSlot.map((item, index) => {
                      if ('type' in item && item.type === 'more') {
                        return (
                          <div
                            key={`more-${day}-${timeSlot}-${index}`}
                            className="timetable-block more-indicator"
                            style={{
                              backgroundColor: item.color,
                              ...item.position,
                              position: 'absolute',
                              cursor: 'pointer'
                            }}
                            onClick={() => setMoreBlocksModal({ isOpen: true, blocks: item.blocks })}
                          >
                            <div className="block-content">
                              <div className="block-title">+{item.count} more</div>
                            </div>
                          </div>
                        );
                      }

                      if (!('block' in item)) return null;

                      const { block, position } = item;
                      const isAlternative = isAlternativeBlock(block);
                      const isCurrentSelection = showingAlternatives &&
                        block.type === 'module' &&
                        block.moduleCode === showingAlternatives.moduleCode &&
                        block.lessonType === showingAlternatives.lessonType &&
                        block.classNo === showingAlternatives.classNo;

                      const blockKey = block.type === 'custom'
                        ? `${block.id}_${block.day}`
                        : `${block.moduleCode}-${block.lessonType}-${block.classNo}-${block.startTime}-${index}`;

                      return (
                        <div
                          key={blockKey}
                          className={`timetable-block ${isAlternative ? 'alternative' : ''} ${isCurrentSelection ? 'current-selection' : ''} ${block.type === 'custom' ? 'custom-block' : ''}`}
                          style={{
                            backgroundColor: getBlockColor(block, showingAlternatives),
                            ...position,
                            position: 'absolute'
                          }}
                          onClick={(e) => handleBlockClick(block, e)}
                        >
                          <div className="block-content">
                            <div className="block-title">
                              {block.type === 'custom' ? block.eventName : block.moduleCode}
                            </div>
                            {block.type === 'module' && (
                              <>
                                <div className="block-subtitle">{block.lessonType} {block.classNo}</div>
                                <div className="block-venue">{block.venue}</div>
                                <div className="block-time">{block.startTime} - {block.endTime}</div>
                              </>
                            )}
                            {block.type === 'custom' && (
                              <div className="block-time">{block.startTime} - {block.endTime}</div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>

    <ConfirmModal
      isOpen={deleteConfirmModal.isOpen}
      onClose={() => setDeleteConfirmModal({ isOpen: false, blockId: '', eventName: '' })}
      onConfirm={handleDeleteCustomBlock}
      title="Delete Event"
      message={`Delete "${deleteConfirmModal.eventName}"?`}
      confirmText="Delete"
      cancelText="Cancel"
    />

    {moreBlocksModal.isOpen && (
      <div className="modal-overlay" onClick={() => setMoreBlocksModal({ isOpen: false, blocks: [] })}>
        <div className="modal-container more-blocks-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3 className="modal-title">All Options</h3>
            <button className="modal-close" onClick={() => setMoreBlocksModal({ isOpen: false, blocks: [] })}>
              <X size={20} />
            </button>
          </div>
          <div className="more-blocks-content">
            {moreBlocksModal.blocks.map((block, index) => (
              <div 
                key={index} 
                className="more-block-item"
                onClick={() => {
                  handleBlockClick(block, new MouseEvent('click') as any);
                  setMoreBlocksModal({ isOpen: false, blocks: [] });
                }}
              >
                <div className="more-block-header">
                  <span className="more-block-code">
                    {block.type === 'custom' ? block.eventName : block.moduleCode}
                  </span>
                  {block.type === 'module' && (
                    <span className="more-block-type">{block.lessonType} {block.classNo}</span>
                  )}
                </div>
                {block.type === 'module' && (
                  <div className="more-block-venue">{block.venue}</div>
                )}
                <div className="more-block-time">{block.startTime} - {block.endTime}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )}
  </>
);
}

export default CustomTimetableComponent;