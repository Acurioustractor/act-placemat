import type { ProjectType } from '../types/project'

interface ProjectTypeBadgeProps {
  type: ProjectType | string
  size?: 'sm' | 'md' | 'lg'
}

const PROJECT_TYPE_CONFIG: Record<ProjectType, {
  label: string
  icon: string
  color: string
  bgColor: string
  borderColor: string
}> = {
  'infrastructure-building': {
    label: 'Infrastructure',
    icon: '🏗️',
    color: 'text-brand-800',
    bgColor: 'bg-brand-100',
    borderColor: 'border-brand-200'
  },
  'storytelling': {
    label: 'Storytelling',
    icon: '📖',
    color: 'text-ocean-800',
    bgColor: 'bg-ocean-100',
    borderColor: 'border-ocean-200'
  },
  'regenerative-enterprise': {
    label: 'Regenerative',
    icon: '🌾',
    color: 'text-green-800',
    bgColor: 'bg-green-100',
    borderColor: 'border-green-200'
  },
  'skills-employment': {
    label: 'Skills & Jobs',
    icon: '🎓',
    color: 'text-purple-800',
    bgColor: 'bg-purple-100',
    borderColor: 'border-purple-200'
  },
  'mixed': {
    label: 'Mixed',
    icon: '🌟',
    color: 'text-clay-800',
    bgColor: 'bg-clay-100',
    borderColor: 'border-clay-200'
  }
}

// Normalize Notion project type values to expected format
function normalizeProjectType(type: string | ProjectType): ProjectType | null {
  if (!type) return null

  // If already in correct format, return as-is
  if (type in PROJECT_TYPE_CONFIG) {
    return type as ProjectType
  }

  // Convert from Notion format (e.g., "Infrastructure Building" -> "infrastructure-building")
  const normalized = type.toLowerCase().replace(/\s+/g, '-') as ProjectType

  if (normalized in PROJECT_TYPE_CONFIG) {
    return normalized
  }

  return null
}

export function ProjectTypeBadge({ type, size = 'md' }: ProjectTypeBadgeProps) {
  const normalizedType = normalizeProjectType(type)

  // If type is invalid or null, don't render anything
  if (!normalizedType) {
    return null
  }

  const config = PROJECT_TYPE_CONFIG[normalizedType]

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base'
  }

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 rounded-full border font-semibold
        ${config.color} ${config.bgColor} ${config.borderColor}
        ${sizeClasses[size]}
      `}
    >
      <span>{config.icon}</span>
      <span>{config.label}</span>
    </span>
  )
}
