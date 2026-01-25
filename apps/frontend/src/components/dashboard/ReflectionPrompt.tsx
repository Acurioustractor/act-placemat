import { useState } from 'react'

interface Question {
  id: string
  label: string
}

interface ReflectionPromptProps {
  horizon: 'week' | 'month' | 'year'
  questions: Question[]
}

const horizonStyles = {
  week: {
    bg: 'from-amber-50 to-white',
    border: 'border-amber-100',
    accent: 'text-amber-700',
    button: 'bg-amber-100 hover:bg-amber-200 text-amber-800',
    input: 'focus:border-amber-300 focus:ring-amber-100',
  },
  month: {
    bg: 'from-blue-50 to-white',
    border: 'border-blue-100',
    accent: 'text-blue-700',
    button: 'bg-blue-100 hover:bg-blue-200 text-blue-800',
    input: 'focus:border-blue-300 focus:ring-blue-100',
  },
  year: {
    bg: 'from-purple-50 to-white',
    border: 'border-purple-100',
    accent: 'text-purple-700',
    button: 'bg-purple-100 hover:bg-purple-200 text-purple-800',
    input: 'focus:border-purple-300 focus:ring-purple-100',
  },
}

export function ReflectionPrompt({ horizon, questions }: ReflectionPromptProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState(false)
  const styles = horizonStyles[horizon]

  const handleSave = () => {
    // In production, this would save to API
    console.log('Saving reflections:', { horizon, answers })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const horizonLabels = {
    week: 'Weekly',
    month: 'Monthly',
    year: 'Yearly',
  }

  return (
    <div className={`bg-gradient-to-br ${styles.bg} rounded-xl p-6 border ${styles.border}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className={`font-semibold ${styles.accent}`}>{horizonLabels[horizon]} Reflection</h3>
        {saved && (
          <span className="text-xs text-emerald-600 font-medium">Saved!</span>
        )}
      </div>

      <div className="space-y-4">
        {questions.map((q) => (
          <div key={q.id}>
            <label className="block text-sm text-slate-700 mb-2 font-medium">
              "{q.label}"
            </label>
            <textarea
              value={answers[q.id] || ''}
              onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
              className={`w-full px-3 py-2 text-sm border border-slate-200 rounded-lg resize-none ${styles.input} focus:outline-none focus:ring-2`}
              rows={3}
              placeholder="Reflect..."
            />
          </div>
        ))}
      </div>

      <button
        onClick={handleSave}
        disabled={Object.values(answers).every(v => !v)}
        className={`w-full mt-4 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${styles.button} disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        Save Reflection
      </button>
    </div>
  )
}
