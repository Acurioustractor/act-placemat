/**
 * Unified Intelligence Dashboard
 *
 * The brain of ACT - learns patterns across all data sources and provides
 * intelligent insights and recommendations.
 *
 * Features:
 * - Overall health score with breakdown
 * - Learned patterns visualization
 * - Actionable insights with confidence scores
 * - Relationship network graph
 * - Recommendations engine
 */

import { useState, useEffect } from 'react'
import { resolveCommandCenterUrl } from '../../config/env'

interface HealthScore {
  overall: number
  breakdown: {
    goals: number
    finances: number
    relationships: number
    communications: number
    opportunities: number
  }
}

interface Insight {
  id: string
  type: string
  title: string
  description: string
  confidence: number
  actionable: boolean
  action: string
  category: string
  created_at: string
}

interface Recommendation {
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  action: string
  impact: string
}

interface Pattern {
  [key: string]: any
}

interface IntelligenceDashboard {
  dashboard: {
    overall_health: number
    score_breakdown: HealthScore['breakdown']
    recent_insights: Insight[]
    learned_patterns_count: number
    last_scan: string
    recommendations: Recommendation[]
  }
}

interface RelationshipNode {
  id: string
  name: string
  type: string
  score: number
}

interface RelationshipLink {
  source: string
  target: string
  strength: number
}

interface RelationshipGraph {
  nodes: RelationshipNode[]
  links: RelationshipLink[]
}

const getScoreColor = (score: number) => {
  if (score >= 80) return { bg: '#dcfce7', text: '#16a34a', label: 'Healthy' }
  if (score >= 60) return { bg: '#fef3c7', text: '#d97706', label: 'Fair' }
  return { bg: '#fee2e2', text: '#dc2626', label: 'Needs Attention' }
}

const getCategoryColor = (category: string) => {
  const colors: Record<string, { bg: string; text: string }> = {
    'timing': { bg: '#dbeafe', text: '#2563eb' },
    'financial': { bg: '#dcfce7', text: '#16a34a' },
    'goal': { bg: '#fef3c7', text: '#d97706' },
    'relationship': { bg: '#f3e8ff', text: '#9333ea' },
    'opportunity': { bg: '#fce7f3', text: '#db2777' }
  }
  return colors[category] || { bg: '#f3f4f6', text: '#6b7280' }
}

const getConfidenceStars = (confidence: number) => {
  const stars = Math.round(confidence * 5)
  return '★'.repeat(stars) + '☆'.repeat(5 - stars)
}

