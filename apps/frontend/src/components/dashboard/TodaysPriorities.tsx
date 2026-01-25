/**
 * TodaysPriorities - Daily Action Center Widget
 *
 * Shows:
 * - Pending agent proposals for review
 * - Quick action buttons for common tasks
 * - Today's urgent items
 * - LCAA-aligned suggestions
 *
 * The control center for daily ACT operations
 * Uses useCommandCenter hook for proposals data
 */

import { useProposals, useAttentionRequired } from '../../hooks/useCommandCenter'
import { useMoonCycle } from '../../hooks/useBrainCenter'

const RISK_COLORS: Record<string, string> = {
  low: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  medium: 'bg-amber-100 text-amber-700 border-amber-200',
  high: 'bg-red-100 text-red-700 border-red-200'
}

const ACTION_TYPE_ICONS: Record<string, string> = {
  outreach_email: '✉️',
  relationship_update: '👥',
  content_draft: '📝',
  project_update: '📊',
  notification: '🔔',
  financial: '💰',
  research: '🔍'
}

const QUICK_ACTIONS = [
  { id: 'sync-goals', label: 'Sync Goals', icon: '🎯', command: 'sync-notion-goals' },
  { id: 'check-ecosystem', label: 'Health Check', icon: '🏥', command: 'ecosystem-health' },
  { id: 'run-enrichment', label: 'Enrich Contacts', icon: '✨', command: 'contact-enrichment' },
  { id: 'generate-digest', label: 'Daily Digest', icon: '📰', command: 'daily-digest' }
]

