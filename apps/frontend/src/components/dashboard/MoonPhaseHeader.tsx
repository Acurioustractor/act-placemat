/**
 * MoonPhaseHeader - Moon Phase Banner with LCAA Alignment
 *
 * Shows:
 * - Current moon phase with emoji
 * - LCAA mode (Listen, Connect, Act, Amplify)
 * - Focus suggestion for the phase
 * - Days until next major phase
 *
 * Provides natural rhythm context for ACT activities
 * Connected to Command Center API via /api/moon-cycle/current
 */

import { useMoonCycle } from '../../hooks/useBrainCenter'

const LCAA_COLORS: Record<string, { bg: string; border: string; text: string; icon: string }> = {
  Listen: {
    bg: 'from-slate-900 via-slate-800 to-slate-900',
    border: 'border-slate-700',
    text: 'text-slate-200',
    icon: '👂'
  },
  Connect: {
    bg: 'from-blue-900 via-indigo-900 to-violet-900',
    border: 'border-indigo-700',
    text: 'text-blue-200',
    icon: '🤝'
  },
  Act: {
    bg: 'from-amber-800 via-orange-700 to-rose-800',
    border: 'border-orange-600',
    text: 'text-amber-100',
    icon: '⚡'
  },
  Amplify: {
    bg: 'from-violet-900 via-purple-800 to-fuchsia-900',
    border: 'border-purple-600',
    text: 'text-purple-200',
    icon: '📢'
  }
}

interface MoonPhaseHeaderProps {
  compact?: boolean
}

export function MoonPhaseHeader({ compact = false }: MoonPhaseHeaderProps) {
  const { phase, emoji, illumination, age, act, next, lcaa, loading, error, refetch } = useMoonCycle()

  if (loading) {
    return (
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-lg p-4 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-slate-700 rounded-full"></div>
          <div className="flex-1">
            <div className="h-4 bg-slate-700 rounded w-32 mb-2"></div>
            <div className="h-3 bg-slate-700 rounded w-48"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !act) {
    return (
      <div className="bg-slate-800 rounded-lg p-4 text-slate-400 text-sm">
        Moon phase unavailable
        <button onClick={refetch} className="ml-2 text-violet-400 hover:underline">
          Retry
        </button>
      </div>
    )
  }

  const mode = act.mode as keyof typeof LCAA_COLORS
  const colors = LCAA_COLORS[mode] || LCAA_COLORS.Listen

  if (compact) {
    return (
      <div className={`bg-gradient-to-r ${colors.bg} rounded-lg p-3 border ${colors.border}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{emoji}</span>
            <div>
              <div className={`text-sm font-medium ${colors.text}`}>{phase}</div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">{colors.icon} {mode}</span>
                <span className="text-xs text-slate-500">•</span>
                <span className="text-xs text-slate-400">{illumination}% lit</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-400">Full in {next?.fullMoon}d</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-gradient-to-r ${colors.bg} rounded-lg overflow-hidden border ${colors.border}`}>
      {/* Main Header */}
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            {/* Moon emoji with glow effect */}
            <div className="relative">
              <span className="text-6xl drop-shadow-lg">{emoji}</span>
              <div
                className="absolute inset-0 blur-xl opacity-30"
                style={{ fontSize: '64px', textAlign: 'center' }}
              >
                {emoji}
              </div>
            </div>

            <div>
              <div className={`text-xs font-medium uppercase tracking-wider ${colors.text} opacity-70 mb-1`}>
                {phase}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-2xl">{colors.icon}</span>
                <h2 className="text-2xl font-bold text-white">{mode} Phase</h2>
              </div>
              <p className={`mt-2 text-sm ${colors.text}`}>
                {act.focus}
              </p>
            </div>
          </div>

          {/* Moon Stats */}
          <div className="text-right">
            <div className="text-4xl font-bold text-white mb-1">{illumination}%</div>
            <div className="text-xs text-slate-400">illumination</div>
            <div className="mt-3 space-y-1">
              <div className="text-xs text-slate-400">
                Day {age?.toFixed(0)} of cycle
              </div>
              {next && (
                <div className="text-xs text-slate-400">
                  Full moon in {next.fullMoon} days
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* LCAA Phases Bar */}
      {lcaa && (
        <div className="px-6 py-4 bg-black/20 border-t border-white/10">
          <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">
            LCAA Moon Rhythm
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[
              { key: 'listen', label: 'Listen', icon: '👂' },
              { key: 'connect', label: 'Connect', icon: '🤝' },
              { key: 'act', label: 'Act', icon: '⚡' },
              { key: 'amplify', label: 'Amplify', icon: '📢' }
            ].map(({ key, label, icon }) => {
              const isActive = mode.toLowerCase() === key
              return (
                <div
                  key={key}
                  className={`p-2 rounded-lg text-center transition-all ${
                    isActive
                      ? 'bg-white/20 ring-2 ring-white/30'
                      : 'bg-white/5 opacity-60'
                  }`}
                >
                  <div className="text-lg mb-1">{icon}</div>
                  <div className={`text-xs font-medium ${isActive ? 'text-white' : 'text-slate-400'}`}>
                    {label}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Current phase detail */}
          <div className="mt-3 p-2 bg-white/10 rounded-lg">
            <div className="text-xs text-slate-300">
              {lcaa[mode.toLowerCase() as keyof typeof lcaa]}
            </div>
          </div>
        </div>
      )}

      {/* Upcoming Phases */}
      {next && (
        <div className="px-6 py-3 bg-black/30 border-t border-white/10">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">
              🌑 New Moon in {next.newMoon} days
            </span>
            <span className="text-slate-400">
              🌕 Full Moon in {next.fullMoon} days
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

export default MoonPhaseHeader
