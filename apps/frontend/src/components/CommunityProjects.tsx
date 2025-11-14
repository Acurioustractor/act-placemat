import { useState, useEffect, useMemo } from 'react'
import type { FormEvent } from 'react'
import { api } from '../services/api'
import { Card } from './ui/Card'
import { SectionHeader } from './ui/SectionHeader'
import { EmptyState } from './ui/EmptyState'
import { USE_MOCK_DATA } from '../config/env'
import { ProjectDetail } from './ProjectDetail'
import ProjectsMap from './ProjectsMap'
import { ImpactFlow } from './ImpactFlow'
import { CommunityLaborValueCard } from './CommunityLaborValueCard'
import { StorytellingScaleCard } from './StorytellingScaleCard'
import { GrantDependencyIndicator } from './GrantDependencyIndicator'
import { ProjectTypeBadge } from './ProjectTypeBadge'
import { EnhancedProjectCard } from './EnhancedProjectCard'
import { ProjectsTable } from './ProjectsTable'
import type { Project, Storyteller } from '../types/project'

type ProjectListResponse = Project[] | { projects?: Project[] }

const isActiveStatus = (status?: string) => {
  if (!status) return false
  const normalized = status.toLowerCase()
  return (
    normalized.includes('active') ||
    normalized.includes('progress') ||
    normalized.includes('delivery') ||
    normalized.includes('🔥')
  )
}

interface CalendarHighlight {
  id: string
  title?: string
  date?: string
  location?: string | null
  attendees?: string[]
  project?: { name?: string; id?: string } | null
}

interface CalendarResponse {
  events?: CalendarHighlight[]
  results?: CalendarHighlight[]
}

type IntelligenceMetrics = Record<string, unknown> & {
  activeProjects?: number
  consentedStorytellers?: number
  openOpportunities?: number
}

interface IntelligenceResponse {
  metrics?: IntelligenceMetrics | null
}

