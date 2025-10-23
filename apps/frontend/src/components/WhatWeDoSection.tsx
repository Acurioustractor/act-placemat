import { useMemo } from 'react'

interface Project {
  id: string
  name: string
  themes?: string[]
  tags?: string[]
  aiSummary?: string
  description?: string
}

interface WhatWeDoSectionProps {
  projects: Project[]
}

// Map themes to deeper purpose and real examples
const THEME_NARRATIVES: Record<string, {
  title: string
  purpose: string
  icon: string
  example?: string
  color: string
}> = {
  'Storytelling': {
    title: 'Community-Controlled Narratives',
    purpose: 'Not just telling stories - communities own and control their narratives, platforms, and data',
    icon: '🎭',
    example: 'PICC Storm Stories: Palm Island documenting resilience on their terms',
    color: 'brand'
  },
  'Youth Justice': {
    title: 'Disrupting Justice Pipelines',
    purpose: 'On-country healing and cultural connection replacing incarceration and harmful systems',
    icon: '⚖️',
    example: 'BG Fit: Fitness camps healing youth through culture, not courts',
    color: 'purple'
  },
  'Health and wellbeing': {
    title: 'Cultural Wellness',
    purpose: 'Connection to Country and community as medicine - not just services, but sovereignty',
    icon: '🏥',
    example: 'Witta Harvest: Food sovereignty building health and economic resilience',
    color: 'ocean'
  },
  'Indigenous': {
    title: 'First Nations Leadership',
    purpose: 'Indigenous knowledge systems, governance, and self-determination at the center',
    icon: '🌏',
    color: 'amber'
  },
  'Economic Freedom': {
    title: 'Regenerative Local Economies',
    purpose: 'Communities generating wealth and opportunity - not extraction, but circulation',
    icon: '🌱',
    color: 'green'
  },
  'Operations': {
    title: 'Infrastructure for Self-Determination',
    purpose: 'Building the tools, systems, and capacity for communities to own their futures',
    icon: '🛠️',
    color: 'slate'
  },
  'Culture': {
    title: 'Living Culture',
    purpose: 'Cultural practice as foundation for everything - not preservation, but evolution',
    icon: '🎨',
    color: 'rose'
  }
}

const COLOR_CLASSES: Record<string, { bg: string; border: string; text: string; textLight: string }> = {
  brand: { bg: 'bg-brand-50', border: 'border-brand-200', text: 'text-brand-900', textLight: 'text-brand-700' },
  ocean: { bg: 'bg-ocean-50', border: 'border-ocean-200', text: 'text-ocean-900', textLight: 'text-ocean-700' },
  purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-900', textLight: 'text-purple-700' },
  amber: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-900', textLight: 'text-amber-700' },
  green: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-900', textLight: 'text-green-700' },
  slate: { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-900', textLight: 'text-slate-700' },
  rose: { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-900', textLight: 'text-rose-700' },
}

export function WhatWeDoSection({ projects }: WhatWeDoSectionProps) {
  const themeData = useMemo(() => {
    const themeCounts = new Map<string, { count: number; projects: Project[] }>()

    projects.forEach(project => {
      const themes = project.themes || project.tags || []
      themes.forEach(theme => {
        const existing = themeCounts.get(theme) || { count: 0, projects: [] }
        themeCounts.set(theme, {
          count: existing.count + 1,
          projects: [...existing.projects, project]
        })
      })
    })

    // Get themes that have narrative definitions
    const enrichedThemes = Array.from(themeCounts.entries())
      .filter(([theme]) => THEME_NARRATIVES[theme])
      .map(([theme, data]) => ({
        theme,
        count: data.count,
        projects: data.projects,
        narrative: THEME_NARRATIVES[theme]
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6) // Top 6 themes

    // Calculate intersections (projects with multiple themes)
    const multiThemeProjects = projects.filter(p => {
      const themes = p.themes || p.tags || []
      return themes.length >= 2
    })

    return { enrichedThemes, intersectionCount: multiThemeProjects.length }
  }, [projects])

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <span className="text-3xl">🎯</span>
        <h3 className="text-base font-bold uppercase tracking-wider text-ocean-700">
          WHAT We Do
        </h3>
      </div>

      <div className="space-y-5">
        {/* Enriched theme cards */}
        {themeData.enrichedThemes.map(({ theme, count, narrative, projects: themeProjects }) => {
          const colors = COLOR_CLASSES[narrative.color] || COLOR_CLASSES.brand

          return (
            <div
              key={theme}
              className={`${colors.bg} ${colors.border} border-2 rounded-2xl p-6 hover:shadow-medium hover:-translate-y-1 transition-all duration-300`}
            >
              <div className="flex items-start gap-4">
                <span className="text-3xl flex-shrink-0">{narrative.icon}</span>
                <div className="flex-1 space-y-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <h4 className={`text-lg font-bold ${colors.text}`}>
                      {narrative.title}
                    </h4>
                    <span className={`text-sm font-semibold ${colors.textLight} whitespace-nowrap`}>
                      {count} {count === 1 ? 'project' : 'projects'}
                    </span>
                  </div>

                  <p className="text-sm text-clay-700 leading-relaxed">
                    {narrative.purpose}
                  </p>

                  {narrative.example && (
                    <div className={`text-sm ${colors.textLight} italic pl-4 py-2 border-l-3 ${colors.border} bg-white/50 rounded-r-lg`}>
                      <span className="font-medium not-italic">Example:</span> {narrative.example}
                    </div>
                  )}

                  {/* Show a few project names */}
                  {themeProjects.length > 0 && (
                    <details className="text-sm mt-3">
                      <summary className={`cursor-pointer ${colors.textLight} hover:underline font-medium flex items-center gap-1`}>
                        <span>View all {count} projects</span>
                        <span className="text-xs">→</span>
                      </summary>
                      <div className="mt-3 pl-4 space-y-1.5 border-l-2 border-clay-200">
                        {themeProjects.slice(0, 5).map(p => (
                          <div key={p.id} className="text-clay-700 text-sm">• {p.name}</div>
                        ))}
                        {themeProjects.length > 5 && (
                          <div className="text-clay-500 text-sm">+ {themeProjects.length - 5} more</div>
                        )}
                      </div>
                    </details>
                  )}
                </div>
              </div>
            </div>
          )
        })}

        {/* Intersection insight */}
        {themeData.intersectionCount > 0 && (
          <div className="mt-6 p-6 bg-gradient-to-r from-clay-50 via-amber-50/50 to-clay-50 border-2 border-clay-300 rounded-2xl shadow-soft">
            <div className="flex items-start gap-3">
              <span className="text-2xl flex-shrink-0">🧵</span>
              <div>
                <p className="font-bold text-clay-900 mb-2 text-base">
                  Threads Weaving Together
                </p>
                <p className="text-sm text-clay-700 leading-relaxed">
                  {themeData.intersectionCount} projects work across <strong>multiple themes</strong>,
                  showing the interconnected nature of this work - youth justice intersects with
                  cultural healing, storytelling builds economic freedom, health flows from connection to Country.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
