import { useState, useEffect } from 'react'
import { resolveApiUrl } from '../config/env'

interface BriefData {
  date: string
  greeting: string
  priority_actions: Array<{
    type: string
    title: string
    description: string
    urgency: 'high' | 'medium' | 'low'
  }>
  opportunities: Array<{
    title: string
    source: string
    deadline?: string
    match_score?: number
  }>
  relationship_alerts: Array<{
    contact_name: string
    last_contact: string
    days_since: number
    suggested_action: string
  }>
  calendar_today: Array<{
    time: string
    title: string
    attendees?: string[]
  }>
}

export function MorningBrief() {
  const [brief, setBrief] = useState<BriefData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchBrief()
  }, [])

  const fetchBrief = async () => {
    setLoading(true)
    try {
      const response = await fetch(resolveApiUrl('/api/intelligence/morning-brief'))
      const data = await response.json()
      setBrief(data)
    } catch (error) {
      console.error('Failed to fetch morning brief:', error)
      // Use stub data for demo
      setBrief({
        date: new Date().toLocaleDateString('en-AU', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
        greeting: 'Good morning, Ben! 🌅',
        priority_actions: [
          {
            type: 'grant',
            title: 'Regenerative Agriculture Grant - Due Tomorrow',
            description: 'Victorian Government $50K grant for soil health projects',
            urgency: 'high',
          },
          {
            type: 'follow_up',
            title: 'Follow up with Jane from Community Gardens Network',
            description: "Haven't heard back on the collaboration proposal from 2 weeks ago",
            urgency: 'medium',
          },
          {
            type: 'meeting_prep',
            title: 'Prepare for 2pm meeting with Nic',
            description: 'Monthly strategy sync - review Q4 project pipeline',
            urgency: 'medium',
          },
        ],
        opportunities: [
          {
            title: 'Community Infrastructure Fund - $100K Available',
            source: 'Federal Government',
            deadline: '2025-11-15',
            match_score: 87,
          },
          {
            title: 'Social Enterprise Support Program',
            source: 'Victorian Government',
            deadline: '2025-10-30',
            match_score: 72,
          },
        ],
        relationship_alerts: [
          {
            contact_name: 'Sarah Thompson',
            last_contact: '2025-08-15',
            days_since: 51,
            suggested_action: 'Quick check-in email about water project progress',
          },
          {
            contact_name: 'Marcus Chen',
            last_contact: '2025-09-01',
            days_since: 34,
            suggested_action: 'Share recent community impact story',
          },
        ],
        calendar_today: [
          {
            time: '10:00 AM',
            title: 'Coffee with Local Council Representative',
            attendees: ['Emma Wilson'],
          },
          {
            time: '2:00 PM',
            title: 'Monthly Strategy Sync',
            attendees: ['Nic Marchesi'],
          },
        ],
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent"></div>
          <p className="mt-4 text-slate-600">Preparing your intelligence brief...</p>
        </div>
      </div>
    )
  }

  if (!brief) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50 p-6">
        <div className="max-w-4xl mx-auto text-center py-12">
          <p className="text-slate-600">Failed to load morning brief</p>
        </div>
      </div>
    )
  }

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high':
        return 'border-l-4 border-red-500 bg-red-50'
      case 'medium':
        return 'border-l-4 border-yellow-500 bg-yellow-50'
      case 'low':
        return 'border-l-4 border-green-500 bg-green-50'
      default:
        return 'border-l-4 border-slate-500 bg-slate-50'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">{brief.greeting}</h1>
          <p className="text-slate-600">{brief.date}</p>
        </div>

        {/* Priority Actions */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">🎯 Priority Actions Today</h2>
          <div className="space-y-3">
            {(brief.priority_actions || []).map((action, idx) => (
              <div key={idx} className={`p-4 rounded-lg ${getUrgencyColor(action.urgency)}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900">{action.title}</h3>
                    <p className="text-sm text-slate-600 mt-1">{action.description}</p>
                  </div>
                  <span className="ml-4 px-2 py-1 text-xs font-semibold rounded bg-white uppercase">
                    {action.urgency}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Opportunities */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">💎 New Opportunities</h2>
          <div className="bg-white rounded-lg shadow-md divide-y divide-slate-200">
            {(brief.opportunities || []).map((opp, idx) => (
              <div key={idx} className="p-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900">{opp.title}</h3>
                    <p className="text-sm text-slate-600 mt-1">{opp.source}</p>
                    {opp.deadline && (
                      <p className="text-sm text-orange-600 mt-1">📅 Due: {opp.deadline}</p>
                    )}
                  </div>
                  {opp.match_score && (
                    <div className="ml-4 text-center">
                      <div className="text-2xl font-bold text-green-600">{opp.match_score}%</div>
                      <div className="text-xs text-slate-500">Match</div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Relationship Alerts */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">🤝 Relationship Check-ins</h2>
          <div className="bg-white rounded-lg shadow-md divide-y divide-slate-200">
            {(brief.relationship_alerts || []).map((alert, idx) => (
              <div key={idx} className="p-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900">{alert.contact_name}</h3>
                    <p className="text-sm text-slate-600 mt-1">
                      Last contact: {alert.last_contact} ({alert.days_since} days ago)
                    </p>
                    <p className="text-sm text-blue-600 mt-1">💡 {alert.suggested_action}</p>
                  </div>
                  <button className="ml-4 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors">
                    Send Email
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Calendar */}
        {brief.calendar_today && brief.calendar_today.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">📅 Today's Schedule</h2>
            <div className="bg-white rounded-lg shadow-md divide-y divide-slate-200">
              {(brief.calendar_today || []).map((event, idx) => (
                <div key={idx} className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="text-sm font-semibold text-blue-600 min-w-[80px]">
                      {event.time}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900">{event.title}</h3>
                      {event.attendees && event.attendees.length > 0 && (
                        <p className="text-sm text-slate-600 mt-1">
                          With: {event.attendees.join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
