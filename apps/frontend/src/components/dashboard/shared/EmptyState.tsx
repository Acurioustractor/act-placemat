/**
 * EmptyState - Reusable empty state component
 *
 * Features:
 * - Icon display
 * - Title and description
 * - Optional action button
 * - Consistent styling
 */

interface EmptyStateProps {
  icon?: string
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

export function EmptyState({
  icon = '📭',
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={className}
      style={{
        textAlign: 'center',
        padding: '48px 24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <span style={{ fontSize: '48px', marginBottom: '16px' }}>{icon}</span>
      <h3
        style={{
          fontSize: '16px',
          fontWeight: '600',
          color: '#1e293b',
          margin: 0,
          marginBottom: '8px',
        }}
      >
        {title}
      </h3>
      {description && (
        <p
          style={{
            fontSize: '14px',
            color: '#64748b',
            margin: 0,
            maxWidth: '300px',
          }}
        >
          {description}
        </p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          style={{
            marginTop: '16px',
            padding: '10px 20px',
            borderRadius: '8px',
            border: 'none',
            background: '#6366f1',
            color: 'white',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
          }}
        >
          {action.label}
        </button>
      )}
    </div>
  )
}

/**
 * TableEmptyState - Empty state for tables/lists
 */
interface TableEmptyStateProps {
  columns: number
  icon?: string
  title?: string
  description?: string
}

export function TableEmptyState({
  columns = 4,
  icon = '📋',
  title = 'No data',
  description,
}: TableEmptyStateProps) {
  return (
    <tr>
      <td colSpan={columns} style={{ padding: '48px 24px', textAlign: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ fontSize: '32px', marginBottom: '12px' }}>{icon}</span>
          <span style={{ fontSize: '14px', color: '#64748b' }}>{title}</span>
          {description && (
            <span style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
              {description}
            </span>
          )}
        </div>
      </td>
    </tr>
  )
}

/**
 * CardEmptyState - Empty state for cards
 */
interface CardEmptyStateProps {
  icon?: string
  title: string
  action?: {
    label: string
    onClick: () => void
  }
}

export function CardEmptyState({
  icon = '✨',
  title,
  action,
}: CardEmptyStateProps) {
  return (
    <div
      style={{
        padding: '32px 24px',
        textAlign: 'center',
        background: '#f8fafc',
        borderRadius: '12px',
        border: '2px dashed #e2e8f0',
      }}
    >
      <span style={{ fontSize: '32px', marginBottom: '12px', display: 'block' }}>{icon}</span>
      <p
        style={{
          fontSize: '14px',
          color: '#64748b',
          margin: 0,
          marginBottom: action ? '12px' : 0,
        }}
      >
        {title}
      </p>
      {action && (
        <button
          onClick={action.onClick}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            border: '1px solid #e2e8f0',
            background: 'white',
            color: '#475569',
            fontSize: '14px',
            cursor: 'pointer',
          }}
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
