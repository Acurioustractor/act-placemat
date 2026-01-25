import { useEffect, useCallback, useState } from 'react'

/**
 * Celebration System for Beautiful Obsolescence
 *
 * Research-backed:
 * - GitHub contribution graph psychology (visible progress)
 * - canvas-confetti for achievements
 * - Dopamine feedback loops for meaningful moments
 * - Celebrate community ownership milestones
 */

// Types for celebration events
type CelebrationType =
  | 'milestone-25'    // 25% community ownership
  | 'milestone-50'    // 50% community ownership
  | 'milestone-75'    // 75% community ownership
  | 'orbit-achieved'  // 100% - project fully community-owned
  | 'story-approved'  // Story got Elder approval
  | 'first-story'     // User's first story contribution

interface CelebrationConfig {
  type: CelebrationType
  title: string
  message: string
  emoji: string
  confettiConfig?: {
    particleCount: number
    spread: number
    colors?: string[]
  }
}

const celebrationConfigs: Record<CelebrationType, CelebrationConfig> = {
  'milestone-25': {
    type: 'milestone-25',
    title: 'Momentum Building',
    message: '25% community ownership achieved',
    emoji: '🌱',
    confettiConfig: { particleCount: 30, spread: 60 },
  },
  'milestone-50': {
    type: 'milestone-50',
    title: 'Halfway There',
    message: '50% community ownership - energy is shifting',
    emoji: '🔥',
    confettiConfig: { particleCount: 50, spread: 80 },
  },
  'milestone-75': {
    type: 'milestone-75',
    title: 'Almost There',
    message: '75% community ownership - orbit approaching',
    emoji: '🚀',
    confettiConfig: { particleCount: 70, spread: 100 },
  },
  'orbit-achieved': {
    type: 'orbit-achieved',
    title: 'Beautiful Obsolescence',
    message: '100% community-owned - we can step back now',
    emoji: '✨',
    confettiConfig: {
      particleCount: 150,
      spread: 180,
      colors: ['#22c55e', '#10b981', '#34d399', '#6ee7b7'],
    },
  },
  'story-approved': {
    type: 'story-approved',
    title: 'Story Approved',
    message: 'Elder review complete - ready to share',
    emoji: '👴',
    confettiConfig: { particleCount: 25, spread: 45 },
  },
  'first-story': {
    type: 'first-story',
    title: 'Welcome to the Movement',
    message: "You've contributed your first story",
    emoji: '🎉',
    confettiConfig: { particleCount: 100, spread: 120 },
  },
}

// Hook to trigger celebrations
export function useCelebration() {
  const [activeMessage, setActiveMessage] = useState<CelebrationConfig | null>(null)

  const celebrate = useCallback(async (type: CelebrationType) => {
    const config = celebrationConfigs[type]
    if (!config) return

    // Show toast message
    setActiveMessage(config)

    // Trigger confetti effect if available on window (loaded via script tag)
    // To enable confetti: npm install canvas-confetti && add to window
    // This is intentionally optional - celebrations work without it
    if (config.confettiConfig && typeof window !== 'undefined') {
      const win = window as unknown as { confetti?: (opts: Record<string, unknown>) => void }
      if (win.confetti) {
        win.confetti({
          particleCount: config.confettiConfig.particleCount,
          spread: config.confettiConfig.spread,
          colors: config.confettiConfig.colors,
          origin: { y: 0.6 },
          disableForReducedMotion: true,
        })
      }
    }

    // Auto-dismiss after 4 seconds
    setTimeout(() => setActiveMessage(null), 4000)
  }, [])

  return { celebrate, activeMessage, dismissMessage: () => setActiveMessage(null) }
}

// Toast component for celebration messages
interface CelebrationToastProps {
  config: CelebrationConfig
  onDismiss: () => void
}

export function CelebrationToast({ config, onDismiss }: CelebrationToastProps) {
  return (
    <div
      className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300"
      role="alert"
      aria-live="polite"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 p-4 pr-12 max-w-sm">
        <button
          onClick={onDismiss}
          className="absolute top-3 right-3 w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-200 transition-colors"
          aria-label="Dismiss"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center text-2xl">
            {config.emoji}
          </div>
          <div>
            <h4 className="font-semibold text-slate-900">{config.title}</h4>
            <p className="text-sm text-slate-600 mt-0.5">{config.message}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// Progress ring component for Beautiful Obsolescence
interface ProgressRingProps {
  progress: number // 0-100
  size?: number
  strokeWidth?: number
  className?: string
}

export function ProgressRing({
  progress,
  size = 120,
  strokeWidth = 8,
  className = '',
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (progress / 100) * circumference

  // Color transitions based on progress
  const getColor = () => {
    if (progress >= 100) return '#22c55e' // Green - orbit achieved
    if (progress >= 75) return '#10b981'  // Emerald
    if (progress >= 50) return '#8b5cf6'  // Violet
    if (progress >= 25) return '#6366f1'  // Indigo
    return '#94a3b8' // Slate
  }

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        {/* Background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={strokeWidth}
        />
        {/* Progress ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={getColor()}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-slate-900">{progress}%</span>
        <span className="text-xs text-slate-500">Community</span>
      </div>
    </div>
  )
}

// Journey indicator (stages of Beautiful Obsolescence)
const stages = [
  { id: 'discovery', emoji: '🔍', label: 'Discovery', threshold: 0 },
  { id: 'ignition', emoji: '🚀', label: 'Ignition', threshold: 25 },
  { id: 'thrust', emoji: '🔥', label: 'Thrust', threshold: 50 },
  { id: 'trajectory', emoji: '🌟', label: 'Trajectory', threshold: 75 },
  { id: 'orbit', emoji: '✨', label: 'Orbit', threshold: 100 },
]

interface JourneyIndicatorProps {
  progress: number
  className?: string
}

export function JourneyIndicator({ progress, className = '' }: JourneyIndicatorProps) {
  const currentStageIndex = stages.findIndex((s, i) => {
    const nextThreshold = stages[i + 1]?.threshold ?? 101
    return progress >= s.threshold && progress < nextThreshold
  })

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {stages.map((stage, index) => {
        const isComplete = progress >= stage.threshold
        const isCurrent = index === currentStageIndex

        return (
          <div key={stage.id} className="flex items-center">
            <div
              className={`
                w-8 h-8 rounded-full flex items-center justify-center text-sm
                transition-all duration-300
                ${isCurrent ? 'ring-2 ring-violet-400 ring-offset-2' : ''}
                ${isComplete ? 'bg-emerald-100' : 'bg-slate-100'}
              `}
              title={`${stage.label} (${stage.threshold}%)`}
            >
              {stage.emoji}
            </div>
            {index < stages.length - 1 && (
              <div
                className={`
                  w-6 h-0.5 mx-1 transition-colors duration-300
                  ${progress > stage.threshold ? 'bg-emerald-300' : 'bg-slate-200'}
                `}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
