import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  ProjectCard,
  LoadingSpinner,
  EmptyState,
  ErrorState,
  SearchBar,
  Button
} from '../../components/ui';
import { ModernFilterPanel } from '../../components/ui/modern';
import { useProjects } from '../../hooks';
import { ProjectFilters, SortOption } from '../../types';
import { PROJECT_AREAS, PROJECT_SORT_OPTIONS, STATUS_OPTIONS, LOCATION_OPTIONS } from '../../constants';

/**
 * Projects page component
 * Displays list of projects with filtering options
 */
const ProjectsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const areaParam = searchParams.get('area');
  
  // Set up filters and sorting
  const [filters, setFilters] = useState<ProjectFilters>({
    area: areaParam ? [areaParam] : undefined,
  });
  
  const [sortOption, setSortOption] = useState<SortOption>(PROJECT_SORT_OPTIONS[0]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Update filters when URL parameters change
  useEffect(() => {
    const areaParam = searchParams.get('area');
    setFilters(prev => ({
      ...prev,
      area: areaParam ? [areaParam] : undefined,
    }));
  }, [searchParams]);

  // Fetch projects with filters and sorting
  const { data: projects = [], isLoading, error, refetch } = useProjects(filters, sortOption);

  const navigate = useNavigate();

  // Handle project navigation
  const handleProjectClick = (project: Record<string, unknown>) => {
    navigate(`/projects/${project.id}`);
  };

  // Reset filters
  const resetFilters = () => {
    setFilters({});
    searchParams.delete('area');
    setSearchParams(searchParams);
  };

  // Filter options for FilterPanel
  const filterOptions = [
    {
      id: 'area',
      label: 'Area',
      type: 'multiselect' as const,
      options: PROJECT_AREAS.map(area => ({
        value: area.value,
        label: area.label
      }))
    },
    {
      id: 'status',
      label: 'Status',
      type: 'multiselect' as const,
      options: STATUS_OPTIONS.PROJECT.map(status => ({
        value: status.value,
        label: status.label
      }))
    },
    {
      id: 'location',
      label: 'Location',
      type: 'multiselect' as const,
      options: LOCATION_OPTIONS.map(location => ({
        value: location.value,
        label: location.label
      }))
    },
    {
      id: 'revenueRange',
      label: 'Revenue Range',
      type: 'range' as const
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-gray-500">Manage and explore ACT projects</p>
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
                setSortOption({ field, direction: direction as 'asc' | 'desc', label: '' });
              }}
            >
              {PROJECT_SORT_OPTIONS.map((option) => (
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
                viewMode === 'grid'
                  ? 'bg-primary-50 text-primary-600 border-primary-300'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
              onClick={() => setViewMode('grid')}
            >
              Grid
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
          placeholder="Search projects..."
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

      {/* Projects List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : error ? (
        <ErrorState
          message="Error loading projects"
          details="There was a problem fetching the projects. Please try again."
          onRetry={() => refetch()}
        />
      ) : projects.length === 0 ? (
        <EmptyState
          title="No projects found"
          description="Try adjusting your filters or search terms."
          icon={
            <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
          }
          action={
            <Button variant="secondary" onClick={resetFilters}>
              Clear Filters
            </Button>
          }
        />
      ) : (
        <div className={
          viewMode === 'grid' 
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            : "space-y-4"
        }>
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onClick={handleProjectClick}
              className={viewMode === 'list' ? 'max-w-none' : ''}
            />
          ))}
        </div>
      )}
      
      {/* Results summary */}
      {!isLoading && !error && projects.length > 0 && (
        <div className="text-sm text-gray-500 text-center pt-6 border-t">
          Showing {projects.length} project{projects.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
};

export default ProjectsPage;