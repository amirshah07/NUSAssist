import { useState } from 'react';
import { Calculator, Plus, X } from 'lucide-react';
import { 
  gradeOptions,
  calculateCAP,
  calculateProjectedCAP,
  getGradePoint
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
  id: string; // For React key
}

export default function PlanningSection({ semesters }: PlanningSectionProps) {
  const [planningModules, setPlanningModules] = useState<PlanningModule[]>([]);
  
  const addPlanningModule = () => {
    const newModule: PlanningModule = {
      id: `plan-${Date.now()}`,
      code: '',
      mcs: 4,
      grade: 'A',
      gradePoint: 5.0
    };
    setPlanningModules(prev => [...prev, newModule]);
  };

  const updatePlanningModule = (id: string, field: keyof Module, value: string | number) => {
    setPlanningModules(prev => prev.map(module => {
      if (module.id === id) {
        const updated = { ...module, [field]: value };
        
        if (field === 'grade') {
          updated.gradePoint = getGradePoint(value as string);
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
    setPlanningModules([]);
  };

  const currentCAP = calculateCAP(semesters);
  const projectedCAP = calculateProjectedCAP(semesters, planningModules);
  const capDifference = parseFloat(projectedCAP) - parseFloat(currentCAP);
  const hasValidModules = planningModules.filter(m => m.code).length > 0;

  return (
    <div className="planning-section">
      <h2 className="section-title">GPA Planning</h2>
      
      <div className="planning-card">
        <div className="planning-header">
          <div>
            <h3 className="planning-title">
              <Calculator className="planning-icon" size={20} />
              {planningModules.length > 0 ? 'Planning Results' : 'Plan Your Grades'}
            </h3>
            <p className="planning-description">
              Add modules you're planning to take (current semester or future) to see how different grades would affect your CAP
            </p>
          </div>
        </div>
        
        <div className="planning-modules">
          {planningModules.length === 0 ? (
            <div className="empty-state">
              <p className="empty-state-text">No modules added yet</p>
              <p className="empty-state-hint">Start planning by adding modules you're considering</p>
            </div>
          ) : (
            planningModules.map(module => (
              <div key={module.id} className="planning-module-row">
                <input
                  type="text"
                  placeholder="Module Code (e.g. CS3230)"
                  value={module.code || ''}
                  onChange={(e) => updatePlanningModule(module.id, 'code', e.target.value.toUpperCase())}
                  className="form-input"
                />
                <input
                  type="number"
                  value={module.mcs || 4}
                  onChange={(e) => updatePlanningModule(module.id, 'mcs', parseInt(e.target.value) || 0)}
                  className="form-input mcs-input"
                  placeholder="MCs"
                  min="0"
                  max="12"
                />
                <select
                  value={module.grade || 'A'}
                  onChange={(e) => updatePlanningModule(module.id, 'grade', e.target.value)}
                  className="form-select grade-select"
                >
                  {gradeOptions.map(opt => (
                    <option key={opt.grade} value={opt.grade}>{opt.grade}</option>
                  ))}
                </select>
                <button
                  onClick={() => removePlanningModule(module.id)}
                  className="btn-icon btn-icon-danger"
                >
                  <X size={20} />
                </button>
              </div>
            ))
          )}
        </div>
        
        <div className="planning-actions">
          <button onClick={addPlanningModule} className="btn btn-secondary">
            <Plus size={20} />
            Add Module
          </button>
          {planningModules.length > 0 && (
            <button onClick={clearAllModules} className="btn btn-ghost btn-small">
              Clear All
            </button>
          )}
        </div>
        
        <div className="planning-results">
          <div className="result-card">
            <p className="result-label">Current CAP</p>
            <p className="result-value">{currentCAP}</p>
          </div>
          <div className={`result-card ${hasValidModules ? 'result-card-active' : ''}`}>
            <p className="result-label">Projected CAP</p>
            <p className={`result-value ${hasValidModules ? 'result-value-projected' : ''}`}>
              {projectedCAP}
            </p>
            {hasValidModules ? (
              <p className={`result-change ${
                capDifference > 0 ? 'result-change-positive' : 
                capDifference < 0 ? 'result-change-negative' : 
                'result-change-neutral'
              }`}>
                {capDifference > 0 ? '↑' : capDifference < 0 ? '↓' : '→'} 
                {' '}
                {Math.abs(capDifference).toFixed(3)} from current
              </p>
            ) : (
              <p className="result-hint">Add modules to see changes</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}