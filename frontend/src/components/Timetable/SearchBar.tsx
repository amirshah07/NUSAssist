//SearchBar.tsx
import { useState, useRef, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import type { FormEvent, ChangeEvent } from "react";
import "./SearchBar.css";

interface ModuleData {
  moduleCode: string;
  semesterData: any; // idk what json structure u have so just leaving it as any
}

interface SelectedModule {
  [moduleCode: string]: any; // moduleCode -> semesterData mapping
}

interface SearchBarProps {
  onModulesUpdate?: (modules: SelectedModule) => void; // callback to pass selected modules to parent
}





export default function SearchBar({ onModulesUpdate }: SearchBarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ModuleData[]>([]);
  const [selectedModules, setSelectedModules] = useState<SelectedModule>({});
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [selectedSemester, setSelectedSemester] = useState<"sem1" | "sem2">("sem1"); // default to sem1
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // this thing closes dropdown when u click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // pass selected modules to parent whenever it changes
  useEffect(() => {
    if (onModulesUpdate) {
      onModulesUpdate(selectedModules);
    }
  }, [selectedModules, onModulesUpdate]);

  const handleSearchChange = async (e: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const query = e.target.value;
    setSearchQuery(query);
    setHighlightedIndex(-1);

    // if search is empty just clear everything
    if (query.trim() === "") {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    // search from the selected semester table
    const { data, error } = await supabase
      .from(selectedSemester) // dynamically choose table based on semester
      .select("moduleCode, semesterData")
      .ilike("moduleCode", `%${query}%`)
      .limit(10); // dont want too many results clogging the dropdown

    if (error) {
      console.error("Error fetching modules:", error.message);
      setSearchResults([]);
    } else {
      setSearchResults(data || []);
      setShowDropdown(true);
    }
  };

  // handle keyboard navigation in dropdown
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || searchResults.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < searchResults.length - 1 ? prev + 1 : 0
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : searchResults.length - 1
        );
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0) {
          selectModule(searchResults[highlightedIndex]);
        }
        break;
      case "Escape":
        setShowDropdown(false);
        setHighlightedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  // add module to selected list
  const selectModule = (module: ModuleData) => {
    // check if already selected to avoid duplicates
    if (selectedModules[module.moduleCode]) {
      console.log("module already selected:", module.moduleCode);
      return;
    }

    setSelectedModules(prev => ({
      ...prev,
      [module.moduleCode]: module.semesterData
    }));

    // clear search after selection
    setSearchQuery("");
    setSearchResults([]);
    setShowDropdown(false);
    setHighlightedIndex(-1);
    
    // focus back on input so user can search for next module
    inputRef.current?.focus();
  };

  // remove module from selected list
  const removeModule = (moduleCode: string) => {
    setSelectedModules(prev => {
      const updated = { ...prev };
      delete updated[moduleCode];
      return updated;
    });
  };

  // semester selection handler
  const handleSemesterChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const newSemester = e.target.value as "sem1" | "sem2";
    setSelectedSemester(newSemester);
    
    // clear search results when switching semester
    setSearchQuery("");
    setSearchResults([]);
    setShowDropdown(false);
    
    // maybe also clear selected modules? depends on ur use case
    // setSelectedModules({});
  };

  const handleSearchSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    console.log("Selected modules for", selectedSemester + ":", selectedModules);
  };

  return (
    <div className="search-container">
      {/* semester selection */}
      <div className="semester-selector">
        <label htmlFor="semester-select">planning for:</label>
        <select 
          id="semester-select"
          value={selectedSemester} 
          onChange={handleSemesterChange}
          className="semester-dropdown"
        >
          <option value="sem1">semester 1</option>
          <option value="sem2">semester 2</option>
        </select>
      </div>

      {/* show selected modules if any */}
      {Object.keys(selectedModules).length > 0 && (
        <div className="selected-modules">
          <h3>selected modules for {selectedSemester}:</h3>
          <div className="module-tags">
            {Object.keys(selectedModules).map(moduleCode => (
              <span key={moduleCode} className="module-tag">
                {moduleCode}
                <button
                  type="button"
                  onClick={() => removeModule(moduleCode)}
                  className="remove-btn"
                  aria-label={`remove ${moduleCode}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* main search input */}
      <div className="input-container" ref={dropdownRef}>
        <form onSubmit={handleSearchSubmit}>
          <input
            ref={inputRef}
            type="text"
            id="search"
            name="search"
            placeholder={`search ${selectedSemester} modules by code`}
            value={searchQuery}
            onChange={handleSearchChange}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (searchResults.length > 0) {
                setShowDropdown(true);
              }
            }}
            autoComplete="off"
          />
        </form>

        {/* dropdown with search results */}
        {showDropdown && searchResults.length > 0 && (
          <div className="dropdown">
            {searchResults.map((result, index) => (
              <div
                key={result.moduleCode}
                className={`dropdown-item ${index === highlightedIndex ? 'highlighted' : ''} ${
                  selectedModules[result.moduleCode] ? 'already-selected' : ''
                }`}
                onClick={() => selectModule(result)}
                onMouseEnter={() => setHighlightedIndex(index)}
              >
                <span className="module-code">{result.moduleCode}</span>
                {selectedModules[result.moduleCode] && (
                  <span className="selected-indicator">✓ already added</span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* no results found */}
        {showDropdown && searchQuery && searchResults.length === 0 && (
          <div className="dropdown">
            <div className="dropdown-item no-results">
              no modules found for "{searchQuery}" in {selectedSemester}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// export the selected modules component separately so u can use it in timetable
export function SelectedModuleDisplay({ 
  modules, 
  onRemove, 
  semester 
}: { 
  modules: SelectedModule; 
  onRemove?: (moduleCode: string) => void;
  semester?: string;
}) {
  if (Object.keys(modules).length === 0) {
    return null; // dont render anything if no modules selected
  }
  //modules = getUniqueLessons(modules, "lessonType");

  return (
    <div className="selected-modules-display">
      <h3>modules for {semester || 'this semester'}:</h3>
      <div className="module-list">
        {Object.entries(modules).map(([moduleCode, semesterData]) => (
          <div key={moduleCode} className="module-item">
            <span className="module-code">{moduleCode}</span>
            {onRemove && (
              <button
                onClick={() => onRemove(moduleCode)}
                className="remove-btn"
                aria-label={`remove ${moduleCode}`}
              >
                ×
              </button>
            )}
            {/* u can access semesterData here for timetable rendering */}
          </div>
        ))}
      </div>
    </div>
  );
}