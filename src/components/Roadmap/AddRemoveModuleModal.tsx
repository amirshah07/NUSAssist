import React, { useState, useEffect, useMemo, useRef } from 'react';
import { X, Plus, Minus, Search, AlertCircle, Lock } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import type { Node, Edge } from '@xyflow/react';
import type { ModuleNodeData } from './CustomNode';
import './AddRemoveModuleModal.css';

interface Module {
  moduleCode: string;
  title: string;
  description: string;
  modulecredit: number;
  hard_prerequisites?: any;
}

interface AddRemoveModuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentNodes: Node[];
  currentEdges: Edge[];
  onAddModule: (module: Module) => void;
  onRemoveModule: (moduleCode: string) => void;
}

const AddRemoveModuleModal = ({
  isOpen,
  onClose,
  currentNodes,
  currentEdges,
  onAddModule,
  onRemoveModule
}: AddRemoveModuleModalProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [allModules, setAllModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [confirmRemove, setConfirmRemove] = useState<{
    moduleCode: string;
    dependents: string[];
  } | null>(null);

  // Get current module codes in roadmap
  const currentModuleCodes = useMemo(() => 
    new Set(currentNodes.map(node => (node.data as ModuleNodeData).moduleCode || node.id.toUpperCase())),
    [currentNodes]
  );

  // Load all modules on component mount
  useEffect(() => {
    const loadModules = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('available_mods')
          .select('moduleCode, title, description, modulecredit, hard_prerequisites')
          .order('moduleCode');

        if (error) throw error;
        setAllModules(data || []);
      } catch (error) {
        console.error('Error loading modules:', error);
      } finally {
        setLoading(false);
      }
    };

    loadModules();
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setSelectedIndex(-1);
    }
  }, [isOpen]);

  // Helper function to check if module code matches (prefix matching)
  const matchesModuleCode = (moduleCode: string, query: string): boolean => {
    if (!query.trim()) return false;
    return moduleCode.toLowerCase().startsWith(query.trim().toLowerCase());
  };

  // Helper function to check if title matches (prefix matching on words)
  const matchesTitle = (title: string, query: string): boolean => {
    if (!query.trim()) return false;
    
    const queryWords = query.trim().toLowerCase().split(/\s+/);
    const titleWords = title.toLowerCase().split(/\s+/);
    
    // Check if all query words match the beginning of any word in the title
    return queryWords.every(queryWord => {
      return titleWords.some(titleWord => titleWord.startsWith(queryWord));
    });
  };

  // Filter modules based on search query
  const filteredModules = useMemo(() => {
    if (!searchQuery.trim()) return [];
    
    const query = searchQuery.trim();
    
    // Separate modules into those matching by code and by title
    const codeMatches: Module[] = [];
    const titleMatches: Module[] = [];
    
    allModules.forEach(module => {
      if (matchesModuleCode(module.moduleCode, query)) {
        codeMatches.push(module);
      } else if (matchesTitle(module.title, query)) {
        titleMatches.push(module);
      }
    });
    
    // Sort each group alphabetically
    codeMatches.sort((a, b) => 
      a.moduleCode.localeCompare(b.moduleCode, undefined, { numeric: true })
    );
    
    titleMatches.sort((a, b) => 
      a.moduleCode.localeCompare(b.moduleCode, undefined, { numeric: true })
    );
    
    // Combine results: code matches first, then title matches
    return [...codeMatches, ...titleMatches].slice(0, 30);
  }, [searchQuery, allModules]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen || filteredModules.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => {
            if (prev === -1) return 0;
            return prev < filteredModules.length - 1 ? prev + 1 : prev;
          });
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => {
            if (prev <= 0) return -1;
            return prev - 1;
          });
          break;
        case 'Enter':
          e.preventDefault();
          if (selectedIndex >= 0 && selectedIndex < filteredModules.length) {
            const selectedModule = filteredModules[selectedIndex];
            if (selectedModule) {
              const isInRoadmap = currentModuleCodes.has(selectedModule.moduleCode);
              if (isInRoadmap) {
                handleRemoveModule(selectedModule.moduleCode);
              } else {
                const { canAdd } = checkPrerequisites(selectedModule);
                if (canAdd) {
                  handleAddModule(selectedModule);
                }
              }
            }
          }
          break;
        case 'Escape':
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredModules, selectedIndex, currentModuleCodes]);

  useEffect(() => {
    setSelectedIndex(-1);
  }, [searchQuery]);

  // Check if module can be added (prerequisites met)
  const checkPrerequisites = (module: Module): { canAdd: boolean; missingPrereqs: string[] } => {
    if (!module.hard_prerequisites) {
      return { canAdd: true, missingPrereqs: [] };
    }

    const missingPrereqs: string[] = [];
    checkPrerequisiteNode(module.hard_prerequisites, missingPrereqs);

    return {
      canAdd: missingPrereqs.length === 0,
      missingPrereqs
    };
  };

  // Recursive function to check prerequisites
  const checkPrerequisiteNode = (prereq: any, missing: string[]): boolean => {
    if (typeof prereq === 'string') {
      // Handle slash-separated options (e.g., "CS1010/CS1010S")
      const options = prereq.split('/');
      const hasAnyOption = options.some(opt => currentModuleCodes.has(opt));
      if (!hasAnyOption) {
        // For display, show concisely
        if (options.length <= 2) {
          missing.push(options.join(' or '));
        } else {
          missing.push(options[0] + '+');
        }
      }
      return hasAnyOption;
    }

    if (Array.isArray(prereq)) {
      // All items in array must be satisfied
      const allSatisfied = prereq.every(item => checkPrerequisiteNode(item, missing));
      return allSatisfied;
    }

    if (prereq && typeof prereq === 'object') {
      if (prereq.type === 'or' && prereq.requirements) {
        // At least one requirement must be satisfied
        const satisfied = prereq.requirements.some((req: any) => {
          const tempMissing: string[] = [];
          const isSatisfied = checkPrerequisiteNode(req, tempMissing);
          return isSatisfied;
        });
        if (!satisfied) {
          // Extract module codes from requirements for clearer display
          const moduleOptions: string[] = [];
          prereq.requirements.forEach((req: any) => {
            if (typeof req === 'string') {
              moduleOptions.push(req);
            }
          });
          if (moduleOptions.length > 0) {
            if (moduleOptions.length <= 2) {
              missing.push(moduleOptions.join(' or '));
            } else {
              missing.push(moduleOptions[0] + '+');
            }
          } else {
            missing.push('Prerequisites not met');
          }
        }
        return satisfied;
      }

      if (prereq.type === 'minimum' && prereq.options) {
        // Need to satisfy 'count' number of options
        let satisfiedCount = 0;
        const moduleOptions: string[] = [];
        
        prereq.options.forEach((opt: any) => {
          const tempMissing: string[] = [];
          if (checkPrerequisiteNode(opt, tempMissing)) {
            satisfiedCount++;
          }
          if (typeof opt === 'string') {
            moduleOptions.push(opt);
          }
        });
        
        const isSatisfied = satisfiedCount >= (prereq.count || 1);
        if (!isSatisfied) {
          if (moduleOptions.length > 0) {
            missing.push(prereq.count + ' from list');
          } else {
            missing.push(prereq.count + ' modules required');
          }
        }
        return isSatisfied;
      }
    }

    return true;
  };

  // Format prerequisites for display
  const formatPrerequisites = (missingPrereqs: string[]): string => {
    if (missingPrereqs.length === 0) return '';
    
    let display = missingPrereqs.join(', ');
    
    // Simplify long prerequisite strings
    display = display.replace(/\s+or\s+/g, '/');
    display = display.replace(/\+/g, ' & others');
    
    const maxLength = 32;
    if (display.length > maxLength) {
      // Try to break at a module boundary
      const truncated = display.substring(0, maxLength);
      const lastSpace = truncated.lastIndexOf(' ');
      const lastComma = truncated.lastIndexOf(',');
      const lastSlash = truncated.lastIndexOf('/');
      
      // Find the best break point
      const breakPoint = Math.max(lastSpace, lastComma, lastSlash);
      
      if (breakPoint > 15) {
        return display.substring(0, breakPoint).trim() + '...';
      }
      return truncated.trim() + '...';
    }
    return display;
  };

  // Bold matching text in results
  const boldMatch = (text: string, query: string, isModuleCode: boolean = false): React.ReactNode => {
    if (!query.trim()) return text;
    
    try {
      if (isModuleCode) {
        // For module codes, bold the prefix match
        const queryLower = query.trim().toLowerCase();
        const textLower = text.toLowerCase();
        
        if (textLower.startsWith(queryLower)) {
          return (
            <>
              <strong>{text.slice(0, query.length)}</strong>
              {text.slice(query.length)}
            </>
          );
        }
        return text;
      } else {
        // For titles, bold word prefix matches
        const queryWords = query.trim().toLowerCase().split(/\s+/);
        
        // Create a map to track which characters should be bolded
        const boldMap = new Array(text.length).fill(false);
        
        // For each query word, find all word prefix matches
        queryWords.forEach(queryWord => {
          // Split text into words and check each word
          let inWord = false;
          
          for (let i = 0; i <= text.length; i++) {
            const char = i < text.length ? text[i] : ' ';
            const isWordChar = /\w/.test(char);
            
            if (!inWord && isWordChar) {
              // Start of a new word
              inWord = true;
              
              // Check if this word starts with the query word
              const remainingText = text.slice(i).toLowerCase();
              if (remainingText.startsWith(queryWord)) {
                // Mark these characters as bold
                for (let j = i; j < i + queryWord.length && j < text.length; j++) {
                  boldMap[j] = true;
                }
              }
            } else if (inWord && !isWordChar) {
              // End of current word
              inWord = false;
            }
          }
        });
        
        // Build the result with bold sections
        const result: React.ReactNode[] = [];
        let currentIndex = 0;
        
        while (currentIndex < text.length) {
          if (boldMap[currentIndex]) {
            // Find the end of this bold section
            let endIndex = currentIndex;
            while (endIndex < text.length && boldMap[endIndex]) {
              endIndex++;
            }
            result.push(<strong key={currentIndex}>{text.slice(currentIndex, endIndex)}</strong>);
            currentIndex = endIndex;
          } else {
            // Find the end of this non-bold section
            let endIndex = currentIndex;
            while (endIndex < text.length && !boldMap[endIndex]) {
              endIndex++;
            }
            result.push(<span key={currentIndex}>{text.slice(currentIndex, endIndex)}</span>);
            currentIndex = endIndex;
          }
        }
        
        return <>{result}</>;
      }
    } catch (error) {
      console.error('Error in boldMatch:', error);
      return text;
    }
  };

  // Get modules that depend on a given module
  const getDependentModules = (moduleCode: string): string[] => {
    const moduleId = moduleCode.toLowerCase().replace(/\s+/g, '');
    const dependents: string[] = [];
    
    currentEdges.forEach(edge => {
      if (edge.source === moduleId) {
        const dependentNode = currentNodes.find(n => n.id === edge.target);
        if (dependentNode) {
          const dependentCode = (dependentNode.data as ModuleNodeData).moduleCode || dependentNode.id.toUpperCase();
          dependents.push(dependentCode);
        }
      }
    });
    
    return dependents;
  };

  const handleAddModule = (module: Module) => {
    const { canAdd } = checkPrerequisites(module);
    
    if (!canAdd) {
      return;
    }

    onAddModule(module);
    setSearchQuery('');
  };

  const handleRemoveModule = (moduleCode: string) => {
    const dependents = getDependentModules(moduleCode);
    
    if (dependents.length > 0) {
      setConfirmRemove({ moduleCode, dependents });
      return;
    }
    
    onRemoveModule(moduleCode);
  };

  const handleConfirmRemove = () => {
    if (confirmRemove) {
      onRemoveModule(confirmRemove.moduleCode);
      setConfirmRemove(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="add-remove-modal-overlay" onClick={onClose}>
      <div 
        className="add-remove-modal" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="add-remove-modal-header">
          <h3 className="add-remove-modal-title">Add/Remove Modules</h3>
          <button 
            className="add-remove-modal-close"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        <div className="search-section">
          <div className="search-container">
            <div className="search-input-wrapper">
              <Search size={18} className="search-icon" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search modules by code or title"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
              {searchQuery && (
                <button
                  className="search-clear"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {searchQuery && (
              <div className="search-dropdown">
                {loading && allModules.length === 0 ? (
                  <div className="search-loading-state">
                    <div className="loading-spinner"></div>
                    <span>Searching modules...</span>
                  </div>
                ) : filteredModules.length === 0 ? (
                  <div className="search-empty-state">
                    No results found for "{searchQuery}"
                  </div>
                ) : (
                  <div className="search-results-list">
                    {filteredModules.map((module, index) => {
                      const isInRoadmap = currentModuleCodes.has(module.moduleCode);
                      const { canAdd, missingPrereqs } = isInRoadmap ? { canAdd: true, missingPrereqs: [] } : checkPrerequisites(module);

                      return (
                        <div 
                          key={module.moduleCode} 
                          className={`search-result-item ${selectedIndex === index ? 'selected' : ''} ${isInRoadmap ? 'in-roadmap' : ''}`}
                          onMouseEnter={() => setSelectedIndex(index)}
                        >
                          <div className="result-content">
                            <div className="result-header">
                              <span className="result-code">{boldMatch(module.moduleCode, searchQuery, true)}</span>
                              <span className="result-credits">{module.modulecredit} MCs</span>
                            </div>
                            <div className="result-title">{boldMatch(module.title, searchQuery, false)}</div>
                            {!isInRoadmap && !canAdd && (
                              <div className="result-prereqs">
                                <Lock size={12} />
                                <span>Requires: {formatPrerequisites(missingPrereqs)}</span>
                              </div>
                            )}
                          </div>
                          
                          <div className="result-action">
                            {isInRoadmap ? (
                              <button
                                className="action-icon-button remove"
                                onClick={() => handleRemoveModule(module.moduleCode)}
                                aria-label="Remove module"
                              >
                                <Minus size={18} />
                              </button>
                            ) : canAdd ? (
                              <button
                                className="action-icon-button add"
                                onClick={() => handleAddModule(module)}
                                aria-label="Add module"
                              >
                                <Plus size={18} />
                              </button>
                            ) : (
                              <div className="action-icon-button locked">
                                <Lock size={16} />
                              </div>
                            )}
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
          <h4 className="section-title">Modules in Roadmap ({currentNodes.length})</h4>
          <div className="module-tags">
            {currentNodes
              .sort((a, b) => {
                const aCode = (a.data as ModuleNodeData).moduleCode || a.id;
                const bCode = (b.data as ModuleNodeData).moduleCode || b.id;
                return aCode.localeCompare(bCode);
              })
              .map(node => {
                const nodeData = node.data as ModuleNodeData;
                const moduleCode = nodeData.moduleCode || node.id.toUpperCase();
                
                return (
                  <div key={node.id} className={`module-tag module-tag-${nodeData.status}`}>
                    <span className="tag-code">{moduleCode}</span>
                    <button
                      className="tag-remove"
                      onClick={() => handleRemoveModule(moduleCode)}
                      aria-label={`Remove ${moduleCode}`}
                    >
                      <X size={14} />
                    </button>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {confirmRemove && (
        <div className="confirm-overlay" onClick={() => setConfirmRemove(null)}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-icon">
              <AlertCircle size={48} color="#ef4444" />
            </div>
            <h3 className="confirm-title">Remove Module?</h3>
            <p className="confirm-message">
              Removing <strong>{confirmRemove.moduleCode}</strong> will also remove these dependent modules:
            </p>
            <div className="confirm-dependents">
              {confirmRemove.dependents.map(dep => (
                <span key={dep} className="dependent-module">{dep}</span>
              ))}
            </div>
            <div className="confirm-actions">
              <button 
                className="confirm-button cancel"
                onClick={() => setConfirmRemove(null)}
              >
                Cancel
              </button>
              <button 
                className="confirm-button remove"
                onClick={handleConfirmRemove}
              >
                Remove All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddRemoveModuleModal;