/**
 * NATURAL LANGUAGE QUERY INTERFACE
 *
 * Enables intelligent contact discovery through natural language queries:
 * - "Who can help with Indigenous youth justice?"
 * - "Who bridges philanthropy and community?"
 * - "Who knows both government and arts?"
 *
 * Uses semantic matching across alignment tags, bio text, and project matches
 */

import React, { useState } from 'react';
import { supabase } from '../../services/supabase';

// ============================================================================
// TYPES
// ============================================================================

interface QueryResult {
  id: string;
  full_name: string;
  current_position: string;
  current_company: string;
  strategic_value: string;
  alignment_tags: string[];
  bio?: string;
  match_score: number;
  match_reasons: string[];
  matched_projects: string[];
  email_address?: string;
  linkedin_url?: string;
}

interface ExampleQuery {
  question: string;
  description: string;
  expectedTags: string[];
}

// ============================================================================
// EXAMPLE QUERIES
// ============================================================================

const EXAMPLE_QUERIES: ExampleQuery[] = [
  {
    question: 'Who can help with Indigenous youth justice?',
    description: 'Find contacts with Indigenous expertise and youth justice experience',
    expectedTags: ['indigenous', 'youth', 'youth_justice', 'justice']
  },
  {
    question: 'Who bridges philanthropy and community development?',
    description: 'Find connectors between funding and grassroots work',
    expectedTags: ['philanthropy', 'funding', 'community', 'social_impact']
  },
  {
    question: 'Who knows both government and arts/culture?',
    description: 'Find cross-domain polymaths in policy and creative sectors',
    expectedTags: ['government', 'arts', 'cultural', 'storytelling']
  },
  {
    question: 'Who can mentor Indigenous entrepreneurs?',
    description: 'Find business mentors with Indigenous cultural competency',
    expectedTags: ['indigenous', 'business', 'mentoring', 'entrepreneur']
  },
  {
    question: 'Who has experience with community-controlled programs?',
    description: 'Find practitioners who understand Beautiful Obsolescence',
    expectedTags: ['community', 'practitioner', 'indigenous', 'leader']
  },
  {
    question: 'Who works in education and technology?',
    description: 'Find educators with digital/tech skills',
    expectedTags: ['educator', 'education', 'technology', 'digital']
  }
];

// ============================================================================
// COMPONENT
// ============================================================================

