import { useState } from 'react';
import Card from './Card';
import Button from './Button';

export interface FilterOption {
  id: string;
  label: string;
  type: 'select' | 'multiselect' | 'text' | 'date' | 'range';
  options?: { value: string; label: string }[];
  placeholder?: string;
}

interface FilterPanelProps<T> {
  filters: T;
  options: FilterOption[];
  onFiltersChange: (filters: T) => void;
  onReset: () => void;
  isLoading?: boolean;
  className?: string;
}

/**
 * Modern FilterPanel component for filtering data
 */
function FilterPanel<T extends Record<string, unknown>>({
  filters,
  options,
  onFiltersChange,
  onReset,
  isLoading = false,
  className = '',
}: FilterPanelProps<T>) {
  const [expanded, setExpanded] = useState(false);

  const handleFilterChange = (id: string, value: unknown) => {
    onFiltersChange({
      ...filters,
      [id]: value,
    });
  };

  const toggleExpanded = () => {
    setExpanded(!expanded);
  };

  // Determine how many filters to show in collapsed state
  const visibleFilters = expanded ? options : options.slice(0, 4);
  const hasMoreFilters = options.length > 4;

  return (
    <Card className={`bg-white border border-gray-200 shadow-sm ${className}`}>
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 items-end">
          {visibleFilters.map((option) => (
            <div key={option.id} className="space-y-2">
              <label className="block text-sm font-semibold text-gray-900">
                {option.label}
              </label>
              
              {option.type === 'select' && (
                <select
                  className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-150 hover:border-gray-400"
                  value={filters[option.id] || ''}
                  onChange={(e) => handleFilterChange(option.id, e.target.value || undefined)}
                  disabled={isLoading}
                >
                  <option value="" className="text-gray-500">{option.placeholder || 'All'}</option>
                  {option.options?.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              )}
              
              {option.type === 'multiselect' && (
                <select
                  className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-150 hover:border-gray-400"
                  value={filters[option.id]?.[0] || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    handleFilterChange(option.id, value ? [value] : undefined);
                  }}
                  disabled={isLoading}
                >
                  <option value="" className="text-gray-500">{option.placeholder || 'All'}</option>
                  {option.options?.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              )}
              
              {option.type === 'text' && (
                <input
                  type="text"
                  className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-150 hover:border-gray-400 placeholder-gray-400"
                  placeholder={option.placeholder}
                  value={filters[option.id] || ''}
                  onChange={(e) => handleFilterChange(option.id, e.target.value || undefined)}
                  disabled={isLoading}
                />
              )}
              
              {option.type === 'date' && (
                <input
                  type="date"
                  className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-150 hover:border-gray-400"
                  value={filters[option.id] || ''}
                  onChange={(e) => handleFilterChange(option.id, e.target.value || undefined)}
                  disabled={isLoading}
                />
              )}
              
              {option.type === 'range' && (
                <div className="flex space-x-2">
                  <input
                    type="number"
                    className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-150 hover:border-gray-400 placeholder-gray-400"
                    placeholder="Min"
                    value={filters[option.id]?.min || ''}
                    onChange={(e) => {
                      const value = e.target.value ? Number(e.target.value) : undefined;
                      handleFilterChange(option.id, {
                        ...filters[option.id],
                        min: value,
                      });
                    }}
                    disabled={isLoading}
                  />
                  <input
                    type="number"
                    className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-150 hover:border-gray-400 placeholder-gray-400"
                    placeholder="Max"
                    value={filters[option.id]?.max || ''}
                    onChange={(e) => {
                      const value = e.target.value ? Number(e.target.value) : undefined;
                      handleFilterChange(option.id, {
                        ...filters[option.id],
                        max: value,
                      });
                    }}
                    disabled={isLoading}
                  />
                </div>
              )}
            </div>
          ))}
          
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onReset}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-150"
            >
              Reset
            </Button>
            
            {hasMoreFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={toggleExpanded}
                disabled={isLoading}
                className="px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-150"
              >
                {expanded ? 'Show Less' : 'More Filters'}
              </Button>
            )}
          </div>
        </div>
        
        {/* Active filters display */}
        {Object.values(filters).some(value => value !== undefined && value !== null && value !== '' && (Array.isArray(value) ? value.length > 0 : true)) && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex flex-wrap gap-2">
              <span className="text-sm font-medium text-gray-700">Active filters:</span>
              {Object.entries(filters).map(([key, value]) => {
                if (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)) {
                  return null;
                }

                const option = options.find(opt => opt.id === key);
                if (!option) return null;
                
                let displayValue = '';
                if (Array.isArray(value)) {
                  displayValue = value[0] || '';
                } else if (typeof value === 'object' && value !== null) {
                  if ('min' in value || 'max' in value) {
                    const parts = [];
                    if (value.min !== undefined) parts.push(`Min: ${value.min}`);
                    if (value.max !== undefined) parts.push(`Max: ${value.max}`);
                    displayValue = parts.join(', ');
                  }
                } else {
                  displayValue = String(value);
                }
                
                if (!displayValue) return null;
                
                return (
                  <span
                    key={key}
                    className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200"
                  >
                    {option.label}: {displayValue}
                    <button
                      onClick={() => handleFilterChange(option.key, undefined)}
                      className="ml-2 hover:text-blue-600 focus:outline-none"
                    >
                      ×
                    </button>
                  </span>
                );
              }).filter(Boolean)}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

export default FilterPanel;