export default function UnifiedIntelligenceDashboard() {
  const [dashboard, setDashboard] = useState<IntelligenceDashboard['dashboard'] | null>(null)
  const [patterns, setPatterns] = useState<Pattern | null>(null)
  const [relationshipGraph, setRelationshipGraph] = useState<RelationshipGraph | null>(null)
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'patterns' | 'relationships' | 'insights'>('overview')

  useEffect(() => {
    fetchDashboard()
    fetchPatterns()
    fetchRelationships()
  }, [])

  const fetchDashboard = async () => {
    try {
      const response = await fetch(resolveCommandCenterUrl('/api/intelligence/dashboard'))
      if (response.ok) {
        const data = await response.json()
        setDashboard(data.dashboard)
      }
    } catch (err) {
      console.error('Error fetching intelligence dashboard:', err)
    }
  }

  const fetchPatterns = async () => {
    try {
      const response = await fetch(resolveCommandCenterUrl('/api/intelligence/patterns'))
      if (response.ok) {
        const data = await response.json()
        setPatterns(data.patterns)
      }
    } catch (err) {
      console.error('Error fetching patterns:', err)
    }
  }

  const fetchRelationships = async () => {
    try {
      const response = await fetch(resolveCommandCenterUrl('/api/intelligence/relationships/graph'))
      if (response.ok) {
        const data = await response.json()
        setRelationshipGraph(data)
      }
    } catch (err) {
      console.error('Error fetching relationships:', err)
    }
  }

  const triggerScan = async () => {
    setScanning(true)
    try {
      const response = await fetch(resolveCommandCenterUrl('/api/intelligence/scan'), {
        method: 'POST'
      })
      if (response.ok) {
        await fetchDashboard()
        await fetchPatterns()
      }
    } catch (err) {
      console.error('Error triggering scan:', err)
    } finally {
      setScanning(false)
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '40px', fontFamily: 'Inter, sans-serif', textAlign: 'center' }}>
        <h1 style={{ fontSize: '32px', fontWeight: '700', marginBottom: '20px' }}>Unified Intelligence</h1>
        <p style={{ color: '#666' }}>Learning from your ACT data...</p>
      </div>
    )
  }

  const overallColor = getScoreColor(dashboard?.overall_health || 0)

  return (
    <div style={{ padding: '24px', fontFamily: 'Inter, sans-serif', maxWidth: '1400px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: '700', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '32px' }}>🧠</span>
            Unified Intelligence
          </h1>
          <p style={{ color: '#666' }}>
            Learning system that connects goals, finances, relationships, and opportunities
          </p>
        </div>
        <button
          onClick={triggerScan}
          disabled={scanning}
          style={{
            padding: '12px 24px',
            borderRadius: '8px',
            border: 'none',
            background: scanning ? '#9ca3af' : '#2563eb',
            color: 'white',
            fontWeight: '600',
            cursor: scanning ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          {scanning ? '🔄 Learning...' : '⚡ Trigger Learning Scan'}
        </button>
      </div>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', background: '#f3f4f6', padding: '4px', borderRadius: '8px', width: 'fit-content' }}>
        {(['overview', 'patterns', 'relationships', 'insights'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              background: activeTab === tab ? 'white' : 'transparent',
              color: activeTab === tab ? '#111827' : '#6b7280',
              fontWeight: '500',
              fontSize: '14px',
              cursor: 'pointer',
              boxShadow: activeTab === tab ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
              textTransform: 'capitalize'
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Overall Health Score */}
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '24px', alignItems: 'center', background: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #e5e7eb' }}>
            <div style={{ width: '160px', height: '160px', borderRadius: '50%', background: overallColor.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '48px', fontWeight: '700', color: overallColor.text }}>{dashboard?.overall_health || 0}</span>
              <span style={{ fontSize: '12px', color: overallColor.text, textTransform: 'uppercase' }}>Health</span>
            </div>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>ACT Intelligence Health</h2>
              <p style={{ color: '#6b7280', marginBottom: '16px' }}>Overall score based on goals, finances, relationships, communications, and opportunities</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
                {Object.entries(dashboard?.score_breakdown || {}).map(([key, value]) => {
                  const color = getScoreColor(value)
                  return (
                    <div key={key} style={{ textAlign: 'center', padding: '12px', background: color.bg, borderRadius: '8px' }}>
                      <p style={{ fontSize: '24px', fontWeight: '700', color: color.text }}>{value}</p>
                      <p style={{ fontSize: '11px', color: color.text, textTransform: 'capitalize' }}>{key}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Recommendations */}
          <div style={{ background: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #e5e7eb' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>AI Recommendations</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {dashboard?.recommendations?.map((rec, idx) => (
                <div key={idx} style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '16px',
                  padding: '16px',
                  background: rec.priority === 'high' ? '#fef2f2' : rec.priority === 'medium' ? '#fffbeb' : '#f9fafb',
                  borderRadius: '12px',
                  border: `1px solid ${rec.priority === 'high' ? '#fecaca' : rec.priority === 'medium' ? '#fde68a' : '#e5e7eb'}`
                }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: rec.priority === 'high' ? '#ef4444' : rec.priority === 'medium' ? '#f59e0b' : '#6b7280',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: '700',
                    fontSize: '14px',
                    flexShrink: 0
                  }}>
                    {idx + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        background: rec.priority === 'high' ? '#fee2e2' : rec.priority === 'medium' ? '#fef3c7' : '#f3f4f6',
                        color: rec.priority === 'high' ? '#dc2626' : rec.priority === 'medium' ? '#d97706' : '#6b7280'
                      }}>
                        {rec.priority}
                      </span>
                      <h3 style={{ fontSize: '15px', fontWeight: '600' }}>{rec.title}</h3>
                    </div>
                    <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>{rec.description}</p>
                    <p style={{ fontSize: '12px', color: '#2563eb', fontWeight: '500' }}>Impact: {rec.impact}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Patterns Tab */}
      {activeTab === 'patterns' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #e5e7eb' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Learned Patterns</h2>
            <p style={{ color: '#6b7280', marginBottom: '24px' }}>
              {dashboard?.learned_patterns_count || 0} patterns discovered from your data
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
              {/* Contact Times Pattern */}
              <div style={{ padding: '20px', background: '#f0fdf4', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>📅</span> Best Contact Times
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', fontSize: '13px' }}>
                  {patterns?.contact_times && Object.entries(patterns.contact_times).map(([day, times]: [string, any]) => (
                    <div key={day} style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ textTransform: 'capitalize', color: '#6b7280' }}>{day}</span>
                      <span style={{ fontWeight: '600', color: times.morning >= 80 ? '#16a34a' : '#6b7280' }}>{times.morning}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Goal Completion Pattern */}
              <div style={{ padding: '20px', background: '#fefce8', borderRadius: '12px', border: '1px solid '#fde047' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>🎯</span> Goal Completion
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                  {patterns?.goal_completion && Object.entries(patterns.goal_completion).map(([key, value]: [string, any]) => (
                    <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ textTransform: 'capitalize', color: '#6b7280' }}>{key.replace('_', ' ')}</span>
                      <span style={{ fontWeight: '600', color: typeof value === 'number' && value > 0.5 ? '#16a34a' : '#6b7280' }}>
                        {typeof value === 'number' ? `${Math.round(value * 100)}%` : value.boost ? `+${value.boost * 100}%` : value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Communication Effectiveness */}
              <div style={{ padding: '20px', background: '#eff6ff', borderRadius: '12px', border: '1px solid '#bfdbfe' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>💬</span> Communication Effectiveness
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                  {patterns?.comm_effectiveness && Object.entries(patterns.comm_effectiveness).map(([channel, data]: [string, any]) => (
                    <div key={channel} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ textTransform: 'capitalize', color: '#6b7280' }}>{channel}</span>
                      <span style={{ fontWeight: '600', color: '#2563eb' }}>{Math.round(data.response_rate * 100)}% response</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Opportunity Success */}
              <div style={{ padding: '20px', background: '#fdf2f8', borderRadius: '12px', border: '1px solid '#fbcfe8' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>💰</span> Opportunity Success
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                  {patterns?.opportunity_success && Object.entries(patterns.opportunity_success).map(([type, data]: [string, any]) => (
                    <div key={type} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ textTransform: 'capitalize', color: '#6b7280' }}>{type}</span>
                      <span style={{ fontWeight: '600', color: '#db2777' }}>{Math.round(data.success_rate * 100)}% avg ${(data.avg_amount / 1000).toFixed(0)}k</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Relationships Tab */}
      {activeTab === 'relationships' && (
        <div style={{ background: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #e5e7eb' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Relationship Network</h2>
          <p style={{ color: '#6b7280', marginBottom: '24px' }}>
            Visualizing connections between contacts in your network
          </p>

          {/* Simple Network Visualization */}
          <div style={{ position: 'relative', height: '400px', background: '#f9fafb', borderRadius: '12px', overflow: 'hidden' }}>
            {relationshipGraph?.nodes?.map((node, idx) => {
              // Calculate position in a circle
              const angle = (idx / (relationshipGraph.nodes.length || 1)) * 2 * Math.PI
              const radius = 120
              const cx = 250 + Math.cos(angle) * radius
              const cy = 200 + Math.sin(angle) * radius

              return (
                <div
                  key={node.id}
                  style={{
                    position: 'absolute',
                    left: cx - 40,
                    top: cy - 20,
                    padding: '8px 16px',
                    background: node.type === 'team' ? '#dbeafe' : node.type === 'partner' ? '#f3e8ff' : '#f0fdf4',
                    borderRadius: '20px',
                    border: `2px solid ${node.type === 'team' ? '#3b82f6' : node.type === 'partner' ? '#9333ea' : '#22c55e'}`,
                    fontSize: '12px',
                    fontWeight: '500',
                    zIndex: 10,
                    whiteSpace: 'nowrap'
                  }}
                >
                  {node.name}
                </div>
              )
            })}

            {/* Draw connections */}
            <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1 }}>
              {relationshipGraph?.links?.map((link, idx) => {
                const sourceIdx = relationshipGraph.nodes.findIndex(n => n.id === link.source)
                const targetIdx = relationshipGraph.nodes.findIndex(n => n.id === link.target)
                if (sourceIdx === -1 || targetIdx === -1) return null

                const angle1 = (sourceIdx / (relationshipGraph.nodes.length || 1)) * 2 * Math.PI
                const angle2 = (targetIdx / (relationshipGraph.nodes.length || 1)) * 2 * Math.PI
                const radius = 120
                const x1 = 250 + Math.cos(angle1) * radius
                const y1 = 200 + Math.sin(angle1) * radius
                const x2 = 250 + Math.cos(angle2) * radius
                const y2 = 200 + Math.sin(angle2) * radius

                return (
                  <line
                    key={idx}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="#d1d5db"
                    strokeWidth={link.strength * 4}
                    opacity={0.6}
                  />
                )
              })}
            </svg>

            {/* Center node */}
            <div style={{
              position: 'absolute',
              left: '210px',
              top: '180px',
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: '700',
              fontSize: '24px',
              zIndex: 20
            }}>
              ACT
            </div>
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', gap: '24px', marginTop: '16px', justifyContent: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#3b82f6' }} />
              <span style={{ fontSize: '13px', color: '#6b7280' }}>Team</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#9333ea' }} />
              <span style={{ fontSize: '13px', color: '#6b7280' }}>Partner</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#22c55e' }} />
              <span style={{ fontSize: '13px', color: '#6b7280' }}>Client</span>
            </div>
          </div>
        </div>
      )}

      {/* Insights Tab */}
      {activeTab === 'insights' && (
        <div style={{ background: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #e5e7eb' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Recent Insights</h2>
          <p style={{ color: '#6b7280', marginBottom: '24px' }}>
            AI-generated insights from pattern analysis
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {dashboard?.recent_insights?.map((insight) => {
              const colors = getCategoryColor(insight.category)
              return (
                <div key={insight.id} style={{
                  padding: '20px',
                  background: 'white',
                  borderRadius: '12px',
                  border: '1px solid #e5e7eb',
                  borderLeft: `4px solid ${colors.text.replace('700', '400')}`
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        background: colors.bg,
                        color: colors.text
                      }}>
                        {insight.category}
                      </span>
                      <h3 style={{ fontSize: '16px', fontWeight: '600' }}>{insight.title}</h3>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '14px', color: '#f59e0b' }}>{getConfidenceStars(insight.confidence)}</div>
                      <div style={{ fontSize: '11px', color: '#6b7280' }}>{Math.round(insight.confidence * 100)}% confidence</div>
                    </div>
                  </div>
                  <p style={{ fontSize: '14px', color: '#4b5563', marginBottom: '12px' }}>{insight.description}</p>
                  {insight.actionable && (
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 16px',
                      background: '#2563eb',
                      color: 'white',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: '500'
                    }}>
                      <span>→</span> {insight.action}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Last Scan Time */}
      <div style={{ marginTop: '24px', textAlign: 'center', color: '#9ca3af', fontSize: '12px' }}>
        Last learning scan: {dashboard?.last_scan ? new Date(dashboard.last_scan).toLocaleString() : 'Never'}
      </div>
    </div>
  )
}
