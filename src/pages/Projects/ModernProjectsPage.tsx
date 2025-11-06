import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  LoadingSpinner, 
  EmptyState, 
  ErrorState,
  Button 
} from '../../components/ui';
import ModernFilterPanel from '../../components/ui/ModernFilterPanel';
import ModernProjectCard from '../../components/ui/ModernProjectCard';
import ProjectDetailModal from '../../components/projects/ProjectDetailModal';
import { useProjects } from '../../hooks';
import { ProjectFilters, SortOption } from '../../types';
import { PROJECT_AREAS, PROJECT_SORT_OPTIONS, STATUS_OPTIONS, LOCATION_OPTIONS } from '../../constants';

const ModernProjectsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const areaParam = searchParams.get('area');
  
  // State management
  const [filters, setFilters] = useState<ProjectFilters>({
    area: areaParam ? [areaParam] : undefined,
  });
  
  const [sortOption, setSortOption] = useState<SortOption>(PROJECT_SORT_OPTIONS[0]);
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'featured'>('grid');
  const [selectedProject, setSelectedProject] = useState<Record<string, unknown> | null>(null);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);

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

  // Handle project click
  const handleProjectClick = (project: import('../../types').Project) => {
    setSelectedProject(project as Record<string, unknown>);
    setIsProjectModalOpen(true);
  };

  // Reset filters
  const resetFilters = () => {
    setFilters({});
    searchParams.delete('area');
    setSearchParams(searchParams);
  };

  // Filter options for ModernFilterPanel
  const filterOptions = [
    {
      id: 'search',
      label: 'Search',
      type: 'search' as const,
      placeholder: 'Search projects by name, description, or lead...'
    },
    {
      id: 'area',
      label: 'Themes',
      type: 'multiselect' as const,
      options: PROJECT_AREAS.map(area => ({
        value: area.value,
        label: area.label,
        icon: area.icon,
        color: area.color,
        count: projects.filter(p => p.themes?.includes(area.value)).length
      }))
    },
    {
      id: 'status',
      label: 'Status',
      type: 'multiselect' as const,
      options: STATUS_OPTIONS.PROJECT.map(status => ({
        value: status.value,
        label: status.label,
        count: projects.filter(p => p.status === status.value).length
      }))
    },
    {
      id: 'location',
      label: 'Location',
      type: 'multiselect' as const,
      options: LOCATION_OPTIONS.map(location => ({
        value: location.value,
        label: location.label,
        count: projects.filter(p => p.location === location.value).length
      }))
    },
    {
      id: 'revenueRange',
      label: 'Revenue Range (AUD)',
      type: 'range' as const,
      min: 0,
      max: 1000000
    }
  ];

  // View mode options
  const viewModeOptions = [
    { id: 'featured', label: 'Featured', icon: '⭐' },
    { id: 'grid', label: 'Grid', icon: '⊞' },
    { id: 'list', label: 'List', icon: '☰' }
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600 font-medium">Loading projects...</p>
          <p className="text-sm text-gray-500">Fetching the latest data from Notion</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        message="Error loading projects"
        details="There was a problem fetching the projects. Please try again."
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="bg-gradient-to-r from-white via-primary-50/50 to-blue-50/50 -mx-6 -mt-6 px-6 pt-6 pb-8 border-b border-gray-200/50">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
          <div className="mb-4 lg:mb-0">
            <h1 className="text-3xl font-bold text-gradient-primary mb-2">Projects</h1>
            <p className="text-gray-600">Manage and explore ACT social impact projects</p>
            <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
              <span className="flex items-center">
                <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                {projects.filter(p => p.status?.includes('Active')).length} Active
              </span>
              <span className="flex items-center">
                <span className="w-2 h-2 bg-blue-400 rounded-full mr-2"></span>
                {projects.length} Total
              </span>
              <span className="flex items-center">
                <span className="w-2 h-2 bg-purple-400 rounded-full mr-2"></span>
                {new Set(projects.flatMap(p => p.themes || [])).size} Themes
              </span>
            </div>
          </div>
          
          {/* Controls */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-3">
            {/* Sort dropdown */}
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Sort by:</label>
              <select
                className="input-modern select-modern min-w-0 w-auto"
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
            <div className="flex rounded-xl border border-gray-200 bg-white/80 backdrop-blur-sm p-1">
              {viewModeOptions.map((mode) => (
                <button
                  key={mode.id}
                  className={`px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                    viewMode === mode.id
                      ? 'bg-primary-500 text-white shadow-lg scale-105'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                  onClick={() => setViewMode(mode.id as 'grid' | 'list' | 'featured')}
                >
                  <span className="mr-1">{mode.icon}</span>
                  {mode.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <ModernFilterPanel
        filters={filters}
        options={filterOptions}
        onFiltersChange={setFilters}
        onReset={resetFilters}
        isLoading={isLoading}
        showActiveCount={true}
      />

      {/* Projects Grid */}
      {projects.length === 0 ? (
        <EmptyState
          title="No projects found"
          description="Try adjusting your filters or search terms to find projects."
          icon={
            <div className="w-16 h-16 bg-gradient-to-br from-primary-100 to-blue-100 rounded-2xl flex items-center justify-center">
              <svg className="h-8 w-8 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
            </div>
          }
          action={{
            label: "Clear Filters",
            onClick: resetFilters
          }}
        />
      ) : (
        <>
          {/* Results header */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing <span className="font-semibold text-gray-900">{projects.length}</span> project{projects.length !== 1 ? 's' : ''}
              {Object.keys(filters).some(key => filters[key]) && (
                <span className="ml-1">with active filters</span>
              )}
            </div>
            
            {Object.keys(filters).some(key => filters[key]) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Clear All
              </Button>
            )}
          </div>

          {/* Projects grid */}
          <div className={`
            ${viewMode === 'featured' 
              ? "grid grid-cols-1 lg:grid-cols-2 gap-8"
              : viewMode === 'grid' 
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                : "space-y-4"
            }
          `}>
            {projects.map((project, index) => (
              <div
                key={project.id}
                className="scale-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <ModernProjectCard
                  project={project}
                  onClick={handleProjectClick}
                  variant={viewMode === 'featured' ? 'featured' : viewMode === 'list' ? 'compact' : 'default'}
                  className={viewMode === 'list' ? 'max-w-none' : ''}
                />
              </div>
            ))}
          </div>
        </>
      )}

      {/* Project Detail Modal */}
      <ProjectDetailModal
        project={selectedProject}
        isOpen={isProjectModalOpen}
        onClose={() => {
          setIsProjectModalOpen(false);
          setSelectedProject(null);
        }}
      />
    </div>
  );
};

export default ModernProjectsPage;