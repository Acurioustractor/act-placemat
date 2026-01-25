/**
 * LCAADashboard - LCAA Pipeline Visualization
 *
 * Shows contacts grouped by LCAA stage (Listen, Connect, Act, Amplify)
 * with relationship intelligence from Command Center API.
 *
 * LCAA Framework:
 * - Listen: New relationships, gathering understanding
 * - Connect: Building relationship, regular engagement
 * - Act: Active collaboration on projects
 * - Amplify: Strong relationships, advocacy stage
 */

import { useState, useMemo } from 'react'
import { useLCAAStages, type Relationship } from '../../hooks/useCommandCenter'

interface LCAAPhase {
  id: 'Listen' | 'Connect' | 'Act' | 'Amplify'
  name: string
  icon: string
  color: string
  bgColor: string
  borderColor: string
  textColor: string
  description: string
}

const phases: LCAAPhase[] = [
  {
    id: 'Listen',
    name: 'Listen',
    icon: '👂',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    textColor: 'text-purple-700',
    description: 'New relationships, learning',
  },
  {
    id: 'Connect',
    name: 'Connect',
    icon: '🤝',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-700',
    description: 'Building engagement',
  },
  {
    id: 'Act',
    name: 'Act',
    icon: '⚡',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    textColor: 'text-emerald-700',
    description: 'Active collaboration',
  },
  {
    id: 'Amplify',
    name: 'Amplify',
    icon: '📣',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    textColor: 'text-amber-700',
    description: 'Strong advocates',
  },
]

interface LCAACardProps {
  phase: LCAAPhase
  contacts: Relationship[]
  onClick: () => void
}

function LCAACard({ phase, contacts, onClick }: LCAACardProps) {
  // Get summary stats
  const hotCount = contacts.filter(c => c.temperature >= 70).length
  const atRiskCount = contacts.filter(c => (c.days_since_contact ?? 0) > 30).length

  // Get top 3 contacts by temperature
  const topContacts = [...contacts]
    .sort((a, b) => b.temperature - a.temperature)
    .slice(0, 3)

  return (
    <button
      onClick={onClick}
      className={`relative p-5 rounded-xl border-2 ${phase.borderColor} ${phase.bgColor} hover:shadow-md transition-all group text-left w-full`}
    >
      {/* Icon and Phase Name */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{phase.icon}</span>
          <div>
            <h3 className={`font-semibold ${phase.color}`}>{phase.name}</h3>
            <p className="text-xs text-slate-500">{phase.description}</p>
          </div>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-sm font-semibold ${phase.color} ${phase.bgColor} border ${phase.borderColor}`}>
          {contacts.length}
        </span>
      </div>

      {/* Summary stats */}
      <div className="flex items-center gap-3 mb-3 text-xs">
        {hotCount > 0 && (
          <span className="flex items-center gap-1 text-red-600">
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            {hotCount} hot
          </span>
        )}
        {atRiskCount > 0 && (
          <span className="flex items-center gap-1 text-amber-600">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            {atRiskCount} need attention
          </span>
        )}
      </div>

      {/* Top contacts */}
      <div className="space-y-2">
        {topContacts.length > 0 ? (
          topContacts.map(contact => (
            <div key={contact.id} className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  contact.temperature >= 70 ? 'bg-red-500' :
                  contact.temperature >= 40 ? 'bg-amber-500' : 'bg-blue-500'
                }`}
              />
              <span className="text-sm text-slate-700 truncate flex-1">{contact.contact_name}</span>
              {contact.days_since_contact !== null && (
                <span className={`text-xs ${
                  contact.days_since_contact > 30 ? 'text-red-500' :
                  contact.days_since_contact > 14 ? 'text-amber-500' : 'text-slate-400'
                }`}>
                  {contact.days_since_contact}d
                </span>
              )}
            </div>
          ))
        ) : (
          <p className="text-sm text-slate-400 italic">No contacts in this stage</p>
        )}
        {contacts.length > 3 && (
          <p className="text-xs text-slate-500">+{contacts.length - 3} more</p>
        )}
      </div>

      {/* Action hint */}
      <div className={`mt-4 flex items-center gap-1 text-sm ${phase.color} opacity-0 group-hover:opacity-100 transition-opacity`}>
        <span>
          {phase.id === 'Listen' && 'Learn more →'}
          {phase.id === 'Connect' && 'Engage →'}
          {phase.id === 'Act' && 'Collaborate →'}
          {phase.id === 'Amplify' && 'Celebrate →'}
        </span>
      </div>
    </button>
  )
}

interface LCAADashboardProps {
  onPhaseSelect?: (phase: LCAAPhase['id']) => void
  onContactSelect?: (contact: Relationship) => void
}

