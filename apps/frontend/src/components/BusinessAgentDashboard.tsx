import { useEffect, useState } from 'react'
import { Card } from './ui/Card'
import { SectionHeader } from './ui/SectionHeader'

interface AgentStatus {
  agent: string
  version: string
  region: string
  status: 'running' | 'stopped'
  lastAnalysis: string | null
  nextAnalysis: string | null
  consecutiveErrors: number
  config: {
    analysisInterval: string
    complianceMonitoring: boolean
    grantDiscovery: boolean
    notifications: boolean
  }
}

interface ComplianceItem {
  type: string
  description: string
  status: string
  frequency?: string
  nextDeadline?: string
  action: string
  daysRemaining?: number
  priority?: string
}

interface Opportunity {
  title: string
  source: string
  type: string
  description: string
  eligibility: string
  estimatedValue: string
  deadline: string
  priority: string
  url: string
}

export function BusinessAgentDashboard() {
  const [status, setStatus] = useState<AgentStatus | null>(null)
  const [compliance, setCompliance] = useState<any>(null)
  const [opportunities, setOpportunities] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchAgentData()
    // Refresh every 5 minutes
    const interval = setInterval(fetchAgentData, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const fetchAgentData = async () => {
    try {
      setLoading(true)
      setError(null)

      const [statusRes, complianceRes, opportunitiesRes] = await Promise.all([
        fetch('http://localhost:4000/api/v2/agents/business-australia/status'),
        fetch('http://localhost:4000/api/v2/agents/business-australia/analyze/compliance'),
        fetch('http://localhost:4000/api/v2/agents/business-australia/analyze/opportunities')
      ])

      const statusData = await statusRes.json()
      const complianceData = await complianceRes.json()
      const opportunitiesData = await opportunitiesRes.json()

      setStatus(statusData)
      setCompliance(complianceData.compliance)
      setOpportunities(opportunitiesData.opportunities)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load agent data')
      console.error('Agent data fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleStartAgent = async () => {
    try {
      await fetch('http://localhost:4000/api/v2/agents/business-australia/start', {
        method: 'POST'
      })
      fetchAgentData()
    } catch (err) {
      console.error('Failed to start agent:', err)
    }
  }

  const handleStopAgent = async () => {
    try {
      await fetch('http://localhost:4000/api/v2/agents/business-australia/stop', {
        method: 'POST'
      })
      fetchAgentData()
    } catch (err) {
      console.error('Failed to stop agent:', err)
    }
  }

  const handleRunAnalysis = async () => {
    try {
      setLoading(true)
      await fetch('http://localhost:4000/api/v2/agents/business-australia/analyze', {
        method: 'POST'
      })
      fetchAgentData()
    } catch (err) {
      console.error('Failed to run analysis:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading && !status) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-4xl">🤖</div>
          <div className="text-lg text-clay-600">Loading Business Agent...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <div className="text-center py-12">
          <div className="mb-4 text-5xl">⚠️</div>
          <h3 className="mb-2 text-lg font-semibold text-clay-900">Agent Error</h3>
          <p className="text-clay-600">{error}</p>
          <button
            onClick={fetchAgentData}
            className="mt-4 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700"
          >
            Retry
          </button>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Agent Status Header */}
      <div className="flex items-center justify-between">
        <div>
          <SectionHeader
            title="🇦🇺 Business Agent for Australia"
            subtitle="Always-on autonomous business intelligence"
          />
          <p className="mt-2 text-sm text-clay-600">
            Continuously monitors finances, compliance, opportunities, and relationships
          </p>
        </div>
        <div className="flex gap-3">
          {status?.status === 'running' ? (
            <>
              <button
                onClick={handleRunAnalysis}
                disabled={loading}
                className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50"
              >
                Run Analysis Now
              </button>
              <button
                onClick={handleStopAgent}
                className="px-4 py-2 bg-clay-200 text-clay-700 rounded-lg hover:bg-clay-300"
              >
                Stop Agent
              </button>
            </>
          ) : (
            <button
              onClick={handleStartAgent}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Start Agent
            </button>
          )}
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className="text-3xl">
              {status?.status === 'running' ? '🟢' : '🔴'}
            </div>
            <div>
              <div className="text-sm font-medium text-clay-500">Status</div>
              <div className="text-lg font-semibold text-clay-900">
                {status?.status === 'running' ? 'Running' : 'Stopped'}
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="text-3xl">📊</div>
            <div>
              <div className="text-sm font-medium text-clay-500">Last Analysis</div>
              <div className="text-sm font-semibold text-clay-900">
                {status?.lastAnalysis
                  ? new Date(status.lastAnalysis).toLocaleTimeString()
                  : 'Never'}
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="text-3xl">⏰</div>
            <div>
              <div className="text-sm font-medium text-clay-500">Interval</div>
              <div className="text-sm font-semibold text-clay-900">
                {status?.config.analysisInterval || 'N/A'}
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="text-3xl">🎯</div>
            <div>
              <div className="text-sm font-medium text-clay-500">Errors</div>
              <div className="text-sm font-semibold text-clay-900">
                {status?.consecutiveErrors || 0}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Compliance Section */}
      {compliance && (
        <Card>
          <SectionHeader
            title="📋 Australian Compliance Monitoring"
            subtitle={`${compliance.checks?.length || 0} items monitored`}
          />

          {compliance.alerts && compliance.alerts.length > 0 && (
            <div className="mt-4 space-y-3">
              <h4 className="font-semibold text-clay-900">⚠️ Upcoming Deadlines</h4>
              {compliance.alerts.map((alert: ComplianceItem, idx: number) => (
                <div
                  key={idx}
                  className={`p-4 rounded-lg border-l-4 ${
                    alert.priority === 'critical'
                      ? 'bg-red-50 border-red-500'
                      : 'bg-yellow-50 border-yellow-500'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h5 className="font-semibold text-clay-900">{alert.title}</h5>
                      <p className="mt-1 text-sm text-clay-600">{alert.message}</p>
                      <p className="mt-2 text-sm font-medium text-clay-700">
                        Action: {alert.action}
                      </p>
                    </div>
                    {alert.deadline && (
                      <div className="ml-4 text-right">
                        <div className="text-sm font-medium text-clay-500">Deadline</div>
                        <div className="text-sm font-semibold text-clay-900">
                          {new Date(alert.deadline).toLocaleDateString()}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {compliance.checks?.map((check: ComplianceItem, idx: number) => (
              <div key={idx} className="p-4 bg-clay-50 rounded-lg">
                <h5 className="font-semibold text-clay-900">{check.type}</h5>
                <p className="mt-1 text-sm text-clay-600">{check.description}</p>
                <div className="mt-2 text-xs text-clay-500">
                  {check.frequency && <div>Frequency: {check.frequency}</div>}
                  {check.nextDeadline && <div>Next: {check.nextDeadline}</div>}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Grant Opportunities */}
      {opportunities && opportunities.relevant && opportunities.relevant.length > 0 && (
        <Card>
          <SectionHeader
            title="🎯 Grant & Funding Opportunities"
            subtitle={`${opportunities.totalFound} opportunities found`}
          />
          <div className="mt-4 space-y-4">
            {opportunities.relevant.map((opp: Opportunity, idx: number) => (
              <div key={idx} className="p-4 bg-gradient-to-r from-brand-50 to-clay-50 rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h5 className="font-semibold text-clay-900">{opp.title}</h5>
                    <p className="mt-1 text-sm text-clay-600">{opp.description}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-brand-100 text-brand-800 rounded">
                        {opp.type}
                      </span>
                      <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
                        {opp.estimatedValue}
                      </span>
                      <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-clay-100 text-clay-800 rounded">
                        {opp.deadline}
                      </span>
                    </div>
                    <a
                      href={opp.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center text-sm font-medium text-brand-600 hover:text-brand-700"
                    >
                      Learn More →
                    </a>
                  </div>
                  <div
                    className={`ml-4 px-3 py-1 text-xs font-semibold rounded ${
                      opp.priority === 'high'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {opp.priority.toUpperCase()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Configuration */}
      {status?.config && (
        <Card>
          <SectionHeader
            title="⚙️ Agent Configuration"
            subtitle="Current settings"
          />
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 bg-clay-50 rounded-lg text-center">
              <div className="text-2xl mb-1">
                {status.config.complianceMonitoring ? '✅' : '❌'}
              </div>
              <div className="text-sm font-medium text-clay-700">Compliance</div>
            </div>
            <div className="p-3 bg-clay-50 rounded-lg text-center">
              <div className="text-2xl mb-1">
                {status.config.grantDiscovery ? '✅' : '❌'}
              </div>
              <div className="text-sm font-medium text-clay-700">Grant Discovery</div>
            </div>
            <div className="p-3 bg-clay-50 rounded-lg text-center">
              <div className="text-2xl mb-1">
                {status.config.notifications ? '✅' : '❌'}
              </div>
              <div className="text-sm font-medium text-clay-700">Notifications</div>
            </div>
            <div className="p-3 bg-clay-50 rounded-lg text-center">
              <div className="text-2xl mb-1">🇦🇺</div>
              <div className="text-sm font-medium text-clay-700">{status.region}</div>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}