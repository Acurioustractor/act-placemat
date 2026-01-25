/**
 * FilterBar - Reusable filter bar component
 *
 * Features:
 * - Search input
 * - Status filter dropdown
 * - Custom filters
 * - Clear filters button
 * - Active filter count
 */

interface FilterBarProps {
  searchValue: string
  onSearchChange: (value: string) => void
  filters: {
    label: string
    value: string
    options: Array<{ value: string; label: string; count?: number }>
  }[]
  filterValues: Record<string, string>
  onFilterChange: (key: string, value: string) => void
  onClearFilters?: () => void
  placeholder?: string
}

export function FilterBar({
  searchValue,
  onSearchChange,
  filters,
  filterValues,
  onFilterChange,
  onClearFilters,
  placeholder = 'Search...',
}: FilterBarProps) {
  const activeFilterCount = Object.values(filterValues).filter(v => v !== '' && v !== 'all').length

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        flexWrap: 'wrap',
        padding: '16px',
        background: '#f8fafc',
        borderRadius: '12px',
        marginBottom: '20px',
      }}
    >
      {/* Search Input */}
      <div style={{ position: 'relative', flex: '1 1 250px', minWidth: '200px' }}>
        <input
          type="text"
          placeholder={placeholder}
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          style={{
            width: '100%',
            padding: '10px 16px 10px 40px',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            fontSize: '14px',
            outline: 'none',
            background: 'white',
          }}
        />
        <span
          style={{
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: '16px',
            opacity: 0.5,
          }}
        >
          🔍
        </span>
      </div>

      {/* Filter Dropdowns */}
      {filters.map((filter) => (
        <select
          key={filter.label}
          value={filterValues[filter.label] || ''}
          onChange={(e) => onFilterChange(filter.label, e.target.value)}
          style={{
            padding: '10px 36px 10px 16px',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            fontSize: '14px',
            outline: 'none',
            background: 'white',
            cursor: 'pointer',
            appearance: 'none',
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2364748b' d='M2 4l4 4 4-4'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 12px center',
          }}
        >
          <option value="">{filter.label}</option>
          {filter.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label} {option.count !== undefined ? `(${option.count})` : ''}
            </option>
          ))}
        </select>
      ))}

      {/* Clear Filters */}
      {activeFilterCount > 0 && onClearFilters && (
        <button
          onClick={onClearFilters}
          style={{
            padding: '10px 16px',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            background: 'white',
            color: '#64748b',
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          Clear
          {activeFilterCount > 0 && (
            <span
              style={{
                background: '#ef4444',
                color: 'white',
                borderRadius: '10px',
                padding: '2px 6px',
                fontSize: '11px',
                fontWeight: '600',
              }}
            >
              {activeFilterCount}
            </span>
          )}
        </button>
      )}
    </div>
  )
}

/**
 * FilterChip - Individual filter chip for toggling
 */
interface FilterChipProps {
  label: string
  active: boolean
  onClick: () => void
  count?: number
  color?: string
}

export function FilterChip({
  label,
  active,
  onClick,
  count,
  color,
}: FilterChipProps) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '6px 14px',
        borderRadius: '20px',
        border: 'none',
        background: active ? color || '#6366f1' : 'white',
        color: active ? 'white' : '#475569',
        fontSize: '13px',
        fontWeight: '500',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        border: `1px solid ${active ? 'transparent' : '#e2e8f0'}`,
        transition: 'all 0.2s ease',
        boxShadow: active ? '0 2px 4px rgba(99, 102, 241, 0.3)' : 'none',
      }}
    >
      {label}
      {count !== undefined && (
        <span
          style={{
            background: active ? 'rgba(255,255,255,0.2)' : '#f1f5f9',
            padding: '2px 6px',
            borderRadius: '10px',
            fontSize: '11px',
          }}
        >
          {count}
        </span>
      )}
    </button>
  )
}

/**
 * FilterChips - Group of filter chips
 */
interface FilterChipsProps {
  options: Array<{
    value: string
    label: string
    count?: number
    color?: string
  }>
  selectedValue: string
  onChange: (value: string) => void
}

export function FilterChips({
  options,
  selectedValue,
  onChange,
}: FilterChipsProps) {
  return (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
      {options.map((option) => (
        <FilterChip
          key={option.value}
          label={option.label}
          active={selectedValue === option.value}
          onClick={() => onChange(option.value)}
          count={option.count}
          color={option.color}
        />
      ))}
    </div>
  )
}

/**
 * SearchInput - Simple search input with icon
 */
interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  onClear?: () => void
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search...',
  onClear,
}: SearchInputProps) {
  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: '400px' }}>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%',
          padding: '10px 40px 10px 16px',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          fontSize: '14px',
          outline: 'none',
          background: 'white',
        }}
      />
      <span
        style={{
          position: 'absolute',
          right: '12px',
          top: '50%',
          transform: 'translateY(-50%)',
          fontSize: '16px',
          opacity: 0.5,
        }}
      >
        {value ? (
          <button
            onClick={() => {
              onChange('')
              onClear?.()
            }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            ✕
          </button>
        ) : (
          '🔍'
        )}
      </span>
    </div>
  )
}
