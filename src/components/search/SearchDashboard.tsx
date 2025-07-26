import { useState, useEffect } from 'react';
import { 
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowPathIcon,
  ShareIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { useProjects, useOpportunities, useOrganizations, usePeople } from '../../hooks';

interface SearchFilter {
  type: 'all' | 'projects' | 'opportunities' | 'organizations' | 'people' | 'artifacts';
  status?: string;
  dateRange?: { start: Date; end: Date };
  tags?: string[];
}

interface SearchResult {
  id: string;
  title: string;
  type: string;
  snippet: string;
  entity: any;
  relatedEntities: Array<{id: string; name: string; type: string}>;
  score: number;
  discrepancies?: string[];
}

interface CrossReference {
  entity1: {id: string; name: string; type: string};
  entity2: {id: string; name: string; type: string};
  connection: string;
  strength: 'weak' | 'medium' | 'strong';
  missing?: boolean;
}

/**
 * Advanced search dashboard with cross-reference capabilities
 * Finds discrepancies, missing links, and provides intelligent search
 */
const SearchDashboard = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilter>({ type: 'all' });
  const [results, setResults] = useState<SearchResult[]>([]);
  const [crossReferences, setCrossReferences] = useState<CrossReference[]>([]);
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showDiscrepancies, setShowDiscrepancies] = useState(false);

  // Load all data
  const { data: projects = [] } = useProjects();
  const { data: opportunities = [] } = useOpportunities();
  const { data: organizations = [] } = useOrganizations();
  const { data: people = [] } = usePeople();

  // Perform intelligent search
  const performSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    const searchResults: SearchResult[] = [];

    // Search projects
    if (filters.type === 'all' || filters.type === 'projects') {
      projects.forEach(project => {
        const score = calculateRelevanceScore(project, searchQuery);
        if (score > 0) {
          searchResults.push({
            id: project.id,
            title: project.name,
            type: 'Project',
            snippet: project.description || project.aiSummary || '',
            entity: project,
            relatedEntities: [
              ...project.relatedOpportunities.map(id => ({
                id, 
                name: opportunities.find(o => o.id === id)?.name || 'Unknown',
                type: 'Opportunity'
              })),
              ...project.partnerOrganizations.map(id => ({
                id,
                name: organizations.find(o => o.id === id)?.name || 'Unknown',
                type: 'Organization'
              }))
            ],
            score,
            discrepancies: findEntityDiscrepancies(project, 'project')
          });
        }
      });
    }

    // Search opportunities
    if (filters.type === 'all' || filters.type === 'opportunities') {
      opportunities.forEach(opp => {
        const score = calculateRelevanceScore(opp, searchQuery);
        if (score > 0) {
          searchResults.push({
            id: opp.id,
            title: opp.name,
            type: 'Opportunity',
            snippet: opp.description || '',
            entity: opp,
            relatedEntities: [
              ...opp.relatedProjects.map(id => ({
                id,
                name: projects.find(p => p.id === id)?.name || 'Unknown',
                type: 'Project'
              }))
            ],
            score,
            discrepancies: findEntityDiscrepancies(opp, 'opportunity')
          });
        }
      });
    }

    // Search organizations
    if (filters.type === 'all' || filters.type === 'organizations') {
      organizations.forEach(org => {
        const score = calculateRelevanceScore(org, searchQuery);
        if (score > 0) {
          searchResults.push({
            id: org.id,
            title: org.name,
            type: 'Organization',
            snippet: org.description || '',
            entity: org,
            relatedEntities: [
              ...org.keyContacts.map(id => ({
                id,
                name: people.find(p => p.id === id)?.fullName || 'Unknown',
                type: 'Person'
              }))
            ],
            score,
            discrepancies: findEntityDiscrepancies(org, 'organization')
          });
        }
      });
    }

    // Search people
    if (filters.type === 'all' || filters.type === 'people') {
      people.forEach(person => {
        const score = calculateRelevanceScore(person, searchQuery);
        if (score > 0) {
          searchResults.push({
            id: person.id,
            title: person.fullName,
            type: 'Person',
            snippet: `${person.roleTitle} at ${person.organization}`,
            entity: person,
            relatedEntities: [
              ...person.relatedProjects.map(id => ({
                id,
                name: projects.find(p => p.id === id)?.name || 'Unknown',
                type: 'Project'
              })),
              ...person.relatedOpportunities.map(id => ({
                id,
                name: opportunities.find(o => o.id === id)?.name || 'Unknown',
                type: 'Opportunity'
              }))
            ],
            score,
            discrepancies: findEntityDiscrepancies(person, 'person')
          });
        }
      });
    }

    // Sort by relevance score
    searchResults.sort((a, b) => b.score - a.score);
    setResults(searchResults);
    
    // Generate cross-references
    generateCrossReferences(searchResults);
    
    setIsSearching(false);
  };

  // Calculate relevance score for search
  const calculateRelevanceScore = (entity: any, query: string): number => {
    const queryLower = query.toLowerCase();
    let score = 0;

    // Check name/title (highest weight)
    if (entity.name?.toLowerCase().includes(queryLower) || 
        entity.fullName?.toLowerCase().includes(queryLower)) {
      score += 10;
    }

    // Check description/summary
    if (entity.description?.toLowerCase().includes(queryLower) ||
        entity.aiSummary?.toLowerCase().includes(queryLower)) {
      score += 5;
    }

    // Check tags and themes
    if (entity.tags?.some((tag: string) => tag.toLowerCase().includes(queryLower)) ||
        entity.themes?.some((theme: string) => theme.toLowerCase().includes(queryLower))) {
      score += 3;
    }

    // Check organization/location
    if (entity.organization?.toLowerCase().includes(queryLower) ||
        entity.location?.toLowerCase().includes(queryLower)) {
      score += 2;
    }

    return score;
  };

  // Find discrepancies in entity data
  const findEntityDiscrepancies = (entity: any, type: string): string[] => {
    const discrepancies: string[] = [];

    switch (type) {
      case 'project':
        if (!entity.lead) discrepancies.push('No project lead assigned');
        if (entity.relatedOpportunities.length === 0 && entity.revenuePotential > 0) {
          discrepancies.push('Has revenue potential but no opportunities');
        }
        if (!entity.nextMilestone) discrepancies.push('No milestone date set');
        break;

      case 'opportunity':
        if (!entity.organization) discrepancies.push('No organization specified');
        if (!entity.primaryContact) discrepancies.push('No primary contact');
        if (entity.amount === 0) discrepancies.push('No amount specified');
        break;

      case 'organization':
        if (entity.keyContacts.length === 0) discrepancies.push('No key contacts');
        if (!entity.website) discrepancies.push('No website listed');
        break;

      case 'person':
        if (!entity.email) discrepancies.push('No email address');
        if (!entity.organization) discrepancies.push('No organization specified');
        if (entity.relatedProjects.length === 0 && entity.relatedOpportunities.length === 0) {
          discrepancies.push('Not linked to any projects or opportunities');
        }
        break;
    }

    return discrepancies;
  };

  // Generate cross-references between entities
  const generateCrossReferences = (searchResults: SearchResult[]) => {
    const refs: CrossReference[] = [];

    searchResults.forEach(result => {
      result.relatedEntities.forEach(related => {
        // Find if the related entity is also in search results
        const relatedResult = searchResults.find(r => r.id === related.id);
        if (relatedResult) {
          refs.push({
            entity1: {
              id: result.id,
              name: result.title,
              type: result.type
            },
            entity2: {
              id: related.id,
              name: related.name,
              type: related.type
            },
            connection: getConnectionType(result.type, related.type),
            strength: calculateConnectionStrength(result.entity, relatedResult.entity)
          });
        }
      });
    });

    // Remove duplicates
    const uniqueRefs = refs.filter((ref, index, self) => 
      index === self.findIndex(r => 
        (r.entity1.id === ref.entity1.id && r.entity2.id === ref.entity2.id) ||
        (r.entity1.id === ref.entity2.id && r.entity2.id === ref.entity1.id)
      )
    );

    setCrossReferences(uniqueRefs);
  };

  // Get connection type between entities
  const getConnectionType = (type1: string, type2: string): string => {
    const pair = [type1, type2].sort().join('-');
    const connections: Record<string, string> = {
      'Project-Opportunity': 'funded by',
      'Project-Organization': 'partnered with',
      'Project-Person': 'led by',
      'Opportunity-Organization': 'offered by',
      'Opportunity-Person': 'contacted through',
      'Organization-Person': 'employs'
    };
    return connections[pair] || 'related to';
  };

  // Calculate connection strength
  const calculateConnectionStrength = (entity1: any, entity2: any): 'weak' | 'medium' | 'strong' => {
    // Simple heuristic based on data completeness and recency
    let score = 0;
    
    if (entity1.lastModified && entity2.lastModified) {
      const daysDiff = Math.abs(
        new Date(entity1.lastModified).getTime() - new Date(entity2.lastModified).getTime()
      ) / (1000 * 60 * 60 * 24);
      
      if (daysDiff < 7) score += 2;
      else if (daysDiff < 30) score += 1;
    }

    if (score >= 2) return 'strong';
    if (score >= 1) return 'medium';
    return 'weak';
  };

  // Email cross-reference search
  const searchEmailsForEntity = (entity: SearchResult) => {
    console.log('Searching emails for mentions of:', entity.title);
    // This would search through email artifacts for mentions
    // Return mock data for now
    return [
      {
        subject: 'Project Update Meeting',
        from: 'john@example.com',
        mentions: ['funding opportunity', 'next milestone'],
        date: new Date('2024-01-15')
      }
    ];
  };

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && performSearch()}
              placeholder="Search across all data..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-lg"
            />
          </div>
        </div>
        
        <div className="flex gap-2">
          <select
            value={filters.type}
            onChange={(e) => setFilters({ ...filters, type: e.target.value as any })}
            className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">All Types</option>
            <option value="projects">Projects</option>
            <option value="opportunities">Opportunities</option>
            <option value="organizations">Organizations</option>
            <option value="people">People</option>
          </select>
          
          <button
            onClick={performSearch}
            disabled={isSearching || !searchQuery.trim()}
            className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-300 flex items-center gap-2"
          >
            <ArrowPathIcon className={`h-4 w-4 ${isSearching ? 'animate-spin' : ''}`} />
            Search
          </button>
        </div>
      </div>

      {/* Filter Toggle */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => setShowDiscrepancies(!showDiscrepancies)}
          className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
            showDiscrepancies 
              ? 'bg-red-100 text-red-700' 
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <ExclamationTriangleIcon className="h-4 w-4" />
          Show Issues Only
        </button>
        
        <span className="text-sm text-gray-500">
          {results.length} results found
        </span>
      </div>

      {/* Search Results */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Results List */}
        <div className="lg:col-span-2 space-y-4">
          {results
            .filter(result => !showDiscrepancies || (result.discrepancies && result.discrepancies.length > 0))
            .map((result) => (
            <div
              key={result.id}
              className={`bg-white border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer ${
                selectedResult?.id === result.id ? 'border-primary-500 bg-primary-50' : 'border-gray-200'
              }`}
              onClick={() => setSelectedResult(result)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-gray-900">{result.title}</h3>
                    <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded">
                      {result.type}
                    </span>
                    {result.discrepancies && result.discrepancies.length > 0 && (
                      <ExclamationTriangleIcon className="h-4 w-4 text-amber-500" />
                    )}
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-3">{result.snippet}</p>
                  
                  {result.relatedEntities.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {result.relatedEntities.slice(0, 3).map((entity, idx) => (
                        <span key={idx} className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                          {entity.name}
                        </span>
                      ))}
                      {result.relatedEntities.length > 3 && (
                        <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                          +{result.relatedEntities.length - 3} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      searchEmailsForEntity(result);
                    }}
                    className="p-1 text-gray-400 hover:text-gray-600"
                    title="Search emails"
                  >
                    <MagnifyingGlassIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      console.log('Sharing:', result.title);
                    }}
                    className="p-1 text-gray-400 hover:text-gray-600"
                    title="Share"
                  >
                    <ShareIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
              
              {result.discrepancies && result.discrepancies.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-xs font-medium text-amber-700 mb-1">Issues found:</p>
                  {result.discrepancies.map((issue, idx) => (
                    <p key={idx} className="text-xs text-amber-600">• {issue}</p>
                  ))}
                </div>
              )}
            </div>
          ))}
          
          {results.length === 0 && searchQuery && !isSearching && (
            <div className="text-center py-8 text-gray-500">
              <MagnifyingGlassIcon className="h-12 w-12 mx-auto mb-2 text-gray-300" />
              <p>No results found for "{searchQuery}"</p>
            </div>
          )}
        </div>

        {/* Detail Panel */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          {selectedResult ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Details</h3>
                <button
                  onClick={() => setSelectedResult(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-2">{selectedResult.title}</h4>
                <p className="text-sm text-gray-600">{selectedResult.snippet}</p>
              </div>
              
              {selectedResult.relatedEntities.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Related Items</h4>
                  <div className="space-y-2">
                    {selectedResult.relatedEntities.map((entity, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm">
                        <span className="text-gray-700">{entity.name}</span>
                        <span className="text-xs text-gray-500">{entity.type}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {selectedResult.discrepancies && selectedResult.discrepancies.length > 0 && (
                <div>
                  <h4 className="font-medium text-red-700 mb-2">Data Issues</h4>
                  <div className="space-y-1">
                    {selectedResult.discrepancies.map((issue, idx) => (
                      <p key={idx} className="text-sm text-red-600">• {issue}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              <p>Select a result to view details</p>
            </div>
          )}
        </div>
      </div>

      {/* Cross References */}
      {crossReferences.length > 0 && (
        <div className="bg-blue-50 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-3">Cross References</h3>
          <div className="grid gap-2">
            {crossReferences.slice(0, 5).map((ref, idx) => (
              <div key={idx} className="flex items-center text-sm text-blue-800">
                <span className="font-medium">{ref.entity1.name}</span>
                <span className="mx-2 text-blue-600">{ref.connection}</span>
                <span className="font-medium">{ref.entity2.name}</span>
                <span className={`ml-2 px-1 py-0.5 rounded text-xs ${
                  ref.strength === 'strong' ? 'bg-green-200 text-green-800' :
                  ref.strength === 'medium' ? 'bg-yellow-200 text-yellow-800' :
                  'bg-gray-200 text-gray-600'
                }`}>
                  {ref.strength}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchDashboard;