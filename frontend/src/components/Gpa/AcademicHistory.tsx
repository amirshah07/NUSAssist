import { useState } from 'react';
import { Plus, X, ChevronDown, Edit2, Trash2 } from 'lucide-react';
import { 
  gradeOptions, 
  calculateSemesterCAP, 
  getGradeColor,
  getGradePoint,
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
}

interface NewSemesterState {
  year: string;
  semester: string;
  modules: Partial<Module>[];
}

export default function AcademicHistory({ semesters, onSemestersChange }: AcademicHistoryProps) {
  const [expandedSemesters, setExpandedSemesters] = useState<{ [key: string]: boolean }>({ Y1S1: true });
  const [isAddingSemester, setIsAddingSemester] = useState(false);
  const [editingSemesterId, setEditingSemesterId] = useState<string | null>(null);
  const [newSemester, setNewSemester] = useState<NewSemesterState>({
    year: '1',
    semester: '1',
    modules: [{ code: '', grade: 'A', gradePoint: 5.0 }]
  });

  const toggleSemester = (semId: string) => {
    setExpandedSemesters(prev => ({ ...prev, [semId]: !prev[semId] }));
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
        mcs: mod.mcs
      }))
    });
    
    setEditingSemesterId(semester.id);
    setIsAddingSemester(true);
  };

  const addModuleToNewSemester = () => {
    setNewSemester(prev => ({
      ...prev,
      modules: [...prev.modules, { code: '', grade: 'A', gradePoint: 5.0 }]
    }));
  };

  const updateNewSemesterModule = (index: number, field: keyof Module, value: string | number) => {
    const updated = [...newSemester.modules];
    updated[index] = { ...updated[index], [field]: value };
    
    if (field === 'grade') {
      updated[index].gradePoint = getGradePoint(value as string);
    }
    
    setNewSemester(prev => ({ ...prev, modules: updated }));
  };

  const removeNewSemesterModule = (index: number) => {
    setNewSemester(prev => ({
      ...prev,
      modules: prev.modules.filter((_, i) => i !== index)
    }));
  };

  const saveSemester = () => {
    const validModules = newSemester.modules.filter(m => m.code);
    if (validModules.length === 0) return;

    // In a real app, fetch module details from database
    const modulesWithDetails: Module[] = validModules.map(mod => ({
      code: mod.code!,
      name: mod.name || `Module ${mod.code}`,
      mcs: mod.mcs || 4,
      grade: mod.grade!,
      gradePoint: mod.gradePoint!
    }));

    const semId = `Y${newSemester.year}S${newSemester.semester}`;
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
    
    // Update expanded state
    if (!editingSemesterId || editingSemesterId !== semId) {
      setExpandedSemesters(prev => ({ ...prev, [semId]: true }));
    }
    
    // Reset form
    setIsAddingSemester(false);
    setEditingSemesterId(null);
    setNewSemester({ year: '1', semester: '1', modules: [{ code: '', grade: 'A', gradePoint: 5.0 }] });
  };

  const removeSemester = (semId: string) => {
    if (window.confirm(`Delete ${semesters.find(s => s.id === semId)?.name}?`)) {
      onSemestersChange(semesters.filter(sem => sem.id !== semId));
      setExpandedSemesters(prev => {
        const updated = { ...prev };
        delete updated[semId];
        return updated;
      });
    }
  };

  const cancelEdit = () => {
    setIsAddingSemester(false);
    setEditingSemesterId(null);
    setNewSemester({ year: '1', semester: '1', modules: [{ code: '', grade: 'A', gradePoint: 5.0 }] });
  };

  return (
    <div className="academic-history">
      <div className="section-header">
        <h2 className="section-title">Academic History</h2>
        {!isAddingSemester && (
          <button
            onClick={() => {
              setIsAddingSemester(true);
              setEditingSemesterId(null);
              setNewSemester({ year: '1', semester: '1', modules: [{ code: '', grade: 'A', gradePoint: 5.0 }] });
            }}
            className="btn btn-primary"
          >
            <Plus size={20} />
            Add Semester
          </button>
        )}
      </div>
      
      <div className="semesters-list">
        {/* Add/Edit Semester Form */}
        {isAddingSemester && (
          <div className="semester-form">
            <div className="form-header">
              <h3 className="form-title">
                {editingSemesterId ? 'Edit Semester' : 'Add New Semester'}
              </h3>
              <button onClick={cancelEdit} className="btn-icon">
                <X size={20} />
              </button>
            </div>
            
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Year</label>
                <select
                  value={newSemester.year}
                  onChange={(e) => setNewSemester(prev => ({ ...prev, year: e.target.value }))}
                  className="form-select"
                >
                  <option value="1">Year 1</option>
                  <option value="2">Year 2</option>
                  <option value="3">Year 3</option>
                  <option value="4">Year 4</option>
                  <option value="5">Year 5</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Semester</label>
                <select
                  value={newSemester.semester}
                  onChange={(e) => setNewSemester(prev => ({ ...prev, semester: e.target.value }))}
                  className="form-select"
                >
                  <option value="1">Semester 1</option>
                  <option value="2">Semester 2</option>
                  <option value="ST1">Special Term 1</option>
                  <option value="ST2">Special Term 2</option>
                </select>
              </div>
            </div>
            
            <div className="form-modules">
              <label className="form-label">Modules</label>
              {editingSemesterId && (
                <p className="form-hint">Module names and MCs will be preserved</p>
              )}
              {newSemester.modules.map((module, idx) => (
                <div key={idx} className="module-input-row">
                  <div className="module-input-group">
                    <input
                      type="text"
                      placeholder="Module Code (e.g. CS1101S)"
                      value={module.code || ''}
                      onChange={(e) => updateNewSemesterModule(idx, 'code', e.target.value.toUpperCase())}
                      className="form-input"
                    />
                    {module.name && (
                      <p className="module-name-hint">{module.name}</p>
                    )}
                  </div>
                  <select
                    value={module.grade || 'A'}
                    onChange={(e) => updateNewSemesterModule(idx, 'grade', e.target.value)}
                    className="form-select grade-select"
                  >
                    {gradeOptions.map(opt => (
                      <option key={opt.grade} value={opt.grade}>{opt.grade}</option>
                    ))}
                  </select>
                  {newSemester.modules.length > 1 && (
                    <button
                      onClick={() => removeNewSemesterModule(idx)}
                      className="btn-icon btn-icon-danger"
                    >
                      <X size={20} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            
            <button
              onClick={addModuleToNewSemester}
              className="btn btn-secondary btn-small"
            >
              <Plus size={16} />
              Add Module
            </button>
            
            <div className="form-actions">
              <button onClick={cancelEdit} className="btn btn-ghost">
                Cancel
              </button>
              <button onClick={saveSemester} className="btn btn-primary">
                {editingSemesterId ? 'Update Semester' : 'Save Semester'}
              </button>
            </div>
          </div>
        )}
        
        {/* Existing Semesters */}
        {sortSemesters(semesters).map(semester => (
          <div key={semester.id} className="semester-card">
            <button
              className="semester-header"
              onClick={() => toggleSemester(semester.id)}
            >
              <div className="semester-info">
                <span className="semester-name">{semester.name}</span>
                <span className="semester-cap">
                  CAP: <span className="cap-value">{calculateSemesterCAP(semester.modules)}</span>
                </span>
              </div>
              <ChevronDown 
                className={`chevron-icon ${expandedSemesters[semester.id] ? 'chevron-up' : ''}`}
                size={20}
              />
            </button>
            
            {expandedSemesters[semester.id] && (
              <div className="semester-content">
                <div className="modules-list">
                  {semester.modules.map((module, idx) => (
                    <div key={idx} className="module-row">
                      <div className="module-info">
                        <span className="module-code">{module.code}</span>
                        <span className="module-name">{module.name}</span>
                      </div>
                      <div className="module-details">
                        <span className="module-mcs">{module.mcs} MCs</span>
                        <span className={`module-grade ${getGradeColor(module.grade)}`}>
                          {module.grade}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="semester-actions">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      startEditingSemester(semester);
                    }}
                    className="btn btn-ghost btn-small"
                  >
                    <Edit2 size={16} />
                    Edit Semester
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeSemester(semester.id);
                    }}
                    className="btn btn-ghost btn-small btn-danger"
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
    </div>
  );
}