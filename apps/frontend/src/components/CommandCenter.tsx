import { useState, useEffect } from 'react'
import { Card } from './ui/Card'
import { Pill } from './ui/Pill'

interface GmailAccount {
  email: string
  received: number
  sent: number
  unread: number
}

interface GmailStats {
  accounts: GmailAccount[]
  totals: {
    received: number
    sent: number
    unread: number
    threads: number
  }
}

interface GHLContact {
  id: string
  contactName: string
  firstName: string
  lastName: string | null
  email: string
  phone: string | null
  type: string
  source: string
  dateAdded: string
  tags: string[]
}

interface IntegrationStatus {
  integrations: Record<string, {
    available: boolean
    status: string
    endpoints: string[]
  }>
  available_services: number
  total_services: number
}

export function CommandCenter() {
  const [loading, setLoading] = useState(true)
  const [gmailStats, setGmailStats] = useState<GmailStats | null>(null)
  const [contacts, setContacts] = useState<GHLContact[]>([])
  const [contactsTotal, setContactsTotal] = useState(0)
  const [integrationStatus, setIntegrationStatus] = useState<IntegrationStatus | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'email' | 'contacts' | 'search'>('overview')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    setLoading(true)
    try {
      // Initialize Gmail workspace and load data in parallel
      const [statusRes, gmailInit] = await Promise.all([
        fetch('/api/v1/integrations/status'),
        fetch('/api/v1/integrations/gmail/workspace/initialize', { method: 'POST' })
      ])

      const statusData = await statusRes.json()
      if (statusData.success) {
        setIntegrationStatus(statusData)
      }

      // Load Gmail stats and contacts
      const [gmailStatsRes, contactsRes] = await Promise.all([
        fetch('/api/v1/integrations/gmail/workspace/stats'),
        fetch('/api/v1/integrations/ghl/contacts?limit=20')
      ])

      const gmailData = await gmailStatsRes.json()
      if (gmailData.success) {
        setGmailStats(gmailData.data)
      }

      const contactsData = await contactsRes.json()
      if (contactsData.success) {
        setContacts(contactsData.data.contacts)
        setContactsTotal(contactsData.data.meta?.total || contactsData.data.count)
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    setSearching(true)
    try {
      const res = await fetch(`/api/v1/integrations/gmail/workspace/search?q=${encodeURIComponent(searchQuery)}&maxResults=20`)
      const data = await res.json()
      if (data.success) {
        setSearchResults(data.data.results || [])
      }
    } catch (error) {
      console.error('Search failed:', error)
    } finally {
      setSearching(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-clay-50 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600 mx-auto mb-4" />
          <p className="text-clay-600">Loading Command Center...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-clay-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-clay-900">Command Center</h1>
            <p className="text-clay-600 mt-1">Unified view of all ACT communications and relationships</p>
          </div>
          <div className="flex items-center gap-2">
            <Pill variant="green">
              {integrationStatus?.available_services || 0}/{integrationStatus?.total_services || 0} Services Active
            </Pill>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 border-b border-clay-200 pb-2">
          {[
            { id: 'overview', label: 'Overview', icon: '📊' },
            { id: 'email', label: 'Email Intelligence', icon: '📧' },
            { id: 'contacts', label: 'CRM Contacts', icon: '👥' },
            { id: 'search', label: 'Search All', icon: '🔍' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-brand-600 text-white'
                  : 'bg-white text-clay-600 hover:bg-clay-100'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Integration Status Cards */}
            {integrationStatus && Object.entries(integrationStatus.integrations).map(([name, status]) => (
              <Card key={name} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-clay-900 capitalize">{name}</h3>
                  <span className={`w-3 h-3 rounded-full ${status.available ? 'bg-green-500' : 'bg-clay-300'}`} />
                </div>
                <p className="text-sm text-clay-600">{status.status}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {status.endpoints.slice(0, 3).map(endpoint => (
                    <span key={endpoint} className="text-xs bg-clay-100 px-2 py-0.5 rounded">
                      {endpoint}
                    </span>
                  ))}
                </div>
              </Card>
            ))}

            {/* Quick Stats */}
            <Card className="p-4 bg-gradient-to-br from-brand-50 to-ocean-50">
              <h3 className="font-semibold text-clay-900 mb-2">📧 Email Activity</h3>
              <div className="space-y-1">
                <p className="text-2xl font-bold text-brand-600">{gmailStats?.totals.unread || 0}</p>
                <p className="text-sm text-clay-600">Unread messages</p>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-clay-600">Received</p>
                  <p className="font-semibold">{gmailStats?.totals.received || 0}</p>
                </div>
                <div>
                  <p className="text-clay-600">Sent</p>
                  <p className="font-semibold">{gmailStats?.totals.sent || 0}</p>
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-gradient-to-br from-sunset-50 to-brand-50">
              <h3 className="font-semibold text-clay-900 mb-2">👥 CRM Contacts</h3>
              <div className="space-y-1">
                <p className="text-2xl font-bold text-sunset-600">{contactsTotal.toLocaleString()}</p>
                <p className="text-sm text-clay-600">Total contacts in GHL</p>
              </div>
            </Card>

            <Card className="p-4 bg-gradient-to-br from-ocean-50 to-brand-50">
              <h3 className="font-semibold text-clay-900 mb-2">📬 Workspace Accounts</h3>
              <div className="space-y-1">
                <p className="text-2xl font-bold text-ocean-600">{gmailStats?.accounts.length || 0}</p>
                <p className="text-sm text-clay-600">Connected mailboxes</p>
              </div>
            </Card>
          </div>
        )}

        {/* Email Intelligence Tab */}
        {activeTab === 'email' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {gmailStats?.accounts.map(account => (
                <Card key={account.email} className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 font-semibold">
                      {account.email.charAt(0).toUpperCase()}
                    </span>
                    <div>
                      <p className="font-medium text-clay-900 text-sm">{account.email}</p>
                      <p className="text-xs text-clay-500">@act.place</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-lg font-bold text-clay-900">{account.received}</p>
                      <p className="text-xs text-clay-500">Received</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-clay-900">{account.sent}</p>
                      <p className="text-xs text-clay-500">Sent</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-brand-600">{account.unread}</p>
                      <p className="text-xs text-clay-500">Unread</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <Card className="p-6">
              <h3 className="font-semibold text-clay-900 mb-4">Email Activity Summary</h3>
              <div className="grid grid-cols-4 gap-6">
                <div className="text-center p-4 bg-clay-50 rounded-lg">
                  <p className="text-3xl font-bold text-clay-900">{gmailStats?.totals.received || 0}</p>
                  <p className="text-sm text-clay-600">Total Received</p>
                </div>
                <div className="text-center p-4 bg-clay-50 rounded-lg">
                  <p className="text-3xl font-bold text-clay-900">{gmailStats?.totals.sent || 0}</p>
                  <p className="text-sm text-clay-600">Total Sent</p>
                </div>
                <div className="text-center p-4 bg-brand-50 rounded-lg">
                  <p className="text-3xl font-bold text-brand-600">{gmailStats?.totals.unread || 0}</p>
                  <p className="text-sm text-clay-600">Unread</p>
                </div>
                <div className="text-center p-4 bg-ocean-50 rounded-lg">
                  <p className="text-3xl font-bold text-ocean-600">
                    {(gmailStats?.totals.received || 0) + (gmailStats?.totals.sent || 0)}
                  </p>
                  <p className="text-sm text-clay-600">Total Activity</p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* CRM Contacts Tab */}
        {activeTab === 'contacts' && (
          <div className="space-y-4">
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-clay-900">Recent Contacts ({contactsTotal.toLocaleString()} total)</h3>
                <Pill variant="brand">GoHighLevel CRM</Pill>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-sm text-clay-600 border-b border-clay-200">
                      <th className="pb-2 font-medium">Name</th>
                      <th className="pb-2 font-medium">Email</th>
                      <th className="pb-2 font-medium">Type</th>
                      <th className="pb-2 font-medium">Source</th>
                      <th className="pb-2 font-medium">Added</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contacts.map(contact => (
                      <tr key={contact.id} className="border-b border-clay-100 hover:bg-clay-50">
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <span className="w-8 h-8 rounded-full bg-sunset-100 flex items-center justify-center text-sunset-600 font-semibold text-sm">
                              {(contact.firstName || contact.contactName || '?').charAt(0).toUpperCase()}
                            </span>
                            <span className="font-medium text-clay-900">
                              {contact.firstName} {contact.lastName || ''}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 text-sm text-clay-600">{contact.email}</td>
                        <td className="py-3">
                          <span className="text-xs px-2 py-1 rounded bg-clay-100 text-clay-700 capitalize">
                            {contact.type}
                          </span>
                        </td>
                        <td className="py-3 text-sm text-clay-600">{contact.source}</td>
                        <td className="py-3 text-sm text-clay-500">
                          {new Date(contact.dateAdded).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* Search Tab */}
        {activeTab === 'search' && (
          <div className="space-y-4">
            <Card className="p-4">
              <h3 className="font-semibold text-clay-900 mb-4">Search Across All Mailboxes</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Search emails across all @act.place accounts..."
                  className="flex-1 px-4 py-2 border border-clay-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <button
                  onClick={handleSearch}
                  disabled={searching}
                  className="px-6 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50"
                >
                  {searching ? 'Searching...' : 'Search'}
                </button>
              </div>
            </Card>

            {searchResults.length > 0 && (
              <Card className="p-4">
                <h3 className="font-semibold text-clay-900 mb-4">
                  Search Results ({searchResults.length})
                </h3>
                <div className="space-y-3">
                  {searchResults.map((result, idx) => (
                    <div key={idx} className="p-3 bg-clay-50 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-clay-900">{result.subject || 'No subject'}</span>
                        <span className="text-xs text-clay-500">{result.account}</span>
                      </div>
                      <p className="text-sm text-clay-600">{result.from}</p>
                      <p className="text-xs text-clay-500 mt-1">{result.snippet}</p>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
