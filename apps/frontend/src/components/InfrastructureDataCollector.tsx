import { useState, useEffect } from 'react'
import { api } from '../services/api'
import { Card } from './ui/Card'
import { CommunityLaborValueCard } from './CommunityLaborValueCard'
import { StorytellingScaleCard } from './StorytellingScaleCard'
import { GrantDependencyIndicator } from './GrantDependencyIndicator'
import { ProjectTypeBadge } from './ProjectTypeBadge'
import type { Project, CommunityLaborMetrics, StorytellingMetrics, GrantDependencyMetrics } from '../types/project'

type ProjectType = 'infrastructure-building' | 'justice-innovation' | 'storytelling-platform' | 'community-enterprise' | 'Mixed'

interface DataCollectorProps {
  onComplete?: () => void
}

export function InfrastructureDataCollector({ onComplete }: DataCollectorProps) {
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Form state
  const [projectType, setProjectType] = useState<ProjectType | ''>('')
  const [youngPeopleCount, setYoungPeopleCount] = useState('')
  const [youngPeopleHours, setYoungPeopleHours] = useState('')
  const [communityMembersCount, setCommunityMembersCount] = useState('')
  const [communityMembersHours, setCommunityMembersHours] = useState('')
  const [livedExpCount, setLivedExpCount] = useState('')
  const [livedExpHours, setLivedExpHours] = useState('')
  const [livedExpDescription, setLivedExpDescription] = useState('')
  const [skillsTransferred, setSkillsTransferred] = useState('')
  const [peopleTrained, setPeopleTrained] = useState('')
  const [certifications, setCertifications] = useState('')
  const [contractorCost, setContractorCost] = useState('')
  const [actualCost, setActualCost] = useState('')
  const [employmentOutcomes, setEmploymentOutcomes] = useState('')
  const [physicalAssets, setPhysicalAssets] = useState('')
  const [activeStorytellers, setActiveStorytellers] = useState('')
  const [totalReach, setTotalReach] = useState('')
  const [potentialReach, setPotentialReach] = useState('')
  const [storiesCaptured, setStoriesCaptured] = useState('')
  const [grantFunding, setGrantFunding] = useState('')
  const [marketRevenue, setMarketRevenue] = useState('')
  const [targetDate, setTargetDate] = useState('')

  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    try {
      const response = await api.getProjects()
      setProjects(response.projects || [])
    } catch (error) {
      console.error('Failed to load projects:', error)
    } finally {
      setLoading(false)
    }
  }

  const selectProject = (project: Project) => {
    setSelectedProject(project)

    // Pre-fill existing data if available
    setProjectType(project.projectType || '')

    if (project.communityLaborMetrics) {
      const clm = project.communityLaborMetrics
      setYoungPeopleCount(clm.youngPeople?.count?.toString() || '')
      setYoungPeopleHours(clm.youngPeople?.hoursContributed?.toString() || '')
      setCommunityMembersCount(clm.communityMembers?.count?.toString() || '')
      setCommunityMembersHours(clm.communityMembers?.hoursContributed?.toString() || '')
      setLivedExpCount(clm.livedExperience?.count?.toString() || '')
      setLivedExpHours(clm.livedExperience?.hoursContributed?.toString() || '')
      setLivedExpDescription(clm.livedExperience?.description || '')
      setContractorCost(clm.contractorEquivalentCost?.toString() || '')
      setActualCost(clm.actualCost?.toString() || '')
      setEmploymentOutcomes(clm.employabilityOutcomes || '')

      if (clm.skillsTransferred && clm.skillsTransferred.length > 0) {
        setSkillsTransferred(clm.skillsTransferred.map(s => s.skill).join(', '))
        setPeopleTrained(clm.skillsTransferred[0]?.peopleTrained?.toString() || '')
        setCertifications(clm.skillsTransferred[0]?.certificationsEarned?.toString() || '')
      }

      if (clm.physicalAssets && clm.physicalAssets.length > 0) {
        setPhysicalAssets(clm.physicalAssets.map(a => `${a.quantity} ${a.type}`).join(', '))
      }
    }

    if (project.storytellingMetrics) {
      const sm = project.storytellingMetrics
      setActiveStorytellers(sm.activeStorytellers?.toString() || '')
      setTotalReach(sm.totalCurrentReach?.toString() || '')
      setPotentialReach(sm.potentialReach?.toString() || '')
      setStoriesCaptured(sm.storiesCaptured?.toString() || '')
    }

    if (project.grantDependencyMetrics) {
      const gdm = project.grantDependencyMetrics
      setGrantFunding(gdm.grantFunding?.toString() || '')
      setMarketRevenue(gdm.marketRevenue?.toString() || '')
      setTargetDate(gdm.targetGrantIndependenceDate || '')
    }
  }

  const getCompleteness = (project: Project): number => {
    let score = 0
    if (project.projectType) score += 25
    if (project.communityLaborMetrics) score += 25
    if (project.storytellingMetrics) score += 25
    if (project.grantDependencyMetrics) score += 25
    return score
  }

  const buildCommunityLaborMetrics = (): CommunityLaborMetrics | null => {
    if (!youngPeopleCount && !communityMembersCount && !contractorCost) return null

    const skills = skillsTransferred.split(',').filter(s => s.trim()).map(skill => ({
      skill: skill.trim(),
      peopleTrained: parseInt(peopleTrained) || 0,
      certificationsEarned: parseInt(certifications) || 0
    }))

    const assets = physicalAssets.split(',').filter(a => a.trim()).map(asset => {
      const parts = asset.trim().split(' ')
      return {
        type: parts.slice(1).join(' ') || asset.trim(),
        quantity: parseInt(parts[0]) || 1,
        unit: 'items'
      }
    })

    const contractorEquiv = parseInt(contractorCost) || 0
    const actual = parseInt(actualCost) || 0

    return {
      youngPeople: youngPeopleCount ? {
        count: parseInt(youngPeopleCount) || 0,
        hoursContributed: parseInt(youngPeopleHours) || 0
      } : undefined,
      communityMembers: communityMembersCount ? {
        count: parseInt(communityMembersCount) || 0,
        hoursContributed: parseInt(communityMembersHours) || 0
      } : undefined,
      livedExperience: livedExpCount ? {
        count: parseInt(livedExpCount) || 0,
        hoursContributed: parseInt(livedExpHours) || 0,
        description: livedExpDescription
      } : undefined,
      skillsTransferred: skills.length > 0 ? skills : undefined,
      contractorEquivalentCost: contractorEquiv,
      actualCost: actual,
      communityValueCreated: contractorEquiv - actual,
      employabilityOutcomes: employmentOutcomes || undefined,
      physicalAssets: assets.length > 0 ? assets : undefined
    }
  }

  const buildStorytellingMetrics = (): StorytellingMetrics | null => {
    if (!activeStorytellers && !totalReach) return null

    return {
      activeStorytellers: parseInt(activeStorytellers) || 0,
      totalCurrentReach: parseInt(totalReach) || 0,
      potentialReach: parseInt(potentialReach) || 0,
      storiesCaptured: parseInt(storiesCaptured) || 0
    }
  }

  const buildGrantDependencyMetrics = (): GrantDependencyMetrics | null => {
    const grant = parseInt(grantFunding) || 0
    const market = parseInt(marketRevenue) || 0

    if (grant === 0 && market === 0) return null

    const total = grant + market
    const percentage = total > 0 ? Math.round((grant / total) * 100) : 100

    return {
      grantFunding: grant,
      marketRevenue: market,
      totalRevenue: total,
      grantDependencyPercentage: percentage,
      targetGrantIndependenceDate: targetDate || undefined
    }
  }

  const handleSave = async () => {
    if (!selectedProject) return

    setSaving(true)
    try {
      const payload: any = {}

      if (projectType) {
        payload.projectType = projectType
      }

      const clm = buildCommunityLaborMetrics()
      if (clm) {
        payload.communityLaborMetrics = clm
      }

      const sm = buildStorytellingMetrics()
      if (sm) {
        payload.storytellingMetrics = sm
      }

      const gdm = buildGrantDependencyMetrics()
      if (gdm) {
        payload.grantDependencyMetrics = gdm
      }

      // Save to Notion via API
      const response = await fetch(`http://localhost:4000/api/projects/${selectedProject.id}/infrastructure`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error('Failed to save infrastructure data')
      }

      alert('✅ Infrastructure data saved to Notion!')

      // Refresh projects
      await loadProjects()
      setSelectedProject(null)

      if (onComplete) {
        onComplete()
      }
    } catch (error) {
      console.error('Failed to save:', error)
      alert('❌ Failed to save data. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  // Get live preview data
  const previewCLM = buildCommunityLaborMetrics()
  const previewSM = buildStorytellingMetrics()
  const previewGDM = buildGrantDependencyMetrics()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading projects...</p>
        </div>
      </div>
    )
  }

  if (!selectedProject) {
    const needsData = projects.filter(p => getCompleteness(p) < 100)
    const complete = projects.filter(p => getCompleteness(p) === 100)

    return (
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-clay-900 mb-3">
            Infrastructure Data Collection
          </h1>
          <p className="text-lg text-clay-600">
            Add impact metrics to your projects - see live previews as you fill data
          </p>
        </div>

        {/* Progress Overview */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <Card className="bg-gradient-to-br from-brand-50 to-ocean-50" padding="md">
            <div className="text-sm font-medium text-clay-600">Total Projects</div>
            <div className="text-3xl font-bold text-clay-900 mt-1">{projects.length}</div>
          </Card>
          <Card className="bg-gradient-to-br from-emerald-50 to-green-50" padding="md">
            <div className="text-sm font-medium text-clay-600">Complete</div>
            <div className="text-3xl font-bold text-emerald-700 mt-1">{complete.length}</div>
            <div className="text-xs text-emerald-600 mt-1">
              {Math.round((complete.length / projects.length) * 100)}% done
            </div>
          </Card>
          <Card className="bg-gradient-to-br from-amber-50 to-orange-50" padding="md">
            <div className="text-sm font-medium text-clay-600">Needs Data</div>
            <div className="text-3xl font-bold text-amber-700 mt-1">{needsData.length}</div>
          </Card>
        </div>

        {/* Projects Needing Data */}
        {needsData.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-clay-900 mb-4">Projects Needing Data</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {needsData.map(project => {
                const completeness = getCompleteness(project)
                return (
                  <Card
                    key={project.id}
                    className="cursor-pointer transition hover:shadow-lg hover:scale-105"
                    padding="md"
                    onClick={() => selectProject(project)}
                  >
                    <div className="flex items-start gap-3">
                      {project.cover_url ? (
                        <img
                          src={project.cover_url}
                          alt=""
                          className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-brand-100 to-ocean-100 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-clay-900 truncate">{project.name}</h3>
                        <p className="text-xs text-clay-500 mt-1">{project.status}</p>
                        <div className="mt-2">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-clay-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-brand-500 transition-all"
                                style={{ width: `${completeness}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium text-clay-600">{completeness}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          </div>
        )}

        {/* Completed Projects */}
        {complete.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-clay-900 mb-4">Complete ✅</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {complete.map(project => (
                <Card
                  key={project.id}
                  className="cursor-pointer transition hover:shadow-md"
                  padding="sm"
                  onClick={() => selectProject(project)}
                >
                  <div className="flex items-center gap-2">
                    <div className="text-2xl">✅</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-clay-900 truncate">{project.name}</div>
                      {project.projectType && (
                        <ProjectTypeBadge type={project.projectType} size="sm" />
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // Data collection form
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => setSelectedProject(null)}
            className="text-brand-600 hover:text-brand-700 font-medium mb-4 flex items-center gap-2"
          >
            ← Back to projects
          </button>
          <h1 className="text-4xl font-bold text-clay-900 mb-2">{selectedProject.name}</h1>
          <p className="text-clay-600">Fill in what you know - estimates are fine, blanks are fine</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Form Column */}
          <div className="space-y-6">
            {/* Project Type */}
            <Card padding="md">
              <h2 className="text-xl font-bold text-clay-900 mb-4">Project Type</h2>
              <select
                value={projectType}
                onChange={(e) => setProjectType(e.target.value as ProjectType)}
                className="w-full rounded-lg border border-clay-200 bg-white px-4 py-2 text-clay-900"
              >
                <option value="">Choose type...</option>
                <option value="infrastructure-building">Infrastructure Building</option>
                <option value="justice-innovation">Justice Innovation</option>
                <option value="storytelling-platform">Storytelling Platform</option>
                <option value="community-enterprise">Community Enterprise</option>
                <option value="Mixed">Mixed</option>
              </select>
            </Card>

            {/* Community Participation */}
            <Card padding="md">
              <h2 className="text-xl font-bold text-clay-900 mb-4">Community Participation</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-clay-700 mb-1">
                    Young people (under 25)
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="number"
                      placeholder="How many"
                      value={youngPeopleCount}
                      onChange={(e) => setYoungPeopleCount(e.target.value)}
                      className="rounded-lg border border-clay-200 px-3 py-2 text-sm"
                    />
                    <input
                      type="number"
                      placeholder="Total hours"
                      value={youngPeopleHours}
                      onChange={(e) => setYoungPeopleHours(e.target.value)}
                      className="rounded-lg border border-clay-200 px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-clay-700 mb-1">
                    Community members (all ages)
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="number"
                      placeholder="How many"
                      value={communityMembersCount}
                      onChange={(e) => setCommunityMembersCount(e.target.value)}
                      className="rounded-lg border border-clay-200 px-3 py-2 text-sm"
                    />
                    <input
                      type="number"
                      placeholder="Total hours"
                      value={communityMembersHours}
                      onChange={(e) => setCommunityMembersHours(e.target.value)}
                      className="rounded-lg border border-clay-200 px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-clay-700 mb-1">
                    People with lived experience
                  </label>
                  <div className="grid grid-cols-2 gap-3 mb-2">
                    <input
                      type="number"
                      placeholder="How many"
                      value={livedExpCount}
                      onChange={(e) => setLivedExpCount(e.target.value)}
                      className="rounded-lg border border-clay-200 px-3 py-2 text-sm"
                    />
                    <input
                      type="number"
                      placeholder="Total hours"
                      value={livedExpHours}
                      onChange={(e) => setLivedExpHours(e.target.value)}
                      className="rounded-lg border border-clay-200 px-3 py-2 text-sm"
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="What kind of lived experience?"
                    value={livedExpDescription}
                    onChange={(e) => setLivedExpDescription(e.target.value)}
                    className="w-full rounded-lg border border-clay-200 px-3 py-2 text-sm"
                  />
                </div>
              </div>
            </Card>

            {/* Skills & Employment */}
            <Card padding="md">
              <h2 className="text-xl font-bold text-clay-900 mb-4">Skills & Employment</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-clay-700 mb-1">
                    Skills transferred
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Construction basics, Tool handling"
                    value={skillsTransferred}
                    onChange={(e) => setSkillsTransferred(e.target.value)}
                    className="w-full rounded-lg border border-clay-200 px-3 py-2 text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="number"
                    placeholder="People trained"
                    value={peopleTrained}
                    onChange={(e) => setPeopleTrained(e.target.value)}
                    className="rounded-lg border border-clay-200 px-3 py-2 text-sm"
                  />
                  <input
                    type="number"
                    placeholder="Certifications"
                    value={certifications}
                    onChange={(e) => setCertifications(e.target.value)}
                    className="rounded-lg border border-clay-200 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-clay-700 mb-1">
                    Employment outcomes
                  </label>
                  <textarea
                    placeholder="e.g., 3 people got construction jobs, 2 started businesses"
                    value={employmentOutcomes}
                    onChange={(e) => setEmploymentOutcomes(e.target.value)}
                    className="w-full rounded-lg border border-clay-200 px-3 py-2 text-sm"
                    rows={3}
                  />
                </div>
              </div>
            </Card>

            {/* Value Created */}
            <Card padding="md">
              <h2 className="text-xl font-bold text-clay-900 mb-4">Value Created</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-clay-700 mb-1">
                    Contractor equivalent cost ($)
                  </label>
                  <input
                    type="number"
                    placeholder="What would contractors charge?"
                    value={contractorCost}
                    onChange={(e) => setContractorCost(e.target.value)}
                    className="w-full rounded-lg border border-clay-200 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-clay-700 mb-1">
                    Actual cost ($)
                  </label>
                  <input
                    type="number"
                    placeholder="Materials + paid labor"
                    value={actualCost}
                    onChange={(e) => setActualCost(e.target.value)}
                    className="w-full rounded-lg border border-clay-200 px-3 py-2 text-sm"
                  />
                </div>
                {contractorCost && actualCost && (
                  <div className="p-3 bg-brand-50 rounded-lg">
                    <div className="text-sm text-brand-900 font-medium">
                      Community value created: ${(parseInt(contractorCost) - parseInt(actualCost)).toLocaleString()}
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-clay-700 mb-1">
                    Physical assets built
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., 1 covered space, 30 seats"
                    value={physicalAssets}
                    onChange={(e) => setPhysicalAssets(e.target.value)}
                    className="w-full rounded-lg border border-clay-200 px-3 py-2 text-sm"
                  />
                </div>
              </div>
            </Card>

            {/* Storytelling */}
            <Card padding="md">
              <h2 className="text-xl font-bold text-clay-900 mb-4">Storytelling</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-clay-700 mb-1">
                      Active storytellers
                    </label>
                    <input
                      type="number"
                      placeholder="How many"
                      value={activeStorytellers}
                      onChange={(e) => setActiveStorytellers(e.target.value)}
                      className="w-full rounded-lg border border-clay-200 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-clay-700 mb-1">
                      Stories captured
                    </label>
                    <input
                      type="number"
                      placeholder="Total"
                      value={storiesCaptured}
                      onChange={(e) => setStoriesCaptured(e.target.value)}
                      className="w-full rounded-lg border border-clay-200 px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-clay-700 mb-1">
                      Current reach
                    </label>
                    <input
                      type="number"
                      placeholder="Combined followers"
                      value={totalReach}
                      onChange={(e) => setTotalReach(e.target.value)}
                      className="w-full rounded-lg border border-clay-200 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-clay-700 mb-1">
                      Potential reach
                    </label>
                    <input
                      type="number"
                      placeholder="If more shared"
                      value={potentialReach}
                      onChange={(e) => setPotentialReach(e.target.value)}
                      className="w-full rounded-lg border border-clay-200 px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              </div>
            </Card>

            {/* Grant Dependency */}
            <Card padding="md">
              <h2 className="text-xl font-bold text-clay-900 mb-4">Funding Journey</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-clay-700 mb-1">
                      Grant funding ($)
                    </label>
                    <input
                      type="number"
                      placeholder="Total grants"
                      value={grantFunding}
                      onChange={(e) => setGrantFunding(e.target.value)}
                      className="w-full rounded-lg border border-clay-200 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-clay-700 mb-1">
                      Market revenue ($)
                    </label>
                    <input
                      type="number"
                      placeholder="Sales/services"
                      value={marketRevenue}
                      onChange={(e) => setMarketRevenue(e.target.value)}
                      className="w-full rounded-lg border border-clay-200 px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-clay-700 mb-1">
                    Target date for 50/50 grant/market
                  </label>
                  <input
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="w-full rounded-lg border border-clay-200 px-3 py-2 text-sm"
                  />
                </div>
              </div>
            </Card>

            {/* Save Button */}
            <div className="sticky bottom-6">
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-4 rounded-lg shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : '💾 Save Infrastructure Data'}
              </button>
            </div>
          </div>

          {/* Live Preview Column */}
          <div className="space-y-6 lg:sticky lg:top-6 lg:self-start">
            <div className="bg-white rounded-xl p-4 shadow-sm border-2 border-brand-200">
              <div className="text-sm font-semibold text-brand-700 mb-3 flex items-center gap-2">
                <span>👁️</span>
                <span>LIVE PREVIEW</span>
              </div>

              <div className="space-y-6">
                {projectType && (
                  <div>
                    <ProjectTypeBadge type={projectType} />
                  </div>
                )}

                {previewCLM && (
                  <CommunityLaborValueCard
                    metrics={previewCLM}
                    projectName={selectedProject.name}
                  />
                )}

                {previewSM && (
                  <StorytellingScaleCard
                    metrics={previewSM}
                    projectName={selectedProject.name}
                  />
                )}

                {previewGDM && (
                  <GrantDependencyIndicator
                    metrics={previewGDM}
                    projectName={selectedProject.name}
                  />
                )}

                {!projectType && !previewCLM && !previewSM && !previewGDM && (
                  <div className="text-center py-12 text-clay-400">
                    <div className="text-4xl mb-2">📊</div>
                    <div className="text-sm">Fill in data to see preview</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