export function LCAADashboard({ onPhaseSelect, onContactSelect }: LCAADashboardProps) {
  const { stages, loading, error } = useLCAAStages()
  const [selectedPhase, setSelectedPhase] = useState<LCAAPhase['id'] | null>(null)

  // Map stages data to phases
  const phaseData = useMemo(() => {
    const map = new Map<string, Relationship[]>()
    stages.forEach(s => {
      map.set(s.stage, s.contacts)
    })
    return map
  }, [stages])

  // Get total stats
  const totalStats = useMemo(() => {
    const all = stages.flatMap(s => s.contacts)
    return {
      total: all.length,
      hot: all.filter(c => c.temperature >= 70).length,
      atRisk: all.filter(c => (c.days_since_contact ?? 0) > 30).length,
    }
  }, [stages])

  if (loading) {
    return (
      <div className="grid grid-cols-4 gap-4">
        {phases.map(phase => (
          <div
            key={phase.id}
            className={`p-5 rounded-xl border-2 ${phase.borderColor} ${phase.bgColor} animate-pulse`}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded bg-slate-200" />
              <div className="h-4 w-16 bg-slate-200 rounded" />
            </div>
            <div className="space-y-2">
              <div className="h-3 w-24 bg-slate-200 rounded" />
              <div className="h-3 w-16 bg-slate-200 rounded" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700 text-sm">Error loading LCAA data: {error}</p>
        <p className="text-red-600 text-xs mt-1">Make sure Command Center API is running on port 3456</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Relationship Pipeline</h2>
          <p className="text-sm text-slate-500">
            LCAA Method: Listen → Connect → Act → Amplify
            <span className="ml-2 text-xs">
              ({totalStats.total} contacts, {totalStats.hot} hot, {totalStats.atRisk} need attention)
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
            Live
          </span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {phases.map(phase => (
          <LCAACard
            key={phase.id}
            phase={phase}
            contacts={phaseData.get(phase.id) || []}
            onClick={() => {
              setSelectedPhase(phase.id)
              onPhaseSelect?.(phase.id)
            }}
          />
        ))}
      </div>

      {/* Selected phase detail panel */}
      {selectedPhase && (
        <div className="mt-6 bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900">
              {phases.find(p => p.id === selectedPhase)?.icon} {selectedPhase} Stage Contacts
            </h3>
            <button
              onClick={() => setSelectedPhase(null)}
              className="text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {(phaseData.get(selectedPhase) || []).map(contact => (
              <button
                key={contact.id}
                onClick={() => onContactSelect?.(contact)}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors text-left"
              >
                {/* Temperature indicator */}
                <div
                  className={`w-3 h-3 rounded-full ${
                    contact.temperature >= 70 ? 'bg-red-500' :
                    contact.temperature >= 40 ? 'bg-amber-500' : 'bg-blue-500'
                  }`}
                />

                {/* Name and email */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 truncate">{contact.contact_name}</p>
                  {contact.contact_email && (
                    <p className="text-xs text-slate-500 truncate">{contact.contact_email}</p>
                  )}
                </div>

                {/* Stats */}
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <span className="text-slate-400">Temp:</span>
                    <span className={
                      contact.temperature >= 70 ? 'text-red-600 font-medium' :
                      contact.temperature >= 40 ? 'text-amber-600 font-medium' : 'text-blue-600'
                    }>
                      {contact.temperature}
                    </span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="text-slate-400">Touch:</span>
                    <span>{contact.total_touchpoints}</span>
                  </span>
                  {contact.days_since_contact !== null && (
                    <span className={`${
                      contact.days_since_contact > 30 ? 'text-red-600 font-medium' :
                      contact.days_since_contact > 14 ? 'text-amber-600' : ''
                    }`}>
                      {contact.days_since_contact}d ago
                    </span>
                  )}
                </div>
              </button>
            ))}

            {(phaseData.get(selectedPhase) || []).length === 0 && (
              <p className="text-center text-slate-400 py-4">No contacts in this stage</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// Compact version for sidebars
export function LCAACompact({ onPhaseSelect }: LCAADashboardProps) {
  const { stages, loading } = useLCAAStages()

  if (loading) {
    return (
      <div className="space-y-2">
        {phases.map(phase => (
          <div key={phase.id} className={`p-3 rounded-lg border ${phase.borderColor} ${phase.bgColor} animate-pulse`}>
            <div className="h-4 w-20 bg-slate-200 rounded" />
          </div>
        ))}
      </div>
    )
  }

  // Build counts map
  const countsMap = new Map<string, number>()
  stages.forEach(s => countsMap.set(s.stage, s.count))

  return (
    <div className="space-y-2">
      {phases.map(phase => {
        const count = countsMap.get(phase.id) || 0
        return (
          <button
            key={phase.id}
            onClick={() => onPhaseSelect?.(phase.id)}
            className={`w-full flex items-center gap-3 p-3 rounded-lg border ${phase.borderColor} ${phase.bgColor} hover:shadow-sm transition-all`}
          >
            <span className="text-lg">{phase.icon}</span>
            <span className={`flex-1 text-sm font-medium ${phase.color}`}>{phase.name}</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${phase.color} bg-white border ${phase.borderColor}`}>
              {count}
            </span>
          </button>
        )
      })}
    </div>
  )
}
