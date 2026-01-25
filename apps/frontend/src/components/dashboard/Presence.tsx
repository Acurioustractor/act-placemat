import { useState, useEffect } from 'react'

interface PresenceUser {
  id: string
  name: string
  avatar?: string
  status: 'active' | 'idle' | 'away'
  activity?: string
  lastSeen: Date
}

// Mock presence data - would come from WebSocket/API
const mockPresence: PresenceUser[] = [
  {
    id: '1',
    name: 'Nic',
    status: 'active',
    activity: 'reviewing Elder content',
    lastSeen: new Date(),
  },
  {
    id: '2',
    name: 'Sarah',
    status: 'active',
    activity: 'added a story 5 min ago',
    lastSeen: new Date(Date.now() - 5 * 60 * 1000),
  },
  {
    id: '3',
    name: 'Ben',
    status: 'idle',
    activity: 'viewing projects',
    lastSeen: new Date(Date.now() - 15 * 60 * 1000),
  },
]

const statusColors = {
  active: 'bg-emerald-500',
  idle: 'bg-amber-500',
  away: 'bg-slate-400',
}

interface PresenceProps {
  compact?: boolean
}

export function Presence({ compact = false }: PresenceProps) {
  const [users, setUsers] = useState<PresenceUser[]>([])
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    // TODO: Replace with WebSocket subscription
    setUsers(mockPresence)

    // Simulate real-time updates
    const interval = setInterval(() => {
      setUsers(prev =>
        prev.map(user => ({
          ...user,
          lastSeen: user.status === 'active' ? new Date() : user.lastSeen,
        }))
      )
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  const activeUsers = users.filter(u => u.status === 'active')

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {/* Stacked avatars */}
        <div className="flex -space-x-2">
          {activeUsers.slice(0, 3).map(user => (
            <div
              key={user.id}
              className="w-7 h-7 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 border-2 border-white flex items-center justify-center text-xs font-medium text-white"
              title={`${user.name} - ${user.activity}`}
            >
              {user.name.charAt(0)}
            </div>
          ))}
          {activeUsers.length > 3 && (
            <div className="w-7 h-7 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-xs font-medium text-slate-600">
              +{activeUsers.length - 3}
            </div>
          )}
        </div>

        {/* Status text */}
        {activeUsers.length > 0 && (
          <span className="text-sm text-slate-500">
            {activeUsers.length} {activeUsers.length === 1 ? 'person' : 'people'} here
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="bg-white/50 backdrop-blur-sm rounded-xl border border-slate-200/50">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex -space-x-2">
            {activeUsers.slice(0, 4).map(user => (
              <div key={user.id} className="relative">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 border-2 border-white flex items-center justify-center text-xs font-medium text-white">
                  {user.name.charAt(0)}
                </div>
                <span
                  className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${statusColors[user.status]}`}
                />
              </div>
            ))}
          </div>
          <div className="text-left">
            <p className="text-sm font-medium text-slate-700">
              {activeUsers.length} {activeUsers.length === 1 ? 'person' : 'people'} working
            </p>
            <p className="text-xs text-slate-500">You're not alone in this work</p>
          </div>
        </div>
        <svg
          className={`w-5 h-5 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded view */}
      {expanded && (
        <div className="border-t border-slate-200/50 px-4 py-3 space-y-3">
          {users.map(user => (
            <div key={user.id} className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-sm font-medium text-white">
                  {user.name.charAt(0)}
                </div>
                <span
                  className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${statusColors[user.status]}`}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-700">{user.name}</p>
                {user.activity && (
                  <p className="text-xs text-slate-500 truncate">
                    {user.status === 'active' && (
                      <span className="inline-flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        {user.activity}
                      </span>
                    )}
                    {user.status === 'idle' && <span>Idle • {user.activity}</span>}
                    {user.status === 'away' && <span>Away</span>}
                  </p>
                )}
              </div>
            </div>
          ))}

          {users.length === 0 && (
            <p className="text-sm text-slate-500 text-center py-2">
              No one else is here right now
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// Mini presence bar for top of page
export function PresenceBar() {
  const [users, setUsers] = useState<PresenceUser[]>([])

  useEffect(() => {
    setUsers(mockPresence.filter(u => u.status === 'active'))
  }, [])

  if (users.length === 0) return null

  return (
    <div className="flex items-center gap-4 text-sm text-slate-500">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span>
          {users.map((user, idx) => (
            <span key={user.id}>
              <span className="font-medium text-slate-700">{user.name}</span>
              {user.activity && <span> {user.activity}</span>}
              {idx < users.length - 1 && <span className="mx-2">•</span>}
            </span>
          ))}
        </span>
      </div>
    </div>
  )
}
