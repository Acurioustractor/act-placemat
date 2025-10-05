import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="card-surface px-6 py-12 text-center">
      {icon && <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center text-brand-500">{icon}</div>}
      <h3 className="text-lg font-semibold text-clay-900">{title}</h3>
      {description && <p className="mt-2 text-sm text-clay-500">{description}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  )
}
