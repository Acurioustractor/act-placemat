import type { PropsWithChildren } from 'react'

interface PillProps {
  variant?: 'brand' | 'ocean' | 'purple' | 'amber' | 'green' | 'slate' | 'rose' | 'clay'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  onClick?: () => void
}

export function Pill({
  children,
  variant = 'brand',
  size = 'md',
  className = '',
  onClick,
}: PropsWithChildren<PillProps>) {
  const baseClasses = 'inline-flex items-center justify-center font-medium transition-all duration-200 rounded-full border'

  const variantClasses = {
    brand: 'bg-brand-50 border-brand-200 text-brand-800 hover:bg-brand-100 hover:border-brand-300',
    ocean: 'bg-ocean-50 border-ocean-200 text-ocean-800 hover:bg-ocean-100 hover:border-ocean-300',
    purple: 'bg-purple-50 border-purple-200 text-purple-800 hover:bg-purple-100 hover:border-purple-300',
    amber: 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100 hover:border-amber-300',
    green: 'bg-green-50 border-green-200 text-green-800 hover:bg-green-100 hover:border-green-300',
    slate: 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100 hover:border-slate-300',
    rose: 'bg-rose-50 border-rose-200 text-rose-800 hover:bg-rose-100 hover:border-rose-300',
    clay: 'bg-clay-50 border-clay-200 text-clay-800 hover:bg-clay-100 hover:border-clay-300',
  }

  const sizeClasses = {
    sm: 'px-2.5 py-1 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base',
  }

  const interactiveClasses = onClick ? 'cursor-pointer hover:shadow-soft' : ''

  const classes = [
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    interactiveClasses,
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const Element = onClick ? 'button' : 'span'

  return (
    <Element className={classes} onClick={onClick}>
      {children}
    </Element>
  )
}
