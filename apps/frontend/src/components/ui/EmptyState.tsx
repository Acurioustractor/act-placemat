import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  actionLabel?: string
  onAction?: () => void
}

export function EmptyState({ icon, title, description, action, actionLabel, onAction }: EmptyStateProps) {
  const resolvedAction =
    action ??
    (actionLabel && onAction ? (
      <button
        type="button"
        onClick={onAction}
        className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-soft transition-colors hover:bg-brand-700"
      >
        {actionLabel}
      </button>
    ) : null)

  return (
    <div className="card-surface px-6 py-12 text-center">
      {icon && <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center text-brand-500">{icon}</div>}
      <h3 className="text-lg font-semibold text-clay-900">{title}</h3>
      {description && <p className="mt-2 text-sm text-clay-500">{description}</p>}
      {resolvedAction && <div className="mt-4 flex justify-center">{resolvedAction}</div>}
    </div>
  )
}