const STUB_PROJECTS: Project[] = [
  // INFRASTRUCTURE BUILDING PROJECT EXAMPLES
  {
    id: 'stub-train-station-townsville',
    name: 'Train Station – Townsville',
    projectType: 'infrastructure-building',
    status: 'Active 🔥',
    themes: ['Infrastructure', 'Skills & Employment', 'Youth'],
    coreValues: ['Decentralised Power', 'Community Ownership'],
    nextMilestoneDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 21).toISOString(),
    relatedPlaces: [{
      indigenousName: 'Wulgurukaba & Bindal',
      westernName: 'Townsville',
      displayName: 'Wulgurukaba & Bindal (Townsville)',
      map: '-19.2590,146.8169',
      state: 'Qld'
    }],
    aiSummary:
      'Community-built gathering space at Townsville train station, constructed with young people and community members with lived experience. Building infrastructure while building skills, confidence, and employment pathways.',
    relatedOrganisations: ['Townsville City Council', 'Local Youth Services'],
    relatedPeople: ['Community builders', 'Young trainees', 'Local tradies'],
    partnerCount: 8,
    updatedAt: new Date().toISOString(),
    communityLaborMetrics: {
      youngPeople: {
        count: 27,
        hoursContributed: 520
      },
      communityMembers: {
        count: 15,
        hoursContributed: 380
      },
      livedExperience: {
        count: 12,
        hoursContributed: 240,
        description: 'Previously incarcerated, long-term unemployed'
      },
      unskilledLabor: {
        count: 35,
        hoursContributed: 780
      },
      skilledLabor: {
        count: 9,
        hoursContributed: 140
      },
      skillsTransferred: [
        { skill: 'Construction basics', peopleTrained: 27, certificationsEarned: 18 },
        { skill: 'Safety & PPE', peopleTrained: 42, certificationsEarned: 42 },
        { skill: 'Project management', peopleTrained: 8, certificationsEarned: 3 }
      ],
      contractorEquivalentCost: 95000,
      actualCost: 28000,
      communityValueCreated: 87000,
      employabilityOutcomes: '27 young people now have construction certifications and hands-on experience. 8 have secured ongoing employment in trades.',
      physicalAssets: [
        { type: 'Covered gathering space', quantity: 1, unit: 'facility' },
        { type: 'Seating areas', quantity: 45, unit: 'square meters' },
        { type: 'Community notice boards', quantity: 4, unit: 'installations' }
      ]
    },
    grantDependencyMetrics: {
      grantFunding: 35000,
      marketRevenue: 12000,
      totalRevenue: 47000,
      grantDependencyPercentage: 74.5,
      historicalData: [
        { year: 2024, grantPercentage: 85, marketPercentage: 15 },
        { year: 2025, grantPercentage: 74.5, marketPercentage: 25.5 }
      ],
      targetGrantIndependenceDate: '2026-12-31',
      targetGrantPercentage: 40,
      socialImpactPerGrantDollar: 3.2,
      socialImpactPerMarketDollar: 4.8
    }
  },
  {
    id: 'stub-artnapa-homestead',
    name: 'Artnapa Homestead – Alice Springs',
    projectType: 'infrastructure-building',
    status: 'Active 🔥',
    themes: ['Infrastructure', 'Cultural Heritage', 'Indigenous Governance'],
    coreValues: ['Indigenous Data Sovereignty', 'Story Sovereignty'],
    nextMilestoneDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 45).toISOString(),
    relatedPlaces: [{
      indigenousName: 'Arrernte',
      westernName: 'Alice Springs',
      displayName: 'Arrernte Country (Alice Springs)',
      map: '-23.6980,133.8807',
      state: 'NT'
    }],
    aiSummary:
      'Restoration and expansion of historic Artnapa Homestead as a community-owned cultural learning center. Young people and community members are rebuilding structures while reconnecting with Country and traditional knowledge.',
    relatedOrganisations: ['Arrernte Council', 'Central Land Council', 'Local Arts Collective'],
    relatedPeople: ['Elders', 'Young Aboriginal builders', 'Cultural knowledge holders'],
    partnerCount: 12,
    updatedAt: new Date().toISOString(),
    communityLaborMetrics: {
      youngPeople: {
        count: 42,
        hoursContributed: 1100
      },
      communityMembers: {
        count: 28,
        hoursContributed: 720
      },
      livedExperience: {
        count: 18,
        hoursContributed: 380,
        description: 'Youth justice system contact, housing insecure'
      },
      unskilledLabor: {
        count: 52,
        hoursContributed: 1420
      },
      skilledLabor: {
        count: 16,
        hoursContributed: 380
      },
      skillsTransferred: [
        { skill: 'Heritage restoration', peopleTrained: 42, certificationsEarned: 24 },
        { skill: 'Traditional building methods', peopleTrained: 38, certificationsEarned: 0 },
        { skill: 'Modern construction', peopleTrained: 35, certificationsEarned: 28 },
        { skill: 'Cultural protocol & knowledge', peopleTrained: 60, certificationsEarned: 0 }
      ],
      contractorEquivalentCost: 185000,
      actualCost: 52000,
      communityValueCreated: 173000,
      employabilityOutcomes: '42 young people gained construction skills and cultural knowledge. 15 secured employment. Intergenerational knowledge transfer from Elders to youth.',
      physicalAssets: [
        { type: 'Restored heritage buildings', quantity: 3, unit: 'structures' },
        { type: 'Cultural learning spaces', quantity: 120, unit: 'square meters' },
        { type: 'Outdoor gathering areas', quantity: 2, unit: 'facilities' },
        { type: 'Story circles', quantity: 4, unit: 'installations' }
      ]
    },
    grantDependencyMetrics: {
      grantFunding: 62000,
      marketRevenue: 8000,
      totalRevenue: 70000,
      grantDependencyPercentage: 88.6,
      historicalData: [
        { year: 2024, grantPercentage: 95, marketPercentage: 5 },
        { year: 2025, grantPercentage: 88.6, marketPercentage: 11.4 }
      ],
      targetGrantIndependenceDate: '2027-06-30',
      targetGrantPercentage: 30,
      socialImpactPerGrantDollar: 4.1,
      socialImpactPerMarketDollar: 5.2
    },
    storytellingMetrics: {
      activeStorytellers: 8,
      potentialStorytellers: 35,
      storiesCaptured: 18,
      storyOpportunities: 120,
      trainingGap: 27,
      captureRate: 15,
      averageStoryReach: 1800,
      totalCurrentReach: 32400,
      potentialReach: 216000,
      storytellersInTraining: 5,
      storiesInProduction: 7
    }
  },
  {
    id: 'stub-mount-yarns',
    name: 'Mount Yarns – Mount Druitt',
    projectType: 'mixed',
    status: 'Active 🔥',
    themes: ['Infrastructure', 'Storytelling', 'Youth', 'Community Arts'],
    coreValues: ['Community Ownership', 'Story Sovereignty'],
    nextMilestoneDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString(),
    relatedPlaces: [{
      indigenousName: 'Darug',
      westernName: 'Mount Druitt',
      displayName: 'Darug Country (Mount Druitt)',
      map: '-33.7693,150.8206',
      state: 'NSW'
    }],
    aiSummary:
      'Converting vacant land into a community storytelling hub and performance space. Young people are building the physical infrastructure while learning to capture and share their community\'s stories. Both infrastructure building AND storytelling capacity development.',
    relatedOrganisations: ['Blacktown City Council', 'Western Sydney Arts', 'Youth Off The Streets'],
    relatedPeople: ['Local youth', 'Community storytellers', 'Artists', 'Builders'],
    partnerCount: 10,
    updatedAt: new Date().toISOString(),
    communityLaborMetrics: {
      youngPeople: {
        count: 35,
        hoursContributed: 780
      },
      communityMembers: {
        count: 22,
        hoursContributed: 520
      },
      livedExperience: {
        count: 16,
        hoursContributed: 310,
        description: 'Youth justice contact, living in social housing'
      },
      unskilledLabor: {
        count: 44,
        hoursContributed: 980
      },
      skilledLabor: {
        count: 13,
        hoursContributed: 310
      },
      skillsTransferred: [
        { skill: 'Landscape construction', peopleTrained: 35, certificationsEarned: 22 },
        { skill: 'Storytelling & media', peopleTrained: 28, certificationsEarned: 15 },
        { skill: 'Event production', peopleTrained: 18, certificationsEarned: 8 },
        { skill: 'Community facilitation', peopleTrained: 12, certificationsEarned: 6 }
      ],
      contractorEquivalentCost: 125000,
      actualCost: 38000,
      communityValueCreated: 117000,
      employabilityOutcomes: '35 young people gained construction and storytelling skills. 12 now work in media/arts. Physical space enables 50+ community events per year.',
      physicalAssets: [
        { type: 'Outdoor performance stage', quantity: 1, unit: 'facility' },
        { type: 'Community garden & gathering space', quantity: 250, unit: 'square meters' },
        { type: 'Seating & shade structures', quantity: 6, unit: 'installations' },
        { type: 'Recording/media booth', quantity: 1, unit: 'facility' }
      ]
    },
    grantDependencyMetrics: {
      grantFunding: 45000,
      marketRevenue: 18000,
      totalRevenue: 63000,
      grantDependencyPercentage: 71.4,
      historicalData: [
        { year: 2024, grantPercentage: 82, marketPercentage: 18 },
        { year: 2025, grantPercentage: 71.4, marketPercentage: 28.6 }
      ],
      targetGrantIndependenceDate: '2026-09-30',
      targetGrantPercentage: 35,
      socialImpactPerGrantDollar: 3.8,
      socialImpactPerMarketDollar: 5.5
    },
    storytellingMetrics: {
      activeStorytellers: 15,
      potentialStorytellers: 48,
      storiesCaptured: 42,
      storyOpportunities: 180,
      trainingGap: 33,
      captureRate: 23.3,
      averageStoryReach: 2200,
      totalCurrentReach: 92400,
      potentialReach: 396000,
      storytellersInTraining: 8,
      storiesInProduction: 12
    }
  },
  // ORIGINAL STORYTELLING PROJECTS
  {
    id: 'stub-picc-storm-stories',
    name: 'PICC – Storm Stories',
    projectType: 'storytelling',
    status: 'Active 🔥',
    themes: ['Storytelling', 'Health and wellbeing', 'Resilience'],
    coreValues: ['Decentralised Power', 'Story Sovereignty'],
    nextMilestoneDate: new Date().toISOString(),
    relatedPlaces: [{
      indigenousName: 'Bwgcolman',
      westernName: 'Palm Island',
      displayName: 'Bwgcolman (Palm Island)',
      map: '-18.7544,146.5811',
      state: 'Qld'
    }],
    aiSummary:
      'Community-owned storytelling and resilience documentation following the Palm Island storms. Capturing and amplifying community voices, building story sovereignty and narrative control.',
    relatedOrganisations: ['Palm Island Community Company'],
    relatedOpportunities: ['Queensland Reconstruction Authority Resilience Grant'],
    partnerCount: 4,
    supporters: 12,
    revenueActual: 50000,
    revenuePotential: 80000,
    updatedAt: new Date().toISOString(),
    storytellingMetrics: {
      activeStorytellers: 12,
      potentialStorytellers: 45,
      storiesCaptured: 28,
      storyOpportunities: 150,
      trainingGap: 33,
      captureRate: 18.7,
      averageStoryReach: 1500,
      totalCurrentReach: 42000,
      potentialReach: 225000,
      storytellersInTraining: 6,
      storiesInProduction: 8
    },
    grantDependencyMetrics: {
      grantFunding: 42000,
      marketRevenue: 8000,
      totalRevenue: 50000,
      grantDependencyPercentage: 84,
      targetGrantIndependenceDate: '2027-03-31',
      targetGrantPercentage: 40
    }
  },
  {
    id: 'stub-witta-harvest',
    name: 'Witta Harvest HQ',
    projectType: 'regenerative-enterprise',
    status: 'Active 🔥',
    themes: ['Operations', 'Health and wellbeing', 'Regenerative Agriculture'],
    coreValues: ['Decentralised Power', 'Community Ownership'],
    nextMilestoneDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString(),
    relatedPlaces: [{
      indigenousName: 'Gubbi Gubbi',
      westernName: 'Witta',
      displayName: 'Gubbi Gubbi (Witta)',
      map: '-26.5833,152.7833',
      state: 'Qld'
    }],
    aiSummary:
      'Regenerative community production site building food security and cultural exchange. Place-based laboratory for relational movements and love-based business models.',
    relatedOrganisations: ['Seed House Witta'],
    relatedOpportunities: ['Sunshine Coast Community Fund'],
    partnerCount: 5,
    supporters: 18,
    revenueActual: 35000,
    revenuePotential: 100000,
    updatedAt: new Date().toISOString(),
    grantDependencyMetrics: {
      grantFunding: 25000,
      marketRevenue: 10000,
      totalRevenue: 35000,
      grantDependencyPercentage: 71.4,
      targetGrantIndependenceDate: '2026-06-30',
      targetGrantPercentage: 25
    }
  },
  {
    id: 'stub-bg-fit',
    name: 'BG Fit',
    projectType: 'skills-employment',
    status: 'Active 🔥',
    themes: ['Youth Justice', 'Health and wellbeing', 'On-Country Healing'],
    coreValues: ['Decentralised Power', 'Cultural Sovereignty'],
    nextMilestoneDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
    relatedPlaces: [{
      indigenousName: 'Kalkadoon',
      westernName: 'Mount Isa',
      displayName: 'Kalkadoon (Mount Isa)',
      map: '-20.7256,139.4927',
      state: 'Qld'
    }],
    aiSummary:
      'On-country fitness and cultural healing camps disrupting the youth justice pipeline. Building employment pathways through cultural connection and physical wellness.',
    relatedOrganisations: ['BG Collective'],
    relatedOpportunities: ['Queensland Youth Justice Innovation Fund'],
    partnerCount: 6,
    supporters: 25,
    revenueActual: 20000,
    revenuePotential: 50000,
    updatedAt: new Date().toISOString(),
    grantDependencyMetrics: {
      grantFunding: 18000,
      marketRevenue: 2000,
      totalRevenue: 20000,
      grantDependencyPercentage: 90,
      targetGrantIndependenceDate: '2027-12-31',
      targetGrantPercentage: 50
    }
  },
]

