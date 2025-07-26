import { useState, useEffect } from 'react';
import Card from './Card';
import Badge from './Badge';
import Button from './Button';
import { COMMUNITY_COLORS, SPACING } from '../../constants/designSystem';

interface FilterOption {
  id: string;
  label: string;
  type: 'select' | 'multiselect' | 'range' | 'date' | 'search' | 'tags';
  options?: Array<{ value: string; label: string; icon?: string; color?: string; count?: number }>;
  placeholder?: string;
  min?: number;
  max?: number;
}

interface ModernFilterPanelProps {
  filters: Record<string, any>;
  options: FilterOption[];
  onFiltersChange: (filters: Record<string, any>) => void;
  onReset: () => void;
  isLoading?: boolean;
  className?: string;
  showActiveCount?: boolean;
}

const ModernFilterPanel = ({
  filters,
  options,
  onFiltersChange,
  onReset,
  isLoading = false,
  className = '',
  showActiveCount = true
}: ModernFilterPanelProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchValues, setSearchValues] = useState<Record<string, string>>({});
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({});

  // Calculate active filter count
  const activeFilterCount = Object.values(filters).filter(value => {
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'object' && value !== null) return Object.keys(value).length > 0;
    return value !== undefined && value !== null && value !== '';
  }).length;

  useEffect(() => {
    setActiveFilters(filters);
  }, [filters]);

  const handleFilterChange = (filterId: string, value: any) => {
    const newFilters = { ...filters, [filterId]: value };
    onFiltersChange(newFilters);
  };

  const handleMultiSelectToggle = (filterId: string, optionValue: string) => {
    const currentValues = filters[filterId] || [];
    const newValues = currentValues.includes(optionValue)
      ? currentValues.filter((v: string) => v !== optionValue)
      : [...currentValues, optionValue];
    
    handleFilterChange(filterId, newValues.length > 0 ? newValues : undefined);
  };

  const handleSearchChange = (filterId: string, value: string) => {
    setSearchValues(prev => ({ ...prev, [filterId]: value }));
    
    // Debounce search
    const timeoutId = setTimeout(() => {
      handleFilterChange(filterId, value || undefined);
    }, 300);

    return () => clearTimeout(timeoutId);
  };

  const renderFilterControl = (option: FilterOption) => {
    const currentValue = filters[option.id];
    const searchValue = searchValues[option.id] || '';

    switch (option.type) {
      case 'search':
        return (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              {option.label}
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder={option.placeholder || `Search ${option.label.toLowerCase()}...`}
                value={searchValue}
                onChange={(e) => handleSearchChange(option.id, e.target.value)}
                className="input-modern pl-10"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>
        );

      case 'select':
        return (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              {option.label}
            </label>
            <select
              value={currentValue || ''}
              onChange={(e) => handleFilterChange(option.id, e.target.value || undefined)}
              className="input-modern select-modern"
            >
              <option value="">All {option.label}</option>
              {option.options?.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label} {opt.count !== undefined ? `(${opt.count})` : ''}
                </option>
              ))}
            </select>
          </div>
        );

      case 'multiselect':
        const filteredOptions = option.options?.filter(opt => 
          opt.label.toLowerCase().includes(searchValue.toLowerCase())
        ) || [];

        return (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">
                {option.label}
              </label>
              {currentValue?.length > 0 && (
                <Badge variant="primary" className="text-xs">
                  {currentValue.length} selected
                </Badge>
              )}
            </div>
            
            {/* Search within options */}
            {option.options && option.options.length > 5 && (
              <div className="relative">
                <input
                  type="text"
                  placeholder={`Search ${option.label.toLowerCase()}...`}
                  value={searchValue}
                  onChange={(e) => setSearchValues(prev => ({ ...prev, [option.id]: e.target.value }))}
                  className="input-modern pl-8 py-2 text-xs"
                />
                <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                  <svg className="h-3 w-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
            )}
            
            <div className="max-h-48 overflow-y-auto space-y-1">
              {filteredOptions.map((opt) => {
                const isSelected = currentValue?.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    onClick={() => handleMultiSelectToggle(option.id, opt.value)}
                    className={`w-full flex items-center justify-between p-2 rounded-lg transition-all duration-200 text-left ${
                      isSelected
                        ? 'border-2 text-teal-700'
                        : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100 hover:border-gray-200'
                    }`}
                    style={{
                      backgroundColor: isSelected ? `${COMMUNITY_COLORS.primary[50]}` : undefined,
                      borderColor: isSelected ? COMMUNITY_COLORS.primary[200] : undefined
                    }}
                  >
                    <div className="flex items-center space-x-2">
                      {opt.icon && <span className="text-sm">{opt.icon}</span>}
                      {opt.color && (
                        <div 
                          className="w-3 h-3 rounded-full flex-shrink-0" 
                          style={{ backgroundColor: opt.color }}
                        />
                      )}
                      <span className="text-sm font-medium">{opt.label}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {opt.count !== undefined && (
                        <span className="text-xs text-gray-500">({opt.count})</span>
                      )}
                      <div 
                        className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                          isSelected ? 'border-teal-600' : 'border-gray-300'
                        }`}
                        style={{
                          backgroundColor: isSelected ? COMMUNITY_COLORS.primary[600] : undefined,
                          borderColor: isSelected ? COMMUNITY_COLORS.primary[600] : undefined
                        }}
                      >
                        {isSelected && (
                          <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
              {filteredOptions.length === 0 && (
                <div className="text-center py-4 text-gray-500 text-sm">
                  No options found
                </div>
              )}
            </div>
          </div>
        );

      case 'range':
        return (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              {option.label}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <input
                  type="number"
                  placeholder="Min"
                  min={option.min}
                  max={option.max}
                  value={currentValue?.min || ''}
                  onChange={(e) => handleFilterChange(option.id, {
                    ...currentValue,
                    min: e.target.value ? parseInt(e.target.value) : undefined
                  })}
                  className="input-modern text-sm"
                />
              </div>
              <div>
                <input
                  type="number"
                  placeholder="Max"
                  min={option.min}
                  max={option.max}
                  value={currentValue?.max || ''}
                  onChange={(e) => handleFilterChange(option.id, {
                    ...currentValue,
                    max: e.target.value ? parseInt(e.target.value) : undefined
                  })}
                  className="input-modern text-sm"
                />
              </div>
            </div>
          </div>
        );

      case 'date':
        return (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              {option.label}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <input
                  type="date"
                  value={currentValue?.start || ''}
                  onChange={(e) => handleFilterChange(option.id, {
                    ...currentValue,
                    start: e.target.value || undefined
                  })}
                  className="input-modern text-sm"
                />
              </div>
              <div>
                <input
                  type="date"
                  value={currentValue?.end || ''}
                  onChange={(e) => handleFilterChange(option.id, {
                    ...currentValue,
                    end: e.target.value || undefined
                  })}
                  className="input-modern text-sm"
                />
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card className={`card-modern ${className}`}>
      {/* Filter Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div 
              className="p-2 rounded-lg"
              style={{ 
                background: `linear-gradient(135deg, ${COMMUNITY_COLORS.primary[500]}, ${COMMUNITY_COLORS.primary[600]})` 
              }}
            >
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.414A1 1 0 013 6.707V4z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Filters</h3>
              {showActiveCount && activeFilterCount > 0 && (
                <p className="text-xs text-gray-500">
                  {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} active
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onReset}
                className="text-gray-500 hover:text-gray-700"
                disabled={isLoading}
              >
                <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Reset
              </Button>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg 
                className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </Button>
          </div>
        </div>

        {/* Active Filters Preview */}
        {!isExpanded && activeFilterCount > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {Object.entries(filters).map(([key, value]) => {
              if (!value || (Array.isArray(value) && value.length === 0)) return null;
              
              const option = options.find(o => o.id === key);
              if (!option) return null;
              
              if (Array.isArray(value)) {
                return value.map((v, idx) => (
                  <Badge
                    key={`${key}-${idx}`}
                    variant="default"
                    className="text-xs border"
                    style={{
                      backgroundColor: COMMUNITY_COLORS.primary[50],
                      color: COMMUNITY_COLORS.primary[700],
                      borderColor: COMMUNITY_COLORS.primary[200]
                    }}
                  >
                    {option.label}: {v}
                    <button
                      onClick={() => handleMultiSelectToggle(key, v)}
                      className="ml-1 hover:text-primary-900"
                    >
                      ×
                    </button>
                  </Badge>
                ));
              } else if (typeof value === 'object' && value !== null) {
                return (
                  <Badge
                    key={key}
                    variant="default"
                    className="text-xs border"
                    style={{
                      backgroundColor: COMMUNITY_COLORS.primary[50],
                      color: COMMUNITY_COLORS.primary[700],
                      borderColor: COMMUNITY_COLORS.primary[200]
                    }}
                  >
                    {option.label}: {value.min || '0'} - {value.max || '∞'}
                    <button
                      onClick={() => handleFilterChange(key, undefined)}
                      className="ml-1 hover:text-primary-900"
                    >
                      ×
                    </button>
                  </Badge>
                );
              } else {
                return (
                  <Badge
                    key={key}
                    variant="default"
                    className="text-xs border"
                    style={{
                      backgroundColor: COMMUNITY_COLORS.primary[50],
                      color: COMMUNITY_COLORS.primary[700],
                      borderColor: COMMUNITY_COLORS.primary[200]
                    }}
                  >
                    {option.label}: {value}
                    <button
                      onClick={() => handleFilterChange(key, undefined)}
                      className="ml-1 hover:text-primary-900"
                    >
                      ×
                    </button>
                  </Badge>
                );
              }
            })}
          </div>
        )}
      </div>

      {/* Filter Controls */}
      {isExpanded && (
        <div className="p-4 space-y-6 fade-in">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {options.map((option) => (
              <div key={option.id} className="space-y-2">
                {renderFilterControl(option)}
              </div>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Use filters to refine your search results</span>
            </div>
            
            {activeFilterCount > 0 && (
              <Button
                variant="primary"
                size="sm"
                disabled={isLoading}
                className="btn-modern"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Applying...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Apply Filters
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      )}
    </Card>
  );
};

export default ModernFilterPanel;