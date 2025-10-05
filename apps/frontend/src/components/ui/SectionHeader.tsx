interface SectionHeaderProps {
  eyebrow?: string
  title: string
  description?: string
  actions?: React.ReactNode
}

export function SectionHeader({ eyebrow, title, description, actions }: SectionHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="space-y-2">
        {eyebrow && <p className="text-sm font-medium uppercase tracking-wide text-brand-600">{eyebrow}</p>}
        <h2 className="text-3xl font-semibold text-clay-900">{title}</h2>
        {description && <p className="section-subtitle max-w-2xl">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}
