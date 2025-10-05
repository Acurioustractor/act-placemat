import { useState } from 'react'
import { Card } from './ui/Card'

interface AgentResponse {
  success: boolean
  question: string
  answer: string
  actions: Array<{
    type: string
    description: string
  }>
  sources: {
    bankTransactions: number
    projects: number
    contacts: number
    researchUsed: boolean
  }
  metadata: {
    model: string
    tokensUsed: number
  }
}

export function AIBusinessAgent() {
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [responses, setResponses] = useState<AgentResponse[]>([])
  const [includeResearch, setIncludeResearch] = useState(false)
  const [researchMode, setResearchMode] = useState<'fast' | 'standard' | 'deep'>('standard')
  const [privacyMode, setPrivacyMode] = useState<'high' | 'medium'>('medium')

  // Quick question suggestions
  const suggestions = [
    "How is my cash flow looking?",
    "Which projects are most profitable?",
    "Do I have any missing receipts?",
    "What should I focus on financially?",
    "Show me my biggest expenses",
    "When is my BAS due?",
  ]

  const askAgent = async () => {
    if (!question.trim()) return

    setLoading(true)

    try {
      const response = await fetch('http://localhost:4000/api/v2/agent/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          question,
          includeResearch,
          researchMode,
          privacyMode
        })
      })

      const result = await response.json()

      if (result.success) {
        setResponses(prev => [result, ...prev])
        setQuestion('')
      }
    } catch (error) {
      console.error('Failed to ask AI agent:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSuggestionClick = (suggestion: string) => {
    setQuestion(suggestion)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      askAgent()
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-clay-900">🤖 AI Business Agent</h1>
        <p className="text-clay-600">
          Ask questions about your finances, projects, and business • Powered by Claude AI + Perplexity
        </p>
      </div>

      {/* How it Works */}
      <Card padding="md" className="border-2 border-blue-200 bg-blue-50">
        <div className="text-sm text-blue-900">
          <p className="font-bold">💡 What I can help with:</p>
          <div className="mt-2 space-y-1">
            <p>• Financial questions (cash flow, expenses, income)</p>
            <p>• Project profitability and tracking</p>
            <p>• Receipt and compliance reminders</p>
            <p>• Web research about business topics</p>
            <p>• Decision support and recommendations</p>
          </div>
        </div>
      </Card>

      {/* Ask Question */}
      <Card padding="lg">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-clay-900">
              Ask me anything about your business:
            </label>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="e.g., How is my cash flow looking this month?"
              className="mt-2 w-full rounded-lg border border-clay-300 p-3 focus:border-rust-500 focus:outline-none focus:ring-2 focus:ring-rust-500/20"
              rows={3}
              disabled={loading}
            />
          </div>

          <div className="space-y-4">
            {/* Research Mode Selection */}
            <div className="rounded-lg border border-clay-200 bg-clay-50 p-4">
              <div className="mb-3 text-sm font-medium text-clay-900">🔬 Research Mode:</div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setResearchMode('fast')}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    researchMode === 'fast'
                      ? 'bg-rust-600 text-white'
                      : 'bg-white text-clay-700 hover:bg-clay-100'
                  }`}
                >
                  ⚡ Fast
                  <div className="text-xs opacity-75">Claude API only</div>
                </button>
                <button
                  onClick={() => setResearchMode('standard')}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    researchMode === 'standard'
                      ? 'bg-rust-600 text-white'
                      : 'bg-white text-clay-700 hover:bg-clay-100'
                  }`}
                >
                  🎯 Standard
                  <div className="text-xs opacity-75">+ Web search</div>
                </button>
                <button
                  onClick={() => setResearchMode('deep')}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    researchMode === 'deep'
                      ? 'bg-rust-600 text-white'
                      : 'bg-white text-clay-700 hover:bg-clay-100'
                  }`}
                >
                  🧠 Deep
                  <div className="text-xs opacity-75">Multi-source research</div>
                </button>
              </div>
            </div>

            {/* Privacy Mode */}
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={privacyMode === 'high'}
                  onChange={(e) => setPrivacyMode(e.target.checked ? 'high' : 'medium')}
                  className="rounded border-clay-300"
                />
                <span className="text-sm text-clay-700">
                  🔒 High Privacy Mode (local AI only)
                </span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              onClick={askAgent}
              disabled={loading || !question.trim()}
              className="w-full rounded-lg bg-rust-600 px-6 py-3 font-medium text-white hover:bg-rust-700 disabled:bg-clay-300 disabled:cursor-not-allowed"
            >
              {loading ? 'Thinking...' : '🤖 Ask AI Agent'}
            </button>
          </div>

          {/* Suggestions */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-clay-700">Quick questions:</p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="rounded-full bg-clay-100 px-3 py-1 text-sm text-clay-700 hover:bg-clay-200"
                  disabled={loading}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Responses */}
      {responses.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-clay-900">Conversation History</h2>

          {responses.map((response, idx) => (
            <Card key={idx} padding="lg" className="border-l-4 border-rust-600">
              <div className="space-y-4">
                {/* Question */}
                <div>
                  <div className="text-sm font-medium text-clay-600">You asked:</div>
                  <div className="mt-1 text-lg font-medium text-clay-900">
                    {response.question}
                  </div>
                </div>

                {/* Answer */}
                <div>
                  <div className="text-sm font-medium text-clay-600">AI Agent:</div>
                  <div className="mt-2 whitespace-pre-wrap text-clay-900">
                    {response.answer}
                  </div>
                </div>

                {/* Actions */}
                {response.actions && response.actions.length > 0 && (
                  <div className="rounded-lg bg-orange-50 p-4">
                    <div className="text-sm font-bold text-orange-900">💡 Recommended Actions:</div>
                    <div className="mt-2 space-y-1">
                      {response.actions.map((action, actionIdx) => (
                        <div key={actionIdx} className="text-sm text-orange-800">
                          • {action.description}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sources & Metadata */}
                <div className="flex items-center justify-between border-t border-clay-200 pt-3 text-xs text-clay-600">
                  <div>
                    Sources: {response.sources.bankTransactions} transactions, {response.sources.projects} projects, {response.sources.contacts} contacts
                    {response.sources.researchUsed && ' + web research'}
                  </div>
                  <div>
                    {response.metadata.model} • {response.metadata.tokensUsed} tokens
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {responses.length === 0 && !loading && (
        <Card padding="lg" className="text-center">
          <div className="text-6xl">🤖</div>
          <h3 className="mt-4 text-lg font-bold text-clay-900">
            Ready to help!
          </h3>
          <p className="mt-2 text-clay-600">
            Ask me any question about your business finances, projects, or operations.
            <br />
            I'll analyze your data and provide insights and recommendations.
          </p>
        </Card>
      )}
    </div>
  )
}
