import React, { useState, useEffect, useMemo, useRef } from 'react';
import { X, Plus, Minus, Search } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import type { SelectedModule } from './types';
import './TimetableAddModuleModal.css';

interface Module {
  moduleCode: string;
  title: string;
  description: string;
  modulecredit: number;
  semesterData: any;
}

interface TimetableAddModuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentModules: SelectedModule;
  currentSemester: "sem1" | "sem2";
  onAddModule: (module: Module) => void;
  onRemoveModule: (moduleCode: string) => void;
}

const TimetableAddModuleModal = ({
  isOpen,
  onClose,
  currentModules,
  currentSemester,
  onAddModule,
  onRemoveModule
}: TimetableAddModuleModalProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Module[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const currentModuleCodes = useMemo(() => 
    new Set(Object.keys(currentModules)),
    [currentModules]
  );

  useEffect(() => {
    async function searchModules() {
      const query = searchQuery.trim();
      if (!query || query.length < 2) {
        setSearchResults([]);
        return;
      }

      setLoading(true);
      try {
        const { data } = await supabase
          .from(currentSemester)
          .select('moduleCode, moduleTitle, semesterData, moduleCredit')
          .ilike('moduleCode', `%${query}%`)
          .limit(20);

        const modules = (data || []).map(item => ({
          moduleCode: item.moduleCode,
          title: item.moduleTitle || 'No title available',
          description: item.semesterData?.description || 'No description available',
          modulecredit: item.moduleCredit || 0,
          semesterData: item.semesterData
        }));
        
        setSearchResults(modules);
      } catch (error) {
        setSearchResults([]);
      } finally {
        setLoading(false);
      }
    }

    const debounceTimer = setTimeout(searchModules, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery, currentSemester]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    } else {
      setSearchQuery('');
      setSelectedIndex(-1);
      setSearchResults([]);
    }
  }, [isOpen]);

  const filteredResults = useMemo(() => 
    searchQuery.trim() ? searchResults.slice(0, 10) : [],
    [searchQuery, searchResults]
  );

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!isOpen || filteredResults.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => prev < filteredResults.length - 1 ? prev + 1 : prev);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
          break;
        case 'Enter':
          e.preventDefault();
          if (selectedIndex >= 0 && selectedIndex < filteredResults.length) {
            const selectedModule = filteredResults[selectedIndex];
            if (selectedModule) {
              currentModuleCodes.has(selectedModule.moduleCode)
                ? onRemoveModule(selectedModule.moduleCode)
                : onAddModule(selectedModule);
            }
          }
          break;
        case 'Escape':
          onClose();
          break;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredResults, selectedIndex, currentModuleCodes, onAddModule, onRemoveModule, onClose]);

  useEffect(() => {
    setSelectedIndex(-1);
  }, [searchQuery]);

  function handleAddModule(module: Module) {
    if (!currentModuleCodes.has(module.moduleCode)) {
      onAddModule(module);
      setSearchQuery('');
      setSearchResults([]);
    }
  }

  function boldMatch(text: string, query: string): React.ReactNode {
    if (!query.trim()) return text;
    
    const queryLower = query.trim().toLowerCase();
    const textLower = text.toLowerCase();
    const index = textLower.indexOf(queryLower);
    
    if (index >= 0) {
      return (
        <>
          {text.slice(0, index)}
          <strong>{text.slice(index, index + query.length)}</strong>
          {text.slice(index + query.length)}
        </>
      );
    }
    return text;
  }

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container timetable-add-modal-size" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Add/Remove Modules</h3>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="timetable-search-section">
          <div className="search-container">
            <div className="search-input-wrapper">
              <Search size={18} className="search-icon" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder={`Search ${currentSemester === 'sem1' ? 'Semester 1' : 'Semester 2'} modules by code`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
              {searchQuery && (
                <button className="search-clear" onClick={() => setSearchQuery('')}>
                  <X size={16} />
                </button>
              )}
            </div>

            {searchQuery && (
              <div className="search-dropdown">
                {loading ? (
                  <div className="search-loading-state">
                    <div className="loading-spinner"></div>
                    <span>Searching modules...</span>
                  </div>
                ) : filteredResults.length === 0 ? (
                  <div className="search-empty-state">
                    {searchQuery.length < 2 
                      ? 'Type at least 2 characters to search'
                      : `No results found for "${searchQuery}" in ${currentSemester}`}
                  </div>
                ) : (
                  <div className="search-results-list">
                    {filteredResults.map((module, index) => {
                      const isInTimetable = currentModuleCodes.has(module.moduleCode);

                      return (
                        <div 
                          key={module.moduleCode} 
                          className={`search-result-item ${selectedIndex === index ? 'selected' : ''} ${isInTimetable ? 'in-timetable' : ''}`}
                          onMouseEnter={() => setSelectedIndex(index)}
                        >
                          <div className="result-content">
                            <div className="result-header">
                              <span className="result-code">
                                {boldMatch(module.moduleCode, searchQuery)}
                              </span>
                            </div>
                            <div className="result-title">
                              {boldMatch(module.title, searchQuery)}
                            </div>
                          </div>
                          
                          <div className="result-action">
                            <button
                              className={`action-icon-button ${isInTimetable ? 'remove' : 'add'}`}
                              onClick={() => isInTimetable 
                                ? onRemoveModule(module.moduleCode) 
                                : handleAddModule(module)}
                            >
                              {isInTimetable ? <Minus size={18} /> : <Plus size={18} />}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="current-modules-section">
          <h4 className="section-title">Modules in Timetable ({Object.keys(currentModules).length})</h4>
          <div className="module-tags">
            {Object.keys(currentModules)
              .sort((a, b) => a.localeCompare(b))
              .map(moduleCode => (
                <div key={moduleCode} className="module-tag">
                  <span className="tag-code">{moduleCode}</span>
                  <button
                    className="tag-remove"
                    onClick={() => onRemoveModule(moduleCode)}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
          </div>
          
          {Object.keys(currentModules).length === 0 && (
            <div className="no-modules-message">
              <p>No modules in your timetable yet. Search above to add modules.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TimetableAddModuleModal;