import React, { useState, useEffect } from 'react';
import { ExternalLink, TrendingUp, Users, Target, Filter } from 'lucide-react';

interface EnrichedContact {
  id: string;
  full_name: string;
  email_address: string;
  current_company: string;
  current_position: string;
  industry: string;
  location: string;
  linkedin_url: string;
  bio: string;
  strategic_value: 'high' | 'medium' | 'low';
  relationship_score: number;
  exa_confidence_score: number;
  exa_last_enriched: string;
}

interface Stats {
  total_contacts: number;
  enriched: number;
  with_linkedin: number;
  high_value: number;
  enrichment_rate: string;
  linkedin_rate: string;
}

export default function EnrichedContactsDashboard() {
  const [contacts, setContacts] = useState<EnrichedContact[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [sortBy, setSortBy] = useState<'strategic_value' | 'confidence' | 'recent'>('strategic_value');

  useEffect(() => {
    fetchStats();
    fetchContacts();
  }, [filter, sortBy]);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/enriched-contacts/stats');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchContacts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        limit: '50',
        sort_by: sortBy,
        ...(filter !== 'all' && { strategic_value: filter })
      });

      const response = await fetch(`/api/enriched-contacts?${params}`);
      const data = await response.json();
      setContacts(data.contacts);
    } catch (error) {
      console.error('Error fetching contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const getValueBadgeColor = (value: string) => {
    switch (value) {
      case 'high': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Enriched Contacts Intelligence
        </h1>
        <p className="text-gray-600">
          AI-powered contact enrichment via Exa.ai
        </p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-500 text-sm">Total Contacts</span>
              <Users className="w-5 h-5 text-blue-500" />
            </div>
            <div className="text-2xl font-bold">{stats.total_contacts.toLocaleString()}</div>
            <div className="text-xs text-green-600 mt-1">
              {stats.enrichment_rate}% enriched
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-500 text-sm">Enriched</span>
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            <div className="text-2xl font-bold">{stats.enriched.toLocaleString()}</div>
            <div className="text-xs text-gray-500 mt-1">
              with AI data
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-500 text-sm">LinkedIn URLs</span>
              <ExternalLink className="w-5 h-5 text-indigo-500" />
            </div>
            <div className="text-2xl font-bold">{stats.with_linkedin.toLocaleString()}</div>
            <div className="text-xs text-gray-500 mt-1">
              {stats.linkedin_rate}% of enriched
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-500 text-sm">High Value</span>
              <Target className="w-5 h-5 text-purple-500" />
            </div>
            <div className="text-2xl font-bold">{stats.high_value.toLocaleString()}</div>
            <div className="text-xs text-gray-500 mt-1">
              strategic priority
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex items-center gap-4">
          <Filter className="w-5 h-5 text-gray-400" />

          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                filter === 'all'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('high')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                filter === 'high'
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              High Value
            </button>
            <button
              onClick={() => setFilter('medium')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                filter === 'medium'
                  ? 'bg-yellow-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Medium Value
            </button>
            <button
              onClick={() => setFilter('low')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                filter === 'low'
                  ? 'bg-gray-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Low Value
            </button>
          </div>

          <div className="ml-auto">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="strategic_value">Strategic Value</option>
              <option value="confidence">Confidence Score</option>
              <option value="recent">Recently Enriched</option>
            </select>
          </div>
        </div>
      </div>

      {/* Contacts List */}
      <div className="bg-white rounded-lg shadow">
        {loading ? (
          <div className="p-12 text-center text-gray-500">
            Loading enriched contacts...
          </div>
        ) : contacts.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            No enriched contacts found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Company & Position
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Strategic Value
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Confidence
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {contacts.map((contact) => (
                  <tr key={contact.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {contact.full_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {contact.email_address}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {contact.current_company}
                        </div>
                        <div className="text-sm text-gray-500">
                          {contact.current_position}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getValueBadgeColor(contact.strategic_value)}`}>
                        {contact.strategic_value || 'unrated'}
                      </span>
                      <div className="text-xs text-gray-500 mt-1">
                        Score: {(contact.relationship_score * 100).toFixed(0)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full"
                            style={{ width: `${(contact.exa_confidence_score || 0) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-600">
                          {((contact.exa_confidence_score || 0) * 100).toFixed(0)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        {contact.linkedin_url && (
                          <a
                            href={contact.linkedin_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800"
                            title="View LinkedIn Profile"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                        <button
                          onClick={() => alert(`View details for ${contact.full_name}`)}
                          className="text-gray-600 hover:text-gray-800 text-sm"
                        >
                          View
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
