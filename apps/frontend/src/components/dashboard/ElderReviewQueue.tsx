import { useState, useEffect } from 'react'

interface ElderReviewItem {
  id: string
  title: string
  type: 'story' | 'vignette' | 'content'
  project: string
  submittedAt: string
  submittedBy: string
  isSacred: boolean
  urgency: 'normal' | 'pending-share' | 'blocking'
}

// Mock data - would come from API
const mockItems: ElderReviewItem[] = [
  {
    id: '1',
    title: 'Uncle Allan - Palm Island Journey',
    type: 'story',
    project: 'The Harvest',
    submittedAt: '2024-01-15',
    submittedBy: 'Sarah',
    isSacred: true,
    urgency: 'blocking',
  },
  {
    id: '2',
    title: 'Mingaminga Cultural Ceremony',
    type: 'vignette',
    project: 'Mingaminga Rangers',
    submittedAt: '2024-01-14',
    submittedBy: 'Nic',
    isSacred: true,
    urgency: 'pending-share',
  },
  {
    id: '3',
    title: 'Community Garden Story',
    type: 'content',
    project: "June's Patch",
    submittedAt: '2024-01-13',
    submittedBy: 'Ben',
    isSacred: false,
    urgency: 'normal',
  },
]

const typeIcons = {
  story: '📖',
  vignette: '🎨',
  content: '📝',
}

const urgencyStyles = {
  normal: 'bg-slate-50 border-slate-200',
  'pending-share': 'bg-amber-50 border-amber-200',
  blocking: 'bg-red-50 border-red-200',
}

interface ElderReviewQueueProps {
  compact?: boolean
  onReviewItem?: (itemId: string) => void
}

export function ElderReviewQueue({ compact = false, onReviewItem }: ElderReviewQueueProps) {
  const [items, setItems] = useState<ElderReviewItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // TODO: Replace with API call
    const fetchItems = async () => {
      await new Promise(resolve => setTimeout(resolve, 300))
      setItems(mockItems)
      setLoading(false)
    }
    fetchItems()
  }, [])

  const sacredCount = items.filter(i => i.isSacred).length
  const blockingCount = items.filter(i => i.urgency === 'blocking').length

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-5 border border-amber-200 animate-pulse">
        <div className="h-5 w-32 bg-amber-200 rounded mb-4" />
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-12 bg-amber-100 rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-5 border border-emerald-200">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl">👴</span>
          <h3 className="font-semibold text-slate-900">Elder Review</h3>
        </div>
        <p className="text-sm text-emerald-700">
          ✓ All content has been reviewed. Cultural protocols honored.
        </p>
      </div>
    )
  }

  if (compact) {
    return (
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-5 border border-amber-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">👴</span>
            <h3 className="font-semibold text-slate-900">Elder Review</h3>
          </div>
          <span className="px-2 py-0.5 text-xs font-semibold text-amber-700 bg-amber-100 rounded-full">
            {items.length} pending
          </span>
        </div>

        {/* Warning for sacred content */}
        {sacredCount > 0 && (
          <div className="flex items-center gap-2 text-xs text-amber-800 mb-3 p-2 bg-amber-100 rounded-lg">
            <span>⚠️</span>
            <span>{sacredCount} items contain sacred content</span>
          </div>
        )}

        {/* Quick list */}
        <div className="space-y-2">
          {items.slice(0, 3).map(item => (
            <button
              key={item.id}
              onClick={() => onReviewItem?.(item.id)}
              className={`w-full flex items-center gap-2 p-2 rounded-lg border text-left ${urgencyStyles[item.urgency]} hover:shadow-sm transition-all`}
            >
              <span>{typeIcons[item.type]}</span>
              <span className="flex-1 text-sm font-medium text-slate-700 truncate">
                {item.title}
              </span>
              {item.isSacred && <span className="text-xs">🔒</span>}
            </button>
          ))}
        </div>

        {items.length > 3 && (
          <button className="w-full mt-3 text-sm text-amber-700 hover:text-amber-900 font-medium">
            View all {items.length} items →
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl overflow-hidden border border-amber-200">
      {/* Header */}
      <div className="px-6 py-4 bg-amber-100/50 border-b border-amber-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-200 flex items-center justify-center">
              <span className="text-xl">👴</span>
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">Elder Review Queue</h2>
              <p className="text-sm text-amber-700">
                Cultural protocol requires Elder approval before sharing
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 text-sm font-semibold text-amber-800 bg-amber-200 rounded-full">
              {items.length} pending
            </span>
          </div>
        </div>
      </div>

      {/* Warnings */}
      {(sacredCount > 0 || blockingCount > 0) && (
        <div className="px-6 py-3 bg-amber-100/30 border-b border-amber-200 flex items-center gap-4">
          {sacredCount > 0 && (
            <span className="flex items-center gap-1.5 text-sm text-amber-800">
              <span>🔒</span>
              {sacredCount} sacred content items
            </span>
          )}
          {blockingCount > 0 && (
            <span className="flex items-center gap-1.5 text-sm text-red-700">
              <span>⚠️</span>
              {blockingCount} blocking publication
            </span>
          )}
        </div>
      )}

      {/* Items */}
      <div className="p-4 space-y-3">
        {items.map(item => (
          <div
            key={item.id}
            className={`p-4 rounded-xl border ${urgencyStyles[item.urgency]} hover:shadow-md transition-all cursor-pointer`}
            onClick={() => onReviewItem?.(item.id)}
          >
            <div className="flex items-start gap-3">
              <span className="text-xl">{typeIcons[item.type]}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-slate-900 truncate">{item.title}</h4>
                  {item.isSacred && (
                    <span className="px-1.5 py-0.5 text-xs font-medium text-amber-700 bg-amber-100 rounded">
                      🔒 Sacred
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-500">
                  {item.project} • Submitted by {item.submittedBy}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                {item.urgency === 'blocking' && (
                  <span className="px-2 py-0.5 text-xs font-medium text-red-700 bg-red-100 rounded">
                    Blocking
                  </span>
                )}
                {item.urgency === 'pending-share' && (
                  <span className="px-2 py-0.5 text-xs font-medium text-amber-700 bg-amber-100 rounded">
                    Pending Share
                  </span>
                )}
                <button className="text-sm font-medium text-amber-700 hover:text-amber-900">
                  Review →
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 bg-amber-100/30 border-t border-amber-200">
        <p className="text-xs text-amber-800 text-center">
          Cultural sovereignty is sacred. Elder review ensures OCAP compliance and community consent.
        </p>
      </div>
    </div>
  )
}

// Badge for navigation/header
export function ElderReviewBadge() {
  const count = mockItems.length
  const hasBlocking = mockItems.some(i => i.urgency === 'blocking')

  if (count === 0) return null

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
      hasBlocking
        ? 'bg-red-100 text-red-700'
        : 'bg-amber-100 text-amber-700'
    }`}>
      <span>👴</span>
      {count}
      {hasBlocking && <span>⚠️</span>}
    </span>
  )
}
