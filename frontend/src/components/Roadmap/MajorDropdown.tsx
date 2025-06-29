import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import './MajorDropdown.css';

interface Major {
  value: string;
  label: string;
}

const MAJORS: Major[] = [
  { value: 'Anthropology', label: 'Anthropology' },
  { value: 'Business Administration', label: 'Business Administration' },
  { value: 'Business Analytics', label: 'Business Analytics' },
  { value: 'Chemistry', label: 'Chemistry' },
  { value: 'Chinese Language', label: 'Chinese Language' },
  { value: 'Chinese Studies', label: 'Chinese Studies' },
  { value: 'Communications and New Media', label: 'Communications and New Media' },
  { value: 'Computer Science', label: 'Computer Science' },
  { value: 'Data Science and Analytics', label: 'Data Science and Analytics' },
  { value: 'Data Science and Economics', label: 'Data Science and Economics' },
  { value: 'Dentistry', label: 'Dentistry' },
  { value: 'Economics', label: 'Economics' },
  { value: 'English Language and Linguistics', label: 'English Language and Linguistics' },
  { value: 'English Literature', label: 'English Literature' },
  { value: 'Environmental Studies', label: 'Environmental Studies' },
  { value: 'Food Science and Technology', label: 'Food Science and Technology' },
  { value: 'Geography', label: 'Geography' },
  { value: 'Global Studies', label: 'Global Studies' },
  { value: 'History', label: 'History' },
  { value: 'Information Security', label: 'Information Security' },
  { value: 'Japanese Studies', label: 'Japanese Studies' },
  { value: 'Law', label: 'Law' },
  { value: 'Life Sciences', label: 'Life Sciences' },
  { value: 'Malay Studies', label: 'Malay Studies' },
  { value: 'Mathematics', label: 'Mathematics' },
  { value: 'Medicine', label: 'Medicine' },
  { value: 'Music', label: 'Music' },
  { value: 'Nursing', label: 'Nursing' },
  { value: 'Pharmaceutical Science', label: 'Pharmaceutical Science' },
  { value: 'Pharmacy', label: 'Pharmacy' },
  { value: 'Philosophy', label: 'Philosophy' },
  { value: 'Philosophy, Politics, and Economics', label: 'Philosophy, Politics, and Economics' },
  { value: 'Physics', label: 'Physics' },
  { value: 'Political Science', label: 'Political Science' },
  { value: 'Psychology', label: 'Psychology' },
  { value: 'Quantitative Finance', label: 'Quantitative Finance' },
  { value: 'Social Work', label: 'Social Work' },
  { value: 'Sociology', label: 'Sociology' },
  { value: 'South Asian Studies', label: 'South Asian Studies' },
  { value: 'Southeast Asian Studies', label: 'Southeast Asian Studies' },
  { value: 'Statistics', label: 'Statistics' },
  { value: 'Theatre and Performance Studies', label: 'Theatre and Performance Studies' }
];

interface MajorDropdownProps {
  currentMajor?: string;
  onMajorSelect: (major: string) => void;
}

const MajorDropdown = ({ currentMajor, onMajorSelect }: MajorDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const filteredMajors = MAJORS.filter(major => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase().trim();
    const labelWords = major.label.toLowerCase().split(/\s+/);
    
    return labelWords.some(word => word.startsWith(query));
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
        setSelectedIndex(-1);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev < filteredMajors.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
          break;
        case 'Enter':
          e.preventDefault();
          if (selectedIndex >= 0 && selectedIndex < filteredMajors.length) {
            handleSelect(filteredMajors[selectedIndex].value);
          }
          break;
        case 'Escape':
          setIsOpen(false);
          setSearchQuery('');
          setSelectedIndex(-1);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, filteredMajors]);

  const handleSelect = (majorValue: string) => {
    onMajorSelect(majorValue);
    setIsOpen(false);
    setSearchQuery('');
    setSelectedIndex(-1);
  };

  const selectedMajor = MAJORS.find(m => m.value === currentMajor);

  return (
    <div className="major-dropdown" ref={dropdownRef}>
      <button 
        className="major-dropdown-trigger"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Select major"
        aria-expanded={isOpen}
      >
        <span className={`major-dropdown-label ${!selectedMajor ? 'placeholder' : ''}`}>
          {selectedMajor ? selectedMajor.label : 'Select Major'}
        </span>
        <ChevronDown 
          size={16} 
          className={`major-dropdown-icon ${isOpen ? 'major-dropdown-icon--open' : ''}`}
        />
      </button>
      
      {isOpen && (
        <div className="major-dropdown-menu">
          <div className="major-dropdown-search">
            <Search size={16} className="major-dropdown-search-icon" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search majors..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSelectedIndex(-1);
              }}
              className="major-dropdown-search-input"
            />
          </div>

          <div className="major-dropdown-results">
            {filteredMajors.length === 0 ? (
              <div className="major-dropdown-empty">
                No majors found
              </div>
            ) : (
              <div className="major-dropdown-list">
                {filteredMajors.map((major, index) => (
                  <button
                    key={major.value}
                    className={`major-dropdown-item ${
                      currentMajor === major.value ? 'major-dropdown-item--active' : ''
                    } ${
                      selectedIndex === index ? 'major-dropdown-item--selected' : ''
                    }`}
                    onClick={() => handleSelect(major.value)}
                    onMouseEnter={() => setSelectedIndex(index)}
                  >
                    <span className="major-dropdown-item-label">{major.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MajorDropdown;