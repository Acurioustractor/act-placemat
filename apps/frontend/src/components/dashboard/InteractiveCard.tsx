import type { ReactNode } from 'react'

/**
 * Interactive Card with Micro-interactions
 *
 * Research-backed:
 * - Hover lift effect (y: -2px)
 * - Shadow depth change
 * - Spring physics via CSS (fallback for no Framer Motion)
 * - Reduced motion support
 */

interface InteractiveCardProps {
  children: ReactNode
  className?: string
  onClick?: () => void
  href?: string
  as?: 'div' | 'button' | 'a'
}

export function InteractiveCard({
  children,
  className = '',
  onClick,
  href,
  as = 'div',
}: InteractiveCardProps) {
  const baseStyles = `
    bg-white rounded-2xl border border-slate-100 overflow-hidden
    transition-all duration-200 ease-out
    hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-200/50
    active:translate-y-0 active:shadow-md
    motion-reduce:transition-none motion-reduce:hover:translate-y-0
    ${className}
  `

  if (as === 'a' && href) {
    return (
      <a href={href} className={baseStyles}>
        {children}
      </a>
    )
  }

  if (as === 'button' || onClick) {
    return (
      <button onClick={onClick} className={`${baseStyles} text-left w-full`}>
        {children}
      </button>
    )
  }

  return <div className={baseStyles}>{children}</div>
}

// Card with header and content sections
interface CardWithHeaderProps {
  title: string
  subtitle?: string
  action?: ReactNode
  children: ReactNode
  className?: string
}

export function CardWithHeader({
  title,
  subtitle,
  action,
  children,
  className = '',
}: CardWithHeaderProps) {
  return (
    <InteractiveCard className={className}>
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          {subtitle && (
            <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>
          )}
        </div>
        {action}
      </div>
      <div className="p-6">{children}</div>
    </InteractiveCard>
  )
}

// Stat card with micro-interactions
interface StatCardProps {
  label: string
  value: string | number
  change?: number
  icon?: ReactNode
  trend?: 'up' | 'down' | 'neutral'
  onClick?: () => void
}

export function StatCard({
  label,
  value,
  change,
  icon,
  trend = 'neutral',
  onClick,
}: StatCardProps) {
  const trendColors = {
    up: 'text-emerald-600 bg-emerald-50',
    down: 'text-red-600 bg-red-50',
    neutral: 'text-slate-600 bg-slate-50',
  }

  return (
    <InteractiveCard
      onClick={onClick}
      as={onClick ? 'button' : 'div'}
      className="p-6"
    >
      <div className="flex items-start justify-between">
        {icon && (
          <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center text-violet-600">
            {icon}
          </div>
        )}
        {change !== undefined && (
          <span
            className={`
              px-2 py-1 text-xs font-medium rounded-lg
              ${trendColors[trend]}
            `}
          >
            {change >= 0 ? '+' : ''}{change}%
          </span>
        )}
      </div>
      <div className="mt-4">
        <p className="text-3xl font-bold text-slate-900">{value}</p>
        <p className="text-sm text-slate-500 mt-1">{label}</p>
      </div>
    </InteractiveCard>
  )
}

// Empty state card
interface EmptyStateProps {
  title: string
  description: string
  icon?: ReactNode
  action?: {
    label: string
    onClick: () => void
  }
}

export function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  return (
    <div className="bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center">
      {icon && (
        <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 flex items-center justify-center mx-auto mb-4 text-2xl">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="
            mt-6 px-6 py-2.5 bg-violet-600 text-white text-sm font-medium rounded-xl
            transition-all duration-200 ease-out
            hover:bg-violet-700 hover:-translate-y-0.5 hover:shadow-lg
            active:translate-y-0 active:shadow-md
            motion-reduce:transition-none motion-reduce:hover:translate-y-0
          "
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
