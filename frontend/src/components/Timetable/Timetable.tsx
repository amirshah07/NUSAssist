import { useState, useEffect, useRef } from 'react';
import { Plus } from 'lucide-react';
import CustomTimetableComponent from './CustomTimetableComponent';
import TimetableAddModuleModal from './TimetableAddModuleModal';
import AddCustomBlockModal from './AddCustomBlockModal';
import TimePreferenceGrid from './TimePreferenceGrid';
import { OptimizationService } from '../../services/optimizationService';
import { TimetableService } from '../../services/timetableService';
import { supabase } from '../../lib/supabaseClient';
import Loading from '../Loading/Loading';
import type { SelectedModule, CustomTimeBlock, TimePreferenceData } from './types';
import './Timetable.css';

export default function Timetable() {
  const [user, setUser] = useState<any>(null);
  const [currentSemester, setCurrentSemester] = useState<"sem1" | "sem2">("sem1");
  const [modules, setModules] = useState<SelectedModule>({});
  const [customBlocks, setCustomBlocks] = useState<CustomTimeBlock[]>([]);
  const [timePreferences, setTimePreferences] = useState<TimePreferenceData>({});
  const [isOptimized, setIsOptimized] = useState(false);
  const [moduleOrder, setModuleOrder] = useState<{ [moduleCode: string]: number }>({});
  const [showAddModuleModal, setShowAddModuleModal] = useState(false);
  const [showAddCustomBlockModal, setShowAddCustomBlockModal] = useState(false);
  const [showTimePreferenceModal, setShowTimePreferenceModal] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    }
    
    getUser();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    async function loadUserData() {
      setIsLoading(true);
      
      try {
        const userSemester = await TimetableService.getUserCurrentSemester(user.id);
        setCurrentSemester(userSemester);

        const timetableData = await TimetableService.loadUserTimetable(user.id, userSemester);
        
        if (timetableData) {
          setModules(timetableData.modules);
          setCustomBlocks(timetableData.customBlocks);
          setTimePreferences(timetableData.timePreferences);
          setIsOptimized(timetableData.isOptimized);
          setModuleOrder(timetableData.moduleOrder);
        }
      } catch (error) {
        console.error('Failed to load user data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadUserData();
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = setTimeout(async () => {
      await TimetableService.saveUserTimetable(
        user.id,
        currentSemester,
        modules,
        timePreferences,
        isOptimized,
        moduleOrder
      );
    }, 1000);

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [modules, timePreferences, isOptimized, currentSemester, user?.id, moduleOrder]);

  async function handleAddCustomBlock(block: CustomTimeBlock) {
    if (!user?.id) return;

    await TimetableService.saveCustomBlock(user.id, currentSemester, block);
    const timetableData = await TimetableService.loadUserTimetable(user.id, currentSemester);
    if (timetableData) setCustomBlocks(timetableData.customBlocks);
  }

  async function handleDeleteCustomBlock(blockId: string) {
    if (!user?.id) return;

    const success = await TimetableService.deleteCustomBlock(user.id, blockId);
    if (success) setCustomBlocks(prev => prev.filter(block => block.id !== blockId));
  }

  async function handleSemesterChange(newSemester: "sem1" | "sem2") {
    if (!user?.id || newSemester === currentSemester) return;

    setIsLoading(true);
    
    try {
      await TimetableService.saveUserTimetable(user.id, currentSemester, modules, timePreferences, isOptimized, moduleOrder);
      await TimetableService.updateUserCurrentSemester(user.id, newSemester);
      setCurrentSemester(newSemester);

      const timetableData = await TimetableService.loadUserTimetable(user.id, newSemester);
      
      if (timetableData) {
        setModules(timetableData.modules);
        setCustomBlocks(timetableData.customBlocks);
        setTimePreferences(timetableData.timePreferences);
        setIsOptimized(timetableData.isOptimized);
        setModuleOrder(timetableData.moduleOrder);
      } else {
        setModules({});
        setCustomBlocks([]);
        setTimePreferences({});
        setIsOptimized(false);
        setModuleOrder({});
      }
    } catch (error) {
      console.error('Failed to switch semester:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleOptimize(preferences: TimePreferenceData) {
    if (!OptimizationService.canOptimize(modules)) return;

    setIsOptimizing(true);
    
    try {
      const optimizedTimetable = await OptimizationService.optimizeTimetable(
        modules,
        { preferredTimeSlots: preferences },
        currentSemester
      );
      
      setModules(optimizedTimetable);
      setTimePreferences(preferences);
      setIsOptimized(true);
      setShowTimePreferenceModal(false);
    } catch (error) {
      console.error('Optimization failed:', error);
    } finally {
      setIsOptimizing(false);
    }
  }

  function getNextAvailableIndex(): number {
    const usedIndices = new Set(Object.values(moduleOrder));
    let index = 0;
    while (usedIndices.has(index)) {
      index++;
    }
    return index;
  }

  function handleAddModule(module: any) {
    if (modules[module.moduleCode]) return;

    const lessonTypeGroups: { [lessonType: string]: any[] } = {};
    
    module.semesterData?.timetable?.forEach((lesson: any) => {
      (lessonTypeGroups[lesson.lessonType] = lessonTypeGroups[lesson.lessonType] || []).push(lesson);
    });

    const filteredTimetable: any[] = [];
    Object.values(lessonTypeGroups).forEach(lessons => {
      const sorted = lessons.sort((a, b) => a.classNo.localeCompare(b.classNo));
      filteredTimetable.push(...lessons.filter(l => l.classNo === sorted[0].classNo));
    });

    const updatedModules = { 
      ...modules, 
      [module.moduleCode]: { ...module.semesterData, timetable: filteredTimetable }
    };

    const updatedOrder = { ...moduleOrder };
    if (updatedOrder[module.moduleCode] === undefined) {
      updatedOrder[module.moduleCode] = getNextAvailableIndex();
    }

    setModules(updatedModules);
    setModuleOrder(updatedOrder);
  }

  function handleRemoveModule(moduleCode: string) {
    const updatedModules = { ...modules };
    delete updatedModules[moduleCode];
    
    const updatedOrder = { ...moduleOrder };
    delete updatedOrder[moduleCode];
    
    setModules(updatedModules);
    setModuleOrder(updatedOrder);
  }

  const canOptimize = Object.keys(modules).length > 0 && OptimizationService.canOptimize(modules);

  if (isLoading) return <Loading />;

  return (
    <div className="timetable-container">
      <div className="timetable-content">
        <div className="timetable-action-bar">
          <div className="action-buttons-left">
            <button className="action-button" onClick={() => setShowAddModuleModal(true)}>
              <Plus size={20} />
              Add Module
            </button>
            
            <button className="action-button" onClick={() => setShowAddCustomBlockModal(true)}>
              <Plus size={20} />
              Add Custom Time Block
            </button>
            
            <button 
              className="action-button"
              onClick={() => setShowTimePreferenceModal(true)}
              disabled={!canOptimize || isOptimizing}
            >
              {isOptimizing ? 'Optimizing...' : 'Create Optimized Timetable'}
            </button>
          </div>

          <div className="semester-buttons-right">
            <button 
              className={`semester-button ${currentSemester === 'sem1' ? 'active' : ''}`}
              onClick={() => handleSemesterChange('sem1')}
            >
              Semester 1
            </button>
            <button 
              className={`semester-button ${currentSemester === 'sem2' ? 'active' : ''}`}
              onClick={() => handleSemesterChange('sem2')}
            >
              Semester 2
            </button>
          </div>
        </div>

        {isOptimizing && <Loading />}

        <div className="timetable-section">
          <CustomTimetableComponent 
            selectedModules={modules}
            customBlocks={customBlocks}
            selectedSemester={currentSemester}
            onModulesUpdate={setModules}
            onDeleteCustomBlock={handleDeleteCustomBlock}
            isOptimized={isOptimized}
            moduleOrder={moduleOrder}
            viewMode="horizontal"
          />
        </div>

        <TimetableAddModuleModal
          isOpen={showAddModuleModal}
          onClose={() => setShowAddModuleModal(false)}
          currentModules={modules}
          currentSemester={currentSemester}
          onAddModule={handleAddModule}
          onRemoveModule={handleRemoveModule}
        />

        <AddCustomBlockModal
          isOpen={showAddCustomBlockModal}
          onClose={() => setShowAddCustomBlockModal(false)}
          onAddBlock={handleAddCustomBlock}
        />

        <TimePreferenceGrid
          isOpen={showTimePreferenceModal}
          onClose={() => setShowTimePreferenceModal(false)}
          onOptimize={handleOptimize}
          initialTimePreferences={timePreferences}
          isOptimizing={isOptimizing}
        />
      </div>
    </div>
  );
}