export function TodaysPriorities() {
  const { proposals, loading: proposalsLoading, approveProposal, rejectProposal } = useProposals({ status: 'pending' })
  const { contacts: attentionContacts, loading: attentionLoading } = useAttentionRequired()
  const { act } = useMoonCycle()

  const loading = proposalsLoading || attentionLoading

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-rose-500"></div>
          <span className="text-sm text-slate-500">Loading priorities...</span>
        </div>
      </div>
    )
  }

  const pendingCount = proposals?.length || 0
  const attentionCount = attentionContacts?.length || 0

  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-rose-50 via-pink-50 to-fuchsia-50 px-6 py-4 border-b border-slate-100">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-sm text-rose-600 font-medium">Today's Focus</div>
            <h3 className="text-lg font-semibold text-slate-900">Priorities & Actions</h3>
          </div>
          <div className="flex items-center gap-2">
            {pendingCount > 0 && (
              <span className="px-2 py-1 bg-rose-100 text-rose-700 text-xs font-medium rounded-full">
                {pendingCount} pending
              </span>
            )}
            {attentionCount > 0 && (
              <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
                {attentionCount} need attention
              </span>
            )}
          </div>
        </div>
      </div>

      {/* LCAA Context */}
      {act && (
        <div className="px-6 py-3 bg-violet-50 border-b border-violet-100">
          <div className="flex items-center gap-2">
            <span className="text-lg">
              {act.mode === 'Listen' && '👂'}
              {act.mode === 'Connect' && '🤝'}
              {act.mode === 'Act' && '⚡'}
              {act.mode === 'Amplify' && '📢'}
            </span>
            <div>
              <span className="text-xs font-medium text-violet-700 uppercase tracking-wider">
                {act.mode} Phase
              </span>
              <span className="text-xs text-violet-600 ml-2">• {act.focus}</span>
            </div>
          </div>
        </div>
      )}

      {/* Agent Proposals */}
      {proposals && proposals.length > 0 && (
        <div className="px-6 py-4 border-b border-slate-100">
          <h4 className="text-sm font-medium text-slate-900 mb-3 flex items-center gap-2">
            <span className="text-rose-500">🤖</span>
            Agent Proposals
          </h4>
          <div className="space-y-3">
            {proposals.slice(0, 5).map(proposal => {
              const riskStyle = RISK_COLORS[proposal.risk_level] || RISK_COLORS.medium
              const icon = ACTION_TYPE_ICONS[proposal.action_type] || '📋'

              return (
                <div
                  key={proposal.id}
                  className="p-3 bg-slate-50 rounded-lg border border-slate-200"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-lg">{icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-slate-500 uppercase tracking-wider">
                          {proposal.agent_id}
                        </span>
                        <span className={`text-xs px-1.5 py-0.5 rounded border ${riskStyle}`}>
                          {proposal.risk_level}
                        </span>
                        {proposal.confidence_score && (
                          <span className="text-xs text-slate-400">
                            {Math.round(proposal.confidence_score * 100)}% confident
                          </span>
                        )}
                      </div>
                      <div className="text-sm font-medium text-slate-900">
                        {proposal.action_type.replace(/_/g, ' ')}
                      </div>
                      {proposal.target_name && (
                        <div className="text-xs text-slate-600 mt-0.5">
                          Target: {proposal.target_name}
                        </div>
                      )}
                      {proposal.reasoning && (
                        <div className="text-xs text-slate-500 mt-1 line-clamp-2">
                          {proposal.reasoning}
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 mt-3">
                        <button
                          onClick={() => approveProposal(proposal.id)}
                          className="px-3 py-1.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded hover:bg-emerald-200 transition-colors"
                        >
                          ✓ Approve
                        </button>
                        <button
                          onClick={() => rejectProposal(proposal.id)}
                          className="px-3 py-1.5 bg-slate-100 text-slate-600 text-xs font-medium rounded hover:bg-slate-200 transition-colors"
                        >
                          ✗ Reject
                        </button>
                        <button
                          className="px-3 py-1.5 text-slate-500 text-xs hover:text-slate-700 transition-colors"
                        >
                          View details →
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}

            {proposals.length > 5 && (
              <div className="text-center">
                <button className="text-xs text-rose-600 hover:text-rose-700 font-medium">
                  View all {proposals.length} proposals →
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Contacts Needing Attention */}
      {attentionContacts && attentionContacts.length > 0 && (
        <div className="px-6 py-4 border-b border-slate-100">
          <h4 className="text-sm font-medium text-slate-900 mb-3 flex items-center gap-2">
            <span className="text-amber-500">👥</span>
            Need Attention
          </h4>
          <div className="space-y-2">
            {attentionContacts.slice(0, 4).map(contact => (
              <div
                key={contact.id}
                className="flex items-center justify-between p-2 bg-amber-50 rounded-lg border border-amber-100"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-amber-200 rounded-full flex items-center justify-center text-amber-700 text-xs font-medium">
                    {contact.contact_name?.charAt(0) || '?'}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-900">{contact.contact_name}</div>
                    <div className="text-xs text-slate-500">
                      {contact.days_since_contact ? `${contact.days_since_contact} days since contact` : 'No recent contact'}
                    </div>
                  </div>
                </div>
                <button className="text-xs text-amber-600 hover:text-amber-700 font-medium">
                  Follow up →
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="px-6 py-4">
        <h4 className="text-sm font-medium text-slate-900 mb-3 flex items-center gap-2">
          <span className="text-blue-500">⚡</span>
          Quick Actions
        </h4>
        <div className="grid grid-cols-2 gap-2">
          {QUICK_ACTIONS.map(action => (
            <button
              key={action.id}
              className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200 hover:bg-slate-100 hover:border-slate-300 transition-colors text-left"
            >
              <span className="text-lg">{action.icon}</span>
              <span className="text-sm font-medium text-slate-700">{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Empty State */}
      {(!proposals || proposals.length === 0) && (!attentionContacts || attentionContacts.length === 0) && (
        <div className="px-6 py-8 text-center">
          <div className="text-4xl mb-2">✨</div>
          <p className="text-sm text-slate-500">All caught up!</p>
          <p className="text-xs text-slate-400 mt-1">
            No pending items need your attention
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="px-6 py-3 bg-slate-50 border-t border-slate-100">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">
            via Agent Command Center
          </span>
          <span className="text-xs text-slate-400">
            Updated just now
          </span>
        </div>
      </div>
    </div>
  )
}

export default TodaysPriorities
