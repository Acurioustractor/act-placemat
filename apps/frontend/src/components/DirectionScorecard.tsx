import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../services/api'
import type { DirectionScorecardData, DirectionWorkflowPlan, OpportunityHighlight } from '../services/api'
import { Card } from './ui/Card'

interface DirectionScorecardProps {
  onAskAgent: (prompt: string) => void
}

type AutomationStatus = 'idle' | 'running' | 'success' | 'error'

export function DirectionScorecard({ onAskAgent }: DirectionScorecardProps) {
  const [scorecard, setScorecard] = useState<DirectionScorecardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const [selectedOpportunity, setSelectedOpportunity] = useState<OpportunityHighlight | null>(null)
  const [workflow, setWorkflow] = useState<DirectionWorkflowPlan | null>(null)
  const [planLoading, setPlanLoading] = useState(false)
  const [automationStates, setAutomationStates] = useState<Record<string, AutomationStatus>>({})
  const [automationMessage, setAutomationMessage] = useState<string | null>(null)

  const loadScorecard = useCallback(async (opts: { fresh?: boolean } = {}) => {
    setError(null)
    setRefreshing(opts.fresh ?? false)
    try {
      const data = await api.getDirectionScorecard({ fresh: opts.fresh })
      setScorecard(data)
      setWorkflow(data.workflow || null)
      const defaultOpp = data.workflow?.opportunity || data.opportunities?.highlights?.[0] || null
      setSelectedOpportunity(defaultOpp || null)
    } catch (err) {
      console.error('Direction scorecard error', err)
      setError('Unable to load direction intelligence. Please check the backend connection.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadScorecard()
  }, [loadScorecard])

  const handleRefresh = () => loadScorecard({ fresh: true })

  const handlePlanOpportunity = async (opportunity: OpportunityHighlight | null) => {
    if (!opportunity) return
    setPlanLoading(true)
    setAutomationMessage(null)
    try {
      const updatedPlan = await api.pursueOpportunity(opportunity.id)
      setWorkflow(updatedPlan)
    } catch (err) {
      console.error('Pursuit plan error', err)
      setAutomationMessage('Unable to build pursuit plan. Please try again.')
    } finally {
      setPlanLoading(false)
    }
  }

  const runAutomationAction = async (actionId: string, endpoint: string) => {
    setAutomationStates((prev) => ({ ...prev, [actionId]: 'running' }))
    setAutomationMessage(null)
    try {
      await api.triggerAutomationAction(endpoint, { previewOnly: true })
      setAutomationStates((prev) => ({ ...prev, [actionId]: 'success' }))
      setAutomationMessage('Automation preview triggered successfully.')
    } catch (err) {
      console.error('Automation trigger error', err)
      setAutomationStates((prev) => ({ ...prev, [actionId]: 'error' }))
      setAutomationMessage('Automation failed to start. Check backend logs.')
    } finally {
      setTimeout(() => {
        setAutomationStates((prev) => ({ ...prev, [actionId]: 'idle' }))
      }, 2500)
    }
  }

  const opportunityOptions = useMemo(() => scorecard?.opportunities?.highlights ?? [], [scorecard])

  const handleAskAgent = () => {
    if (!workflow?.aiAgentPrompt) {
      onAskAgent('Draft an outreach plan for our top grant pursuit, referencing current cash flow and key contacts.')
      return
    }
    onAskAgent(workflow.aiAgentPrompt)
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-slate-600">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
        <p className="font-medium">Generating live direction intelligence...</p>
      </div>
    )
  }

  if (error || !scorecard) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center">
        <p className="text-red-600 font-semibold mb-4">{error}</p>
        <button
          onClick={handleRefresh}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Retry
        </button>
      </div>
    )
  }

  const { finance, projects, relationships, directionScore, updatedAt } = scorecard
  const financeRecommendations = finance.recommendations || []
  const fundingNeedPct = projects.totalProjects
    ? Math.round((projects.needsByCategory.funding / projects.totalProjects) * 100)
    : 0
  const engagementNeedPct = projects.totalProjects
    ? Math.round((projects.needsByCategory.engagement / projects.totalProjects) * 100)
    : 0

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-500">Direction Intelligence</p>
          <h1 className="text-3xl font-bold text-slate-900">Company Direction Scorecard</h1>
          <p className="text-sm text-slate-500">Updated {new Date(updatedAt).toLocaleString('en-AU')}</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleRefresh}
            className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
            disabled={refreshing}
          >
            {refreshing ? 'Refreshing...' : 'Refresh Intelligence'}
          </button>
          <button
            onClick={handleAskAgent}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-semibold shadow-md hover:shadow-lg transition-all"
          >
            Ask AI For Next Actions
          </button>
        </div>
      </div>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card padding="lg" variant="soft" className="text-center">
          <p className="text-sm font-semibold text-slate-500 mb-2">Direction Score</p>
          <div className="text-6xl font-black text-slate-900">{directionScore}</div>
          <p className="text-xs uppercase tracking-widest text-slate-400">Overall Readiness</p>
        </Card>
        <Card padding="lg" variant="soft">
          <p className="text-sm font-semibold text-slate-500 mb-2">Finance</p>
          <p className="text-2xl font-bold text-slate-900">
            {typeof finance.cashPosition?.netPosition === 'number'
              ? `$${finance.cashPosition.netPosition.toLocaleString()}`
              : 'N/A'}
          </p>
          <p className="text-sm text-slate-500">
            Runway: {finance.runwayMonths ? `${finance.runwayMonths} months` : 'Unknown'}
          </p>
          {finance.lastUpdated && (
            <p className="text-xs text-slate-400 mt-1">
              Snapshot {new Date(finance.lastUpdated).toLocaleString('en-AU')}
              {finance.status === 'cached' && ' • Cached'}
            </p>
          )}
        </Card>
        <Card padding="lg" variant="soft">
          <p className="text-sm font-semibold text-slate-500 mb-2">Relationships</p>
          <p className="text-2xl font-bold text-slate-900">{relationships.healthScore}</p>
          <p className="text-sm text-slate-500">
            {relationships.recentContacts.length} warm Gmail allies detected
          </p>
        </Card>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card padding="lg" variant="solid" className="text-white">
          <h2 className="text-xl font-semibold mb-4">Financial Health</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between text-white/80">
              <span>Receivables</span>
              <span className="font-semibold text-white">
                ${finance.cashPosition?.receivable?.toLocaleString() ?? '0'}
              </span>
            </div>
            <div className="flex justify-between text-white/80">
              <span>Payables</span>
              <span className="font-semibold text-white">
                ${finance.cashPosition?.payable?.toLocaleString() ?? '0'}
              </span>
            </div>
            <div className="flex justify-between text-white/80">
              <span>Runway</span>
              <span className="font-semibold text-white">
                {finance.runwayMonths ? `${finance.runwayMonths} months` : 'Unknown'}
              </span>
            </div>
          </div>
          {financeRecommendations.length > 0 && (
            <div className="mt-4">
              <p className="text-xs uppercase text-white/60 font-semibold mb-1">Recommended moves</p>
              <ul className="space-y-1 text-sm text-white/90 list-disc list-inside">
                {financeRecommendations.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </Card>

        <Card padding="lg" variant="soft">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Project Momentum</h2>
          <div className="text-sm text-slate-600 mb-4">
            Tracking {projects.totalProjects} projects • Funding need {projects.needsByCategory.funding || 0} ({fundingNeedPct}%)
            • Engagement need {projects.needsByCategory.engagement || 0} ({engagementNeedPct}%)
          </div>
          <div className="space-y-3">
            {projects.focusProjects.slice(0, 4).map((project) => (
              <div key={project.id} className="p-3 border border-slate-100 rounded-lg bg-white">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-slate-900">{project.name}</p>
                  {typeof project.healthScore === 'number' && (
                    <span className="text-sm font-semibold text-blue-600">{project.healthScore}</span>
                  )}
                </div>
                {project.topRecommendation && (
                  <p className="text-sm text-slate-500 mt-1">{project.topRecommendation}</p>
                )}
              </div>
            ))}
          </div>
        </Card>

        <Card padding="lg" variant="soft">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Relationship Pulse</h2>
          <div className="space-y-3">
            {relationships.tierStats.slice(0, 4).map((tier) => (
              <div key={tier.tier} className="flex items-center justify-between text-sm">
                <span className="font-medium capitalize">{tier.tier}</span>
                <span className="font-semibold text-slate-800">{tier.total_contacts} contacts</span>
              </div>
            ))}
          </div>
          {relationships.recentContacts.length > 0 && (
            <div className="mt-4">
              <p className="text-xs uppercase text-slate-500 font-semibold mb-2">Fresh allies</p>
              <div className="space-y-2">
                {relationships.recentContacts.slice(0, 3).map((contact) => (
                  <div key={contact.id} className="text-sm">
                    <p className="font-semibold text-slate-800">{contact.name}</p>
                    <p className="text-slate-500 flex items-center gap-2">
                      {contact.freshness && (
                        <span className="text-base">{contact.freshness.emoji}</span>
                      )}
                      <span>
                        {contact.freshness?.label || 'Last ping'}{' '}
                        {contact.lastInteraction ? new Date(contact.lastInteraction).toLocaleDateString('en-AU') : 'Unknown'}
                      </span>
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </section>

      {projects.highNeedProjects.length > 0 && (
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card padding="lg" variant="soft">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">High-Need Projects</h2>
            <p className="text-sm text-slate-500 mb-4">
              Showing top {Math.min(3, projects.highNeedProjects.length)} projects needing immediate funding or engagement support.
            </p>
            <div className="space-y-3">
              {projects.highNeedProjects.slice(0, 3).map(project => (
                <div key={project.id} className="border border-slate-100 rounded-lg p-3 bg-white">
                  <p className="font-semibold text-slate-900">{project.name}</p>
                  <p className="text-xs text-slate-500">
                    Funding score {project.fundingScore ?? '--'} • Engagement {project.engagementScore ?? '--'}
                  </p>
                  {project.tags && project.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {project.tags.slice(0, 3).map(tag => (
                        <span key={tag} className="text-xs px-2 py-0.5 bg-slate-50 border border-slate-100 rounded-full text-slate-600">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </section>
      )}

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card padding="lg" variant="soft" className="lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-slate-900">Opportunity Radar</h2>
            {planLoading && <span className="text-xs text-slate-500">Building plan...</span>}
          </div>
          <div className="space-y-3">
            {opportunityOptions.length === 0 && <p className="text-sm text-slate-500">No live opportunities detected.</p>}
            {opportunityOptions.map((opportunity) => {
              const isActive = selectedOpportunity?.id === opportunity.id
              return (
                <button
                  key={opportunity.id}
                  onClick={() => {
                    setSelectedOpportunity(opportunity)
                    handlePlanOpportunity(opportunity)
                  }}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                    isActive ? 'border-blue-500 bg-blue-50 shadow-sm' : 'border-slate-200 hover:border-blue-300'
                  }`}
                >
                  <p className="font-semibold text-slate-900">{opportunity.name}</p>
                  <p className="text-sm text-slate-500">
                    {opportunity.amount ? `$${opportunity.amount.toLocaleString()}` : 'Amount TBD'} •{' '}
                    {opportunity.deadline ? new Date(opportunity.deadline).toLocaleDateString('en-AU') : 'Deadline TBC'}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-1 text-xs text-slate-600">
                    {typeof opportunity.matchScore === 'number' && (
                      <span className="px-2 py-0.5 bg-blue-50 border border-blue-100 rounded-full text-blue-700">
                        Match {opportunity.matchScore}%
                      </span>
                    )}
                    {typeof opportunity.fundingGapClosed === 'number' && (
                      <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-100 rounded-full text-emerald-700">
                        Closes {opportunity.fundingGapClosed}% gap
                      </span>
                    )}
                  </div>
                  {opportunity.matchingProject && (
                    <p className="text-xs text-slate-500 mt-1">
                      Best for {opportunity.matchingProject.name}
                      {opportunity.matchingProject.sharedTags?.length
                        ? ` (${opportunity.matchingProject.sharedTags.slice(0, 2).join(', ')})`
                        : ''}
                    </p>
                  )}
                  {opportunity.tags && opportunity.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {opportunity.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="text-xs px-2 py-1 bg-white border border-slate-200 rounded-full text-slate-600"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </Card>

        <Card padding="lg" variant="solid" className="lg:col-span-2 text-white">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <h2 className="text-xl font-semibold">Grant Pursuit Plan</h2>
            {planLoading && <span className="text-xs font-semibold text-white/70">Refreshing plan...</span>}
          </div>
          {workflow ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div>
                  <p className="text-xs uppercase text-white/70 font-semibold">Opportunity</p>
                  <p className="text-base font-bold">{workflow.opportunity?.name || 'Select a grant'}</p>
                  {workflow.opportunity?.deadline && (
                    <p className="text-sm text-white/80">
                      Due {new Date(workflow.opportunity.deadline).toLocaleDateString('en-AU')}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-xs uppercase text-white/70 font-semibold">Project</p>
                  <p className="text-base font-bold">{workflow.project?.name || 'Assign a project'}</p>
                  {workflow.project?.funding?.recommendation && (
                    <p className="text-sm text-white/80">{workflow.project.funding.recommendation}</p>
                  )}
                  {workflow.projectJustification && (
                    <p className="text-xs text-white/70 mt-1">{workflow.projectJustification}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs uppercase text-white/70 font-semibold">Contact</p>
                  <p className="text-base font-bold">
                    {workflow.recommendedContact?.name || 'Pick a strategic ally'}
                  </p>
                  <p className="text-sm text-white/80">
                    {workflow.recommendedContact?.currentCompany || workflow.recommendedContact?.currentRole || ''}
                  </p>
                  {workflow.contactJustification && (
                    <p className="text-xs text-white/70 mt-1">{workflow.contactJustification}</p>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3 mb-6">
                <div className="px-4 py-2 rounded-full bg-white/20 text-white text-sm font-semibold">
                  Readiness {workflow.readinessScore ?? '--'}
                </div>
                <button
                  onClick={handleAskAgent}
                  className="px-4 py-2 rounded-full border border-white/40 bg-white/10 text-white text-sm hover:bg-white/20 transition-colors"
                >
                  Draft Outreach With AI
                </button>
              </div>
              {workflow.nextSteps && workflow.nextSteps.length > 0 && (
                <div className="mb-6">
                  <p className="text-xs uppercase text-white/70 font-semibold mb-2">Next steps</p>
                  <div className="space-y-2">
                    {workflow.nextSteps.map((step, idx) => (
                      <div key={`${step.label}-${idx}`} className="bg-white/10 rounded-lg p-3">
                        <p className="text-sm font-semibold text-white">{step.label}</p>
                        {step.detail && <p className="text-sm text-white/80">{step.detail}</p>}
                        {step.recommendedChannel && (
                          <p className="text-xs mt-1 text-white/60">Channel: {step.recommendedChannel}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {workflow.automationActions && workflow.automationActions.length > 0 && (
                <div className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-slate-900">Automation previews</p>
                    {automationMessage && <p className="text-xs text-slate-500">{automationMessage}</p>}
                  </div>
                  <div className="space-y-3">
                    {workflow.automationActions.map((action) => {
                      const status = automationStates[action.id] || 'idle'
                      return (
                        <div key={action.id} className="flex flex-col gap-1 border border-slate-100 rounded-lg p-3">
                          <p className="text-sm font-semibold text-slate-900">{action.description}</p>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => runAutomationAction(action.id, action.endpoint)}
                              className="px-3 py-1 text-xs font-semibold rounded-full bg-slate-900 text-white hover:bg-slate-700 disabled:opacity-40"
                              disabled={status === 'running'}
                            >
                              {status === 'running' ? 'Running...' : 'Preview Automation'}
                            </button>
                            {status === 'success' && <span className="text-xs text-green-600 font-semibold">Success</span>}
                            {status === 'error' && <span className="text-xs text-red-600 font-semibold">Failed</span>}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-white text-sm">Select an opportunity to generate a pursuit plan.</div>
          )}
        </Card>
      </section>
    </div>
  )
}
