import { Icons } from './types'

interface TheShiftProps {
  progress: number // 0-100
}

const stages = [
  { label: 'Normal', position: 0 },
  { label: "ACT's Normal", position: 25 },
  { label: "Witta's Normal", position: 50 },
  { label: "World's Normal", position: 75 },
  { label: 'Outside Limitation', position: 100 },
]

export function TheShift({ progress }: TheShiftProps) {
  const clampedProgress = Math.min(100, Math.max(0, progress))

  // Determine current stage
  const currentStageIndex = stages.findIndex((s, i) => {
    const next = stages[i + 1]
    return next ? progress < next.position : true
  })

  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-6 text-white">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-emerald-400">
          {Icons.shift}
        </div>
        <div>
          <h2 className="text-lg font-semibold">The Shift</h2>
          <p className="text-sm text-slate-400">Movement toward liberation</p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-2xl font-bold text-emerald-400">{clampedProgress}%</p>
          <p className="text-xs text-slate-400">{stages[currentStageIndex]?.label}</p>
        </div>
      </div>

      {/* Progress Visualization */}
      <div className="relative mt-6 mb-8">
        {/* Background track */}
        <div className="h-3 bg-slate-700 rounded-full" />

        {/* Progress fill */}
        <div
          className="absolute top-0 h-3 bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
          style={{ width: `${clampedProgress}%` }}
        />

        {/* Stage markers */}
        {stages.map((stage, idx) => (
          <div
            key={idx}
            className="absolute -translate-x-1/2"
            style={{ left: `${stage.position}%`, top: '-8px' }}
          >
            <div
              className={`w-5 h-5 rounded-full border-2 transition-colors ${
                progress >= stage.position
                  ? 'bg-emerald-400 border-emerald-300'
                  : 'bg-slate-600 border-slate-500'
              }`}
            />
          </div>
        ))}

        {/* Stage labels */}
        <div className="flex justify-between mt-6 text-xs">
          {stages.map((stage, idx) => (
            <div
              key={idx}
              className={`text-center transition-colors ${
                progress >= stage.position ? 'text-slate-300' : 'text-slate-500'
              }`}
              style={{
                width: '20%',
                transform: idx === 0 ? 'translateX(-10%)' : idx === stages.length - 1 ? 'translateX(10%)' : 'none'
              }}
            >
              {stage.label}
            </div>
          ))}
        </div>
      </div>

      {/* Stage Description */}
      <div className="bg-white/5 rounded-lg p-4 mt-4">
        <p className="text-sm text-slate-300">
          <span className="text-emerald-400 font-medium">Current phase: </span>
          {currentStageIndex === 0 && "Establishing ACT's way of doing things differently"}
          {currentStageIndex === 1 && "Our methods becoming normal within ACT community"}
          {currentStageIndex === 2 && "Witta community adopting regenerative practices"}
          {currentStageIndex === 3 && "Methods spreading beyond our immediate community"}
          {currentStageIndex === 4 && "Operating beyond conventional limitations"}
        </p>
      </div>

      {/* Evidence Indicators */}
      <div className="grid grid-cols-4 gap-3 mt-4">
        <div className="text-center p-3 bg-white/5 rounded-lg">
          <p className="text-lg font-semibold text-emerald-400">3</p>
          <p className="text-xs text-slate-400">Ready handovers</p>
        </div>
        <div className="text-center p-3 bg-white/5 rounded-lg">
          <p className="text-lg font-semibold text-teal-400">70</p>
          <p className="text-xs text-slate-400">Active projects</p>
        </div>
        <div className="text-center p-3 bg-white/5 rounded-lg">
          <p className="text-lg font-semibold text-cyan-400">239</p>
          <p className="text-xs text-slate-400">Storytellers</p>
        </div>
        <div className="text-center p-3 bg-white/5 rounded-lg">
          <p className="text-lg font-semibold text-blue-400">100%</p>
          <p className="text-xs text-slate-400">Protocol compliance</p>
        </div>
      </div>
    </div>
  )
}
