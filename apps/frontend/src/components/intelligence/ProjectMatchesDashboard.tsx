/**
 * Project Matches Dashboard
 *
 * Visualizes contact-to-project alignment matches from the unified scoring engine
 * Enables exploration of "polymaths" who match multiple projects
 * Supports Beautiful Obsolescence tracking
 */

import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { BeautifulObsolescenceTracker } from './BeautifulObsolescenceTracker';
import { NaturalLanguageQuery } from './NaturalLanguageQuery';

interface ProjectMatch {
  id: string;
  contact_id: string;
  person_id?: string;
  project_notion_id: string;
  project_name: string;
  project_source: string;
  alignment_score: number;
  matched_keywords: string[];
  match_reason: string;
  alma_intervention_id?: string;
  alma_signal_boost?: number;
  engagement_status: 'potential' | 'contacted' | 'active' | 'obsolete';
  created_at: string;

  // Joined contact data
  contact?: {
    full_name: string;
    current_position: string;
    current_company: string;
    location: string;
    strategic_value: string;
    alignment_tags: string[];
    email_address?: string;
    linkedin_url?: string;
  };
}

interface PolymathContact {
  id: string;
  full_name: string;
  current_position: string;
  strategic_value: string;
  alignment_tags: string[];
  project_count: number;
  matched_projects: string[];
  avg_score: number;
  max_score: number;
}

type ViewMode = 'projects' | 'contacts' | 'polymaths' | 'obsolescence' | 'query';
type FilterTier = 'all' | 'top_priority' | 'high_value' | 'potential';

