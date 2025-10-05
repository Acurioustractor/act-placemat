interface MetricTileProps {
  label: string
  value: string | number
  caption?: string
  tone?: 'brand' | 'ocean' | 'neutral'
}

const toneClasses: Record<NonNullable<MetricTileProps['tone']>, string> = {
  brand: 'border-brand-100 text-brand-800',
  ocean: 'border-ocean-100 text-ocean-800',
  neutral: 'border-clay-200 text-clay-700',
}

export function MetricTile({ label, value, caption, tone = 'neutral' }: MetricTileProps) {
  return (
    <div className={`stat-tile border ${toneClasses[tone]} flex flex-col gap-2`}> 
      <span className="text-sm font-medium text-clay-500">{label}</span>
      <span className="text-2xl font-semibold text-clay-900">{value}</span>
      {caption && <span className="text-sm text-clay-500">{caption}</span>}
    </div>
  )
}
