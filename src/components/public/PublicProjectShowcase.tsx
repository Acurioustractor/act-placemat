import { useState, useMemo } from 'react';
import { 
  MapPinIcon,
  CalendarDaysIcon,
  CurrencyDollarIcon,
  UsersIcon,
  EyeIcon,
  ArrowTopRightOnSquareIcon,
  ChevronRightIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';
import { useProjects } from '../../hooks';
import { ProjectStatus, ProjectPlace } from '../../types';

interface PublicProject {
  id: string;
  name: string;
  description: string;
  aiSummary?: string;
  place: ProjectPlace;
  location: string;
  state: string;
  status: ProjectStatus;
  themes: string[];
  tags: string[];
  revenueActual: number;
  startDate?: Date;
  partnerOrganizations: string[];
  websiteLinks?: string;
}

interface ShowcaseFilters {
  place: ProjectPlace | 'all';
  theme: string | 'all';
  status: ProjectStatus | 'all';
}

/**
 * Public-facing project showcase component
 * Displays ACT projects in an engaging, filterable view for community visibility
 */
const PublicProjectShowcase = () => {
  const { data: allProjects = [] } = useProjects();
  const [selectedProject, setSelectedProject] = useState<PublicProject | null>(null);
  const [filters, setFilters] = useState<ShowcaseFilters>({
    place: 'all',
    theme: 'all',
    status: 'all'
  });
  const [showFilters, setShowFilters] = useState(false);

  // Filter projects for public display (only active/harvest projects)
  const publicProjects = useMemo(() => {
    return allProjects
      .filter(project => 
        project.status === ProjectStatus.ACTIVE
      )
      .map(project => ({
        ...project,
        // Sanitize sensitive information for public view
        revenueActual: Math.round(project.revenueActual / 1000) * 1000, // Round to nearest thousand
        description: project.aiSummary || project.description || 'Empowering communities through innovative approaches.',
      }));
  }, [allProjects]);

  // Apply filters
  const filteredProjects = useMemo(() => {
    return publicProjects.filter(project => {
      if (filters.place !== 'all' && project.place !== filters.place) return false;
      if (filters.theme !== 'all' && !project.themes.includes(filters.theme)) return false;
      if (filters.status !== 'all' && project.status !== filters.status) return false;
      return true;
    });
  }, [publicProjects, filters]);

  // Get unique themes for filtering
  const availableThemes = useMemo(() => {
    const themes = new Set<string>();
    publicProjects.forEach(project => {
      project.themes.forEach(theme => themes.add(theme));
    });
    return Array.from(themes).sort();
  }, [publicProjects]);

  // Get place display info
  const getPlaceInfo = (place: ProjectPlace) => {
    switch (place) {
      case ProjectPlace.COMMUNITY:
        return { label: 'Community', color: 'bg-green-100 text-green-800', icon: '🌱' };
      case ProjectPlace.REGIONAL:
        return { label: 'Regional', color: 'bg-blue-100 text-blue-800', icon: '🌿' };
      case ProjectPlace.NATIONAL:
        return { label: 'National', color: 'bg-purple-100 text-purple-800', icon: '🌳' };
      case ProjectPlace.INTERNATIONAL:
        return { label: 'International', color: 'bg-orange-100 text-orange-800', icon: '🌲' };
      default:
        return { label: 'Community', color: 'bg-gray-100 text-gray-800', icon: '🌱' };
    }
  };

  // Calculate summary stats
  const stats = useMemo(() => {
    const active = filteredProjects.filter(p => p.status === ProjectStatus.ACTIVE).length;
    const totalImpact = filteredProjects.reduce((sum, p) => sum + p.revenueActual, 0);
    const locations = new Set(filteredProjects.map(p => p.state || p.location)).size;
    const partnerships = new Set(
      filteredProjects.flatMap(p => p.partnerOrganizations)
    ).size;

    return { active, totalImpact, locations, partnerships };
  }, [filteredProjects]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-800 text-white">
        <div className="max-w-7xl mx-auto px-4 py-16">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              ACT Projects Showcase
            </h1>
            <p className="text-xl md:text-2xl text-primary-100 mb-8 max-w-3xl mx-auto">
              Discover our community-driven projects creating positive impact across Australia and beyond
            </p>
            
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-12">
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold">{stats.active}</div>
                <div className="text-primary-200">Active Projects</div>
              </div>
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold">
                  ${(stats.totalImpact / 1000).toFixed(0)}K
                </div>
                <div className="text-primary-200">Community Impact</div>
              </div>
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold">{stats.locations}</div>
                <div className="text-primary-200">Locations</div>
              </div>
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold">{stats.partnerships}</div>
                <div className="text-primary-200">Partnerships</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-gray-900">
            Our Projects ({filteredProjects.length})
          </h2>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <FunnelIcon className="h-4 w-4" />
            Filters
          </button>
        </div>

        {showFilters && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Scale
                </label>
                <select
                  value={filters.place}
                  onChange={(e) => setFilters({ ...filters, place: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                >
                  <option value="all">All Scales</option>
                  <option value={ProjectPlace.COMMUNITY}>Community</option>
                  <option value={ProjectPlace.REGIONAL}>Regional</option>
                  <option value={ProjectPlace.NATIONAL}>National</option>
                  <option value={ProjectPlace.INTERNATIONAL}>International</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Theme
                </label>
                <select
                  value={filters.theme}
                  onChange={(e) => setFilters({ ...filters, theme: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                >
                  <option value="all">All Themes</option>
                  {availableThemes.map(theme => (
                    <option key={theme} value={theme}>{theme}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                >
                  <option value="all">All Statuses</option>
                  <option value={ProjectStatus.ACTIVE}>Active</option>
                  <option value={ProjectStatus.IDEATION}>Ideation</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Projects Grid */}
      <div className="max-w-7xl mx-auto px-4 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => {
            const placeInfo = getPlaceInfo(project.place);
            
            return (
              <div
                key={project.id}
                className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-shadow duration-300 overflow-hidden cursor-pointer group"
                onClick={() => setSelectedProject(project)}
              >
                {/* Project Header */}
                <div className="p-6 pb-4">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                        {project.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${placeInfo.color}`}>
                          <span>{placeInfo.icon}</span>
                          {placeInfo.label}
                        </span>
                        {project.status === ProjectStatus.ACTIVE && (
                          <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                            Active
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRightIcon className="h-5 w-5 text-gray-400 group-hover:text-primary-600 transition-colors" />
                  </div>

                  <p className="text-gray-600 text-sm leading-relaxed line-clamp-3">
                    {project.description}
                  </p>
                </div>

                {/* Project Details */}
                <div className="px-6 pb-4 space-y-3">
                  <div className="flex items-center text-sm text-gray-500">
                    <MapPinIcon className="h-4 w-4 mr-2" />
                    {project.location || project.state || 'Australia'}
                  </div>

                  {project.startDate && (
                    <div className="flex items-center text-sm text-gray-500">
                      <CalendarDaysIcon className="h-4 w-4 mr-2" />
                      Started {new Date(project.startDate).getFullYear()}
                    </div>
                  )}

                  {project.revenueActual > 0 && (
                    <div className="flex items-center text-sm text-gray-500">
                      <CurrencyDollarIcon className="h-4 w-4 mr-2" />
                      ${(project.revenueActual / 1000).toFixed(0)}K impact
                    </div>
                  )}

                  {project.partnerOrganizations.length > 0 && (
                    <div className="flex items-center text-sm text-gray-500">
                      <UsersIcon className="h-4 w-4 mr-2" />
                      {project.partnerOrganizations.length} partner{project.partnerOrganizations.length !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>

                {/* Tags */}
                {project.themes.length > 0 && (
                  <div className="px-6 pb-6">
                    <div className="flex flex-wrap gap-2">
                      {project.themes.slice(0, 3).map((theme, idx) => (
                        <span
                          key={idx}
                          className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded"
                        >
                          {theme}
                        </span>
                      ))}
                      {project.themes.length > 3 && (
                        <span className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                          +{project.themes.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {filteredProjects.length === 0 && (
          <div className="text-center py-16">
            <EyeIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">No projects found</h3>
            <p className="text-gray-500 mb-6">Try adjusting your filters to see more projects.</p>
            <button
              onClick={() => setFilters({ place: 'all', theme: 'all', status: 'all' })}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>

      {/* Project Detail Modal */}
      {selectedProject && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-gray-900 bg-opacity-50 transition-opacity" onClick={() => setSelectedProject(null)} />
            
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl">
              <div className="p-8">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">
                      {selectedProject.name}
                    </h2>
                    <div className="flex items-center gap-3">
                      {(() => {
                        const placeInfo = getPlaceInfo(selectedProject.place);
                        return (
                          <span className={`inline-flex items-center gap-1 px-3 py-1 text-sm font-medium rounded-full ${placeInfo.color}`}>
                            <span>{placeInfo.icon}</span>
                            {placeInfo.label}
                          </span>
                        );
                      })()}
                      <span className="text-sm text-gray-500">
                        {selectedProject.location || selectedProject.state}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedProject(null)}
                    className="text-gray-400 hover:text-gray-600 text-2xl"
                  >
                    ×
                  </button>
                </div>

                <div className="prose prose-gray max-w-none mb-8">
                  <p className="text-lg leading-relaxed text-gray-700">
                    {selectedProject.description}
                  </p>
                </div>

                {/* Project Stats */}
                <div className="grid grid-cols-2 gap-6 mb-8 p-6 bg-gray-50 rounded-lg">
                  {selectedProject.revenueActual > 0 && (
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900">
                        ${(selectedProject.revenueActual / 1000).toFixed(0)}K
                      </div>
                      <div className="text-sm text-gray-500">Community Impact</div>
                    </div>
                  )}
                  
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">
                      {selectedProject.partnerOrganizations.length}
                    </div>
                    <div className="text-sm text-gray-500">Partnerships</div>
                  </div>
                </div>

                {/* Themes */}
                {selectedProject.themes.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Focus Areas</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedProject.themes.map((theme, idx) => (
                        <span
                          key={idx}
                          className="inline-block px-3 py-1 text-sm bg-primary-100 text-primary-800 rounded-full"
                        >
                          {theme}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-4">
                  {selectedProject.websiteLinks && (
                    <a
                      href={selectedProject.websiteLinks}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                    >
                      <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                      Visit Project
                    </a>
                  )}
                  <button
                    onClick={() => {
                      // Mock contact functionality
                      console.log('Contact about project:', selectedProject.name);
                    }}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Get Involved
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicProjectShowcase;