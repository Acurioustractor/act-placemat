import { useState, useEffect } from 'react'
import { resolveApiUrl } from '../config/env'

// LinkedIn Contact Interface (existing system)
interface Contact {
  id: number
  full_name: string
  email_address: string | null
  current_company: string | null
  current_position: string | null
  location: string | null
  industry: string | null
  profile_picture_url?: string | null
  relationship_strength?: number
  last_contact_date?: string | null
}

interface ContactStats {
  total_contacts: number
  contacts_with_email: number
  contacts_without_email: number
}

// Strategic Intelligence Interfaces (new system)
interface ContactInteraction {
  project_id: string
  project_name?: string
  interaction_type: string | null
  gmail_thread_id: string | null
}

interface StrategicContact {
  person_id: string
  full_name: string
  email: string
  current_position: string | null
  current_company: string | null
  sector: string | null
  engagement_priority: 'critical' | 'high' | 'medium' | 'low'
  composite_score: number
  influence_score: number
  strategic_value_score: number
  total_interactions: number
  created_at: string
  contact_interactions?: ContactInteraction[]
}

interface TierStats {
  tier: string
  total_contacts: number
  synced_to_notion: number
  government_contacts: number
}

type TabType = 'linkedin' | 'strategic'

export function ContactIntelligenceHub() {
  const [activeTab, setActiveTab] = useState<TabType>('strategic')

  // LinkedIn Contacts State
  const [contacts, setContacts] = useState<Contact[]>([])
  const [stats, setStats] = useState<ContactStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [hasEmailFilter, setHasEmailFilter] = useState(false)
  const [industryFilter, setIndustryFilter] = useState('')
  const [locationFilter, setLocationFilter] = useState('')
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)

  // Strategic Intelligence State
  const [tierStats, setTierStats] = useState<TierStats[]>([])
  const [promotionCandidates, setPromotionCandidates] = useState<StrategicContact[]>([])
  const [strategicLoading, setStrategicLoading] = useState(true)
  const [tierFilter, setTierFilter] = useState<string>('all')
  const [promoting, setPromoting] = useState<string | null>(null)

  // Additional Strategic Intelligence Filters
  const [projectCountFilter, setProjectCountFilter] = useState<string>('all')
  const [strategicSearchQuery, setStrategicSearchQuery] = useState<string>('')

  // Fetch LinkedIn data
  useEffect(() => {
    if (activeTab === 'linkedin') {
      fetchStats()
    }
  }, [activeTab])

  useEffect(() => {
    if (activeTab === 'linkedin') {
      const timer = setTimeout(() => {
        fetchContacts()
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [searchQuery, hasEmailFilter, industryFilter, locationFilter, activeTab])

  // Fetch Strategic Intelligence data
  useEffect(() => {
    if (activeTab === 'strategic') {
      fetchStrategicIntelligence()
    }
  }, [activeTab, tierFilter])

  const fetchStats = async () => {
    try {
      const response = await fetch(resolveApiUrl('/api/contacts/stats'))
      if (!response.ok) throw new Error(`API returned ${response.status}`)
      const data = await response.json()
      setStats(data)
    } catch (error) {
      console.error('Failed to fetch stats:', error)
      setStats(null)
    }
  }

  const fetchContacts = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (searchQuery) params.append('query', searchQuery)
      if (hasEmailFilter) params.append('hasEmail', 'true')
      if (industryFilter) params.append('industry', industryFilter)
      if (locationFilter) params.append('location', locationFilter)
      params.append('limit', '50')

      const response = await fetch(resolveApiUrl(`/api/contacts/search?${params}`))
      if (!response.ok) throw new Error(`API returned ${response.status}`)
      const data = await response.json()
      setContacts(data.contacts || [])
    } catch (error) {
      console.error('Failed to fetch contacts:', error)
      setContacts([])
    } finally {
      setLoading(false)
    }
  }

  const fetchStrategicIntelligence = async () => {
    setStrategicLoading(true)
    try {
      // Fetch tier stats
      const statsResponse = await fetch(resolveApiUrl('/api/contact-intelligence/stats'))
      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setTierStats(statsData.stats || [])
      }

      // Fetch contacts by tier or promotion candidates
      let endpoint = '/api/contact-intelligence/contacts'
      if (tierFilter === 'critical') {
        endpoint = '/api/contact-intelligence/promotion-candidates'
      } else if (tierFilter !== 'all') {
        endpoint = `/api/contact-intelligence/contacts?tier=${tierFilter}`
      }

      const contactsResponse = await fetch(resolveApiUrl(endpoint))
      if (contactsResponse.ok) {
        const contactsData = await contactsResponse.json()
        setPromotionCandidates(contactsData.candidates || contactsData.contacts || [])
      }
    } catch (error) {
      console.error('Failed to fetch strategic intelligence:', error)
    } finally {
      setStrategicLoading(false)
    }
  }

  const promoteToNotion = async (personId: string) => {
    setPromoting(personId)
    try {
      const response = await fetch(resolveApiUrl(`/api/contact-intelligence/promote/${personId}`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: 'bg-fit' }) // You can make this dynamic
      })

      if (response.ok) {
        alert('Contact promoted to Notion successfully!')
        fetchStrategicIntelligence() // Refresh the list
      } else {
        alert('Failed to promote contact')
      }
    } catch (error) {
      console.error('Promotion error:', error)
      alert('Error promoting contact')
    } finally {
      setPromoting(null)
    }
  }

  const getTierColor = (tier: string) => {
    switch (tier.toLowerCase()) {
      case 'critical': return { bg: 'bg-red-100', text: 'text-red-700', icon: '🔴' }
      case 'high': return { bg: 'bg-orange-100', text: 'text-orange-700', icon: '🟠' }
      case 'medium': return { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: '🟡' }
      case 'low': return { bg: 'bg-gray-100', text: 'text-gray-700', icon: '⚪' }
      default: return { bg: 'bg-gray-100', text: 'text-gray-700', icon: '⚪' }
    }
  }

  const getTierLabel = (tier: string) => {
    switch (tier.toLowerCase()) {
      case 'critical': return 'Tier 1: Critical'
      case 'high': return 'Tier 2: High'
      case 'medium': return 'Tier 3: Medium'
      case 'low': return 'Tier 4: Low'
      default: return tier
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            🤝 Contact Intelligence Hub
          </h1>
          <p className="text-slate-600">
            Strategic contact management and relationship intelligence
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-md p-2 mb-6 flex gap-2">
          <button
            onClick={() => setActiveTab('strategic')}
            className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-all ${
              activeTab === 'strategic'
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <span className="text-xl">🎯</span>
              <span>Strategic Intelligence</span>
              <span className="text-xs opacity-75">(25 contacts)</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('linkedin')}
            className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-all ${
              activeTab === 'linkedin'
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <span className="text-xl">💼</span>
              <span>LinkedIn Network</span>
              <span className="text-xs opacity-75">(20k+)</span>
            </div>
          </button>
        </div>

        {/* Strategic Intelligence Tab */}
        {activeTab === 'strategic' && (
          <div>
            {/* Tier Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              {tierStats.map((stat) => {
                const colors = getTierColor(stat.tier)
                return (
                  <div key={stat.tier} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-medium text-slate-600">{getTierLabel(stat.tier)}</div>
                      <span className="text-2xl">{colors.icon}</span>
                    </div>
                    <div className="text-3xl font-bold text-slate-900 mb-1">
                      {stat.total_contacts}
                    </div>
                    <div className="text-xs text-slate-500">
                      {stat.synced_to_notion} synced to Notion
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Tier Filter */}
            <div className="bg-white rounded-lg shadow-md p-4 mb-6">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-slate-700">Filter by tier:</span>
                <div className="flex gap-2 flex-wrap">
                  {['all', 'critical', 'high', 'medium', 'low'].map((tier) => (
                    <button
                      key={tier}
                      onClick={() => setTierFilter(tier)}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                        tierFilter === tier
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {tier === 'all' ? 'All Tiers' : getTierLabel(tier)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Notice for Tier 1 Contacts */}
            {tierFilter === 'critical' && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <div className="text-red-600 text-xl">🎯</div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-red-900 mb-1">Tier 1: Critical Contacts - Promotion Candidates</h3>
                    <p className="text-sm text-red-800">
                      These high-value contacts (score 80+) are ready for Notion promotion. Review each contact and click "Promote to Notion" to add them to your strategic network.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Contacts Table */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              {strategicLoading ? (
                <div className="p-12 text-center text-slate-500">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
                  <p className="mt-4">Loading strategic intelligence...</p>
                </div>
              ) : promotionCandidates.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="text-6xl mb-4">🎯</div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">No contacts in this tier</h3>
                  <p className="text-slate-600">
                    Try selecting a different tier filter or run Gmail discovery on more projects.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Contact</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Projects</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Tier</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Score</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Influence</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Strategic Value</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Interactions</th>
                        {tierFilter === 'critical' && (
                          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Actions</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {promotionCandidates.map((contact) => {
                        const colors = getTierColor(contact.engagement_priority)
                        return (
                          <tr key={contact.person_id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="flex-shrink-0">
                                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                                    {contact.full_name.substring(0, 2).toUpperCase()}
                                  </div>
                                </div>
                                <div>
                                  <div className="font-semibold text-slate-900">{contact.full_name}</div>
                                  <div className="text-sm text-blue-600">{contact.email}</div>
                                  {contact.current_company && (
                                    <div className="text-xs text-slate-500">{contact.current_company}</div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              {(() => {
                                const interactions = contact.contact_interactions || [];

                                return interactions.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {interactions.map((interaction, idx) => (
                                      <a
                                        key={idx}
                                        href={`/?tab=projects&project=${interaction.project_id}`}
                                        className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold hover:bg-blue-200 transition-colors"
                                      >
                                        🏘️ {interaction.project_name || 'Unknown Project'}
                                      </a>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-xs text-slate-400">No projects</span>
                                );
                              })()}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`${colors.bg} ${colors.text} px-3 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1`}>
                                {colors.icon} {getTierLabel(contact.engagement_priority)}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <div className="text-2xl font-bold text-slate-900">{contact.composite_score}</div>
                                <div className="text-xs text-slate-500">/100</div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <div className="w-16 bg-slate-200 rounded-full h-2">
                                  <div
                                    className="bg-green-500 h-2 rounded-full"
                                    style={{ width: `${contact.influence_score}%` }}
                                  />
                                </div>
                                <span className="text-sm font-medium text-slate-700">{contact.influence_score}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <div className="w-16 bg-slate-200 rounded-full h-2">
                                  <div
                                    className="bg-purple-500 h-2 rounded-full"
                                    style={{ width: `${contact.strategic_value_score}%` }}
                                  />
                                </div>
                                <span className="text-sm font-medium text-slate-700">{contact.strategic_value_score}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-sm text-slate-700">{contact.total_interactions}</span>
                            </td>
                            {tierFilter === 'critical' && (
                              <td className="px-6 py-4">
                                <button
                                  onClick={() => promoteToNotion(contact.person_id)}
                                  disabled={promoting === contact.person_id}
                                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-semibold rounded-lg hover:shadow-lg transition-all disabled:opacity-50"
                                >
                                  {promoting === contact.person_id ? 'Promoting...' : '🚀 Promote to Notion'}
                                </button>
                              </td>
                            )}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* LinkedIn Network Tab (existing functionality) */}
        {activeTab === 'linkedin' && (
          <div>
            {/* Stats Cards */}
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="text-sm text-slate-600 mb-1">Total Contacts</div>
                  <div className="text-3xl font-bold text-blue-600">
                    {stats.total_contacts?.toLocaleString() || '0'}
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="text-sm text-slate-600 mb-1">With Email</div>
                  <div className="text-3xl font-bold text-green-600">
                    {stats.contacts_with_email?.toLocaleString() || '0'}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {stats.total_contacts && stats.contacts_with_email
                      ? ((stats.contacts_with_email / stats.total_contacts) * 100).toFixed(1)
                      : '0'}
                    % of network
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="text-sm text-slate-600 mb-1">Without Email</div>
                  <div className="text-3xl font-bold text-orange-600">
                    {stats.contacts_without_email?.toLocaleString() || '0'}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Potential for enrichment
                  </div>
                </div>
              </div>
            )}

            {/* Data Quality Notice */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <div className="text-blue-600 text-xl">ℹ️</div>
                <div className="flex-1">
                  <h3 className="font-semibold text-blue-900 mb-1">About Your LinkedIn Contact Data</h3>
                  <p className="text-sm text-blue-800">
                    Your database contains <strong>20,398 LinkedIn contacts</strong>, but many have incomplete information.
                    The Strategic Intelligence tab shows contacts discovered through Gmail project analysis with automatic tier assignments.
                  </p>
                </div>
              </div>
            </div>

            {/* Search & Filters */}
            <div className="bg-white rounded-lg shadow-md p-4 mb-6">
              <div className="flex flex-col gap-3">
                <div className="flex gap-4 items-center">
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="Search by name, company, position, industry..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={hasEmailFilter}
                      onChange={(e) => setHasEmailFilter(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-sm text-slate-700">Has Email Only</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Contacts List */}
            <div className="bg-white rounded-lg shadow-md">
              {loading ? (
                <div className="p-12 text-center text-slate-500">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
                  <p className="mt-4">Loading contacts...</p>
                </div>
              ) : contacts.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="text-6xl mb-4">🤝</div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">LinkedIn Network API Coming Soon</h3>
                  <p className="text-slate-600 mb-4">
                    Your LinkedIn network of 20,398 contacts will be searchable here once we connect the backend API.
                  </p>
                  <p className="text-sm text-slate-500 mt-4">
                    In the meantime, check out the <strong>Strategic Intelligence</strong> tab to see your Gmail-discovered contacts with automatic tier assignments!
                  </p>
                </div>
              ) : (
                <div className="p-6">
                  <p className="text-slate-600">Showing {contacts.length} contacts</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Contact Detail Modal (for LinkedIn contacts) */}
        {selectedContact && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-2xl font-bold text-slate-900">
                    {selectedContact.full_name}
                  </h2>
                  <button
                    onClick={() => setSelectedContact(null)}
                    className="text-slate-400 hover:text-slate-600 text-2xl"
                  >
                    ×
                  </button>
                </div>

                <div className="space-y-4">
                  {selectedContact.current_position && (
                    <div>
                      <div className="text-sm font-semibold text-slate-600 mb-1">Position</div>
                      <div className="text-slate-900">{selectedContact.current_position}</div>
                    </div>
                  )}

                  {selectedContact.email_address && (
                    <div>
                      <div className="text-sm font-semibold text-slate-600 mb-1">Email</div>
                      <a
                        href={`mailto:${selectedContact.email_address}`}
                        className="text-blue-600 hover:underline"
                      >
                        {selectedContact.email_address}
                      </a>
                    </div>
                  )}

                  <div className="pt-4 border-t border-slate-200 flex gap-2">
                    {selectedContact.email_address && (
                      <a
                        href={`mailto:${selectedContact.email_address}`}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white text-center rounded hover:bg-blue-700 transition-colors"
                      >
                        📧 Send Email
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
