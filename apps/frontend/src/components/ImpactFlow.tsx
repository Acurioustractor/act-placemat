import { useMemo } from 'react'
import { Card } from './ui/Card'
import { Pill } from './ui/Pill'
import { WhatWeDoSection } from './WhatWeDoSection'

interface Project {
  id: string
  name: string
  themes?: string[]
  tags?: string[]
  coreValues?: string[]
  relatedPlaces?: Array<{ displayName?: string; indigenousName?: string }>
  storytellerCount?: number
  partnerCount?: number
  revenueActual?: number | null
  revenuePotential?: number | null
  relationshipPillars?: string[]
}

interface ImpactFlowProps {
  projects: Project[]
}

export function ImpactFlow({ projects }: ImpactFlowProps) {
  const insights = useMemo(() => {
    // Aggregate data from all projects
    const locations = new Set<string>()
    const themes = new Map<string, number>()
    const values = new Map<string, number>()
    const pillars = new Map<string, number>()

    let totalStorytellers = 0
    let totalPartners = 0
    let totalRevenue = 0
    let projectsWithStorytellers = 0
    let projectsWithPartners = 0

    projects.forEach(project => {
      // Locations
      project.relatedPlaces?.forEach(place => {
        const name = place.displayName || place.indigenousName
        if (name) locations.add(name)
      })

      // Themes
      const projectThemes = project.themes || project.tags || []
      projectThemes.forEach(theme => {
        themes.set(theme, (themes.get(theme) || 0) + 1)
      })

      // Core Values
      const projectValues = Array.isArray(project.coreValues)
        ? project.coreValues
        : project.coreValues
        ? [project.coreValues]
        : []
      projectValues.forEach(value => {
        values.set(value, (values.get(value) || 0) + 1)
      })

      // Relationship Pillars
      const projectPillars = project.relationshipPillars || []
      projectPillars.forEach(pillar => {
        pillars.set(pillar, (pillars.get(pillar) || 0) + 1)
      })

      // Impact metrics
      if (project.storytellerCount && project.storytellerCount > 0) {
        totalStorytellers += project.storytellerCount
        projectsWithStorytellers++
      }
      if (project.partnerCount && project.partnerCount > 0) {
        totalPartners += project.partnerCount
        projectsWithPartners++
      }

      const revenue = (project.revenueActual || 0) + (project.revenuePotential || 0)
      if (revenue > 0) {
        totalRevenue += revenue
      }
    })

    // Sort by count, take top items
    const topThemes = Array.from(themes.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)

    const topValues = Array.from(values.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)

    const topPillars = Array.from(pillars.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)

    // Calculate community readiness score
    const dataOwnership = 100 // All data in Notion, exportable
    const storyManagement = Math.min(100, (projectsWithStorytellers / Math.max(1, projects.length)) * 100)
    const partnerEngagement = Math.min(100, (projectsWithPartners / Math.max(1, projects.length)) * 100)
    const readinessScore = Math.round((dataOwnership + storyManagement + partnerEngagement) / 3)

    return {
      locations: Array.from(locations).slice(0, 8),
      topThemes,
      topValues,
      topPillars,
      totalStorytellers,
      totalPartners,
      totalRevenue,
      readinessScore,
      projectCount: projects.length
    }
  }, [projects])

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`
    } else if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(0)}K`
    }
    return `$${amount}`
  }

  return (
    <div className="space-y-10">
      {/* Title */}
      <div className="text-center px-6 py-8">
        <h2 className="text-3xl md:text-4xl font-bold text-clay-900 mb-4">
          The Flow of Capacity Building
        </h2>
        <p className="text-base text-clay-600 max-w-3xl mx-auto leading-relaxed">
          How ACT's work flows through communities, building capacity that makes ACT itself obsolete
        </p>
      </div>

      {/* Flow Visualization */}
      <Card padding="xl" variant="soft" className="bg-gradient-to-br from-white via-clay-50/30 to-white">
        <div className="grid gap-12">
          {/* WHERE: Locations */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <span className="text-3xl">📍</span>
              <h3 className="text-base font-bold uppercase tracking-wider text-brand-700">
                WHERE We Work
              </h3>
              <span className="text-sm text-clay-500">({insights.locations.length}+ places)</span>
            </div>
            <div className="flex flex-wrap gap-3">
              {insights.locations.map((location, idx) => (
                <Pill key={idx} variant="brand" size="md">
                  {location}
                </Pill>
              ))}
            </div>
          </div>

          {/* Flow Arrow */}
          <div className="flex justify-center">
            <div className="text-4xl text-clay-300">↓</div>
          </div>

          {/* WHAT: Themes - Using enriched WhatWeDoSection */}
          <WhatWeDoSection projects={projects} />

          {/* Flow Arrow */}
          <div className="flex justify-center my-4">
            <div className="text-5xl text-clay-300">↓</div>
          </div>

          {/* HOW: Values & Pillars */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <span className="text-3xl">💫</span>
              <h3 className="text-base font-bold uppercase tracking-wider text-purple-700">
                HOW We Work
              </h3>
            </div>
            <div className="space-y-6">
              {/* Core Values */}
              <div>
                <div className="text-sm font-semibold text-clay-700 mb-4">Core Values</div>
                <div className="flex flex-wrap gap-3">
                  {insights.topValues.map(([value, count]) => (
                    <Pill key={value} variant="purple" size="md">
                      {value}
                      <span className="ml-2 text-xs opacity-75">({count})</span>
                    </Pill>
                  ))}
                </div>
              </div>

              {/* Relationship Pillars */}
              {insights.topPillars.length > 0 && (
                <div>
                  <div className="text-sm font-semibold text-clay-700 mb-4">Relationship Pillars</div>
                  <div className="flex flex-wrap gap-3">
                    {insights.topPillars.map(([pillar, count]) => (
                      <Pill key={pillar} variant="amber" size="md">
                        {pillar}
                        <span className="ml-2 text-xs opacity-75">({count})</span>
                      </Pill>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Flow Arrow */}
          <div className="flex justify-center my-4">
            <div className="text-5xl text-clay-300">↓</div>
          </div>

          {/* IMPACT: Results */}
          <div className="bg-gradient-to-r from-brand-50 via-ocean-50/50 to-brand-50 rounded-2xl p-8 border-2 border-brand-200">
            <div className="flex items-center gap-3 mb-8">
              <span className="text-3xl">✨</span>
              <h3 className="text-base font-bold uppercase tracking-wider text-brand-800">
                IMPACT: Community Capacity Built
              </h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <div className="text-center">
                <div className="text-4xl md:text-5xl font-bold text-brand-700 mb-2">{insights.projectCount}</div>
                <div className="text-sm text-clay-700 font-medium">Active Projects</div>
              </div>
              <div className="text-center">
                <div className="text-4xl md:text-5xl font-bold text-ocean-700 mb-2">{insights.totalStorytellers}</div>
                <div className="text-sm text-clay-700 font-medium">Storytellers</div>
                <div className="text-xs text-ocean-600 mt-1">Trusted voices activated</div>
              </div>
              <div className="text-center">
                <div className="text-4xl md:text-5xl font-bold text-purple-700 mb-2">{insights.totalPartners}</div>
                <div className="text-sm text-clay-700 font-medium">Partners</div>
                <div className="text-xs text-purple-600 mt-1">Local organizations</div>
              </div>
              <div className="text-center">
                <div className="text-4xl md:text-5xl font-bold text-amber-700 mb-2">{formatCurrency(insights.totalRevenue)}</div>
                <div className="text-sm text-clay-700 font-medium">In Community Hands</div>
                <div className="text-xs text-amber-600 mt-1">Revenue managed</div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Obsolescence Progress */}
      <Card padding="lg" variant="soft" className="bg-gradient-to-br from-brand-50 via-white to-ocean-50/30 border-2 border-brand-200">
        <div className="space-y-8">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-clay-900">
                Progress Toward Community Independence
              </h3>
              <span className="text-3xl font-bold text-brand-700">{insights.readinessScore}%</span>
            </div>
            <div className="w-full h-4 bg-clay-200 rounded-full overflow-hidden shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-brand-500 to-ocean-500 transition-all duration-1000 rounded-full"
                style={{ width: `${insights.readinessScore}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-start gap-3 p-4 bg-white/60 rounded-xl">
              <span className="text-2xl flex-shrink-0">✅</span>
              <div>
                <div className="font-semibold text-clay-900 mb-1">Data Owned Locally</div>
                <div className="text-sm text-clay-600">Communities control their stories</div>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-white/60 rounded-xl">
              <span className="text-2xl flex-shrink-0">✅</span>
              <div>
                <div className="font-semibold text-clay-900 mb-1">Stories Self-Managed</div>
                <div className="text-sm text-clay-600">Storytellers empowered</div>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-white/60 rounded-xl">
              <span className="text-2xl flex-shrink-0">⏳</span>
              <div>
                <div className="font-semibold text-clay-900 mb-1">Building Independence</div>
                <div className="text-sm text-clay-600">Growing toward full autonomy</div>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t-2 border-clay-200 text-center">
            <p className="text-base text-clay-700 italic font-medium">
              "ACT's success is measured by how quickly communities don't need ACT anymore"
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}
