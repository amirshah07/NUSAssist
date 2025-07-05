import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';

interface ModuleSearchResult {
  moduleCode: string;
  title: string;
  moduleCredit: number;
}

interface UseModuleSearchReturn {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchResults: ModuleSearchResult[];
  isSearching: boolean;
  selectedIndex: number;
  setSelectedIndex: (index: number) => void;
  selectModule: (module: ModuleSearchResult) => void;
  clearSearch: () => void;
}

// Helper function to check if module code matches
const matchesModuleCode = (moduleCode: string, query: string): boolean => {
  if (!query.trim()) return false;
  return moduleCode.toLowerCase().startsWith(query.trim().toLowerCase());
};

// Helper function to check if title matches 
const matchesTitle = (title: string, query: string): boolean => {
  if (!query.trim()) return false;
  
  const queryWords = query.trim().toLowerCase().split(/\s+/);
  const titleWords = title.toLowerCase().split(/\s+/);
  
  // Check if all query words match the beginning of any word in the title
  return queryWords.every(queryWord => {
    return titleWords.some(titleWord => titleWord.startsWith(queryWord));
  });
};

export const useModuleSearch = (
  onModuleSelect: (code: string, name: string, mcs: number) => void
): UseModuleSearchReturn => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ModuleSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const [allModules, setAllModules] = useState<ModuleSearchResult[]>([]);
  const [modulesLoaded, setModulesLoaded] = useState(false);

  // Load all modules once on component mount
  useEffect(() => {
    const loadModules = async () => {
      try {
        const { data, error } = await supabase
          .from('nus_mods_data')
          .select('moduleCode, title, moduleCredit')
          .order('moduleCode');

        if (error) throw error;
        
        setAllModules(data || []);
        setModulesLoaded(true);
      } catch (error) {
        console.error('Error loading modules:', error);
        setModulesLoaded(true);
      }
    };

    if (!modulesLoaded) {
      loadModules();
    }
  }, [modulesLoaded]);

  // Filter modules based on search query
  const filterModules = useCallback((query: string) => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);

    // Separate modules into those matching by code and by title
    const codeMatches: ModuleSearchResult[] = [];
    const titleMatches: ModuleSearchResult[] = [];
    
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
    
    // Combine results: code matches first, then title matches, limit to 8
    const results = [...codeMatches, ...titleMatches].slice(0, 8);
    setSearchResults(results);
    setIsSearching(false);
  }, [allModules]);

  useEffect(() => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([]);
      setSelectedIndex(-1);
      return;
    }

    const timeout = setTimeout(() => {
      filterModules(searchQuery);
    }, 150);

    setSearchTimeout(timeout);

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [searchQuery, filterModules]);

  useEffect(() => {
    setSelectedIndex(-1);
  }, [searchResults]);

  const selectModule = useCallback((module: ModuleSearchResult) => {
    onModuleSelect(module.moduleCode, module.title, module.moduleCredit);
    clearSearch();
  }, [onModuleSelect]);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
    setSelectedIndex(-1);
  }, []);

  return {
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching,
    selectedIndex,
    setSelectedIndex,
    selectModule,
    clearSearch
  };
};