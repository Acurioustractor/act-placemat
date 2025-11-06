import { useState } from 'react';
import {
  Card,
  Badge,
  LoadingSpinner,
  EmptyState,
  ErrorState,
  SearchBar
} from '../../components/ui';
import { ModernFilterPanel } from '../../components/ui/modern';
import { useOrganizations, usePeople, useProjects, useOpportunities } from '../../hooks';
import { OrganizationFilters, PersonFilters, RelationshipStatus, Organization, Person } from '../../types';
import { STATUS_OPTIONS } from '../../constants';

/**
 * Network page component with rich relationship visualization
 * Displays organizations and people with detailed connection information
 */
const NetworkPage = () => {
  // Set up tab state
  const [activeTab, setActiveTab] = useState<'organizations' | 'people'>('organizations');
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  
  // Set up filters
  const [orgFilters, setOrgFilters] = useState<OrganizationFilters>({});
  const [peopleFilters, setPeopleFilters] = useState<PersonFilters>({});
  
  // Fetch all data for relationship mapping
  const { 
    data: organizations = [], 
    isLoading: orgsLoading, 
    error: orgsError,
    refetch: refetchOrgs 
  } = useOrganizations(orgFilters);
  
  const { 
    data: people = [], 
    isLoading: peopleLoading, 
    error: peopleError,
    refetch: refetchPeople 
  } = usePeople(peopleFilters);
  
  const { data: projects = [] } = useProjects();
  const { data: opportunities = [] } = useOpportunities();
  
  // One-time debug dump when all data is loaded
  if (organizations.length > 0 && people.length > 0 && projects.length > 0 && opportunities.length > 0) {
    console.log('🔍 COMPREHENSIVE DATA ANALYSIS:');
    console.log('📊 Data counts:', {
      organizations: organizations.length,
      people: people.length,
      projects: projects.length,
      opportunities: opportunities.length
    });
    
    // Sample the first few items of each type
    console.log('🏢 Sample organization IDs:', organizations.slice(0, 3).map(o => ({ id: o.id, name: o.name })));
    console.log('👤 Sample people IDs:', people.slice(0, 3).map(p => ({ id: p.id, name: p.fullName })));
    console.log('💼 Sample project IDs:', projects.slice(0, 3).map(p => ({ id: p.id, name: p.name })));
    console.log('🎯 Sample opportunity IDs:', opportunities.slice(0, 3).map(o => ({ id: o.id, name: o.name })));
    
    // Look at one organization's relationship data in detail
    const sampleOrg = organizations[0];
    console.log('🔗 First organization relationship analysis:', {
      name: sampleOrg.name,
      keyContacts: sampleOrg.keyContacts,
      relatedProjects: sampleOrg.relatedProjects,
      activeOpportunities: sampleOrg.activeOpportunities
    });
    
    // Look at one person's relationship data
    const samplePerson = people[0];
    console.log('🔗 First person relationship analysis:', {
      name: samplePerson.fullName,
      organization: samplePerson.organization,
      relatedProjects: samplePerson.relatedProjects,
      relatedOpportunities: samplePerson.relatedOpportunities
    });
  }

  // Reset filters
  const resetOrgFilters = () => setOrgFilters({});
  const resetPeopleFilters = () => setPeopleFilters({});
  
  // Toggle card expansion
  const toggleCardExpansion = (id: string) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Get relationship status badge variant
  const getRelationshipVariant = (status: string): 'primary' | 'success' | 'warning' | 'danger' | 'default' => {
    switch (status) {
      case RelationshipStatus.PROSPECT:
        return 'warning';
      case RelationshipStatus.ACTIVE:
        return 'primary';
      case RelationshipStatus.PARTNER:
        return 'success';
      case RelationshipStatus.INACTIVE:
        return 'default';
      case RelationshipStatus.CLOSED:
        return 'danger';
      default:
        return 'default';
    }
  };
  
  // Helper functions to resolve relationships with debug logging
  const getProjectsByIds = (ids: string[]) => {
    if (!ids || ids.length === 0) return [];
    const matchedProjects = projects.filter(project => ids.includes(project.id));
    console.log(`🔗 Projects lookup: ${ids.length} IDs requested, ${matchedProjects.length} found`, { ids, available: projects.map(p => p.id), matched: matchedProjects.map(p => ({ id: p.id, name: p.name })) });
    return matchedProjects;
  };
  
  const getOpportunitiesByIds = (ids: string[]) => {
    if (!ids || ids.length === 0) return [];
    const matchedOpportunities = opportunities.filter(opp => ids.includes(opp.id));
    console.log(`🎯 Opportunities lookup: ${ids.length} IDs requested, ${matchedOpportunities.length} found`, { ids, available: opportunities.map(o => o.id), matched: matchedOpportunities.map(o => ({ id: o.id, name: o.name })) });
    return matchedOpportunities;
  };
  
  const getPeopleByIds = (ids: string[]) => {
    if (!ids || ids.length === 0) return [];
    const matchedPeople = people.filter(person => ids.includes(person.id));
    console.log(`👥 People lookup: ${ids.length} IDs requested, ${matchedPeople.length} found`, { ids, available: people.map(p => p.id), matched: matchedPeople.map(p => ({ id: p.id, name: p.fullName })) });
    return matchedPeople;
  };
  
  const getOrganizationByName = (name: string) => {
    if (!name || name.trim() === '') return undefined;
    
    // Try exact match first
    let matchedOrg = organizations.find(org => org.name === name);
    
    // If no exact match, try case-insensitive and trimmed
    if (!matchedOrg) {
      const normalizedName = name.trim().toLowerCase();
      matchedOrg = organizations.find(org => org.name.trim().toLowerCase() === normalizedName);
    }
    
    console.log(`🏢 Organization lookup for "${name}": ${matchedOrg ? 'FOUND' : 'NOT FOUND'}`, {
      searchName: name,
      found: matchedOrg ? { id: matchedOrg.id, name: matchedOrg.name } : null,
      availableOrgs: organizations.map(o => o.name)
    });
    
    return matchedOrg;
  };
  
  // Enhanced Organization Card Component
  const OrganizationCard = ({ org }: { org: Organization }) => {
    const isExpanded = expandedCards.has(org.id);
    
    // Debug: Log the raw relationship data
    console.log(`🏢 Organization "${org.name}" relationships:`);
    console.log('  - keyContacts:', org.keyContacts);
    console.log('  - relatedProjects:', org.relatedProjects);
    console.log('  - activeOpportunities:', org.activeOpportunities);
    
    const linkedPeople = getPeopleByIds(org.keyContacts || []);
    const linkedProjects = getProjectsByIds(org.relatedProjects || []);
    const linkedOpportunities = getOpportunitiesByIds(org.activeOpportunities || []);
    
    return (
      <Card
        hoverable
        className="flex flex-col h-full transition-all duration-200"
        onClick={() => toggleCardExpansion(org.id)}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate pr-2">
              {org.name}
            </h3>
            <p className="text-sm text-gray-500">{org.type}</p>
            {org.description && (
              <p className="text-sm text-gray-600 mt-1 line-clamp-2">{org.description}</p>
            )}
          </div>
          <Badge variant={getRelationshipVariant(org.relationshipStatus)} size="sm">
            {org.relationshipStatus}
          </Badge>
        </div>
        
        {/* Quick Stats */}
        <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
          <div className="flex items-center space-x-4">
            <span>👥 {linkedPeople.length} contacts</span>
            <span>💼 {linkedProjects.length} projects</span>
            <span>🎯 {linkedOpportunities.length} opportunities</span>
          </div>
          {org.location && (
            <span className="text-xs bg-gray-100 px-2 py-1 rounded">{org.location}</span>
          )}
        </div>
        
        {/* Contact Info */}
        {(org.website || org.nextContactDate) && (
          <div className="text-xs text-gray-500 space-y-1 mb-3">
            {org.website && (
              <div>🌐 <a href={org.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{org.website}</a></div>
            )}
            {org.nextContactDate && (
              <div>📅 Next contact: {new Date(org.nextContactDate).toLocaleDateString()}</div>
            )}
          </div>
        )}
        
        {/* Expandable Details */}
        {isExpanded && (
          <div className="mt-4 pt-4 border-t space-y-4">
            {/* Linked People */}
            {linkedPeople.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">👥 Key Contacts ({linkedPeople.length})</h4>
                <div className="space-y-2">
                  {linkedPeople.slice(0, 3).map(person => (
                    <div key={person.id} className="flex items-center justify-between text-sm">
                      <div>
                        <span className="font-medium">{person.fullName}</span>
                        {person.roleTitle && <span className="text-gray-500 ml-2">{person.roleTitle}</span>}
                      </div>
                      {person.email && (
                        <a href={`mailto:${person.email}`} className="text-blue-600 hover:underline text-xs">✉️</a>
                      )}
                    </div>
                  ))}
                  {linkedPeople.length > 3 && (
                    <div className="text-xs text-gray-500">... and {linkedPeople.length - 3} more</div>
                  )}
                </div>
              </div>
            )}
            
            {/* Linked Projects */}
            {linkedProjects.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">💼 Related Projects ({linkedProjects.length})</h4>
                <div className="space-y-1">
                  {linkedProjects.slice(0, 3).map(project => (
                    <div key={project.id} className="text-sm">
                      <span className="font-medium">{project.name}</span>
                      <Badge variant="outline" size="xs" className="ml-2">{project.status}</Badge>
                    </div>
                  ))}
                  {linkedProjects.length > 3 && (
                    <div className="text-xs text-gray-500">... and {linkedProjects.length - 3} more</div>
                  )}
                </div>
              </div>
            )}
            
            {/* Linked Opportunities */}
            {linkedOpportunities.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">🎯 Active Opportunities ({linkedOpportunities.length})</h4>
                <div className="space-y-1">
                  {linkedOpportunities.slice(0, 3).map(opp => (
                    <div key={opp.id} className="flex items-center justify-between text-sm">
                      <span className="font-medium">{opp.name}</span>
                      <span className="text-green-600 font-semibold">${opp.amount.toLocaleString()}</span>
                    </div>
                  ))}
                  {linkedOpportunities.length > 3 && (
                    <div className="text-xs text-gray-500">... and {linkedOpportunities.length - 3} more</div>
                  )}
                </div>
              </div>
            )}
            
            {/* Notes */}
            {org.notes && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">📝 Notes</h4>
                <p className="text-sm text-gray-600 line-clamp-3">{org.notes}</p>
              </div>
            )}
          </div>
        )}
        
        {/* Expand Indicator */}
        <div className="mt-auto pt-3 text-center">
          <div className="text-xs text-gray-400">
            {isExpanded ? '🔼 Click to collapse' : '🔽 Click to expand details'}
          </div>
        </div>
      </Card>
    );
  };
  
  // Enhanced People Card Component
  const PersonCard = ({ person }: { person: Person }) => {
    const isExpanded = expandedCards.has(person.id);
    
    // Debug: Log the raw relationship data
    console.log(`👤 Person "${person.fullName}" relationships:`);
    console.log('  - organization:', person.organization);
    console.log('  - relatedProjects:', person.relatedProjects);
    console.log('  - relatedOpportunities:', person.relatedOpportunities);
    
    const linkedOrg = getOrganizationByName(person.organization);
    const linkedProjects = getProjectsByIds(person.relatedProjects || []);
    const linkedOpportunities = getOpportunitiesByIds(person.relatedOpportunities || []);
    
    return (
      <Card
        hoverable
        className="flex flex-col h-full transition-all duration-200"
        onClick={() => toggleCardExpansion(person.id)}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate pr-2">
              {person.fullName}
            </h3>
            <p className="text-sm text-gray-500">{person.roleTitle}</p>
            <p className="text-sm text-gray-700">{person.organization}</p>
          </div>
          <Badge variant={getRelationshipVariant(person.relationshipType)} size="sm">
            {person.relationshipType}
          </Badge>
        </div>
        
        {/* Quick Stats */}
        <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
          <div className="flex items-center space-x-4">
            <span>💼 {linkedProjects.length} projects</span>
            <span>🎯 {linkedOpportunities.length} opportunities</span>
            {person.influenceLevel && <span>⭐ {person.influenceLevel}</span>}
          </div>
        </div>
        
        {/* Contact Info */}
        <div className="text-xs text-gray-500 space-y-1 mb-3">
          {person.email && (
            <div>✉️ <a href={`mailto:${person.email}`} className="text-blue-600 hover:underline">{person.email}</a></div>
          )}
          {person.phone && <div>📞 {person.phone}</div>}
          {person.linkedin && (
            <div>💼 <a href={person.linkedin} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">LinkedIn</a></div>
          )}
          {person.nextContactDate && (
            <div>📅 Next contact: {new Date(person.nextContactDate).toLocaleDateString()}</div>
          )}
        </div>
        
        {/* Expandable Details */}
        {isExpanded && (
          <div className="mt-4 pt-4 border-t space-y-4">
            {/* Linked Organization */}
            {linkedOrg && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">🏢 Organization</h4>
                <div className="flex items-center justify-between text-sm">
                  <div>
                    <span className="font-medium">{linkedOrg.name}</span>
                    <span className="text-gray-500 ml-2">{linkedOrg.type}</span>
                  </div>
                  <Badge variant={getRelationshipVariant(linkedOrg.relationshipStatus)} size="xs">
                    {linkedOrg.relationshipStatus}
                  </Badge>
                </div>
              </div>
            )}
            
            {/* Linked Projects */}
            {linkedProjects.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">💼 Related Projects ({linkedProjects.length})</h4>
                <div className="space-y-1">
                  {linkedProjects.slice(0, 3).map(project => (
                    <div key={project.id} className="text-sm">
                      <span className="font-medium">{project.name}</span>
                      <Badge variant="outline" size="xs" className="ml-2">{project.status}</Badge>
                    </div>
                  ))}
                  {linkedProjects.length > 3 && (
                    <div className="text-xs text-gray-500">... and {linkedProjects.length - 3} more</div>
                  )}
                </div>
              </div>
            )}
            
            {/* Linked Opportunities */}
            {linkedOpportunities.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">🎯 Related Opportunities ({linkedOpportunities.length})</h4>
                <div className="space-y-1">
                  {linkedOpportunities.slice(0, 3).map(opp => (
                    <div key={opp.id} className="flex items-center justify-between text-sm">
                      <span className="font-medium">{opp.name}</span>
                      <span className="text-green-600 font-semibold">${opp.amount.toLocaleString()}</span>
                    </div>
                  ))}
                  {linkedOpportunities.length > 3 && (
                    <div className="text-xs text-gray-500">... and {linkedOpportunities.length - 3} more</div>
                  )}
                </div>
              </div>
            )}
            
            {/* Interests & Expertise */}
            {(person.interests?.length > 0 || person.expertise?.length > 0) && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">🎯 Interests & Expertise</h4>
                <div className="flex flex-wrap gap-1">
                  {person.interests?.slice(0, 3).map((interest, idx) => (
                    <Badge key={idx} variant="outline" size="xs" className="bg-blue-50 text-blue-700">
                      {interest}
                    </Badge>
                  ))}
                  {person.expertise?.slice(0, 3).map((skill, idx) => (
                    <Badge key={idx} variant="outline" size="xs" className="bg-green-50 text-green-700">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            {/* Notes */}
            {person.notes && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">📝 Notes</h4>
                <p className="text-sm text-gray-600 line-clamp-3">{person.notes}</p>
              </div>
            )}
          </div>
        )}
        
        {/* Expand Indicator */}
        <div className="mt-auto pt-3 text-center">
          <div className="text-xs text-gray-400">
            {isExpanded ? '🔼 Click to collapse' : '🔽 Click to expand details'}
          </div>
        </div>
      </Card>
    );
  };
  
  // Filter options for Organizations
  const orgFilterOptions = [
    {
      id: 'relationshipStatus',
      label: 'Relationship Status',
      type: 'multiselect' as const,
      options: STATUS_OPTIONS.ORGANIZATION.map(status => ({
        value: status.value,
        label: status.label
      }))
    },
    {
      id: 'type',
      label: 'Organization Type',
      type: 'search' as const,
      placeholder: 'Filter by type...'
    },
    {
      id: 'location',
      label: 'Location',
      type: 'search' as const,
      placeholder: 'Filter by location...'
    }
  ];

  // Filter options for People
  const peopleFilterOptions = [
    {
      id: 'organization',
      label: 'Organization',
      type: 'search' as const,
      placeholder: 'Filter by organization...'
    },
    {
      id: 'relationshipType',
      label: 'Relationship Type',
      type: 'search' as const,
      placeholder: 'Filter by relationship type...'
    },
    {
      id: 'influenceLevel',
      label: 'Influence Level',
      type: 'search' as const,
      placeholder: 'Filter by influence level...'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Network</h1>
            <p className="text-gray-500">Rich relationship management with connected insights</p>
          </div>
          <div className="mt-4 sm:mt-0 text-sm text-gray-500">
            <div className="flex items-center space-x-4">
              <span>🏢 {organizations.length} organizations</span>
              <span>👥 {people.length} people</span>
              <span>💼 {projects.length} projects</span>
              <span>🎯 {opportunities.length} opportunities</span>
              <span>🔗 {organizations.reduce((sum, org) => sum + (org.keyContacts?.length || 0), 0)} connections</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'organizations'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => setActiveTab('organizations')}
            >
              Organizations
            </button>
            <button
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'people'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => setActiveTab('people')}
            >
              People
            </button>
          </nav>
        </div>
      </div>

      {/* Organizations Tab */}
      {activeTab === 'organizations' && (
        <>
          {/* Search and Filters */}
          <div className="space-y-4 mb-6">
            <SearchBar
              placeholder="Search organizations..."
              value={orgFilters.search || ''}
              onChange={(value) => setOrgFilters(prev => ({ ...prev, search: value || undefined }))}
              className="max-w-md"
            />
            
            <ModernFilterPanel
              filters={orgFilters}
              options={orgFilterOptions}
              onFiltersChange={setOrgFilters}
              onReset={resetOrgFilters}
              isLoading={orgsLoading}
            />
          </div>

          {/* Organizations List */}
          {orgsLoading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : orgsError ? (
            <ErrorState
              message="Error loading organizations"
              details="There was a problem fetching the organizations. Please try again."
              onRetry={() => refetchOrgs()}
            />
          ) : organizations.length === 0 ? (
            <EmptyState
              title="No organizations found"
              description="Try adjusting your filters or add a new organization."
              icon={
                <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
              }
            />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {organizations.map((org) => (
                <OrganizationCard key={org.id} org={org} />
              ))}
            </div>
          )}
        </>
      )}

      {/* People Tab */}
      {activeTab === 'people' && (
        <>
          {/* Search and Filters */}
          <div className="space-y-4 mb-6">
            <SearchBar
              placeholder="Search people..."
              value={peopleFilters.search || ''}
              onChange={(value) => setPeopleFilters(prev => ({ ...prev, search: value || undefined }))}
              className="max-w-md"
            />
            
            <ModernFilterPanel
              filters={peopleFilters}
              options={peopleFilterOptions}
              onFiltersChange={setPeopleFilters}
              onReset={resetPeopleFilters}
              isLoading={peopleLoading}
            />
          </div>

          {/* People List */}
          {peopleLoading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : peopleError ? (
            <ErrorState
              message="Error loading people"
              details="There was a problem fetching the people. Please try again."
              onRetry={() => refetchPeople()}
            />
          ) : people.length === 0 ? (
            <EmptyState
              title="No people found"
              description="Try adjusting your filters or add a new person."
              icon={
                <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              }
            />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {people.map((person) => (
                <PersonCard key={person.id} person={person} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default NetworkPage;