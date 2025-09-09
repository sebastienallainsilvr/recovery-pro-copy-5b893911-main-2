import { useState, useMemo, useCallback } from 'react';

export const useDataFiltering = (data, initialFilters = {}) => {
  const [filters, setFilters] = useState(initialFilters);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredData = useMemo(() => {
    let result = [...data];
    
    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== 'all') {
        result = result.filter(item => {
          // Support nested properties (e.g., 'entreprise.agent_assigne')
          const keys = key.split('.');
          const itemValue = keys.reduce((obj, k) => obj?.[k], item);
          return itemValue === value;
        });
      }
    });
    
    // Apply search
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(item => {
        // Search in all string/number fields recursively
        const searchInObject = (obj, depth = 0) => {
          if (depth > 3) return false; // Avoid infinite recursion
          
          return Object.values(obj || {}).some(val => {
            if (typeof val === 'string' || typeof val === 'number') {
              return String(val).toLowerCase().includes(lowerSearch);
            }
            if (typeof val === 'object' && val !== null) {
              return searchInObject(val, depth + 1);
            }
            return false;
          });
        };
        
        return searchInObject(item);
      });
    }
    
    return result;
  }, [data, filters, searchTerm]);

  const setFilter = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(initialFilters);
    setSearchTerm('');
  }, [initialFilters]);

  const hasActiveFilters = useMemo(() => {
    return searchTerm || Object.values(filters).some(value => value && value !== 'all');
  }, [filters, searchTerm]);

  return {
    filteredData,
    filters,
    searchTerm,
    setFilter,
    setSearchTerm,
    resetFilters,
    hasActiveFilters
  };
};