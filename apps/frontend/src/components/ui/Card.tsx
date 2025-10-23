import type { PropsWithChildren, ReactNode } from 'react'

interface CardProps {
  className?: string
  padding?: 'sm' | 'md' | 'lg' | 'xl' | 'none'
  header?: ReactNode
  footer?: ReactNode
  hover?: boolean
  variant?: 'default' | 'soft' | 'bordered'
}

export function Card({
  children,
  className = '',
  padding = 'md',
  header,
  footer,
  hover = false,
  variant = 'default',
}: PropsWithChildren<CardProps>) {
  const paddingClass = {
    none: 'p-0',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
    xl: 'p-10',
  }[padding]

  const variantClasses = {
    default: 'bg-white border border-clay-200 shadow-soft',
    soft: 'bg-white shadow-medium',
    bordered: 'bg-white border-2 border-clay-200',
  }

  const hoverClasses = hover ? 'transition-all duration-300 hover:shadow-hover hover:-translate-y-0.5' : ''

  const classes = [
    'rounded-2xl',
    variantClasses[variant],
    paddingClass,
    hoverClasses,
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={classes}>
      {header && <div className="mb-6">{header}</div>}
      <div>{children}</div>
      {footer && <div className="mt-8 pt-6 border-t border-clay-200">{footer}</div>}
    </div>
  )
}
