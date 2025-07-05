import { useState, useRef } from 'react';
import { Plus, X, ChevronDown, Edit2, Trash2, Calendar, Eye, EyeOff } from 'lucide-react';
import ModuleSearchInput from './ModuleSearchInput';
import ConfirmModal from "../ConfirmModal/ConfirmModal"
import AlertModal from './AlertModal';
import { 
  gradeOptions, 
  calculateSemesterCAP, 
  getGradeColor,
  getGradePoint,
  getDisplayGrade,
  sortSemesters 
} from './GpaCalculations';
import type { 
  Semester, 
  Module
} from './GpaCalculations';
import './AcademicHistory.css';

interface AcademicHistoryProps {
  semesters: Semester[];
  onSemestersChange: (semesters: Semester[]) => void;
  onUIOnlyUpdate?: (semesters: Semester[]) => void;
}

interface NewModuleState {
  code?: string;
  name?: string;
  grade?: string;
  gradePoint?: number;
  suUsed?: boolean;
  mcs?: number | string;
  showActualGrade?: boolean;
}

interface NewSemesterState {
  year: string;
  semester: string;
  modules: NewModuleState[];
}

export default function AcademicHistory({ semesters, onSemestersChange, onUIOnlyUpdate }: AcademicHistoryProps) {
  const [expandedSemesters, setExpandedSemesters] = useState<{ [key: string]: boolean }>({});
  const [isAddingSemester, setIsAddingSemester] = useState(false);
  const [editingSemesterId, setEditingSemesterId] = useState<string | null>(null);
  const [newSemester, setNewSemester] = useState<NewSemesterState>({
    year: '1',
    semester: '1',
    modules: [{ code: '', grade: 'A', gradePoint: 5.0, mcs: '', suUsed: false }]
  });
  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean;
    semesterId: string | null;
  }>({ isOpen: false, semesterId: null });
  const [alertModal, setAlertModal] = useState<{
  isOpen: boolean;
  message: string;
}>({ isOpen: false, message: '' });

  const formRef = useRef<HTMLDivElement>(null);

  const toggleSemester = (semId: string) => {
    setExpandedSemesters(prev => ({ ...prev, [semId]: !prev[semId] }));
  };

  const toggleModuleGrade = (semesterId: string, moduleIndex: number) => {
    const updatedSemesters = semesters.map(semester => {
      if (semester.id === semesterId) {
        const updatedModules = [...semester.modules];
        updatedModules[moduleIndex] = {
          ...updatedModules[moduleIndex],
          showActualGrade: !updatedModules[moduleIndex].showActualGrade
        };
        return { ...semester, modules: updatedModules };
      }
      return semester;
    });
    
    if (onUIOnlyUpdate) {
      onUIOnlyUpdate(updatedSemesters);
    } else {
      onSemestersChange(updatedSemesters);
    }
  };

  const startEditingSemester = (semester: Semester) => {
    const yearMatch = semester.id.match(/Y(\d)/);
    const semMatch = semester.id.match(/S(\w+)/);
    
    setNewSemester({
      year: yearMatch ? yearMatch[1] : '1',
      semester: semMatch ? semMatch[1] : '1',
      modules: semester.modules.map(mod => ({
        code: mod.code,
        grade: mod.grade,
        gradePoint: mod.gradePoint,
        name: mod.name,
        mcs: mod.mcs, 
        suUsed: mod.suUsed || false
      }))
    });
    
    setEditingSemesterId(semester.id);
    setIsAddingSemester(true);
    setTimeout(() => {
      document.querySelector('.academic_history_semester_form')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  const addModuleToNewSemester = () => {
    setNewSemester(prev => ({
      ...prev,
      modules: [...prev.modules, { code: '', grade: 'A', gradePoint: 5.0, mcs: '', suUsed: false }]
    }));
  };

  const updateNewSemesterModule = (index: number, field: keyof NewModuleState, value: string | number | boolean) => {
    setNewSemester(prev => {
      const updated = [...prev.modules];
      updated[index] = { ...updated[index], [field]: value };
      
      if (field === 'grade' && typeof value === 'string') {
        updated[index].gradePoint = getGradePoint(value);
      }
      
      return { ...prev, modules: updated };
    });
  };

  const removeNewSemesterModule = (index: number) => {
    setNewSemester(prev => ({
      ...prev,
      modules: prev.modules.filter((_, i) => i !== index)
    }));
  };

  const saveSemester = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    const validModules = newSemester.modules.filter(m => {
      return m.code && m.code.trim().length > 0;
    });
    
    if (validModules.length === 0) {
      setAlertModal({
        isOpen: true,
        message: 'Please add at least one module with a code.'
      });
      return;
    }
    
    const invalidMC = validModules.some(m => {
      if (m.mcs === '' || m.mcs === undefined || m.mcs === null) return false; // Empty is okay, will default to 4
      const mcValue = Number(m.mcs);
      return isNaN(mcValue) || mcValue < 0 || mcValue > 32;
    });
    if (invalidMC) {
      setAlertModal({
        isOpen: true,
        message: 'Please enter valid MC values (0-32) for all modules.'
      });
      return;
    }

    const moduleCodes = validModules.map(m => m.code!.trim().toUpperCase());
    const uniqueCodes = new Set(moduleCodes);
    if (moduleCodes.length !== uniqueCodes.size) {
      setAlertModal({
        isOpen: true,
        message: 'Duplicate module codes found in the same semester. Please ensure all module codes are unique.'
      });
      return;
    }

    const semId = `Y${newSemester.year}S${newSemester.semester}`;
    
    if (!editingSemesterId || editingSemesterId !== semId) {
      const exists = semesters.some(sem => sem.id === semId);
      if (exists) {
        setAlertModal({
          isOpen: true,
          message: `Year ${newSemester.year} ${
            newSemester.semester === 'ST1' ? 'Special Term 1' : 
            newSemester.semester === 'ST2' ? 'Special Term 2' :
            `Semester ${newSemester.semester}`
          } already exists!`
        });
        return;
      }
    }

    const modulesWithDetails: Module[] = validModules.map(mod => ({
      code: mod.code!.trim().toUpperCase(),
      name: mod.name || '',
      mcs: (mod.mcs !== '' && mod.mcs !== undefined && mod.mcs !== null) ? Number(mod.mcs) : 4, 
      grade: mod.grade || 'A',
      gradePoint: mod.gradePoint || 5.0,
      suUsed: mod.suUsed || false,
      showActualGrade: false
    }));

    const semesterName = newSemester.semester === 'ST1' ? 'Special Term 1' : 
                        newSemester.semester === 'ST2' ? 'Special Term 2' :
                        `Semester ${newSemester.semester}`;
    const semName = `Year ${newSemester.year} ${semesterName}`;
    
    let updatedSemesters: Semester[];
    
    if (editingSemesterId) {
      updatedSemesters = semesters.map(sem => 
        sem.id === editingSemesterId 
          ? { id: semId, name: semName, modules: modulesWithDetails }
          : sem
      );
    } else {
      updatedSemesters = [...semesters, {
        id: semId,
        name: semName,
        modules: modulesWithDetails
      }];
    }
    
    onSemestersChange(sortSemesters(updatedSemesters));
    
    if (!editingSemesterId || editingSemesterId !== semId) {
      setExpandedSemesters(prev => ({ ...prev, [semId]: true }));
    }
    
    setIsAddingSemester(false);
    setEditingSemesterId(null);
    setNewSemester({ year: '1', semester: '1', modules: [{ code: '', grade: 'A', gradePoint: 5.0, mcs: '', suUsed: false }] });
  };

  const removeSemester = (semId: string) => {
    setDeleteModalState({ isOpen: true, semesterId: semId });
  };
  const handleDeleteConfirm = () => {
  if (deleteModalState.semesterId) {
    onSemestersChange(semesters.filter(sem => sem.id !== deleteModalState.semesterId));
    setExpandedSemesters(prev => {
      const updated = { ...prev };
      delete updated[deleteModalState.semesterId!];
      return updated;
    });
  }
  setDeleteModalState({ isOpen: false, semesterId: null });
};

  const cancelEdit = () => {
    setIsAddingSemester(false);
    setEditingSemesterId(null);
    setNewSemester({ year: '1', semester: '1', modules: [{ code: '', grade: 'A', gradePoint: 5.0, mcs: '', suUsed: false }] });
  };

  const handleAddSemesterClick = () => {
    setIsAddingSemester(true);
    setEditingSemesterId(null);
    setNewSemester({ year: '1', semester: '1', modules: [{ code: '', grade: 'A', gradePoint: 5.0, mcs: '', suUsed: false }] });
    setTimeout(() => {
      document.querySelector('.academic_history_semester_form')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const firstInput = document.querySelector('.academic_history_semester_form input') as HTMLInputElement;
      firstInput?.focus();
    }, 100);
  };

  return (
    <div className="academic_history">
      <div className="academic_history_section_header">
        <h2 className="academic_history_section_title">Academic History</h2>
        {!isAddingSemester && (
          <button
            onClick={handleAddSemesterClick}
            className="academic_history_btn academic_history_btn_secondary"
          >
            <Plus size={20} />
            Add Semester
          </button>
        )}
      </div>
      
      <div className="academic_history_semesters_list">
        {isAddingSemester && (
          <div className="academic_history_semester_form" ref={formRef} onClick={(e) => e.stopPropagation()}>
            <div className="academic_history_form_header">
              <h3 className="academic_history_form_title">
                {editingSemesterId ? 'Edit Semester' : 'Add New Semester'}
              </h3>
              <button onClick={cancelEdit} className="academic_history_btn_icon" type="button">
                <X size={20} />
              </button>
            </div>
            
            <div className="academic_history_form_grid">
              <div className="academic_history_form_group">
                <label className="academic_history_form_label">Year</label>
                <select
                  value={newSemester.year}
                  onChange={(e) => setNewSemester(prev => ({ ...prev, year: e.target.value }))}
                  className="academic_history_form_select"
                >
                  <option value="1">Year 1</option>
                  <option value="2">Year 2</option>
                  <option value="3">Year 3</option>
                  <option value="4">Year 4</option>
                  <option value="5">Year 5</option>
                </select>
              </div>
              <div className="academic_history_form_group">
                <label className="academic_history_form_label">Semester</label>
                <select
                  value={newSemester.semester}
                  onChange={(e) => setNewSemester(prev => ({ ...prev, semester: e.target.value }))}
                  className="academic_history_form_select"
                >
                  <option value="1">Semester 1</option>
                  <option value="2">Semester 2</option>
                  <option value="ST1">Special Term 1</option>
                  <option value="ST2">Special Term 2</option>
                </select>
              </div>
            </div>
            
            <div className="academic_history_form_modules">
              {newSemester.modules.map((module, idx) => (
                <div key={idx} className="academic_history_module_row_wrapper">
                  <div className="academic_history_module_input_grid">
                    <div className="academic_history_form_field academic_history_module_code_field">
                      <label className={`academic_history_form_label ${idx !== 0 ? 'academic_history_desktop_hidden' : ''}`}>Module code</label>
                      <ModuleSearchInput
                        value={module.code || ''}
                        onModuleSelect={(code, name, mcs) => {
                          updateNewSemesterModule(idx, 'code', code);
                          updateNewSemesterModule(idx, 'name', name);
                          updateNewSemesterModule(idx, 'mcs', mcs);
                        }}
                        onManualEntry={(code) => {
                          updateNewSemesterModule(idx, 'code', code);
                          
                          if (!code) {
                            updateNewSemesterModule(idx, 'name', '');
                          }
                        }}
                        autoFocus={idx === newSemester.modules.length - 1}
                      />
                    </div>
                    <div className="academic_history_form_field academic_history_module_name_field">
                      <label className={`academic_history_form_label ${idx !== 0 ? 'academic_history_desktop_hidden' : ''}`}>Module name</label>
                      <input
                        type="text"
                        value={module.name || ''}
                        onChange={(e) => updateNewSemesterModule(idx, 'name', e.target.value)}
                        className="academic_history_form_input"
                        placeholder={
                          module.code 
                            ? module.name 
                              ? "Edit module name" 
                              : "Enter module name (optional)"
                            : "Enter code first"
                        }
                        disabled={!module.code}
                      />
                    </div>
                    <div className="academic_history_form_field academic_history_mc_field">
                      <label className={`academic_history_form_label ${idx !== 0 ? 'academic_history_desktop_hidden' : ''}`}>MCs</label>
                      <input
                        type="number"
                        value={module.mcs === undefined || module.mcs === null ? '' : module.mcs}
                        onChange={(e) => updateNewSemesterModule(idx, 'mcs', e.target.value === '' ? '' : parseInt(e.target.value))}
                        className="academic_history_form_input academic_history_mcs_input"
                        placeholder="4"
                        min="0"
                        max="32"
                      />
                    </div>
                    <div className="academic_history_form_field academic_history_grade_field">
                      <label className={`academic_history_form_label ${idx !== 0 ? 'academic_history_desktop_hidden' : ''}`}>Grade</label>
                      <select
                        value={module.grade || 'A'}
                        onChange={(e) => updateNewSemesterModule(idx, 'grade', e.target.value)}
                        className="academic_history_form_select"
                      >
                        {gradeOptions.map(opt => (
                          <option key={opt.grade} value={opt.grade}>{opt.grade}</option>
                        ))}
                      </select>
                    </div>
                    <div className="academic_history_form_field academic_history_su_field">
                      <label className={`academic_history_form_label ${idx !== 0 ? 'academic_history_desktop_hidden' : ''}`}>S/U</label>
                      <label className="academic_history_su_checkbox">
                        <input
                          type="checkbox"
                          checked={module.suUsed || false}
                          onChange={(e) => updateNewSemesterModule(idx, 'suUsed', e.target.checked)}
                          className="academic_history_su_checkbox_input"
                        />
                      </label>
                    </div>
                    <div className="academic_history_form_field academic_history_action_field">
                      <label className="academic_history_form_label_invisible">Action</label>
                      {newSemester.modules.length > 1 ? (
                        <button
                          onClick={() => removeNewSemesterModule(idx)}
                          className="academic_history_btn_icon academic_history_btn_icon_danger"
                          type="button"
                        >
                          <X size={20} />
                        </button>
                      ) : (
                        <div className="academic_history_module_action_spacer"></div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <button
              onClick={addModuleToNewSemester}
              className="academic_history_btn academic_history_btn_secondary academic_history_btn_small"
              type="button"
            >
              <Plus size={16} />
              Add Module
            </button>
            
            <div className="academic_history_form_actions">
              <button onClick={cancelEdit} className="academic_history_btn academic_history_btn_ghost" type="button">
                Cancel
              </button>
              <button 
                onClick={saveSemester} 
                className="academic_history_btn academic_history_btn_primary"
                type="button"
              >
                {editingSemesterId ? 'Update Semester' : 'Save Semester'}
              </button>
            </div>
          </div>
        )}
        
        {semesters.length === 0 && !isAddingSemester && (
          <div className="academic_history_empty_state_card">
            <Calendar className="academic_history_empty_state_icon" size={48} />
            <h3 className="academic_history_empty_state_title">No Academic History Yet</h3>
            <p className="academic_history_empty_state_text">
              Add your first semester to see your academic history
            </p>
          </div>
        )}
        
        {sortSemesters(semesters).map(semester => (
          <div key={semester.id} className="academic_history_semester_card">
            <button
              className="academic_history_semester_header"
              onClick={() => toggleSemester(semester.id)}
            >
              <div className="academic_history_semester_info">
                <span className="academic_history_semester_name">{semester.name}</span>
                <span className="academic_history_semester_cap">
                  CAP: <span className="academic_history_cap_value">{calculateSemesterCAP(semester.modules)}</span>
                </span>
              </div>
              <ChevronDown 
                className={`academic_history_chevron_icon ${expandedSemesters[semester.id] ? 'academic_history_chevron_up' : ''}`}
                size={20}
              />
            </button>
            
            {expandedSemesters[semester.id] && (
              <div className="academic_history_semester_content">
                <div className="academic_history_modules_list">
                  {semester.modules.map((module, idx) => (
                    <div key={idx} className="academic_history_module_row">
                      <div className="academic_history_module_info">
                        <span className="academic_history_module_code">{module.code}</span>
                        <span className="academic_history_module_name">{module.name}</span>
                      </div>
                      <div className="academic_history_module_details">
                        <span className="academic_history_module_mcs">{module.mcs} MCs</span>
                        <div className="academic_history_grade_display">
                          <span className={`academic_history_module_grade ${getGradeColor(getDisplayGrade(module))}`}>
                            {getDisplayGrade(module)}
                          </span>
                          {module.suUsed ? (
                            <button
                              onClick={() => toggleModuleGrade(semester.id, idx)}
                              className="academic_history_btn_icon_inline"
                              title={module.showActualGrade ? "Hide actual grade" : "Show actual grade"}
                              type="button"
                            >
                              {module.showActualGrade ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          ) : (
                            <div className="academic_history_btn_icon_placeholder"></div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="academic_history_semester_actions">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      startEditingSemester(semester);
                    }}
                    className="academic_history_btn academic_history_btn_ghost academic_history_btn_small"
                    type="button"
                  >
                    <Edit2 size={16} />
                    Edit Semester
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeSemester(semester.id);
                    }}
                    className="academic_history_btn academic_history_btn_ghost academic_history_btn_small academic_history_btn_danger"
                    type="button"
                  >
                    <Trash2 size={16} />
                    Delete Semester
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
        
      </div>
      <ConfirmModal
        isOpen={deleteModalState.isOpen}
        onClose={() => setDeleteModalState({ isOpen: false, semesterId: null })}
        onConfirm={handleDeleteConfirm}
        title="Delete Semester"
        message={(() => {
          const semester = semesters.find(s => s.id === deleteModalState.semesterId);
          if (!semester) return '';
          return (
            <>
              Are you sure you want to delete:
              <br />
              <span style={{ color: '#FF6B00', fontWeight: 600 }}>{semester.name}</span>
            </>
          );
        })()}
        confirmText="Delete Semester"
        cancelText="Cancel"
      />
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ isOpen: false, message: '' })}
        message={alertModal.message}
      />
    </div>
  );
}