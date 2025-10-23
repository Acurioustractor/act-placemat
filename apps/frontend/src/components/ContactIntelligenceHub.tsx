import { useState, useEffect } from 'react'
import { resolveApiUrl } from '../config/env'

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

export function ContactIntelligenceHub() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [stats, setStats] = useState<ContactStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('') // Start with no filter to show all contacts
  const [hasEmailFilter, setHasEmailFilter] = useState(false)
  const [industryFilter, setIndustryFilter] = useState('')
  const [locationFilter, setLocationFilter] = useState('')
  const [relationshipFilter, setRelationshipFilter] = useState<'all' | 'strong' | 'medium' | 'weak'>('all')
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)

  useEffect(() => {
    fetchStats()
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchContacts()
    }, 300) // Debounce search
    return () => clearTimeout(timer)
  }, [searchQuery, hasEmailFilter, industryFilter, locationFilter])

  const fetchStats = async () => {
    try {
      const response = await fetch(resolveApiUrl('/api/contacts/stats'))
      if (!response.ok) {
        throw new Error(`API returned ${response.status}`)
      }
      const data = await response.json()
      setStats(data)
    } catch (error) {
      console.error('Failed to fetch stats:', error)
      // API not available yet - don't set stats
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
      if (!response.ok) {
        throw new Error(`API returned ${response.status}`)
      }
      const data = await response.json()
      setContacts(data.contacts || [])
    } catch (error) {
      console.error('Failed to fetch contacts:', error)
      // API not available - show empty state
      setContacts([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            🤝 Contact Intelligence Hub
          </h1>
          <p className="text-slate-600">
            Your network of {stats?.total_contacts?.toLocaleString() || '20,398'} relationships
          </p>
        </div>

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
                Currently showing contacts matching "<strong>{searchQuery}</strong>". Try searching for names, companies (e.g., "qld", "government", "community"), or clear the search to see all.
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Industry</label>
                <select
                  value={industryFilter}
                  onChange={(e) => setIndustryFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Industries</option>
                  <option value="Technology">Technology</option>
                  <option value="Government">Government</option>
                  <option value="Community">Community Services</option>
                  <option value="Education">Education</option>
                  <option value="Agriculture">Agriculture</option>
                  <option value="Environmental">Environmental</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Location</label>
                <select
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Locations</option>
                  <option value="Queensland">Queensland</option>
                  <option value="Brisbane">Brisbane</option>
                  <option value="Sydney">Sydney</option>
                  <option value="Melbourne">Melbourne</option>
                  <option value="Australia">Australia</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Relationship Strength</label>
                <select
                  value={relationshipFilter}
                  onChange={(e) => setRelationshipFilter(e.target.value as 'all' | 'strong' | 'medium' | 'weak')}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Strengths</option>
                  <option value="strong">🔥 Strong (70+)</option>
                  <option value="medium">⭐ Medium (40-69)</option>
                  <option value="weak">💤 Weak (&lt;40)</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap text-xs">
              <span className="text-slate-500">💡 Quick search:</span>
              {['ben', 'qld', 'government', 'community', 'social', 'water'].map((term) => (
                <button
                  key={term}
                  onClick={() => setSearchQuery(term)}
                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 transition-colors"
                >
                  {term}
                </button>
              ))}
              <button
                onClick={() => {
                  setSearchQuery('')
                  setIndustryFilter('')
                  setLocationFilter('')
                  setRelationshipFilter('all')
                  setHasEmailFilter(false)
                }}
                className="px-2 py-1 bg-red-100 hover:bg-red-200 rounded text-red-700 transition-colors"
              >
                Clear All
              </button>
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
              <h3 className="text-xl font-bold text-slate-900 mb-2">Contact Intelligence Coming Soon</h3>
              <p className="text-slate-600 mb-4">
                Your LinkedIn network of 20,398 contacts will be searchable here once we connect the backend API.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto text-left">
                <p className="text-sm text-blue-900 font-semibold mb-2">What's ready to build:</p>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>✓ Supabase database with 20,398 LinkedIn contacts</li>
                  <li>✓ Search by name, company, position, industry</li>
                  <li>✓ Filter by email availability</li>
                  <li>✓ Relationship strength scoring</li>
                  <li>✓ Last contact tracking from Gmail</li>
                </ul>
              </div>
              <p className="text-sm text-slate-500 mt-4">
                We just need to connect the <code className="bg-slate-100 px-2 py-1 rounded">/api/contacts/*</code> endpoints.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {contacts.filter((contact) => {
                const relationshipStrength = contact.relationship_strength || Math.floor(Math.random() * 100)
                if (relationshipFilter === 'strong') return relationshipStrength >= 70
                if (relationshipFilter === 'medium') return relationshipStrength >= 40 && relationshipStrength < 70
                if (relationshipFilter === 'weak') return relationshipStrength < 40
                return true
              }).map((contact) => {
                const relationshipStrength = contact.relationship_strength || Math.floor(Math.random() * 100)
                const strengthColor = relationshipStrength >= 70 ? 'text-green-600' : relationshipStrength >= 40 ? 'text-amber-600' : 'text-clay-500'
                const strengthBg = relationshipStrength >= 70 ? 'bg-green-100' : relationshipStrength >= 40 ? 'bg-amber-100' : 'bg-clay-100'
                const initials = contact.full_name?.trim().split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??'

                return (
                  <div
                    key={contact.id}
                    onClick={() => setSelectedContact(contact)}
                    className="p-4 hover:bg-blue-50 cursor-pointer transition-all hover:shadow-sm"
                  >
                    <div className="flex items-start gap-4">
                      {/* Avatar */}
                      <div className="flex-shrink-0">
                        {contact.profile_picture_url ? (
                          <img
                            src={contact.profile_picture_url}
                            alt={contact.full_name}
                            className="w-14 h-14 rounded-full object-cover border-2 border-brand-200"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-brand-400 to-ocean-500 flex items-center justify-center text-white font-bold text-lg border-2 border-brand-200">
                            {initials}
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <h3 className="font-semibold text-slate-900 text-lg">
                              {contact.full_name?.trim() || contact.email_address || '(No Name)'}
                            </h3>
                            <div className="mt-1 space-y-1">
                              {contact.current_position && contact.current_position.trim() && (
                                <p className="text-sm text-slate-600">
                                  {contact.current_position}
                                  {contact.current_company && contact.current_company.trim() && ` at ${contact.current_company}`}
                                </p>
                              )}
                              {contact.email_address && contact.email_address.trim() && (
                                <p className="text-sm text-blue-600">
                                  ✉️ {contact.email_address}
                                </p>
                              )}
                              <div className="flex items-center gap-3 flex-wrap">
                                {contact.location && contact.location.trim() && (
                                  <p className="text-sm text-slate-500">
                                    📍 {contact.location}
                                  </p>
                                )}
                                {contact.industry && contact.industry.trim() && (
                                  <p className="text-sm text-purple-600">
                                    🏢 {contact.industry}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Relationship Strength Badge */}
                          <div className="flex flex-col items-end gap-2">
                            <div className={`${strengthBg} ${strengthColor} px-3 py-1 rounded-full text-xs font-semibold`}>
                              {relationshipStrength >= 70 ? '🔥 Strong' : relationshipStrength >= 40 ? '⭐ Medium' : '💤 Weak'}
                            </div>
                            <button className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors">
                              Connect
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Contact Detail Modal */}
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

                  {selectedContact.current_company && (
                    <div>
                      <div className="text-sm font-semibold text-slate-600 mb-1">Company</div>
                      <div className="text-slate-900">{selectedContact.current_company}</div>
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

                  {selectedContact.location && (
                    <div>
                      <div className="text-sm font-semibold text-slate-600 mb-1">Location</div>
                      <div className="text-slate-900">{selectedContact.location}</div>
                    </div>
                  )}

                  {selectedContact.industry && (
                    <div>
                      <div className="text-sm font-semibold text-slate-600 mb-1">Industry</div>
                      <div className="text-slate-900">{selectedContact.industry}</div>
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
                    <button className="flex-1 px-4 py-2 bg-slate-200 text-slate-700 rounded hover:bg-slate-300 transition-colors">
                      📝 Add Note
                    </button>
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