export const NaturalLanguageQuery: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<QueryResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ========================================================================
  // TAG EXTRACTION
  // ========================================================================

  const extractTagsFromQuery = (queryText: string): string[] => {
    const lowerQuery = queryText.toLowerCase();

    // Common tag mappings
    const tagMappings: { [key: string]: string[] } = {
      'indigenous': ['indigenous', 'aboriginal', 'first nations', 'cultural', 'torres strait'],
      'youth': ['youth', 'young people', 'children', 'kids'],
      'justice': ['justice', 'youth justice', 'criminal justice', 'restorative'],
      'education': ['education', 'educator', 'teaching', 'learning', 'school'],
      'community': ['community', 'grassroots', 'local'],
      'government': ['government', 'policy', 'public sector', 'department'],
      'arts': ['arts', 'creative', 'culture', 'storytelling', 'narrative'],
      'technology': ['technology', 'tech', 'digital', 'software', 'data'],
      'business': ['business', 'enterprise', 'entrepreneur', 'commercial'],
      'mentoring': ['mentor', 'mentoring', 'coach', 'coaching', 'support'],
      'philanthropy': ['philanthropy', 'funding', 'grant', 'donor', 'foundation'],
      'health': ['health', 'medical', 'wellbeing', 'mental health'],
      'environment': ['environment', 'regenerative', 'conservation', 'climate'],
      'social_impact': ['social impact', 'social change', 'community development'],
      'leadership': ['leader', 'leadership', 'director', 'manager', 'ceo'],
      'practitioner': ['practitioner', 'hands-on', 'implementation', 'delivery']
    };

    const extractedTags: string[] = [];

    // Check query against each tag mapping
    Object.entries(tagMappings).forEach(([tag, keywords]) => {
      if (keywords.some(keyword => lowerQuery.includes(keyword))) {
        extractedTags.push(tag);
      }
    });

    return extractedTags;
  };

  // ========================================================================
  // INTELLIGENT SEARCH
  // ========================================================================

  const handleSearch = async () => {
    if (!query.trim()) {
      setError('Please enter a query');
      return;
    }

    setLoading(true);
    setError(null);
    setResults([]);

    try {
      // 1. Extract tags from query
      const queryTags = extractTagsFromQuery(query);

      if (queryTags.length === 0) {
        setError('Could not understand query. Try using keywords like: Indigenous, youth, community, technology, arts, government, etc.');
        setLoading(false);
        return;
      }

      console.log('Query tags:', queryTags);

      // 2. Fetch all enriched contacts
      const { data: contacts, error: contactsError } = await supabase
        .from('linkedin_contacts')
        .select('*')
        .not('alignment_tags', 'is', null);

      if (contactsError) {
        console.error('Error fetching contacts:', contactsError);
        setError('Failed to search contacts');
        setLoading(false);
        return;
      }

      if (!contacts || contacts.length === 0) {
        setError('No enriched contacts found');
        setLoading(false);
        return;
      }

      // 3. Score each contact
      const scoredContacts = contacts.map(contact => {
        let score = 0;
        const matchReasons: string[] = [];

        // Check alignment tags (15 points each)
        const tagMatches = queryTags.filter(tag =>
          contact.alignment_tags.includes(tag)
        );
        score += tagMatches.length * 15;
        if (tagMatches.length > 0) {
          matchReasons.push(`Tags: ${tagMatches.join(', ')}`);
        }

        // Check bio text (10 points each)
        const bioLower = (contact.bio || '').toLowerCase();
        const bioMatches = queryTags.filter(tag =>
          bioLower.includes(tag.replace(/_/g, ' '))
        );
        const uniqueBioMatches = bioMatches.filter(tag => !tagMatches.includes(tag));
        score += uniqueBioMatches.length * 10;
        if (uniqueBioMatches.length > 0) {
          matchReasons.push(`Bio mentions: ${uniqueBioMatches.join(', ')}`);
        }

        // Strategic value bonus
        if (contact.strategic_value === 'high') {
          score += 30;
          matchReasons.push('High strategic value');
        } else if (contact.strategic_value === 'medium') {
          score += 15;
        }

        // Polymath bonus (check if they match multiple projects)
        // We'll fetch this separately

        return {
          id: contact.id,
          full_name: contact.full_name,
          current_position: contact.current_position,
          current_company: contact.current_company,
          strategic_value: contact.strategic_value,
          alignment_tags: contact.alignment_tags,
          bio: contact.bio,
          match_score: score,
          match_reasons: matchReasons,
          matched_projects: [],
          email_address: contact.email_address,
          linkedin_url: contact.linkedin_url
        };
      });

      // 4. Filter for minimum score and sort
      const topResults = scoredContacts
        .filter(c => c.match_score >= 15) // At least 1 tag match
        .sort((a, b) => b.match_score - a.match_score)
        .slice(0, 20);

      // 5. Fetch project matches for these contacts
      if (topResults.length > 0) {
        const contactIds = topResults.map(r => r.id);
        const { data: matches } = await supabase
          .from('project_contact_matches')
          .select('contact_id, project_name')
          .in('contact_id', contactIds);

        if (matches) {
          // Group by contact
          const projectsByContact = new Map<string, string[]>();
          matches.forEach(match => {
            if (!projectsByContact.has(match.contact_id)) {
              projectsByContact.set(match.contact_id, []);
            }
            projectsByContact.get(match.contact_id)!.push(match.project_name);
          });

          // Add to results
          topResults.forEach(result => {
            result.matched_projects = projectsByContact.get(result.id) || [];
            // Polymath bonus
            if (result.matched_projects.length >= 3) {
              result.match_score += 20;
              result.match_reasons.push(`Polymath (${result.matched_projects.length} projects)`);
            }
          });

          // Re-sort after polymath bonus
          topResults.sort((a, b) => b.match_score - a.match_score);
        }
      }

      setResults(topResults);
    } catch (err) {
      console.error('Search failed:', err);
      setError('Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ========================================================================
  // RENDER RESULT CARD
  // ========================================================================

  const renderResultCard = (result: QueryResult, index: number) => {
    const isTopPriority = result.match_score >= 80;
    const isHighValue = result.match_score >= 60 && result.match_score < 80;

    return (
      <div
        key={result.id}
        className={`border-2 rounded-lg p-4 ${
          isTopPriority
            ? 'border-purple-300 bg-purple-50'
            : isHighValue
            ? 'border-blue-300 bg-blue-50'
            : 'border-gray-200 bg-white'
        }`}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl font-bold text-gray-500">#{index + 1}</span>
              <h3 className="text-lg font-bold text-gray-900">{result.full_name}</h3>
            </div>
            <p className="text-sm text-gray-600">{result.current_position}</p>
            {result.current_company && (
              <p className="text-xs text-gray-500">{result.current_company}</p>
            )}
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-gray-900">{result.match_score}</div>
            <div className="text-xs text-gray-500">match score</div>
          </div>
        </div>

        {/* Match Reasons */}
        <div className="mb-3">
          <div className="text-xs font-semibold text-gray-700 mb-1">Why this match:</div>
          <div className="space-y-1">
            {result.match_reasons.map((reason, i) => (
              <div key={i} className="text-xs text-gray-600">
                <span className="text-green-600 mr-1">✓</span>
                {reason}
              </div>
            ))}
          </div>
        </div>

        {/* Tags */}
        {result.alignment_tags && result.alignment_tags.length > 0 && (
          <div className="mb-3">
            <div className="flex flex-wrap gap-1">
              {result.alignment_tags.slice(0, 10).map(tag => (
                <span
                  key={tag}
                  className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full"
                >
                  {tag}
                </span>
              ))}
              {result.alignment_tags.length > 10 && (
                <span className="px-2 py-1 text-xs text-gray-500">
                  +{result.alignment_tags.length - 10} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Matched Projects */}
        {result.matched_projects && result.matched_projects.length > 0 && (
          <div className="mb-3">
            <div className="text-xs font-semibold text-gray-700 mb-1">
              Matched Projects ({result.matched_projects.length}):
            </div>
            <div className="text-xs text-gray-600">
              {result.matched_projects.slice(0, 3).join(', ')}
              {result.matched_projects.length > 3 && ` +${result.matched_projects.length - 3} more`}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {result.email_address && (
            <a
              href={`mailto:${result.email_address}`}
              className="px-3 py-1 text-xs bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              Email
            </a>
          )}
          {result.linkedin_url && (
            <a
              href={result.linkedin_url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1 text-xs bg-gray-700 text-white rounded-lg hover:bg-gray-800"
            >
              LinkedIn
            </a>
          )}
        </div>
      </div>
    );
  };

  // ========================================================================
  // RENDER
  // ========================================================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          🗣️ Natural Language Query
        </h2>
        <p className="text-gray-600">
          Ask questions to find the right people for your project
        </p>
      </div>

      {/* Search Box */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            placeholder='Ask a question like "Who can help with Indigenous youth justice?"'
            className="flex-1 px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={handleSearch}
            disabled={loading}
            className="px-6 py-3 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}
      </div>

      {/* Example Queries */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Example Queries</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {EXAMPLE_QUERIES.map((example, index) => (
            <button
              key={index}
              onClick={() => {
                setQuery(example.question);
                setError(null);
              }}
              className="text-left p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all"
            >
              <div className="font-medium text-gray-900 text-sm mb-1">
                {example.question}
              </div>
              <div className="text-xs text-gray-600">{example.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-900">
              Found {results.length} matches
            </h3>
            <div className="text-sm text-gray-600">
              Sorted by match score (highest first)
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {results.map((result, index) => renderResultCard(result, index))}
          </div>
        </div>
      )}

      {!loading && results.length === 0 && query && !error && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-xl font-bold text-gray-700 mb-2">No matches found</h3>
          <p className="text-gray-600">Try a different query or use broader keywords</p>
        </div>
      )}
    </div>
  );
};

export default NaturalLanguageQuery;