export const ProjectMatchesDashboard: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('polymaths');
  const [filterTier, setFilterTier] = useState<FilterTier>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [matches, setMatches] = useState<ProjectMatch[]>([]);
  const [polymaths, setPolymaths] = useState<PolymathContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stats
  const [stats, setStats] = useState({
    totalMatches: 0,
    topPriority: 0,
    highValue: 0,
    potential: 0,
    uniqueContacts: 0,
    uniqueProjects: 0,
  });

  // Fetch matches
  useEffect(() => {
    fetchMatches();
  }, [filterTier]);

  const fetchMatches = async () => {
    try {
      setLoading(true);
      setError(null);

      // Build query
      let query = supabase
        .from('project_contact_matches')
        .select(`
          *,
          contact:linkedin_contacts(
            full_name,
            current_position,
            current_company,
            location,
            strategic_value,
            alignment_tags,
            email_address,
            linkedin_url
          )
        `)
        .order('alignment_score', { ascending: false });

      // Apply tier filter
      if (filterTier === 'top_priority') {
        query = query.gte('alignment_score', 80);
      } else if (filterTier === 'high_value') {
        query = query.gte('alignment_score', 60).lt('alignment_score', 80);
      } else if (filterTier === 'potential') {
        query = query.gte('alignment_score', 40).lt('alignment_score', 60);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setMatches(data || []);

      // Calculate stats
      const allMatches = data || [];
      setStats({
        totalMatches: allMatches.length,
        topPriority: allMatches.filter(m => m.alignment_score >= 80).length,
        highValue: allMatches.filter(m => m.alignment_score >= 60 && m.alignment_score < 80).length,
        potential: allMatches.filter(m => m.alignment_score >= 40 && m.alignment_score < 60).length,
        uniqueContacts: new Set(allMatches.map(m => m.contact_id)).size,
        uniqueProjects: new Set(allMatches.map(m => m.project_notion_id)).size,
      });

    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching matches:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch polymaths
  useEffect(() => {
    if (viewMode === 'polymaths') {
      fetchPolymaths();
    }
  }, [viewMode]);

  const fetchPolymaths = async () => {
    try {
      setLoading(true);

      // Group matches by contact
      const contactMap = new Map<string, {
        contact: any;
        matches: ProjectMatch[];
      }>();

      matches.forEach(match => {
        if (!contactMap.has(match.contact_id)) {
          contactMap.set(match.contact_id, {
            contact: match.contact,
            matches: [],
          });
        }
        contactMap.get(match.contact_id)!.matches.push(match);
      });

      // Find contacts with 3+ matches
      const polymathData: PolymathContact[] = Array.from(contactMap.entries())
        .filter(([_, data]) => data.matches.length >= 3)
        .map(([contactId, data]) => {
          const scores = data.matches.map(m => m.alignment_score);
          return {
            id: contactId,
            full_name: data.contact?.full_name || 'Unknown',
            current_position: data.contact?.current_position || 'Unknown',
            strategic_value: data.contact?.strategic_value || 'unknown',
            alignment_tags: data.contact?.alignment_tags || [],
            project_count: data.matches.length,
            matched_projects: data.matches.map(m => m.project_name),
            avg_score: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
            max_score: Math.max(...scores),
          };
        })
        .sort((a, b) => b.project_count - a.project_count || b.avg_score - a.avg_score);

      setPolymaths(polymathData);

    } catch (err: any) {
      console.error('Error fetching polymaths:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filter matches by search
  const filteredMatches = matches.filter(match => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      match.contact?.full_name?.toLowerCase().includes(query) ||
      match.project_name?.toLowerCase().includes(query) ||
      match.matched_keywords?.some(k => k.toLowerCase().includes(query))
    );
  });

  // Group matches by project
  const matchesByProject = filteredMatches.reduce((acc, match) => {
    if (!acc[match.project_name]) {
      acc[match.project_name] = [];
    }
    acc[match.project_name].push(match);
    return acc;
  }, {} as Record<string, ProjectMatch[]>);

  // Group matches by contact
  const matchesByContact = filteredMatches.reduce((acc, match) => {
    const name = match.contact?.full_name || 'Unknown';
    if (!acc[name]) {
      acc[name] = [];
    }
    acc[name].push(match);
    return acc;
  }, {} as Record<string, ProjectMatch[]>);

  // Get tier badge
  const getTierBadge = (score: number) => {
    if (score >= 80) return { label: 'TOP PRIORITY', color: 'bg-green-500', icon: '🎯' };
    if (score >= 60) return { label: 'HIGH VALUE', color: 'bg-blue-500', icon: '✅' };
    return { label: 'POTENTIAL', color: 'bg-amber-500', icon: '💡' };
  };

  // Get engagement status badge
  const getEngagementBadge = (status: string) => {
    switch (status) {
      case 'potential': return { label: 'Potential', color: 'bg-gray-400' };
      case 'contacted': return { label: 'Contacted', color: 'bg-blue-400' };
      case 'active': return { label: 'Active', color: 'bg-green-400' };
      case 'obsolete': return { label: 'Obsolete ✨', color: 'bg-purple-500' };
      default: return { label: status, color: 'bg-gray-400' };
    }
  };

  if (loading && matches.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading intelligence matches...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600">Error loading matches: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          🧠 Intelligence Hub - Project Matches
        </h1>
        <p className="text-gray-600">
          Unified alignment scoring across all ACT projects with ALMA domain intelligence
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="text-sm text-gray-600">Total Matches</div>
          <div className="text-2xl font-bold text-gray-900">{stats.totalMatches}</div>
        </div>
        <div className="bg-green-50 rounded-lg shadow-sm p-4">
          <div className="text-sm text-green-700">🎯 Top Priority</div>
          <div className="text-2xl font-bold text-green-900">{stats.topPriority}</div>
        </div>
        <div className="bg-blue-50 rounded-lg shadow-sm p-4">
          <div className="text-sm text-blue-700">✅ High Value</div>
          <div className="text-2xl font-bold text-blue-900">{stats.highValue}</div>
        </div>
        <div className="bg-amber-50 rounded-lg shadow-sm p-4">
          <div className="text-sm text-amber-700">💡 Potential</div>
          <div className="text-2xl font-bold text-amber-900">{stats.potential}</div>
        </div>
        <div className="bg-purple-50 rounded-lg shadow-sm p-4">
          <div className="text-sm text-purple-700">Contacts</div>
          <div className="text-2xl font-bold text-purple-900">{stats.uniqueContacts}</div>
        </div>
        <div className="bg-indigo-50 rounded-lg shadow-sm p-4">
          <div className="text-sm text-indigo-700">Projects</div>
          <div className="text-2xl font-bold text-indigo-900">{stats.uniqueProjects}</div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* View Mode */}
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('polymaths')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === 'polymaths'
                  ? 'bg-purple-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              🌟 Polymaths
            </button>
            <button
              onClick={() => setViewMode('projects')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === 'projects'
                  ? 'bg-purple-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              📊 By Project
            </button>
            <button
              onClick={() => setViewMode('contacts')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === 'contacts'
                  ? 'bg-purple-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              👤 By Contact
            </button>
            <button
              onClick={() => setViewMode('obsolescence')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === 'obsolescence'
                  ? 'bg-purple-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              ✨ Beautiful Obsolescence
            </button>
            <button
              onClick={() => setViewMode('query')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === 'query'
                  ? 'bg-purple-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              🗣️ Natural Query
            </button>
          </div>

          {/* Tier Filter */}
          <div className="flex gap-2">
            {(['all', 'top_priority', 'high_value', 'potential'] as FilterTier[]).map(tier => (
              <button
                key={tier}
                onClick={() => setFilterTier(tier)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filterTier === tier
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {tier === 'all' && 'All'}
                {tier === 'top_priority' && '🎯 Top'}
                {tier === 'high_value' && '✅ High'}
                {tier === 'potential' && '💡 Potential'}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search contacts, projects, keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      {viewMode === 'polymaths' && (
        <PolymathsView polymaths={polymaths} />
      )}

      {viewMode === 'projects' && (
        <ProjectsView matchesByProject={matchesByProject} getTierBadge={getTierBadge} />
      )}

      {viewMode === 'contacts' && (
        <ContactsView matchesByContact={matchesByContact} getTierBadge={getTierBadge} />
      )}

      {viewMode === 'obsolescence' && (
        <BeautifulObsolescenceTracker showAll={true} />
      )}

      {viewMode === 'query' && (
        <NaturalLanguageQuery />
      )}
    </div>
  );
};

// Polymaths View
const PolymathsView: React.FC<{ polymaths: PolymathContact[] }> = ({ polymaths }) => {
  if (polymaths.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-8 text-center">
        <p className="text-gray-600">No polymath contacts found (need 3+ project matches)</p>
        <p className="text-sm text-gray-500 mt-2">Run batch matching to populate data</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <h3 className="font-semibold text-purple-900 mb-1">🌟 Polymath Contacts</h3>
        <p className="text-sm text-purple-700">
          Contacts who match 3+ projects across different domains. These are high-value connectors for the ACT ecosystem.
        </p>
      </div>

      {polymaths.map((contact, index) => (
        <div key={contact.id} className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl font-bold text-purple-600">#{index + 1}</span>
                <h3 className="text-xl font-bold text-gray-900">{contact.full_name}</h3>
                {contact.strategic_value === 'high' && (
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded">
                    ⭐ High Value
                  </span>
                )}
              </div>

              <p className="text-gray-600 mb-3">{contact.current_position}</p>

              <div className="grid grid-cols-3 gap-4 mb-3">
                <div>
                  <div className="text-sm text-gray-500">Projects Matched</div>
                  <div className="text-2xl font-bold text-purple-600">{contact.project_count}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Avg Score</div>
                  <div className="text-2xl font-bold text-blue-600">{contact.avg_score}/100</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Max Score</div>
                  <div className="text-2xl font-bold text-green-600">{contact.max_score}/100</div>
                </div>
              </div>

              <div className="mb-3">
                <div className="text-sm text-gray-600 mb-1">Alignment Tags:</div>
                <div className="flex flex-wrap gap-1">
                  {contact.alignment_tags.slice(0, 8).map(tag => (
                    <span key={tag} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded">
                      {tag}
                    </span>
                  ))}
                  {contact.alignment_tags.length > 8 && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                      +{contact.alignment_tags.length - 8} more
                    </span>
                  )}
                </div>
              </div>

              <div>
                <div className="text-sm text-gray-600 mb-1">Matched Projects:</div>
                <div className="text-sm text-gray-700">
                  {contact.matched_projects.slice(0, 5).join(' • ')}
                  {contact.matched_projects.length > 5 && ` • +${contact.matched_projects.length - 5} more`}
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Projects View
const ProjectsView: React.FC<{
  matchesByProject: Record<string, ProjectMatch[]>;
  getTierBadge: (score: number) => { label: string; color: string; icon: string };
}> = ({ matchesByProject, getTierBadge }) => {
  const projects = Object.keys(matchesByProject).sort((a, b) =>
    matchesByProject[b].length - matchesByProject[a].length
  );

  return (
    <div className="space-y-4">
      {projects.map(projectName => {
        const matches = matchesByProject[projectName];
        const topMatch = matches[0];

        return (
          <div key={projectName} className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-3">{projectName}</h3>
            <div className="text-sm text-gray-600 mb-4">
              {matches.length} match{matches.length !== 1 ? 'es' : ''} •{' '}
              {topMatch.alma_intervention_id && '⚖️ ALMA-enabled • '}
              Source: {topMatch.project_source}
            </div>

            <div className="space-y-2">
              {matches.slice(0, 5).map(match => {
                const tier = getTierBadge(match.alignment_score);
                return (
                  <div key={match.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{match.contact?.full_name}</div>
                      <div className="text-sm text-gray-600">{match.contact?.current_position}</div>
                      {match.matched_keywords.length > 0 && (
                        <div className="text-xs text-gray-500 mt-1">
                          Keywords: {match.matched_keywords.slice(0, 3).join(', ')}
                        </div>
                      )}
                    </div>
                    <div className="text-right ml-4">
                      <div className="text-2xl font-bold text-gray-900">{match.alignment_score}</div>
                      <div className={`text-xs px-2 py-1 rounded ${tier.color} text-white mt-1`}>
                        {tier.icon} {tier.label}
                      </div>
                      {match.alma_signal_boost && match.alma_signal_boost > 0 && (
                        <div className="text-xs text-purple-600 mt-1">
                          +{match.alma_signal_boost} ALMA
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {matches.length > 5 && (
              <div className="mt-3 text-sm text-gray-600">
                + {matches.length - 5} more matches
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// Contacts View
const ContactsView: React.FC<{
  matchesByContact: Record<string, ProjectMatch[]>;
  getTierBadge: (score: number) => { label: string; color: string; icon: string };
}> = ({ matchesByContact, getTierBadge }) => {
  const contacts = Object.keys(matchesByContact).sort((a, b) =>
    matchesByContact[b].length - matchesByContact[a].length
  );

  return (
    <div className="space-y-4">
      {contacts.map(contactName => {
        const matches = matchesByContact[contactName];
        const contact = matches[0].contact;
        const avgScore = Math.round(matches.reduce((sum, m) => sum + m.alignment_score, 0) / matches.length);

        return (
          <div key={contactName} className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{contactName}</h3>
                <p className="text-gray-600">{contact?.current_position}</p>
                {contact?.location && (
                  <p className="text-sm text-gray-500">{contact.location}</p>
                )}
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-600">Avg Score</div>
                <div className="text-2xl font-bold text-blue-600">{avgScore}/100</div>
                <div className="text-sm text-gray-600">{matches.length} projects</div>
              </div>
            </div>

            <div className="space-y-2">
              {matches.map(match => {
                const tier = getTierBadge(match.alignment_score);
                return (
                  <div key={match.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{match.project_name}</div>
                      <div className="text-xs text-gray-500 mt-1">{match.match_reason}</div>
                    </div>
                    <div className="text-right ml-4">
                      <div className="text-xl font-bold text-gray-900">{match.alignment_score}</div>
                      <div className={`text-xs px-2 py-1 rounded ${tier.color} text-white mt-1`}>
                        {tier.icon}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ProjectMatchesDashboard;
