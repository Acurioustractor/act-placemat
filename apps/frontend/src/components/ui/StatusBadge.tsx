/**
 * StatusBadge - Accessible status indicators
 *
 * Research-backed: Carbon Design System pattern
 * Uses Shape + Color + Text (never color alone)
 *
 * Accessibility: Works for colorblind users due to shape + text
 */

interface StatusBadgeProps {
  status: 'active' | 'paused' | 'needs-attention' | 'inactive'
  size?: 'sm' | 'md'
  showLabel?: boolean
}

const statusConfig = {
  active: {
    label: 'Active',
    color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    icon: (
      <svg className="w-3 h-3" viewBox="0 0 12 12" fill="currentColor">
        <circle cx="6" cy="6" r="4" />
      </svg>
    ),
  },
  paused: {
    label: 'Paused',
    color: 'bg-amber-100 text-amber-800 border-amber-200',
    icon: (
      <svg className="w-3 h-3" viewBox="0 0 12 12" fill="currentColor">
        <rect x="2" y="2" width="8" height="8" rx="1" />
      </svg>
    ),
  },
  'needs-attention': {
    label: 'Needs Attention',
    color: 'bg-red-100 text-red-800 border-red-200',
    icon: (
      <svg className="w-3 h-3" viewBox="0 0 12 12" fill="currentColor">
        <polygon points="6,1 11,11 1,11" />
      </svg>
    ),
  },
  inactive: {
    label: 'Inactive',
    color: 'bg-slate-100 text-slate-600 border-slate-200',
    icon: (
      <svg className="w-3 h-3" viewBox="0 0 12 12" fill="currentColor">
        <circle cx="6" cy="6" r="4" fillOpacity="0.5" />
      </svg>
    ),
  },
}

export function StatusBadge({
  status,
  size = 'sm',
  showLabel = true,
}: StatusBadgeProps) {
  const config = statusConfig[status]

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs gap-1',
    md: 'px-2.5 py-1 text-sm gap-1.5',
  }

  return (
    <span
      className={`
        inline-flex items-center font-medium rounded-full border
        ${config.color}
        ${sizeClasses[size]}
      `}
      role="status"
      aria-label={config.label}
    >
      {config.icon}
      {showLabel && <span>{config.label}</span>}
    </span>
  )
}
