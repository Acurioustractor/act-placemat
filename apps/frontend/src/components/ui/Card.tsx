import type { PropsWithChildren, ReactNode } from 'react'

interface CardProps {
  className?: string
  padding?: 'sm' | 'md' | 'lg' | 'none'
  header?: ReactNode
  footer?: ReactNode
}

export function Card({
  children,
  className = '',
  padding = 'md',
  header,
  footer,
}: PropsWithChildren<CardProps>) {
  const paddingClass = {
    none: 'p-0',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  }[padding]

  const classes = ['card-surface', paddingClass, className].filter(Boolean).join(' ')

  return (
    <div className={classes}>
      {header && <div className="mb-4">{header}</div>}
      <div>{children}</div>
      {footer && <div className="mt-6">{footer}</div>}
    </div>
  )
}
