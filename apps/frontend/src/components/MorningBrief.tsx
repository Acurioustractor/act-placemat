import { useState, useEffect, useMemo } from 'react'
import { resolveApiUrl } from '../config/env'
import { Card } from './ui/Card'
import { Pill } from './ui/Pill'
import ProjectsMap from './ProjectsMap'

interface Project {
  id: string
  name: string
  status?: string
  themes?: string[]
  deadline?: string
  revenueActual?: number | null
  revenuePotential?: number | null
  storytellerCount?: number
  partnerCount?: number
  relatedOrganisations?: Array<any>
  relatedPlaces?: Array<{ displayName?: string; indigenousName?: string }>
}

export function MorningBrief() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    setLoading(true)
    try {
      const response = await fetch(resolveApiUrl('/api/real/projects'))
      if (!response.ok) {
        throw new Error(`API returned ${response.status}`)
      }
      const data = await response.json()
      setProjects(data.projects || [])
    } catch (error) {
      console.error('Failed to fetch projects:', error)
      setProjects([])
    } finally {
      setLoading(false)
    }
  }

  // Calculate real intelligence from project data
  const intelligence = useMemo(() => {
    const activeProjects = projects.filter(p =>
      p.status !== 'Completed' && p.status !== 'Cancelled'
    )

    // Calculate total partners and places
    const totalPartners = activeProjects.reduce((sum, p) =>
      sum + (p.relatedOrganisations?.length || 0), 0
    )
    const totalPlaces = activeProjects.reduce((sum, p) =>
      sum + (p.relatedPlaces?.length || 0), 0
    )

    // Projects with strong impact potential (partners + places + themes)
    const impactOpportunities = activeProjects
      .map(p => ({
        ...p,
        impactScore: (p.relatedOrganisations?.length || 0) +
                    (p.relatedPlaces?.length || 0) +
                    (p.themes?.length || 0)
      }))
      .filter(p => p.impactScore > 0)
      .sort((a, b) => b.impactScore - a.impactScore)
      .slice(0, 5)

    // Projects with strong community engagement
    const communityStrongProjects = activeProjects
      .filter(p => (p.relatedOrganisations?.length || 0) > 0)
      .sort((a, b) =>
        (b.relatedOrganisations?.length || 0) - (a.relatedOrganisations?.length || 0)
      )
      .slice(0, 5)

    // Location concentration
    const locationMap = new Map<string, number>()
    activeProjects.forEach(p => {
      p.relatedPlaces?.forEach(place => {
        const name = place.displayName || place.indigenousName
        if (name) {
          locationMap.set(name, (locationMap.get(name) || 0) + 1)
        }
      })
    })

    const topLocations = Array.from(locationMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)

    // Theme distribution
    const themeMap = new Map<string, number>()
    activeProjects.forEach(p => {
      p.themes?.forEach(theme => {
        themeMap.set(theme, (themeMap.get(theme) || 0) + 1)
      })
    })

    return {
      activeCount: activeProjects.length,
      totalPartners,
      totalPlaces,
      impactOpportunities,
      communityStrongProjects,
      topLocations,
      topThemes: Array.from(themeMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3)
    }
  }, [projects])

  if (loading) {
    return (
      <div className="min-h-screen bg-clay-50 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-brand-500 border-t-transparent"></div>
          <p className="mt-6 text-lg text-clay-700 font-medium">Loading your intelligence brief...</p>
        </div>
      </div>
    )
  }

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`
    if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}K`
    return `$${amount}`
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good Morning'
    if (hour < 18) return 'Good Afternoon'
    return 'Good Evening'
  }

  const formatDate = () => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }
    return new Date().toLocaleDateString('en-AU', options)
  }

  return (
    <div className="min-h-screen bg-clay-50 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center py-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <span className="text-5xl">🌅</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-clay-900 mb-3">{getGreeting()}, Ben!</h1>
          <p className="text-lg text-clay-600 font-medium">{formatDate()}</p>
        </div>

        {/* Portfolio Overview */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card padding="lg" variant="soft" className="text-center">
            <div className="text-4xl font-bold text-brand-700 mb-2">{intelligence.activeCount}</div>
            <div className="text-sm font-medium text-clay-700">Active Projects</div>
          </Card>

          <Card padding="lg" variant="soft" className="text-center">
            <div className="text-4xl font-bold text-purple-700 mb-2">{intelligence.totalPartners}</div>
            <div className="text-sm font-medium text-clay-700">Partner Organisations</div>
          </Card>

          <Card padding="lg" variant="soft" className="text-center">
            <div className="text-4xl font-bold text-ocean-700 mb-2">{intelligence.totalPlaces}</div>
            <div className="text-sm font-medium text-clay-700">Locations</div>
          </Card>
        </div>

        {/* Projects Map */}
        <div>
          <h2 className="text-2xl font-bold text-clay-900 mb-6 flex items-center gap-3">
            <span className="text-3xl">🗺️</span>
            Projects Across Australia
          </h2>
          <Card padding="none" variant="soft">
            <ProjectsMap projects={projects} />
          </Card>
        </div>

        {/* Impact Opportunities */}
        {intelligence.impactOpportunities.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-clay-900 mb-6 flex items-center gap-3">
              <span className="text-3xl">🌱</span>
              Impact Opportunities
            </h2>
            <div className="grid gap-4">
              {intelligence.impactOpportunities.map((project) => (
                <Card key={project.id} padding="lg" hover variant="soft">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-clay-900">{project.name}</h3>
                      <div className="flex flex-wrap gap-2 mt-3">
                        {project.relatedOrganisations && project.relatedOrganisations.length > 0 && (
                          <Pill variant="purple" size="sm">
                            {project.relatedOrganisations.length} partners
                          </Pill>
                        )}
                        {project.relatedPlaces && project.relatedPlaces.length > 0 && (
                          <Pill variant="ocean" size="sm">
                            {project.relatedPlaces.length} locations
                          </Pill>
                        )}
                        {project.themes && project.themes.length > 0 && (
                          <Pill variant="brand" size="sm">
                            {project.themes.length} themes
                          </Pill>
                        )}
                      </div>
                    </div>
                    <div className="text-center px-4 py-3 bg-brand-50 rounded-2xl border-2 border-brand-200">
                      <div className="text-3xl font-bold text-brand-700">{project.impactScore}</div>
                      <div className="text-xs text-clay-600 font-medium mt-1">Impact Score</div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Community-Strong Projects */}
        {intelligence.communityStrongProjects.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-clay-900 mb-6 flex items-center gap-3">
              <span className="text-3xl">🤝</span>
              Partnership Networks
            </h2>
            <div className="grid gap-4">
              {intelligence.communityStrongProjects.map((project) => (
                <Card key={project.id} padding="lg" hover variant="soft">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-clay-900">{project.name}</h3>
                      <div className="flex items-center gap-2 mt-3">
                        {project.relatedOrganisations && project.relatedOrganisations.length > 0 && (
                          <Pill variant="purple" size="sm">
                            {project.relatedOrganisations.length} partner org{project.relatedOrganisations.length > 1 ? 's' : ''}
                          </Pill>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Geographic Focus */}
        {intelligence.topLocations.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-clay-900 mb-6 flex items-center gap-3">
              <span className="text-3xl">📍</span>
              Geographic Focus
            </h2>
            <Card padding="lg" variant="soft">
              <div className="flex flex-wrap gap-3">
                {intelligence.topLocations.map(([location, count]) => (
                  <div key={location} className="flex items-center gap-2 px-4 py-3 bg-brand-50 rounded-2xl border-2 border-brand-200">
                    <span className="font-bold text-brand-900">{location}</span>
                    <span className="text-sm text-clay-600">({count} projects)</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* Thematic Focus */}
        {intelligence.topThemes.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-clay-900 mb-6 flex items-center gap-3">
              <span className="text-3xl">🎯</span>
              Thematic Focus
            </h2>
            <Card padding="lg" variant="soft">
              <div className="flex flex-wrap gap-3">
                {intelligence.topThemes.map(([theme, count]) => (
                  <div key={theme} className="flex items-center gap-2 px-4 py-3 bg-ocean-50 rounded-2xl border-2 border-ocean-200">
                    <span className="font-bold text-ocean-900">{theme}</span>
                    <span className="text-sm text-clay-600">({count} projects)</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
