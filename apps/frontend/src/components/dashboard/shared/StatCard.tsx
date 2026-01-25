/**
 * StatCard - Reusable stat card component
 *
 * Features:
 * - Icon support
 * - Value display with optional formatting
 * - Label and sublabel
 * - Color variants
 * - Clickable action support
 */

interface StatCardProps {
  label: string
  value: string | number
  icon?: string
  subValue?: string
  color?: 'default' | 'emerald' | 'blue' | 'violet' | 'amber' | 'red' | 'slate'
  trend?: {
    value: number
    label: string
  }
  onClick?: () => void
}

const colorClasses = {
  default: {
    bg: 'bg-white',
    border: 'border-slate-200',
    text: 'text-slate-900',
    subtext: 'text-slate-500',
  },
  emerald: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-700',
    subtext: 'text-emerald-600',
  },
  blue: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-700',
    subtext: 'text-blue-600',
  },
  violet: {
    bg: 'bg-violet-50',
    border: 'border-violet-200',
    text: 'text-violet-700',
    subtext: 'text-violet-600',
  },
  amber: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-700',
    subtext: 'text-amber-600',
  },
  red: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-700',
    subtext: 'text-red-600',
  },
  slate: {
    bg: 'bg-slate-50',
    border: 'border-slate-200',
    text: 'text-slate-700',
    subtext: 'text-slate-500',
  },
}

export function StatCard({
  label,
  value,
  icon,
  subValue,
  color = 'default',
  trend,
  onClick,
}: StatCardProps) {
  const colors = colorClasses[color]

  return (
    <div
      onClick={onClick}
      style={{
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        borderRadius: '12px',
        padding: '16px 20px',
        cursor: onClick ? 'pointer' : 'default',
        transition: onClick ? 'all 0.2s ease' : 'none',
      }}
      className={onClick ? 'hover:shadow-md hover:border-slate-300' : ''}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: '13px',
              color: colors.subtext,
              marginBottom: '4px',
            }}
          >
            {label}
          </div>
          <div
            style={{
              fontSize: '28px',
              fontWeight: '700',
              color: colors.text,
              lineHeight: 1,
            }}
          >
            {value}
          </div>
          {subValue && (
            <div
              style={{
                fontSize: '12px',
                color: colors.subtext,
                marginTop: '4px',
              }}
            >
              {subValue}
            </div>
          )}
          {trend && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                marginTop: '8px',
                fontSize: '12px',
                color: trend.value >= 0 ? '#22c55e' : '#ef4444',
              }}
            >
              <span>{trend.value >= 0 ? '↑' : '↓'}</span>
              <span>{Math.abs(trend.value)}%</span>
              <span style={{ color: '#64748b' }}>{trend.label}</span>
            </div>
          )}
        </div>
        {icon && (
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              background: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * CompactStatCard - Smaller stat card for dense layouts
 */
interface CompactStatCardProps {
  label: string
  value: string | number
  color?: 'default' | 'emerald' | 'blue' | 'violet' | 'amber' | 'red'
  onClick?: () => void
}

export function CompactStatCard({
  label,
  value,
  color = 'default',
  onClick,
}: CompactStatCardProps) {
  const colorMap = {
    default: '#1e293b',
    emerald: '#059669',
    blue: '#2563eb',
    violet: '#7c3aed',
    amber: '#d97706',
    red: '#dc2626',
  }

  return (
    <div
      onClick={onClick}
      style={{
        textAlign: 'center',
        padding: '12px 16px',
        background: 'white',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <div
        style={{
          fontSize: '20px',
          fontWeight: '700',
          color: colorMap[color],
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: '11px',
          color: '#64748b',
          marginTop: '2px',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}
      >
        {label}
      </div>
    </div>
  )
}

/**
 * ProgressStatCard - Stat card with progress bar
 */
interface ProgressStatCardProps {
  label: string
  value: string | number
  current: number
  max: number
  color?: 'default' | 'emerald' | 'blue' | 'violet' | 'amber' | 'red'
  icon?: string
}

export function ProgressStatCard({
  label,
  value,
  current,
  max,
  color = 'default',
  icon,
}: ProgressStatCardProps) {
  const percentage = Math.min(100, Math.round((current / max) * 100))

  const colorMap = {
    default: '#6366f1',
    emerald: '#22c55e',
    blue: '#3b82f6',
    violet: '#8b5cf6',
    amber: '#f59e0b',
    red: '#ef4444',
  }

  return (
    <div
      style={{
        background: 'white',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        padding: '16px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {icon && <span style={{ fontSize: '18px' }}>{icon}</span>}
          <span style={{ fontSize: '13px', color: '#64748b' }}>{label}</span>
        </div>
        <span style={{ fontSize: '18px', fontWeight: '700', color: colorMap[color] }}>
          {value}
        </span>
      </div>

      <div
        style={{
          height: '8px',
          background: '#f1f5f9',
          borderRadius: '4px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${percentage}%`,
            background: colorMap[color],
            borderRadius: '4px',
            transition: 'width 0.3s ease',
          }}
        />
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: '8px',
          fontSize: '11px',
          color: '#94a3b8',
        }}
      >
        <span>{current} of {max}</span>
        <span>{percentage}%</span>
      </div>
    </div>
  )
}
