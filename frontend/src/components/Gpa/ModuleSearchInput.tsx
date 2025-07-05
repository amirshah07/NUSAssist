import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useModuleSearch } from './useModuleSearch';
import { supabase } from '../../lib/supabaseClient';
import './ModuleSearchInput.css';

interface ModuleSearchInputProps {
  value: string;
  onModuleSelect: (code: string, name: string, mcs: number) => void;
  onManualEntry: (code: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

// Helper function to find exact match in database
async function findModuleInDatabase(code: string): Promise<{ code: string; name: string; mcs: number } | null> {
  if (!code || code.length < 2) return null;
  
  try {
    // Skip very short codes (less than 4 chars) or very long codes (more than 8)
    if (code.length < 4 || code.length > 8) {
      return null;
    }
    
    // Skip if it's incomplete (e.g., "CS" or "CS1")
    const hasBasicStructure = /^[A-Z]{2,3}\d/.test(code);
    if (!hasBasicStructure) {
      return null;
    }
    
    // First try exact match in NUS modules database
    const { data: nusModule, error: nusError } = await supabase
      .from('nus_mods_data')
      .select('moduleCode, title, moduleCredit')
      .eq('moduleCode', code)
      .single();
    
    if (nusModule && !nusError) {
      return {
        code: nusModule.moduleCode,
        name: nusModule.title,
        mcs: nusModule.moduleCredit
      };
    }
    
    // If not found in NUS database, check user's saved modules
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: userModules, error: userError } = await supabase
        .from('user_gpa_modules')
        .select('module_code, module_name, mcs')
        .eq('module_code', code)
        .limit(1);
      
      if (userModules && userModules.length > 0 && !userError) {
        const userModule = userModules[0];
        if (userModule.module_name) {
          return {
            code: userModule.module_code,
            name: userModule.module_name,
            mcs: userModule.mcs
          };
        }
      }
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

export default function ModuleSearchInput({
  value,
  onModuleSelect,
  onManualEntry,
  placeholder = "Module Code (e.g. CS1101S)",
  autoFocus = false
}: ModuleSearchInputProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [isCheckingDatabase, setIsCheckingDatabase] = useState(false);
  const [additionalResult, setAdditionalResult] = useState<{ code: string; name: string; mcs: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const {
    setSearchQuery,
    searchResults,
    isSearching,
    selectedIndex,
    setSelectedIndex,
    selectModule,
    clearSearch
  } = useModuleSearch((code, name, mcs) => {
    onModuleSelect(code, name, mcs);
    setShowDropdown(false);
  });

  // Check database when search returns no results
  useEffect(() => {
    // Debounce the database check to reduce API calls
    const timeoutId = setTimeout(() => {
      const checkDatabase = async () => {
        if (showDropdown && value.length >= 2 && searchResults.length === 0 && !isSearching) {
          setIsCheckingDatabase(true);
          try {
            const dbResult = await findModuleInDatabase(value);
            setAdditionalResult(dbResult);
          } catch (error) {
            setAdditionalResult(null);
          }
          setIsCheckingDatabase(false);
        } else {
          setAdditionalResult(null);
        }
      };

      checkDatabase();
    }, 300); 

    return () => clearTimeout(timeoutId);
  }, [value, searchResults, showDropdown, isSearching]);

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(-1);
  }, [searchResults, additionalResult, setSelectedIndex]);

  // Handle input change - directly update parent on every change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value.toUpperCase();
    
    // Immediately update parent state
    onManualEntry(newValue);
    
    // Update search
    setSearchQuery(newValue);
    setShowDropdown(newValue.length >= 2);
  };

  const handleKeyDown = async (e: React.KeyboardEvent) => {
    const totalResults = searchResults.length + (additionalResult ? 1 : 0);
    
    switch (e.key) {
      case 'ArrowDown':
        if (showDropdown && totalResults > 0) {
          e.preventDefault();
          setSelectedIndex(Math.min(selectedIndex + 1, totalResults - 1));
        }
        break;
        
      case 'ArrowUp':
        if (showDropdown && totalResults > 0) {
          e.preventDefault();
          setSelectedIndex(Math.max(selectedIndex - 1, -1));
        }
        break;
        
      case 'Enter':
        e.preventDefault();
        
        // If user selected something from dropdown
        if (showDropdown && selectedIndex >= 0) {
          if (selectedIndex < searchResults.length) {
            selectModule(searchResults[selectedIndex]);
          } else if (additionalResult && selectedIndex === searchResults.length) {
            onModuleSelect(additionalResult.code, additionalResult.name, additionalResult.mcs);
            onManualEntry(additionalResult.code);
          }
          setShowDropdown(false);
          return;
        }
        
        // Otherwise, check database for exact match
        if (value) {
          setIsCheckingDatabase(true);
          try {
            const dbModule = await findModuleInDatabase(value);
            
            if (dbModule) {
              // Found exact match in database - use the database info
              onModuleSelect(dbModule.code, dbModule.name, dbModule.mcs);
              onManualEntry(dbModule.code);
            } else {
              // Not in database - just update the code
              onManualEntry(value);
            }
          } catch (error) {
            onManualEntry(value);
          }
          
          setIsCheckingDatabase(false);
          setShowDropdown(false);
        }
        break;
        
      case 'Escape':
        if (showDropdown) {
          setShowDropdown(false);
        }
        break;
    }
  };

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="module-search-container">
      <div className="module-search-input-wrapper">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (value && value.length >= 2) {
              setSearchQuery(value);
              setShowDropdown(true);
            }
          }}
          onBlur={() => {
            setShowDropdown(false);
          }}
          placeholder={placeholder}
          className="form-input module-search-input"
          autoFocus={autoFocus}
          title="Type at least 2 characters to search"
        />
        {value && (
          <button
            className="module-search-clear"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              onManualEntry('');
              clearSearch();
              setAdditionalResult(null);
              inputRef.current?.focus();
            }}
            type="button"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {showDropdown && value && value.length >= 2 && (
        <div ref={dropdownRef} className="module-search-dropdown">
          {isSearching || isCheckingDatabase ? (
            <div className="module-search-loading">
              <div className="module-search-spinner"></div>
              <span>{isCheckingDatabase ? 'Checking database...' : 'Searching...'}</span>
            </div>
          ) : searchResults.length === 0 && !additionalResult ? (
            <div className="module-search-empty">
              No matches found. Press Enter to add "{value}" as a custom module.
            </div>
          ) : (
            <div className="module-search-results">
              {searchResults.map((module, index) => (
                <div
                  key={module.moduleCode}
                  className={`module-search-item ${index === selectedIndex ? 'selected' : ''}`}
                  onMouseDown={(e) => {
                    e.preventDefault(); 
                    selectModule(module);
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <div className="module-search-item-code">{module.moduleCode}</div>
                  <div className="module-search-item-title">{module.title}</div>
                </div>
              ))}
              {additionalResult && searchResults.length === 0 && (
                <div
                  className={`module-search-item ${selectedIndex === 0 ? 'selected' : ''}`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onModuleSelect(additionalResult.code, additionalResult.name, additionalResult.mcs);
                    onManualEntry(additionalResult.code);
                    setShowDropdown(false);
                  }}
                  onMouseEnter={() => setSelectedIndex(0)}
                >
                  <div className="module-search-item-code">{additionalResult.code}</div>
                  <div className="module-search-item-title">{additionalResult.name}</div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}