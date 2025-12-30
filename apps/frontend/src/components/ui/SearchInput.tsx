/**
 * Search Input Component - Modern CRM-style Search
 * 
 * Advanced search input with filters and suggestions
 * Inspired by HubSpot and modern CRM platforms
 */

import React, { useState, useRef, useEffect } from 'react';

interface SearchFilter {
  id: string;
  label: string;
  value?: string;
  type: 'select' | 'text' | 'boolean';
  options?: { label: string; value: string }[];
}

interface SearchInputProps {
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  onSearch?: (query: string, filters: Record<string, any>) => void;
  filters?: SearchFilter[];
  suggestions?: string[];
  loading?: boolean;
  className?: string;
}

export function SearchInput({
  placeholder = 'Search...',
  value,
  onChange,
  onSearch,
  filters = [],
  suggestions = [],
  loading = false,
  className = ''
}: SearchInputProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filterValues, setFilterValues] = useState<Record<string, any>>({});
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(value, filterValues);
    }
    setShowSuggestions(false);
  };

  const handleFilterChange = (filterId: string, filterValue: any) => {
    const newFilters = { ...filterValues, [filterId]: filterValue };
    setFilterValues(newFilters);
    if (onSearch) {
      onSearch(value, newFilters);
    }
  };

  const clearFilters = () => {
    setFilterValues({});
    if (onSearch) {
      onSearch(value, {});
    }
  };

  const activeFilterCount = Object.values(filterValues).filter(v => v && v !== '').length;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Main Search Input */}
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative flex items-center">
          {/* Search Icon */}
          <div className="absolute left-4 flex items-center pointer-events-none">
            {loading ? (
              <div className="w-5 h-5 border-2 border-brand-600 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <svg className="w-5 h-5 text-clay-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            )}
          </div>

          {/* Input Field */}
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setShowSuggestions(suggestions.length > 0)}
            placeholder={placeholder}
            className="w-full pl-12 pr-20 py-4 text-lg bg-white border-2 border-clay-200 rounded-2xl focus:border-brand-500 focus:ring-4 focus:ring-brand-100 transition-all duration-200 placeholder-clay-400"
            disabled={loading}
          />

          {/* Filter Toggle & Search Button */}
          <div className="absolute right-2 flex items-center space-x-2">
            {filters.length > 0 && (
              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className={`relative p-2 rounded-xl transition-all duration-200 ${
                  showFilters || activeFilterCount > 0
                    ? 'bg-brand-100 text-brand-700 shadow-soft'
                    : 'bg-clay-100 text-clay-600 hover:bg-clay-200'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.707A1 1 0 013 7V4z" />
                </svg>
                {activeFilterCount > 0 && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-brand-600 text-white text-xs rounded-full flex items-center justify-center">
                    {activeFilterCount}
                  </div>
                )}
              </button>
            )}
            
            <button
              type="submit"
              disabled={loading}
              className="p-2 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-all duration-200 shadow-soft hover:shadow-medium disabled:opacity-50"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Suggestions Dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-clay-200 rounded-2xl shadow-medium z-50 max-h-60 overflow-y-auto">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                type="button"
                onClick={() => {
                  onChange(suggestion);
                  setShowSuggestions(false);
                  if (onSearch) onSearch(suggestion, filterValues);
                }}
                className="w-full px-4 py-3 text-left hover:bg-clay-50 transition-colors duration-150 first:rounded-t-2xl last:rounded-b-2xl"
              >
                <div className="flex items-center space-x-3">
                  <svg className="w-4 h-4 text-clay-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <span className="text-clay-700">{suggestion}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </form>

      {/* Advanced Filters Panel */}
      {showFilters && filters.length > 0 && (
        <div className="mt-4 p-6 bg-white border border-clay-200 rounded-2xl shadow-soft">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-clay-900">Advanced Filters</h4>
            {activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                className="text-sm text-brand-600 hover:text-brand-700 font-medium"
              >
                Clear All ({activeFilterCount})
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filters.map((filter) => (
              <div key={filter.id} className="space-y-2">
                <label className="block text-sm font-medium text-clay-700">
                  {filter.label}
                </label>
                
                {filter.type === 'select' && filter.options ? (
                  <select
                    value={filterValues[filter.id] || ''}
                    onChange={(e) => handleFilterChange(filter.id, e.target.value)}
                    className="w-full px-3 py-2 border border-clay-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
                  >
                    <option value="">All {filter.label}</option>
                    {filter.options.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : filter.type === 'boolean' ? (
                  <select
                    value={filterValues[filter.id] || ''}
                    onChange={(e) => handleFilterChange(filter.id, e.target.value === 'true' ? true : e.target.value === 'false' ? false : '')}
                    className="w-full px-3 py-2 border border-clay-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
                  >
                    <option value="">All</option>
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                ) : (
                  <input
                    type="text"
                    value={filterValues[filter.id] || ''}
                    onChange={(e) => handleFilterChange(filter.id, e.target.value)}
                    placeholder={`Filter by ${filter.label.toLowerCase()}...`}
                    className="w-full px-3 py-2 border border-clay-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
