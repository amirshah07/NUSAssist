import { useState } from 'react';
import { Calculator, Plus, X, Trash2, Edit2 } from 'lucide-react';
import ModuleSearchInput from './ModuleSearchInput';
import ConfirmModal from '../ConfirmModal/ConfirmModal';
import AlertModal from './AlertModal'
import { 
  gradeOptions,
  calculateCAP,
  calculateProjectedCAP,
  getGradePoint,
  getGradeColor
} from './GpaCalculations';
import type { 
  Semester, 
  Module,
} from './GpaCalculations';
import './PlanningSection.css';

interface PlanningSectionProps {
  semesters: Semester[];
}

interface PlanningModule extends Partial<Module> {
  id: string; 
  name?: string;
  suUsed?: boolean;
}

export default function PlanningSection({ semesters }: PlanningSectionProps) {
  const [planningModules, setPlanningModules] = useState<PlanningModule[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [hasSimulated, setHasSimulated] = useState(false);
  const [previousModules, setPreviousModules] = useState<PlanningModule[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [alertModal, setAlertModal] = useState<{
  isOpen: boolean;
  message: string;
}>({ isOpen: false, message: '' });
  
  const startSimulation = () => {
    // Save current state before editing
    setPreviousModules([...planningModules]);
    setIsSimulating(true);
    if (planningModules.length === 0) {
      addPlanningModule();
    } else {
      // Ensure all existing modules have proper gradePoint values
      setPlanningModules(prev => prev.map(module => ({
        ...module,
        gradePoint: module.gradePoint || getGradePoint(module.grade || 'A')
      })));
    }
  };

  const addPlanningModule = () => {
    const newModule: PlanningModule = {
      id: `plan-${Date.now()}`,
      code: '',
      name: '',
      mcs: 4,
      grade: 'A',
      gradePoint: getGradePoint('A'), 
      suUsed: false
    };
    setPlanningModules(prev => [...prev, newModule]);
    
    setTimeout(() => {
      const inputs = document.querySelectorAll('.planning_section_planning_form_card .planning_section_module_code_field input');
      const lastInput = inputs[inputs.length - 1] as HTMLInputElement;
      lastInput?.focus();
    }, 100);
  };

  const updatePlanningModule = (id: string, field: keyof PlanningModule, value: string | number | boolean) => {
    setPlanningModules(prev => prev.map(module => {
      if (module.id === id) {
        const updated = { ...module, [field]: value };
        
        if (field === 'code' && typeof value === 'string') {
          updated.code = value.toUpperCase();
        }
        
        // Update grade point when grade changes
        if (field === 'grade' && typeof value === 'string') {
          updated.gradePoint = getGradePoint(value);
        }
        
        return updated;
      }
      return module;
    }));
  };

  const removePlanningModule = (id: string) => {
    setPlanningModules(prev => prev.filter(module => module.id !== id));
  };

  const clearAllModules = () => {
    setShowDeleteModal(true);
  };
  const handleDeleteConfirm = () => {
  setPlanningModules([]);
  setHasSimulated(false);
  setShowDeleteModal(false);
};

  const cancelSimulation = () => {
    // Revert to previous state (empty array if no previous simulation)
    setPlanningModules(previousModules);
    setIsSimulating(false);
  };

  const simulateGPA = () => {
    // Filter out modules without codes
    const validModules = planningModules.filter(m => m.code && m.code.trim().length > 0);
    
    if (validModules.length === 0) {
      setAlertModal({
        isOpen: true,
        message: 'Please add at least one module with a code to simulate GPA.'
      });
      return;
    }
    
    // Check for valid MC values
    const invalidMC = validModules.some(m => {
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
    
    // Check for duplicate module codes within planning modules only
    const moduleCodes = validModules.map(m => m.code!.trim().toUpperCase());
    const uniqueCodes = new Set(moduleCodes);
    
  if (moduleCodes.length !== uniqueCodes.size) {
    setAlertModal({
      isOpen: true,
      message: 'Duplicate module codes found in simulation. Please ensure all module codes are unique.'
    });
    return;
  }
    
    // Update the modules to only include valid ones 
    const normalizedModules = validModules.map(m => {
      const grade = m.grade || 'A';
      return {
        ...m,
        code: m.code!.trim().toUpperCase(),
        grade: grade,
        gradePoint: getGradePoint(grade),
        mcs: Number(m.mcs) || 4
      };
    });
    setPlanningModules(normalizedModules);
    
    setHasSimulated(true);
    
    setIsSimulating(false);
  };

  const currentCAP = calculateCAP(semesters);
  // Only calculate projected GPA with modules that have been simulated
  const projectedCAP = hasSimulated 
    ? calculateProjectedCAP(semesters, planningModules)
    : currentCAP; // Show current GPA when no simulation has been run
  
  const currentCAPRounded = Math.round(parseFloat(currentCAP) * 100) / 100;
  const projectedCAPRounded = Math.round(parseFloat(projectedCAP) * 100) / 100;
  const capDifference = hasSimulated ? projectedCAPRounded - currentCAPRounded : 0;
  const hasValidModules = hasSimulated && planningModules.filter(m => m.code).length > 0;
  
  const projectedCAPDisplay = projectedCAPRounded.toFixed(2);

  return (
    <div className="planning_section">
      <div className="planning_section_section_header">
        <h2 className="planning_section_section_title">GPA Simulator</h2>
        {!isSimulating && (
          <button
            onClick={startSimulation}
            className="planning_section_btn planning_section_btn_secondary"
          >
            <Plus size={20} />
            Add Modules
          </button>
        )}
      </div>
      
      {isSimulating && (
        <div className="planning_section_planning_form_card">
          <div className="planning_section_form_header">
            <h3 className="planning_section_form_title">Simulate GPA</h3>
            <button onClick={cancelSimulation} className="planning_section_btn_icon" type="button">
              <X size={20} />
            </button>
          </div>

          <div className="planning_section_form_modules">
            {planningModules.map((module, idx) => (
              <div key={module.id} className="planning_section_module_row_wrapper">
                <div className="planning_section_module_input_grid">
                  <div className="planning_section_form_field planning_section_module_code_field">
                    <label className={`planning_section_form_label ${idx !== 0 ? 'planning_section_desktop_hidden' : ''}`}>Module code</label>
                    <ModuleSearchInput
                      value={module.code || ''}
                      onModuleSelect={(code, name, mcs) => {
                        updatePlanningModule(module.id, 'code', code);
                        updatePlanningModule(module.id, 'name', name);
                        updatePlanningModule(module.id, 'mcs', mcs);
                        const currentGrade = module.grade || 'A';
                        updatePlanningModule(module.id, 'gradePoint', getGradePoint(currentGrade));
                      }}
                      onManualEntry={(code) => {
                        updatePlanningModule(module.id, 'code', code);
                        
                        if (!code) {
                          updatePlanningModule(module.id, 'name', '');
                        }
                      }}
                      autoFocus={idx === 0}
                    />
                  </div>
                  <div className="planning_section_form_field planning_section_module_name_field">
                    <label className={`planning_section_form_label ${idx !== 0 ? 'planning_section_desktop_hidden' : ''}`}>Module name</label>
                    <input
                      type="text"
                      value={module.name || ''}
                      onChange={(e) => updatePlanningModule(module.id, 'name', e.target.value)}
                      className="planning_section_form_input"
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
                  <div className="planning_section_form_field planning_section_mc_field">
                    <label className={`planning_section_form_label ${idx !== 0 ? 'planning_section_desktop_hidden' : ''}`}>MCs</label>
                    <input
                      type="number"
                      value={module.mcs || 4}
                      onChange={(e) => updatePlanningModule(module.id, 'mcs', parseInt(e.target.value) || 0)}
                      className="planning_section_form_input planning_section_mcs_input"
                      placeholder="4"
                      min="0"
                      max="32"
                    />
                  </div>
                  <div className="planning_section_form_field planning_section_grade_field">
                    <label className={`planning_section_form_label ${idx !== 0 ? 'planning_section_desktop_hidden' : ''}`}>Grade</label>
                    <select
                      value={module.grade || 'A'}
                      onChange={(e) => updatePlanningModule(module.id, 'grade', e.target.value)}
                      className="planning_section_form_select"
                    >
                      {gradeOptions.map(opt => (
                        <option key={opt.grade} value={opt.grade}>{opt.grade}</option>
                      ))}
                    </select>
                  </div>
                  <div className="planning_section_form_field planning_section_su_field">
                    <label className={`planning_section_form_label ${idx !== 0 ? 'planning_section_desktop_hidden' : ''}`}>S/U</label>
                    <label className="planning_section_su_checkbox">
                      <input
                        type="checkbox"
                        checked={module.suUsed || false}
                        onChange={(e) => updatePlanningModule(module.id, 'suUsed', e.target.checked)}
                        className="planning_section_su_checkbox_input"
                      />
                    </label>
                  </div>
                  <div className="planning_section_form_field planning_section_action_field">
                    {idx === 0 && <label className="planning_section_form_label_invisible">Action</label>}
                    {planningModules.length > 1 ? (
                      <button
                        onClick={() => removePlanningModule(module.id)}
                        className="planning_section_btn_icon planning_section_btn_icon_danger"
                        type="button"
                      >
                        <X size={20} />
                      </button>
                    ) : (
                      <div className="planning_section_module_action_spacer"></div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <button
            onClick={addPlanningModule}
            className="planning_section_btn planning_section_btn_secondary planning_section_btn_small"
            type="button"
          >
            <Plus size={16} />
            Add Module
          </button>
          
          <div className="planning_section_form_actions">
            <button onClick={cancelSimulation} className="planning_section_btn planning_section_btn_ghost" type="button">
              Cancel
            </button>
            <button 
              onClick={simulateGPA} 
              className="planning_section_btn planning_section_btn_primary"
              type="button"
            >
              Simulate GPA
            </button>
          </div>
        </div>
      )}
      
      {!isSimulating && (
        (!hasSimulated || planningModules.length === 0) ? (
          <div className="planning_section_empty_state_card">
            <Calculator className="planning_section_empty_state_icon" size={48} />
            <h3 className="planning_section_empty_state_title">No Simulation Yet</h3>
            <p className="planning_section_empty_state_text">
              Add a module to see your projected GPA
            </p>
          </div>
        ) : (
          <>
            <div className="planning_section_planning_results_card">
              <h3 className="planning_section_results_title">Simulated Modules</h3>
              <div className="planning_section_simulated_modules_list">
                {planningModules.map(module => (
                  <div key={module.id} className="planning_section_simulated_module_row">
                    <div className="planning_section_module_info">
                      <span className="planning_section_module_code">{module.code}</span>
                      <span className="planning_section_module_name">{module.name}</span>
                    </div>
                    <div className="planning_section_module_details">
                      <span className="planning_section_module_mcs">{module.mcs} MCs</span>
                      <span className={`planning_section_module_grade ${getGradeColor(module.suUsed && module.grade !== 'S' && module.grade !== 'U' ? 'S' : module.grade || 'A')}`}>
                        {module.suUsed && module.grade !== 'S' && module.grade !== 'U' ? 'S' : module.grade}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="planning_section_simulation_actions">
                <button onClick={startSimulation} className="planning_section_btn planning_section_btn_ghost planning_section_btn_small">
                  <Edit2 size={16} />
                  Edit Simulation
                </button>
                <button onClick={clearAllModules} className="planning_section_btn planning_section_btn_ghost planning_section_btn_small planning_section_btn_danger">
                  <Trash2 size={16} />
                  Clear All
                </button>
              </div>
            </div>
          </>
        )
      )}
      
      <div className="planning_section_planning_results">
        <div className="planning_section_result_card">
          <p className="planning_section_result_label">Current GPA</p>
          <p className="planning_section_result_value">{currentCAP}</p>
        </div>
        <div className={`planning_section_result_card ${
          hasValidModules 
            ? capDifference > 0 
              ? 'planning_section_result_card_increase' 
              : capDifference < 0 
                ? 'planning_section_result_card_decrease' 
                : 'planning_section_result_card_same'
            : ''
        }`}>
          <p className="planning_section_result_label">Projected GPA</p>
          <p className={`planning_section_result_value ${
            hasValidModules 
              ? capDifference > 0 
                ? 'planning_section_result_value_increase' 
                : capDifference < 0 
                  ? 'planning_section_result_value_decrease' 
                  : 'planning_section_result_value_same'
              : ''
          }`}>
            {projectedCAPDisplay}
          </p>
          {hasValidModules ? (
            <p className={`planning_section_result_change ${
              capDifference > 0 ? 'planning_section_result_change_positive' : 
              capDifference < 0 ? 'planning_section_result_change_negative' : 
              'planning_section_result_change_neutral'
            }`}>
              {capDifference > 0 ? '↑' : capDifference < 0 ? '↓' : '→'} 
              {' '}
              {Math.abs(capDifference).toFixed(2)} from current
            </p>
          ) : (
            <p className="planning_section_result_hint">Simulate to see changes</p>
          )}
        </div>
      </div>
        <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
        title="Clear Simulation"
        message={(() => {
          return (
            <>
              Are you sure you want to clear all simulated modules?
            </>
          );
        })()}
        confirmText="Clear All"
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