export function CommunityProjects() {
  const initialMock = () => {
    if (USE_MOCK_DATA) return true
    if (typeof window !== 'undefined' && (window as any).__ACT_USE_MOCKS === true) {
      return true
    }
    return false
  }

  const handleStorytellerAdded = (projectId: string, storyteller: Storyteller) => {
    setProjects((prev) =>
      prev.map((project) => {
        if (project.id !== projectId) return project
        const existing = project.storytellers || []
        const updatedStorytellers = [...existing, storyteller]
        return {
          ...project,
          storytellers: updatedStorytellers,
          storytellerCount: (project.storytellerCount ?? existing.length) + 1,
        }
      })
    )
  }

  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [calendarHighlights, setCalendarHighlights] = useState<CalendarHighlight[]>([])
  const [intelligenceMetrics, setIntelligenceMetrics] = useState<IntelligenceMetrics | null>(null)
  const [calendarError, setCalendarError] = useState<string | null>(null)
  const [useMocks, setUseMocks] = useState<boolean>(initialMock)

  // Filter and view state
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [selectedTheme, setSelectedTheme] = useState<string>('all')
  const [selectedProjectType, setSelectedProjectType] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards')
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'funding'>('date')

  // Project detail navigation
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)

  useEffect(() => {
    loadProjects()
    loadInsights()

    // Check for project URL parameter
    const params = new URLSearchParams(window.location.search)
    const projectParam = params.get('project')
    if (projectParam) {
      setSelectedProjectId(projectParam)
    }
  }, [])

  // Extract unique statuses, themes, and project types for filter dropdowns
  const { uniqueStatuses, uniqueThemes, uniqueProjectTypes } = useMemo(() => {
    const statuses = new Set<string>()
    const themes = new Set<string>()
    const projectTypes = new Set<string>()

    projects.forEach((project) => {
      if (project.status) statuses.add(project.status)
      if (project.projectType) projectTypes.add(project.projectType)
      const projectThemes = project.themes || project.tags || []
      projectThemes.forEach((theme) => themes.add(theme))
    })

    return {
      uniqueStatuses: Array.from(statuses).sort(),
      uniqueThemes: Array.from(themes).sort(),
      uniqueProjectTypes: Array.from(projectTypes).sort(),
    }
  }, [projects])

  const { activeProjects, otherProjects, filteredActiveProjects, filteredOtherProjects } = useMemo(() => {
    const active: Project[] = []
    const other: Project[] = []

    const getMilestoneValue = (value?: string | null) => {
      if (!value) return Number.POSITIVE_INFINITY
      const timestamp = new Date(value).getTime()
      return Number.isNaN(timestamp) ? Number.POSITIVE_INFINITY : timestamp
    }

    const getFundingValue = (project: Project) => {
      return (project.actualIncoming || 0) + (project.potentialIncoming || 0)
    }

    // First, split into active and other
    projects.forEach((project) => {
      if (isActiveStatus(project.status)) {
        active.push(project)
      } else {
        other.push(project)
      }
    })

    // Apply filters
    const applyFilters = (projectList: Project[]) => {
      return projectList.filter((project) => {
        // Search filter
        if (searchQuery) {
          const query = searchQuery.toLowerCase()
          const matchesSearch =
            project.name?.toLowerCase().includes(query) ||
            project.description?.toLowerCase().includes(query) ||
            project.aiSummary?.toLowerCase().includes(query) ||
            project.organization?.toLowerCase().includes(query)
          if (!matchesSearch) return false
        }

        // Status filter
        if (selectedStatus !== 'all' && project.status !== selectedStatus) {
          return false
        }

        // Theme filter
        if (selectedTheme !== 'all') {
          const projectThemes = project.themes || project.tags || []
          if (!projectThemes.includes(selectedTheme)) return false
        }

        // Project Type filter
        if (selectedProjectType !== 'all' && project.projectType !== selectedProjectType) {
          return false
        }

        return true
      })
    }

    // Apply sorting
    const applySorting = (projectList: Project[]) => {
      const sorted = [...projectList]

      if (sortBy === 'date') {
        sorted.sort((a, b) => getMilestoneValue(a.nextMilestoneDate) - getMilestoneValue(b.nextMilestoneDate))
      } else if (sortBy === 'name') {
        sorted.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
      } else if (sortBy === 'funding') {
        sorted.sort((a, b) => getFundingValue(b) - getFundingValue(a))
      }

      return sorted
    }

    const filteredActive = applySorting(applyFilters(active))
    const filteredOther = applySorting(applyFilters(other))

    return {
      activeProjects: active,
      otherProjects: other,
      filteredActiveProjects: filteredActive,
      filteredOtherProjects: filteredOther,
    }
  }, [projects, searchQuery, selectedStatus, selectedTheme, selectedProjectType, sortBy])

  const parseCalendarError = (errorObj?: Error) => {
    if (!errorObj) return 'Connect Google Calendar to see shared milestones.'
    const rawMessage = errorObj.message || ''
    if (rawMessage.includes('Cannot GET /api/calendar/events') || rawMessage.includes('404')) {
      return 'Calendar events are unavailable in this environment.'
    }
    try {
      const jsonMatch = rawMessage.match(/\{.*\}/s)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        if (parsed?.message) return parsed.message
      }
    } catch {
      // ignore parse errors
    }
    if (rawMessage.toLowerCase().includes('not authenticated')) {
      return 'Connect Google Calendar to see shared milestones.'
    }
    return rawMessage || 'Connect Google Calendar to see shared milestones.'
  }

  const loadInsights = async () => {
    if (useMocks) {
      setCalendarHighlights([])
      setIntelligenceMetrics(null)
      setCalendarError('Calendar sync inactive in mock mode.')
      return
    }

    try {
      const [calendar, intelligence] = (await Promise.allSettled([
        api.getCalendarHighlights(2),
        api.getIntelligenceDashboard()
      ])) as [
        PromiseSettledResult<CalendarResponse>,
        PromiseSettledResult<IntelligenceResponse>
      ]

      if (calendar.status === 'fulfilled') {
        setCalendarError(null)
        const calendarValue = calendar.value || {}
        setCalendarHighlights(calendarValue.events || calendarValue.results || [])
      }
      if (calendar.status === 'rejected') {
        const reason = calendar.reason as Error | undefined
        setCalendarError(parseCalendarError(reason))
        setCalendarHighlights([])
      }

      if (intelligence.status === 'fulfilled') {
        const insights = intelligence.value || {}
        setIntelligenceMetrics(insights.metrics || null)
      }
    } catch (err) {
      console.warn('Failed to load project insights', err)
    }
  }

  const loadProjects = async () => {
    if (useMocks) {
      setProjects(STUB_PROJECTS)
      setError((prev) => prev ?? 'Using cached project snapshot.')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      // Using real dashboard projects API that connects to your 64 Notion projects
      const payload = (await api.getDashboardProjects()) as ProjectListResponse
      let normalized: Project[] = []
      if (Array.isArray(payload)) {
        normalized = payload
      } else if (payload && Array.isArray(payload.projects)) {
        normalized = payload.projects
      }
      if (!normalized.length) {
        setUseMocks(true)
        if (typeof window !== 'undefined') {
          ;(window as any).__ACT_USE_MOCKS = true
        }
        setProjects(STUB_PROJECTS)
        setError('Showing cached project snapshot until real data sync completes.')
      } else {
        setProjects(normalized)
        setError(null)
      }
    } catch (err) {
      console.warn('Falling back to stub projects due to API error:', err)
      setUseMocks(true)
      if (typeof window !== 'undefined') {
        ;(window as any).__ACT_USE_MOCKS = true
      }
      setProjects(STUB_PROJECTS)
      setError('Unable to reach /api/real/projects. Displaying cached project snapshot.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card className="flex items-center justify-center" padding="lg">
        <div className="flex flex-col items-center gap-3 text-clay-500">
          <div className="h-12 w-12 animate-spin rounded-full border-2 border-brand-200 border-t-transparent" />
          <p>Loading community projects…</p>
        </div>
      </Card>
    )
  }

  // Show project detail page if a project is selected
  if (selectedProjectId) {
    return (
      <ProjectDetail
        projectId={selectedProjectId}
        onBack={() => setSelectedProjectId(null)}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <SectionHeader
          eyebrow="Project Engine"
          title="Community Projects"
          description="Real initiatives from community partners, synced live from Supabase and Notion so everyone can see progress and impact."
        />

      {error && (
        <Card className="border-red-100 bg-red-50 text-red-700" padding="sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold">Showing cached data</h3>
              <p className="text-xs">{error}</p>
            </div>
            {!useMocks && (
              <button
                onClick={loadProjects}
                className="rounded-lg border border-red-200 px-3 py-1 text-xs font-medium text-red-700 transition hover:bg-red-100"
              >
                Try again
              </button>
            )}
          </div>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-brand-100 bg-brand-50/70 text-brand-800" padding="sm">
          <p className="text-sm font-medium">Living Projects</p>
          <p className="mt-1 text-2xl font-semibold">{projects.length}</p>
          <p className="mt-2 text-sm">Active community initiatives spanning culture, enterprise, and youth justice.</p>
          <p className="mt-1 text-xs text-brand-600">In delivery right now: {activeProjects.length}</p>
        </Card>
        <Card className="border-ocean-100 bg-ocean-50/70 text-ocean-800" padding="sm">
          <p className="text-sm font-medium">Community Control</p>
          <p className="mt-2 text-sm">Communities own their data. Every project is exportable, editable, and forkable without ACT approval.</p>
        </Card>
      </div>

      {/* Filter and View Controls */}
      <Card padding="md">
        <div className="space-y-4">
          {/* Search Bar */}
          <div>
            <input
              type="text"
              placeholder="Search projects by name, description, or organization..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-clay-200 bg-white px-4 py-2 text-sm text-clay-900 placeholder-clay-400 transition focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </div>

          {/* Filters and View Controls */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <label htmlFor="status-filter" className="text-xs font-medium text-clay-600">
                Status:
              </label>
              <select
                id="status-filter"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="rounded-lg border border-clay-200 bg-white px-3 py-1.5 text-sm text-clay-900 transition focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-100"
              >
                <option value="all">All</option>
                {uniqueStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            {/* Theme Filter */}
            <div className="flex items-center gap-2">
              <label htmlFor="theme-filter" className="text-xs font-medium text-clay-600">
                Theme:
              </label>
              <select
                id="theme-filter"
                value={selectedTheme}
                onChange={(e) => setSelectedTheme(e.target.value)}
                className="rounded-lg border border-clay-200 bg-white px-3 py-1.5 text-sm text-clay-900 transition focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-100"
              >
                <option value="all">All</option>
                {uniqueThemes.map((theme) => (
                  <option key={theme} value={theme}>
                    {theme}
                  </option>
                ))}
              </select>
            </div>

            {/* Project Type Filter */}
            <div className="flex items-center gap-2">
              <label htmlFor="type-filter" className="text-xs font-medium text-clay-600">
                Type:
              </label>
              <select
                id="type-filter"
                value={selectedProjectType}
                onChange={(e) => setSelectedProjectType(e.target.value)}
                className="rounded-lg border border-clay-200 bg-white px-3 py-1.5 text-sm text-clay-900 transition focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-100"
              >
                <option value="all">All</option>
                {uniqueProjectTypes.map((type) => (
                  <option key={type} value={type}>
                    {type === 'infrastructure-building' ? 'Infrastructure Building' :
                     type === 'justice-innovation' ? 'Justice Innovation' :
                     type === 'storytelling-platform' ? 'Storytelling Platform' :
                     type === 'community-enterprise' ? 'Community Enterprise' :
                     type === 'Mixed' ? 'Mixed' : type}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort By */}
            <div className="flex items-center gap-2">
              <label htmlFor="sort-by" className="text-xs font-medium text-clay-600">
                Sort by:
              </label>
              <select
                id="sort-by"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'date' | 'name' | 'funding')}
                className="rounded-lg border border-clay-200 bg-white px-3 py-1.5 text-sm text-clay-900 transition focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-100"
              >
                <option value="date">Next Milestone</option>
                <option value="name">Name</option>
                <option value="funding">Funding</option>
              </select>
            </div>

            {/* View Mode Toggle */}
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs font-medium text-clay-600">View:</span>
              <div className="flex rounded-lg border border-clay-200 bg-white">
                <button
                  onClick={() => setViewMode('cards')}
                  className={`px-3 py-1.5 text-xs font-medium transition ${
                    viewMode === 'cards'
                      ? 'bg-brand-100 text-brand-800'
                      : 'text-clay-600 hover:bg-clay-50'
                  } rounded-l-lg`}
                >
                  Cards
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`px-3 py-1.5 text-xs font-medium transition ${
                    viewMode === 'table'
                      ? 'bg-brand-100 text-brand-800'
                      : 'text-clay-600 hover:bg-clay-50'
                  } rounded-r-lg`}
                >
                  Table
                </button>
              </div>
            </div>

            {/* Clear Filters */}
            {(searchQuery || selectedStatus !== 'all' || selectedTheme !== 'all' || selectedProjectType !== 'all' || sortBy !== 'date') && (
              <button
                onClick={() => {
                  setSearchQuery('')
                  setSelectedStatus('all')
                  setSelectedTheme('all')
                  setSelectedProjectType('all')
                  setSortBy('date')
                }}
                className="text-xs font-medium text-brand-700 transition hover:text-brand-800 hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>

          {/* Results count */}
          <div className="text-xs text-clay-500">
            Showing {filteredActiveProjects.length + filteredOtherProjects.length} of {projects.length} projects
          </div>
        </div>
      </Card>

      {/* Projects Map */}
      {projects.length > 0 && (
        <div className="mb-8">
          <ProjectsMap
            projects={projects}
            onProjectClick={(projectId) => setSelectedProjectId(projectId)}
          />
        </div>
      )}

      {/* Impact Flow Visualization */}
      {projects.length > 0 && (
        <div className="mb-8">
          <ImpactFlow projects={projects} />
        </div>
      )}

      {projects.length === 0 ? (
        <EmptyState
          title="No projects yet"
          description="Community projects will appear here as soon as they're synced from Supabase."
        />
      ) : filteredActiveProjects.length === 0 && filteredOtherProjects.length === 0 ? (
        <EmptyState
          title="No matching projects"
          description="Try adjusting your filters or search terms to find projects."
        />
      ) : viewMode === 'table' ? (
        <div className="space-y-6">
          {/* Table View - All Projects */}
          <ProjectsTable
            projects={[...filteredActiveProjects, ...filteredOtherProjects]}
            onSelectProject={setSelectedProjectId}
          />
        </div>
      ) : (
        <div className="space-y-10">
          {/* Cards View */}
          {filteredActiveProjects.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-widest text-brand-600">Active projects</h3>
                <span className="text-xs font-medium text-brand-500">Showing {filteredActiveProjects.length} in delivery</span>
              </div>
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
                {filteredActiveProjects.map((project) => (
                  <EnhancedProjectCard
                    key={project.id}
                    project={project}
                    onSelect={setSelectedProjectId}
                  />
                ))}
              </div>
            </div>
          )}

          {filteredOtherProjects.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-widest text-clay-500">Also in motion</h3>
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
                {filteredOtherProjects.map((project) => (
                  <EnhancedProjectCard
                    key={project.id}
                    project={project}
                    onSelect={setSelectedProjectId}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {(calendarHighlights.length > 0 || intelligenceMetrics) && (
        <Card className="mt-8 grid gap-4 md:grid-cols-2" padding="md">
          {calendarHighlights.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-clay-900">Upcoming milestones</h3>
              <p className="mt-1 text-sm text-clay-500">Pulled directly from Google Calendar.</p>
              <ul className="mt-4 space-y-3 text-sm">
                {calendarHighlights.map((event) => (
                  <li key={event.id} className="rounded-lg border border-clay-100 bg-clay-50 p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-clay-900">{event.title || 'Untitled event'}</span>
                      <span className="text-xs text-clay-500">
                        {event.date ? new Date(event.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'TBC'}
                      </span>
                    </div>
                    {event.location && <p className="text-xs text-clay-500">{event.location}</p>}
                    {event.project?.name && (
                      <p className="text-xs text-brand-700">Project: {event.project.name}</p>
                    )}
                    {event.attendees && event.attendees.length > 0 && (
                      <p className="text-xs text-clay-500 mt-1">
                        Participants: {event.attendees.slice(0, 3).join(', ')}{event.attendees.length > 3 ? '…' : ''}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {calendarHighlights.length === 0 && calendarError && (
            <div className="rounded-lg border border-clay-100 bg-clay-50 p-3 text-sm text-clay-500">
              {calendarError}
            </div>
          )}

          {calendarHighlights.length === 0 && !calendarError && (
            <p className="text-sm text-clay-500">No milestones scheduled.</p>
          )}

          {intelligenceMetrics && (
            <div>
              <h3 className="text-lg font-semibold text-clay-900">Project insights</h3>
              <p className="mt-1 text-sm text-clay-500">Snapshot of project/partner readiness from the intelligence engine.</p>
              <dl className="mt-4 grid gap-3 text-sm">
                <div className="flex items-center justify-between rounded-lg border border-clay-100 bg-clay-50 p-3">
                  <span className="text-clay-500">Active projects</span>
                  <span className="text-lg font-semibold text-brand-700">{intelligenceMetrics.activeProjects ?? 0}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-clay-100 bg-clay-50 p-3">
                  <span className="text-clay-500">Consented storytellers</span>
                  <span className="text-lg font-semibold text-ocean-700">{intelligenceMetrics.consentedStorytellers ?? 0}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-clay-100 bg-clay-50 p-3">
                  <span className="text-clay-500">Open opportunities</span>
                  <span className="text-lg font-semibold text-clay-900">{intelligenceMetrics.openOpportunities ?? 0}</span>
                </div>
              </dl>
            </div>
          )}
        </Card>
      )}
      </div>
    </div>
  )
}

function ActiveProjectCard({
  project,
  onClick,
}: {
  project: Project
  onClick?: (projectId: string) => void
}) {
  const coverImage = project.coverImage || null
  const lastUpdated = project.notionLastEditedAt || project.updatedAt || project.lastUpdated || project.last_updated || null

  const relationshipPillars = Array.isArray(project.relationshipPillars)
    ? project.relationshipPillars.slice(0, 4)
    : []

  const coreValues = Array.isArray(project.coreValues)
    ? project.coreValues
    : project.coreValues
    ? [project.coreValues]
    : []

  const themes = project.themes || project.tags || []

  // Partners and places for context - filter out any invalid values
  const partners = (project.relatedOrganisations || []).filter(p => p && p !== '0' && p !== 0)
  const rawPlaces = (project.relatedPlaces || []).filter(p => p && p.indigenousName)
  const people = (project.relatedPeople || []).filter(p => p && p !== '0' && p !== 0)

  // Places are already objects with proper structure
  const places = rawPlaces

  // Use location as fallback for places if we don't have place names
  const displayPlaces = places.length > 0 ? places : (project.location ? [{ indigenousName: project.location, westernName: null, displayName: project.location }] : [])

  return (
    <div
      className="flex flex-col gap-6 border border-brand-100 bg-white shadow-sm md:flex-row cursor-pointer hover:shadow-lg transition-shadow rounded-lg p-6"
      onClick={() => onClick?.(project.id)}
    >
      <div className="md:w-80 flex-shrink-0">
        <div className="aspect-[4/3] overflow-hidden rounded-xl bg-gradient-to-br from-brand-100 to-ocean-100 shadow-md">
          {coverImage ? (
            <img src={coverImage} alt={project.name} className="h-full w-full object-cover transition hover:scale-105" loading="lazy" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm font-medium text-brand-600 bg-gradient-to-br from-brand-50 to-ocean-50">
              <div className="text-center space-y-2 p-4">
                <div className="text-5xl">📍</div>
                <div className="text-xs text-clay-500">Sense of place</div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-5">
        {/* Header with location and partners */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-clay-500 flex-wrap">
            {project.projectType && (
              <>
                <ProjectTypeBadge type={project.projectType} size="sm" />
                <span>•</span>
              </>
            )}
            {displayPlaces.length > 0 && (
              <>
                <span>📍</span>
                <span className="font-medium">{displayPlaces.slice(0, 2).map(p => p.displayName).join(', ')}</span>
              </>
            )}
            {displayPlaces.length > 0 && partners.length > 0 && <span>•</span>}
            {partners.length > 0 && (
              <span>{partners.length} {partners.length === 1 ? 'partner' : 'partners'}</span>
            )}
          </div>

          <h3 className="text-2xl font-semibold text-clay-900 leading-tight">{project.name}</h3>
        </div>

        {/* What it is */}
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-clay-500 mb-2">What it is</h4>
          <p className="text-base text-clay-700 leading-relaxed">
            {project.aiSummary || project.description || 'Community-defined initiative'}
          </p>
        </div>

        {/* Why it matters - derive from themes and values */}
        {(coreValues.length > 0 || themes.length > 0) && (
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-clay-500 mb-2">Why it matters</h4>
            <div className="flex flex-wrap gap-2">
              {coreValues.map((value) => (
                <span
                  key={`value-${value}`}
                  className="rounded-full bg-brand-100 px-3 py-1 text-sm font-medium text-brand-800"
                >
                  {value}
                </span>
              ))}
              {themes.slice(0, 3).map((theme) => (
                <span key={`theme-${theme}`} className="rounded-full bg-ocean-100 px-3 py-1 text-sm text-ocean-800">
                  {theme}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* How it's happening - relationship pillars */}
        {relationshipPillars.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-clay-500 mb-2">How it's happening</h4>
            <div className="flex flex-wrap gap-2">
              {relationshipPillars.map((pillar) => (
                <span
                  key={`pillar-${pillar}`}
                  className="rounded-full border border-brand-200 bg-white px-3 py-1 text-sm text-brand-700"
                >
                  {pillar}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* People involved */}
        {people.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-clay-500 mb-2">People involved</h4>
            <p className="text-sm text-clay-600">
              {people.slice(0, 5).join(', ')}
              {people.length > 5 && ` and ${people.length - 5} others`}
            </p>
          </div>
        )}

        {/* Quick Impact Metrics */}
        {(project.communityLaborMetrics || project.storytellingMetrics || project.grantDependencyMetrics) && (
          <div className="rounded-lg border border-clay-200 bg-clay-50/50 p-4 space-y-2">
            {project.communityLaborMetrics && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-clay-700 font-medium">Community Value Created</span>
                <span className="text-brand-700 font-bold">
                  ${(project.communityLaborMetrics.communityValueCreated / 1000).toFixed(0)}k
                </span>
              </div>
            )}
            {project.storytellingMetrics && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-clay-700 font-medium">Story Reach Potential</span>
                <span className="text-ocean-700 font-bold">
                  {(project.storytellingMetrics.potentialReach / 1000).toFixed(0)}k people
                </span>
              </div>
            )}
            {project.grantDependencyMetrics && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-clay-700 font-medium">Grant Dependency</span>
                <span className={`font-bold ${project.grantDependencyMetrics.grantDependencyPercentage > 70 ? 'text-clay-600' : 'text-brand-700'}`}>
                  {Math.round(project.grantDependencyMetrics.grantDependencyPercentage)}%
                </span>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-clay-400 pt-3 border-t border-clay-100">
          {lastUpdated && <span>Updated {new Date(lastUpdated).toLocaleDateString()}</span>}
          {project.notionUrl && (
            <a
              href={project.notionUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-brand-700 transition hover:text-brand-800"
              onClick={(e) => e.stopPropagation()}
            >
              <span>View full story</span>
              <span aria-hidden>↗</span>
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

function ProjectCard({
  project,
  onClick,
}: {
  project: Project
  onClick?: (projectId: string) => void
}) {
  const themes = project.themes || project.tags || []
  const lastUpdated =
    project.notionLastEditedAt ||
    project.updatedAt ||
    project.lastUpdated ||
    project.last_updated

  const coverImage = project.coverImage || (project as any).cover_photo || (project as any).image

  const coreValues = Array.isArray(project.coreValues)
    ? project.coreValues
    : project.coreValues
    ? [project.coreValues]
    : []

  const partners = (project.relatedOrganisations || []).filter(p => p && p !== '0' && p !== 0)
  const rawPlaces = (project.relatedPlaces || []).filter(p => p && p.indigenousName)
  const people = (project.relatedPeople || []).filter(p => p && p !== '0' && p !== 0)
  const relationshipPillars = Array.isArray(project.relationshipPillars)
    ? project.relationshipPillars.slice(0, 3)
    : []

  // Places are already objects with proper structure
  const places = rawPlaces

  // Use location as fallback for places if we don't have place names
  const displayPlaces = places.length > 0 ? places : (project.location ? [{ indigenousName: project.location, westernName: null, displayName: project.location }] : [])

  return (
    <div
      className="flex h-full flex-col justify-between overflow-hidden cursor-pointer hover:shadow-lg transition-shadow bg-white rounded-lg border border-clay-200"
      onClick={() => onClick?.(project.id)}
    >
      {coverImage && (
        <div className="relative h-48 w-full overflow-hidden bg-clay-100">
          <img
            src={coverImage}
            alt={`${project.name} cover`}
            className="h-full w-full object-cover"
            onError={(e) => {
              // Hide image if it fails to load
              e.currentTarget.style.display = 'none'
            }}
          />
        </div>
      )}

      <div className="p-6 flex flex-col flex-1 gap-4">
        {/* Project type and context */}
        <div className="flex items-center gap-2 text-xs text-clay-500 flex-wrap">
          {project.projectType && (
            <>
              <ProjectTypeBadge type={project.projectType} size="sm" />
              <span>•</span>
            </>
          )}
          {displayPlaces.length > 0 && (
            <>
              <span>📍</span>
              <span className="font-medium">{displayPlaces[0].displayName}</span>
            </>
          )}
          {displayPlaces.length > 0 && partners.length > 0 && <span>•</span>}
          {partners.length > 0 && (
            <span>{partners.length} {partners.length === 1 ? 'partner' : 'partners'}</span>
          )}
        </div>

        {/* Project name */}
        <h3 className="text-lg font-semibold text-clay-900 leading-tight">{project.name}</h3>

        {/* What it is */}
        <div className="flex-1 space-y-3">
          <p className="text-sm text-clay-600 line-clamp-3">
            {project.aiSummary || project.description || 'Community-defined initiative'}
          </p>

          {/* Why it matters */}
          {(coreValues.length > 0 || themes.length > 0) && (
            <div className="flex flex-wrap gap-1.5">
              {coreValues.slice(0, 2).map((value) => (
                <span
                  key={`value-${value}`}
                  className="rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-medium text-brand-800"
                >
                  {value}
                </span>
              ))}
              {themes.slice(0, 3).map((theme) => (
                <span key={`theme-${theme}`} className="rounded-full bg-ocean-100 px-2.5 py-0.5 text-xs text-ocean-800">
                  {theme}
                </span>
              ))}
            </div>
          )}

          {/* How it's happening */}
          {relationshipPillars.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {relationshipPillars.map((pillar) => (
                <span
                  key={`pillar-${pillar}`}
                  className="rounded-full border border-brand-200 bg-white px-2.5 py-0.5 text-xs text-brand-700"
                >
                  {pillar}
                </span>
              ))}
            </div>
          )}

          {/* People involved */}
          {people.length > 0 && (
            <p className="text-xs text-clay-500">
              With {people.slice(0, 3).join(', ')}
              {people.length > 3 && ` and ${people.length - 3} others`}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-clay-400 pt-3 border-t border-clay-100">
          <span>
            {lastUpdated ? `Updated ${new Date(lastUpdated).toLocaleDateString()}` : ''}
          </span>
          {project.notionUrl && (
            <a
              href={project.notionUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-brand-700 transition hover:text-brand-800"
              onClick={(e) => e.stopPropagation()}
            >
              <span>View story</span>
              <span aria-hidden>↗</span>
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

function StorytellerPanel({
  project,
  canAddStorytellers,
  onStorytellerAdded,
  compact = false,
}: {
  project: Project
  canAddStorytellers: boolean
  onStorytellerAdded: (projectId: string, storyteller: Storyteller) => void
  compact?: boolean
}) {
  const storytellers = project.storytellers || []
  const [isAdding, setIsAdding] = useState(false)
  const [fullName, setFullName] = useState('')
  const [bio, setBio] = useState('')
  const [expertise, setExpertise] = useState('')
  const [profileImageUrl, setProfileImageUrl] = useState('')
  const [consentGranted, setConsentGranted] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  if (!canAddStorytellers && storytellers.length === 0) {
    return null
  }

  const panelClasses = compact
    ? 'rounded-lg border border-clay-100 bg-clay-50/70 p-3 space-y-3'
    : 'rounded-xl border border-clay-100 bg-clay-50/70 p-4 space-y-4'

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!fullName.trim()) {
      setError('Please enter a storyteller name.')
      return
    }

    setSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      const payload = {
        fullName: fullName.trim(),
        bio: bio.trim() ? bio.trim() : null,
        consentGranted,
        expertiseAreas: expertise
          ? expertise.split(',').map((item) => item.trim()).filter(Boolean)
          : [],
        profileImageUrl: profileImageUrl.trim() || null,
        mediaType: null,
      }

      const response = await api.addProjectStoryteller(project.id, payload)
      const storytellerData: any = (response as any).storyteller ?? response

      const normalizedStoryteller: Storyteller = {
        id: storytellerData.id ?? `${project.id}-storyteller-${Date.now()}`,
        project_id: storytellerData.project_id ?? project.supabaseProjectId ?? project.id,
        full_name: storytellerData.full_name ?? payload.fullName,
        bio: storytellerData.bio ?? payload.bio ?? null,
        expertise_areas: storytellerData.expertise_areas ?? payload.expertiseAreas ?? [],
        profile_image_url: storytellerData.profile_image_url ?? payload.profileImageUrl ?? null,
        media_type: storytellerData.media_type ?? null,
        created_at: storytellerData.created_at ?? new Date().toISOString(),
        consent_given: storytellerData.consent_given ?? payload.consentGranted ?? true,
      }

      onStorytellerAdded(project.id, normalizedStoryteller)
      setSuccess('Storyteller added')
      setIsAdding(false)
      setFullName('')
      setBio('')
      setExpertise('')
      setProfileImageUrl('')
      setConsentGranted(true)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to add storyteller. Please try again.'
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={panelClasses}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h4 className={`${compact ? 'text-sm' : 'text-base'} font-semibold text-clay-900`}>
            Community storytellers
          </h4>
          <p className={`${compact ? 'text-xs' : 'text-sm'} text-clay-500`}>
            {storytellers.length > 0
              ? `${storytellers.length} trusted voices linked to this project.`
              : 'Invite storytellers to keep this project alive.'}
          </p>
        </div>
        {canAddStorytellers && (
          <button
            type="button"
            onClick={() => {
              setIsAdding((prev) => !prev)
              setError(null)
              setSuccess(null)
            }}
            className="rounded-lg border border-brand-200 bg-white px-3 py-1 text-xs font-medium text-brand-700 transition hover:bg-brand-50"
          >
            {isAdding ? 'Cancel' : 'Add storyteller'}
          </button>
        )}
      </div>

      {storytellers.length > 0 && (
        <ul className="space-y-2">
          {storytellers.map((storyteller) => (
            <li
              key={storyteller.id ?? storyteller.full_name}
              className="rounded-lg border border-white/60 bg-white/80 p-3 shadow-sm"
            >
              <div className="flex items-start gap-3">
                {storyteller.profile_image_url ? (
                  <img
                    src={storyteller.profile_image_url}
                    alt={storyteller.full_name}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-sm">
                    🎙️
                  </div>
                )}
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-semibold text-clay-900">{storyteller.full_name}</p>
                  {storyteller.bio && (
                    <p className="text-xs text-clay-600 line-clamp-3">{storyteller.bio}</p>
                  )}
                  {Array.isArray(storyteller.expertise_areas) && storyteller.expertise_areas.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {storyteller.expertise_areas.slice(0, 4).map((area) => (
                        <span
                          key={`${storyteller.id}-${area}`}
                          className="rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-700"
                        >
                          {area}
                        </span>
                      ))}
                      {storyteller.expertise_areas.length > 4 && (
                        <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-600">
                          +{storyteller.expertise_areas.length - 4}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {isAdding && canAddStorytellers && (
        <form
          onSubmit={handleSubmit}
          className="space-y-3 rounded-lg border border-brand-100 bg-white/95 p-3"
        >
          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex flex-col text-xs font-medium text-clay-600">
              Full name
              <input
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                className="mt-1 rounded-lg border border-clay-200 bg-white px-3 py-2 text-sm text-clay-900 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-200"
                placeholder="Storyteller name"
              />
            </label>
            <label className="flex flex-col text-xs font-medium text-clay-600">
              Expertise areas
              <input
                value={expertise}
                onChange={(event) => setExpertise(event.target.value)}
                className="mt-1 rounded-lg border border-clay-200 bg-white px-3 py-2 text-sm text-clay-900 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-200"
                placeholder="Culture, youth, justice…"
              />
            </label>
            <label className="flex flex-col text-xs font-medium text-clay-600 md:col-span-2">
              Profile image URL (optional)
              <input
                value={profileImageUrl}
                onChange={(event) => setProfileImageUrl(event.target.value)}
                className="mt-1 rounded-lg border border-clay-200 bg-white px-3 py-2 text-sm text-clay-900 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-200"
                placeholder="https://"
              />
            </label>
            <label className="flex flex-col text-xs font-medium text-clay-600 md:col-span-2">
              Bio / introduction
              <textarea
                value={bio}
                onChange={(event) => setBio(event.target.value)}
                rows={compact ? 3 : 4}
                className="mt-1 rounded-lg border border-clay-200 bg-white px-3 py-2 text-sm text-clay-900 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-200"
                placeholder="Share why this voice matters for the project..."
              />
            </label>
          </div>
          <label className="flex items-center gap-2 text-xs text-clay-600">
            <input
              type="checkbox"
              checked={consentGranted}
              onChange={(event) => setConsentGranted(event.target.checked)}
            />
            Consent confirmed to share story updates publicly
          </label>
          <div className="flex items-center justify-between">
            <div className="text-xs text-clay-400">
              {error && <span className="text-red-600">{error}</span>}
              {success && <span className="text-brand-700">{success}</span>}
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center rounded-lg bg-brand-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? 'Saving…' : 'Save storyteller'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
