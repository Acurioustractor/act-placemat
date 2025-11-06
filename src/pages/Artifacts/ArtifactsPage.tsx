import { useState } from 'react';
import { LoadingSpinner, EmptyState, ErrorState } from '../../components/ui';
import { useArtifacts } from '../../hooks';
import { ArtifactFilters, ArtifactType, ArtifactStatus, ArtifactFormat } from '../../types';
import { COMMUNITY_COLORS } from '../../constants/designSystem';

/**
 * Artifacts page component
 * Displays list of artifacts with filtering options and links to related entities
 */
const ArtifactsPage = () => {
  // Set up filters
  const [filters, setFilters] = useState<ArtifactFilters>({});
  
  // Fetch artifacts with filters
  const { data: artifacts = [], isLoading, error, refetch } = useArtifacts(filters);

  // Group artifacts by type
  const artifactsByType = artifacts.reduce((acc, artifact) => {
    const type = artifact.type || 'Other';
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(artifact);
    return acc;
  }, {} as Record<string, typeof artifacts>);

  // Get status badge variant - currently unused
  /*
  const getStatusVariant = (status: string): 'primary' | 'success' | 'warning' | 'danger' | 'default' => {
    switch (status) {
      case ArtifactStatus.DRAFT:
        return 'default';
      case ArtifactStatus.REVIEW:
        return 'warning';
      case ArtifactStatus.APPROVED:
        return 'primary';
      case ArtifactStatus.PUBLISHED:
        return 'success';
      case ArtifactStatus.ARCHIVED:
        return 'danger';
      default:
        return 'default';
    }
  };
  */

  // Get format icon
  const getFormatIcon = (format: string) => {
    switch (format) {
      case ArtifactFormat.PDF:
        return '📄';
      case ArtifactFormat.DOC:
        return '📝';
      case ArtifactFormat.SLIDE:
        return '🎯';
      case ArtifactFormat.SPREADSHEET:
        return '📊';
      case ArtifactFormat.IMAGE:
        return '🖼️';
      case ArtifactFormat.VIDEO:
        return '🎥';
      case ArtifactFormat.AUDIO:
        return '🎵';
      case ArtifactFormat.WEB:
        return '🌐';
      default:
        return '📎';
    }
  };

  // Get status colors matching the modern design system
  const getStatusColor = (status: string): { bg: string; text: string } => {
    switch (status) {
      case ArtifactStatus.DRAFT:
        return { bg: COMMUNITY_COLORS.neutral[100], text: COMMUNITY_COLORS.neutral[700] };
      case ArtifactStatus.REVIEW:
        return { bg: '#fef3c7', text: '#92400e' }; // amber
      case ArtifactStatus.APPROVED:
        return { bg: COMMUNITY_COLORS.primary[100], text: COMMUNITY_COLORS.primary[700] };
      case ArtifactStatus.PUBLISHED:
        return { bg: COMMUNITY_COLORS.success[100], text: COMMUNITY_COLORS.success[700] };
      case ArtifactStatus.ARCHIVED:
        return { bg: '#fecaca', text: '#b91c1c' }; // red
      default:
        return { bg: COMMUNITY_COLORS.neutral[100], text: COMMUNITY_COLORS.neutral[700] };
    }
  };

  return (
    <div className="space-y-8">
      {/* Elegant Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Artifacts Gallery</h1>
            <p className="text-gray-600">Discover documents, reports, and media assets from our community projects</p>
          </div>
          
          <div 
            className="w-16 h-16 rounded-xl flex items-center justify-center shadow-sm"
            style={{
              background: `linear-gradient(135deg, ${COMMUNITY_COLORS.primary[600]}, ${COMMUNITY_COLORS.primary[700]})`
            }}
          >
            <span className="text-white text-2xl">🎨</span>
          </div>
        </div>
        
        {/* Executive Summary Metrics */}
        {!isLoading && !error && artifacts.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl border border-purple-200">
              <div className="text-2xl font-bold text-purple-700 mb-1">
                {artifacts.length}
              </div>
              <div className="text-sm text-purple-600">Total Artifacts</div>
            </div>
            
            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-4 rounded-xl border border-indigo-200">
              <div className="text-2xl font-bold text-indigo-700 mb-1">
                {Object.keys(artifactsByType).length}
              </div>
              <div className="text-sm text-indigo-600">Categories</div>
            </div>
            
            <div className="bg-gradient-to-br from-teal-50 to-teal-100 p-4 rounded-xl border border-teal-200">
              <div className="text-2xl font-bold text-teal-700 mb-1">
                {artifacts.reduce((sum, a) => sum + a.relatedProjects.length, 0)}
              </div>
              <div className="text-sm text-teal-600">Project Links</div>
            </div>
            
            <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-4 rounded-xl border border-amber-200">
              <div className="text-2xl font-bold text-amber-700 mb-1">
                {artifacts.reduce((sum, a) => sum + a.relatedOpportunities.length, 0)}
              </div>
              <div className="text-sm text-amber-600">Opportunity Links</div>
            </div>
          </div>
        )}
      </div>

      {/* Modern Filter Panel */}
      <div
        className="p-6 rounded-xl border shadow-sm"
        style={{
          background: `linear-gradient(180deg, ${COMMUNITY_COLORS.primary[50]} 0%, ${COMMUNITY_COLORS.neutral[50]} 100%)`,
          borderColor: COMMUNITY_COLORS.primary[200]
        }}
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Filter Artifacts</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
            <select
              className="block w-full rounded-lg border border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm transition-colors"
              style={{ backgroundColor: 'white' }}
              value={filters.type?.[0] || ''}
              onChange={(e) => {
                const value = e.target.value;
                setFilters(prev => ({
                  ...prev,
                  type: value ? [value] : undefined,
                }));
              }}
            >
              <option value="">All Types</option>
              {Object.values(ArtifactType).map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              className="block w-full rounded-lg border border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm transition-colors"
              style={{ backgroundColor: 'white' }}
              value={filters.status?.[0] || ''}
              onChange={(e) => {
                const value = e.target.value;
                setFilters(prev => ({
                  ...prev,
                  status: value ? [value] : undefined,
                }));
              }}
            >
              <option value="">All Statuses</option>
              {Object.values(ArtifactStatus).map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Format</label>
            <select
              className="block w-full rounded-lg border border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm transition-colors"
              style={{ backgroundColor: 'white' }}
              value={filters.format?.[0] || ''}
              onChange={(e) => {
                const value = e.target.value;
                setFilters(prev => ({
                  ...prev,
                  format: value ? [value] : undefined,
                }));
              }}
            >
              <option value="">All Formats</option>
              {Object.values(ArtifactFormat).map((format) => (
                <option key={format} value={format}>
                  {format}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <input
              type="text"
              className="block w-full rounded-lg border border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm transition-colors"
              style={{ backgroundColor: 'white' }}
              placeholder="Search artifacts..."
              value={filters.search || ''}
              onChange={(e) => {
                const value = e.target.value;
                setFilters(prev => ({
                  ...prev,
                  search: value || undefined,
                }));
              }}
            />
          </div>
        </div>
        
        {(filters.type || filters.status || filters.format || filters.search) && (
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => setFilters({})}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>

      {/* Artifacts List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : error ? (
        <ErrorState
          message="Error loading artifacts"
          details="There was a problem fetching the artifacts. Please try again."
          onRetry={() => refetch()}
        />
      ) : artifacts.length === 0 ? (
        <EmptyState
          title="No artifacts found"
          description="Try adjusting your filters or create a new artifact."
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
        />
      ) : (
        <div className="space-y-10">
          {Object.entries(artifactsByType).map(([type, typeArtifacts]) => (
            <div key={type}>
              <div className="flex items-center mb-6">
                <div className="flex items-center space-x-4">
                  <div 
                    className="p-3 rounded-xl shadow-sm"
                    style={{
                      background: `linear-gradient(135deg, ${COMMUNITY_COLORS.secondary[500]}, ${COMMUNITY_COLORS.secondary[600]})`
                    }}
                  >
                    <span className="text-white text-xl">{getFormatIcon('WEB')}</span>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{type}</h2>
                    <p className="text-sm text-gray-500">{typeArtifacts.length} item{typeArtifacts.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                <div 
                  className="flex-1 ml-6 h-px"
                  style={{
                    background: `linear-gradient(to right, ${COMMUNITY_COLORS.primary[300]}, transparent)`
                  }}
                ></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {typeArtifacts.map((artifact) => (
                  <div
                    key={artifact.id}
                    className="group flex flex-col h-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all duration-200 hover:shadow-lg hover:scale-[1.02] cursor-pointer"
                    onClick={() => {
                      // Navigate to artifact detail page or open file
                      if (artifact.fileUrl) {
                        window.open(artifact.fileUrl, '_blank');
                      } else {
                        console.log('Navigate to artifact', artifact.id);
                      }
                    }}
                  >
                    {/* Thumbnail Image */}
                    <div className="relative w-full h-48 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
                      {artifact.thumbnailUrl ? (
                        <>
                          <img 
                            src={artifact.thumbnailUrl} 
                            alt={artifact.name}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            onError={(e) => {
                              // Fallback to icon if image fails to load
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              target.nextElementSibling?.classList.remove('hidden');
                            }}
                          />
                          <div className="hidden absolute inset-0 flex items-center justify-center">
                            <span className="text-6xl opacity-30">{getFormatIcon(artifact.format)}</span>
                          </div>
                        </>
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-6xl opacity-30">{getFormatIcon(artifact.format)}</span>
                        </div>
                      )}
                      
                      {/* Status Badge Overlay */}
                      <div className="absolute top-3 right-3">
                        <div 
                          className="px-2 py-1 rounded-lg text-xs font-medium shadow-sm"
                          style={{
                            backgroundColor: getStatusColor(artifact.status).bg,
                            color: getStatusColor(artifact.status).text
                          }}
                        >
                          {artifact.status}
                        </div>
                      </div>
                      
                      {/* Type Badge Overlay */}
                      <div className="absolute bottom-3 left-3">
                        <div 
                          className="px-2 py-1 rounded-lg text-xs font-medium shadow-sm"
                          style={{
                            backgroundColor: COMMUNITY_COLORS.primary[600],
                            color: 'white'
                          }}
                        >
                          {artifact.type}
                        </div>
                      </div>
                    </div>
                    
                    {/* Card Content */}
                    <div className="flex flex-col flex-1 p-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-primary-600 transition-colors">
                          {artifact.name}
                        </h3>
                        
                        {/* Related entities with icons */}
                        <div className="space-y-1 mb-3">
                          {artifact.relatedProjects.length > 0 && (
                            <div className="flex items-center text-xs text-gray-600">
                              <span className="mr-1">💼</span>
                              <span className="font-medium">{artifact.relatedProjects.length}</span>
                              <span className="ml-1">project{artifact.relatedProjects.length !== 1 ? 's' : ''}</span>
                            </div>
                          )}
                          
                          {artifact.relatedOpportunities.length > 0 && (
                            <div className="flex items-center text-xs text-gray-600">
                              <span className="mr-1">🎯</span>
                              <span className="font-medium">{artifact.relatedOpportunities.length}</span>
                              <span className="ml-1">opportunit{artifact.relatedOpportunities.length !== 1 ? 'ies' : 'y'}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Footer */}
                      <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-100">
                        <span className="flex items-center">
                          <span className="mr-1">📅</span>
                          {artifact.lastModified && new Date(artifact.lastModified).toLocaleDateString()}
                        </span>
                        {artifact.fileUrl && (
                          <span className="flex items-center text-primary-600 font-medium">
                            <span className="mr-1">🔗</span>
                            View
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Results summary */}
      {!isLoading && !error && artifacts.length > 0 && (
        <div className="text-sm text-gray-500 text-center pt-6 border-t">
          Showing {artifacts.length} artifact{artifacts.length !== 1 ? 's' : ''} across {Object.keys(artifactsByType).length} type{Object.keys(artifactsByType).length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
};

export default ArtifactsPage;