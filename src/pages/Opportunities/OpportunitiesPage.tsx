import { useState } from 'react';
import { 
  Card, 
  Badge, 
  LoadingSpinner, 
  EmptyState, 
  ErrorState, 
  SearchBar,
  Button 
} from '../../components/ui';
import { ModernFilterPanel } from '../../components/ui/modern';
import { useOpportunities } from '../../hooks';
import { OpportunityFilters, SortOption } from '../../types';
import { OPPORTUNITY_STAGES, PROBABILITY_OPTIONS } from '../../constants';

/**
 * Opportunities page component with modern filters
 * Displays list of opportunities with filtering options
 */
const OpportunitiesPage = () => {
  // Set up filters and sorting
  const [filters, setFilters] = useState<OpportunityFilters>({});
  const [sortOption, setSortOption] = useState<SortOption>({
    field: 'amount',
    direction: 'desc',
    label: 'Amount (High to Low)'
  });
  const [viewMode, setViewMode] = useState<'pipeline' | 'list'>('pipeline');
  
  // Fetch opportunities with filters
  const { data: opportunities = [], isLoading, error, refetch } = useOpportunities(filters, sortOption);

  // Reset filters
  const resetFilters = () => {
    setFilters({});
  };

  // Get stage badge variant
  const getStageVariant = (stage: string): 'primary' | 'success' | 'warning' | 'danger' | 'default' => {
    switch (stage) {
      case 'Discovery':
        return 'default';
      case 'Applied':
        return 'primary';
      case 'Negotiation':
        return 'warning';
      case 'Closed Won':
        return 'success';
      case 'Closed Lost':
        return 'danger';
      default:
        return 'default';
    }
  };

  // Filter options for FilterPanel
  const filterOptions = [
    {
      id: 'stage',
      label: 'Stage',
      type: 'multiselect' as const,
      options: OPPORTUNITY_STAGES.map(stage => ({
        value: stage.value,
        label: stage.label
      }))
    },
    {
      id: 'probability',
      label: 'Probability',
      type: 'multiselect' as const,
      options: PROBABILITY_OPTIONS.map(prob => ({
        value: prob.value,
        label: prob.label
      }))
    },
    {
      id: 'organization',
      label: 'Organization',
      type: 'text' as const,
      placeholder: 'Filter by organization...'
    },
    {
      id: 'amountRange',
      label: 'Amount Range',
      type: 'range' as const
    }
  ];

  // Sort options
  const sortOptions = [
    { field: 'amount', direction: 'desc', label: 'Amount (High to Low)' },
    { field: 'amount', direction: 'asc', label: 'Amount (Low to High)' },
    { field: 'weightedValue', direction: 'desc', label: 'Weighted Value (High to Low)' },
    { field: 'probability', direction: 'desc', label: 'Probability (High to Low)' },
    { field: 'deadline', direction: 'asc', label: 'Deadline (Soonest First)' },
    { field: 'name', direction: 'asc', label: 'Name (A-Z)' }
  ];

  // Group opportunities by stage for pipeline view
  const opportunitiesByStage = opportunities.reduce((acc, opportunity) => {
    const stage = opportunity.stage;
    if (!acc[stage]) {
      acc[stage] = [];
    }
    acc[stage].push(opportunity);
    return acc;
  }, {} as Record<string, typeof opportunities>);

  // Get sorted stages that have opportunities
  const sortedStages = OPPORTUNITY_STAGES.filter(stage => 
    opportunitiesByStage[stage.value] && opportunitiesByStage[stage.value].length > 0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Opportunities</h1>
          <p className="text-gray-500">Manage and track funding opportunities</p>
        </div>
        
        <div className="mt-4 sm:mt-0 flex items-center space-x-2">
          {/* Sort dropdown */}
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Sort by:</label>
            <select
              className="rounded-md border-gray-300 text-sm focus:border-primary-500 focus:ring-primary-500"
              value={`${sortOption.field}-${sortOption.direction}`}
              onChange={(e) => {
                const [field, direction] = e.target.value.split('-');
                const selectedSort = sortOptions.find(s => s.field === field && s.direction === direction);
                if (selectedSort) setSortOption(selectedSort);
              }}
            >
              {sortOptions.map((option) => (
                <option key={`${option.field}-${option.direction}`} value={`${option.field}-${option.direction}`}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          
          {/* View mode toggle */}
          <div className="flex rounded-md border border-gray-300">
            <button
              className={`px-3 py-1 text-sm ${
                viewMode === 'pipeline'
                  ? 'bg-primary-50 text-primary-600 border-primary-300'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
              onClick={() => setViewMode('pipeline')}
            >
              Pipeline
            </button>
            <button
              className={`px-3 py-1 text-sm border-l ${
                viewMode === 'list'
                  ? 'bg-primary-50 text-primary-600 border-primary-300'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
              onClick={() => setViewMode('list')}
            >
              List
            </button>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        <SearchBar
          placeholder="Search opportunities..."
          value={filters.search || ''}
          onChange={(value) => setFilters(prev => ({ ...prev, search: value || undefined }))}
          className="max-w-md"
        />
        
        <ModernFilterPanel
          filters={filters}
          options={filterOptions}
          onFiltersChange={setFilters}
          onReset={resetFilters}
          isLoading={isLoading}
        />
      </div>

      {/* Opportunities Content */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : error ? (
        <ErrorState
          message="Error loading opportunities"
          details="There was a problem fetching the opportunities. Please try again."
          onRetry={() => refetch()}
        />
      ) : opportunities.length === 0 ? (
        <EmptyState
          title="No opportunities found"
          description="Try adjusting your filters or search terms."
          icon={
            <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
          action={
            <Button variant="secondary" onClick={resetFilters}>
              Clear Filters
            </Button>
          }
        />
      ) : viewMode === 'pipeline' ? (
        /* Pipeline View */
        <div className="space-y-8">
          {sortedStages.map((stageConfig) => (
            <div key={stageConfig.value}>
              <div className="flex items-center mb-4">
                <div
                  className="w-3 h-3 rounded-full mr-3"
                  style={{ backgroundColor: stageConfig.color }}
                />
                <h2 className="text-lg font-semibold text-gray-900">
                  {stageConfig.icon} {stageConfig.label}
                </h2>
                <span className="ml-2 px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                  {opportunitiesByStage[stageConfig.value].length}
                </span>
                <div className="ml-4 text-sm text-gray-500">
                  ${opportunitiesByStage[stageConfig.value]
                    .reduce((sum, opp) => sum + opp.amount, 0)
                    .toLocaleString()} total
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {opportunitiesByStage[stageConfig.value].map((opportunity) => (
                  <Card
                    key={opportunity.id}
                    hoverable
                    className="flex flex-col h-full"
                    onClick={() => console.log('Navigate to opportunity', opportunity.id)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-semibold text-gray-900 truncate">
                          {opportunity.name}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">{opportunity.organization}</p>
                      </div>
                      <Badge variant={getStageVariant(opportunity.stage)} size="sm">
                        {opportunity.stage}
                      </Badge>
                    </div>
                    
                    <div className="mt-auto space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="text-lg font-semibold text-gray-900">
                          ${opportunity.amount.toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-500">
                          {opportunity.probability}% chance
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Weighted Value:</span>
                        <span className="font-medium text-green-600">
                          ${opportunity.weightedValue.toLocaleString()}
                        </span>
                      </div>
                      
                      {opportunity.deadline && (
                        <div className="text-xs text-gray-500 pt-2 border-t">
                          Deadline: {new Date(opportunity.deadline).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* List View */
        <div className="space-y-4">
          {opportunities.map((opportunity) => (
            <Card
              key={opportunity.id}
              hoverable
              className="p-6"
              onClick={() => console.log('Navigate to opportunity', opportunity.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-3">
                    <h3 className="text-lg font-semibold text-gray-900 truncate">
                      {opportunity.name}
                    </h3>
                    <Badge variant={getStageVariant(opportunity.stage)} size="sm">
                      {opportunity.stage}
                    </Badge>
                  </div>
                  <p className="text-gray-600 mt-1">{opportunity.organization}</p>
                </div>
                
                <div className="flex items-center space-x-6 text-sm">
                  <div className="text-right">
                    <div className="text-lg font-semibold text-gray-900">
                      ${opportunity.amount.toLocaleString()}
                    </div>
                    <div className="text-gray-500">
                      {opportunity.probability}% probability
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="font-medium text-green-600">
                      ${opportunity.weightedValue.toLocaleString()}
                    </div>
                    <div className="text-gray-500">Weighted</div>
                  </div>
                  
                  {opportunity.deadline && (
                    <div className="text-right">
                      <div className="text-gray-900">
                        {new Date(opportunity.deadline).toLocaleDateString()}
                      </div>
                      <div className="text-gray-500">Deadline</div>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
      
      {/* Results summary */}
      {!isLoading && !error && opportunities.length > 0 && (
        <div className="text-sm text-gray-500 text-center pt-6 border-t">
          <div className="flex justify-center space-x-8">
            <span>Showing {opportunities.length} opportunit{opportunities.length !== 1 ? 'ies' : 'y'}</span>
            <span>
              Total Value: ${opportunities.reduce((sum, opp) => sum + opp.amount, 0).toLocaleString()}
            </span>
            <span>
              Weighted Value: ${opportunities.reduce((sum, opp) => sum + opp.weightedValue, 0).toLocaleString()}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default OpportunitiesPage;