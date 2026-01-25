import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'

interface SearchResult {
  id: string
  type: 'story' | 'project' | 'person' | 'vignette' | 'action'
  title: string
  subtitle?: string
  icon: string
}

interface QuickAction {
  id: string
  label: string
  icon: string
  shortcut?: string
}

const quickActions: QuickAction[] = [
  { id: 'add-story', label: 'Add a new story', icon: '📝', shortcut: 'S' },
  { id: 'elder-review', label: 'Review Elder queue', icon: '👴', shortcut: 'E' },
  { id: 'art-queue', label: 'View art ready for creation', icon: '🎨', shortcut: 'A' },
  { id: 'obsolescence', label: 'Check Beautiful Obsolescence progress', icon: '🌟', shortcut: 'O' },
]

const suggestedQueries = [
  'stories needing consent',
  'projects near community ownership',
  'what moved people this week',
  'Elder reviews pending',
]

// Mock recent items - would come from API
const recentItems: SearchResult[] = [
  { id: '1', type: 'story', title: 'Uncle Allan Palm Island', subtitle: 'The Harvest', icon: '📖' },
  { id: '2', type: 'vignette', title: 'Orange Sky Origins', subtitle: 'Community Voice', icon: '🎨' },
  { id: '3', type: 'project', title: 'The Harvest', subtitle: '80% community ownership', icon: '🌾' },
]

interface CommandBarProps {
  isOpen: boolean
  onClose: () => void
}

export function CommandBar({ isOpen, onClose }: CommandBarProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
      setQuery('')
      setResults([])
      setSelectedIndex(0)
    }
  }, [isOpen])

  // Search handler with debounce
  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }

    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        // TODO: Replace with actual API call
        // For now, filter mock data
        const filtered = recentItems.filter(
          item =>
            item.title.toLowerCase().includes(query.toLowerCase()) ||
            item.subtitle?.toLowerCase().includes(query.toLowerCase())
        )
        setResults(filtered)
      } finally {
        setLoading(false)
      }
    }, 150)

    return () => clearTimeout(timer)
  }, [query])

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const items = query ? results : recentItems
      const totalItems = items.length + quickActions.length

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex(i => (i + 1) % totalItems)
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex(i => (i - 1 + totalItems) % totalItems)
          break
        case 'Enter':
          e.preventDefault()
          // Handle selection
          if (selectedIndex < items.length) {
            console.log('Selected item:', items[selectedIndex])
          } else {
            console.log('Selected action:', quickActions[selectedIndex - items.length])
          }
          onClose()
          break
        case 'Escape':
          onClose()
          break
      }
    },
    [query, results, selectedIndex, onClose]
  )

  if (!isOpen) return null

  const displayItems = query ? results : recentItems

  return createPortal(
    <div className="fixed inset-0 z-50" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" />

      {/* Command Bar */}
      <div
        className="absolute top-[20%] left-1/2 -translate-x-1/2 w-full max-w-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
          {/* Search Input */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
            <svg
              className="w-5 h-5 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => {
                setQuery(e.target.value)
                setSelectedIndex(0)
              }}
              onKeyDown={handleKeyDown}
              placeholder="Search projects, stories, people, art..."
              className="flex-1 text-lg text-slate-900 placeholder:text-slate-400 outline-none bg-transparent"
            />
            <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-400 bg-slate-100 rounded border border-slate-200">
              <span className="text-base">⌘</span>K
            </kbd>
          </div>

          {/* Results Area */}
          <div className="max-h-[60vh] overflow-y-auto">
            {/* Recent / Search Results */}
            {displayItems.length > 0 && (
              <div className="p-2">
                <p className="px-3 py-2 text-xs font-medium text-slate-500 uppercase tracking-wide">
                  {query ? 'Results' : 'Recent'}
                </p>
                {displayItems.map((item, idx) => (
                  <button
                    key={item.id}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                      selectedIndex === idx
                        ? 'bg-emerald-50 text-emerald-900'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                    onClick={() => {
                      console.log('Selected:', item)
                      onClose()
                    }}
                  >
                    <span className="text-lg">{item.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{item.title}</p>
                      {item.subtitle && (
                        <p className="text-sm text-slate-500 truncate">{item.subtitle}</p>
                      )}
                    </div>
                    <span className="text-xs text-slate-400 capitalize">{item.type}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Quick Actions */}
            <div className="p-2 border-t border-slate-100">
              <p className="px-3 py-2 text-xs font-medium text-slate-500 uppercase tracking-wide">
                Quick Actions
              </p>
              {quickActions.map((action, idx) => {
                const itemIndex = displayItems.length + idx
                return (
                  <button
                    key={action.id}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                      selectedIndex === itemIndex
                        ? 'bg-emerald-50 text-emerald-900'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                    onClick={() => {
                      console.log('Action:', action)
                      onClose()
                    }}
                  >
                    <span className="text-lg">{action.icon}</span>
                    <span className="flex-1 font-medium">{action.label}</span>
                    {action.shortcut && (
                      <kbd className="px-1.5 py-0.5 text-xs font-medium text-slate-400 bg-slate-100 rounded border border-slate-200">
                        {action.shortcut}
                      </kbd>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Suggested Queries */}
            {!query && (
              <div className="p-2 border-t border-slate-100">
                <p className="px-3 py-2 text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Try
                </p>
                <div className="flex flex-wrap gap-2 px-3 pb-2">
                  {suggestedQueries.map(suggestion => (
                    <button
                      key={suggestion}
                      className="px-3 py-1.5 text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors"
                      onClick={() => setQuery(suggestion)}
                    >
                      "{suggestion}"
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Loading State */}
            {loading && (
              <div className="flex items-center justify-center py-8">
                <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {/* No Results */}
            {query && !loading && results.length === 0 && (
              <div className="text-center py-8 text-slate-500">
                <p>No results for "{query}"</p>
                <p className="text-sm mt-1">Try a different search term</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

// Hook to manage command bar state
export function useCommandBar() {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ⌘K or Ctrl+K to open
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen(true)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
  }
}
