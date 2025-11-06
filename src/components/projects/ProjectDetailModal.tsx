import { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import LoadingSpinner from '../ui/LoadingSpinner';
import ArtifactGrid from '../artifacts/ArtifactGrid';

interface ProjectDetailModalProps {
  project: Record<string, unknown> | null;
  isOpen: boolean;
  onClose: () => void;
}

const ProjectDetailModal = ({ project, isOpen, onClose }: ProjectDetailModalProps) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'artifacts' | 'financials' | 'timeline'>('overview');
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  useEffect(() => {
    if (project && isOpen) {
      // Here you could fetch additional project details from Notion
      // including the rich content/summaries mentioned
      setIsLoadingDetails(true);
      // Simulate API call
      setTimeout(() => setIsLoadingDetails(false), 800);
    }
  }, [project, isOpen]);

  if (!project) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusColor = (status: unknown) => {
    const statusStr = String(status || '');
    if (statusStr.includes('Active')) return 'success';
    if (statusStr.includes('Transferred')) return 'primary';
    if (statusStr.includes('Sunsetting')) return 'warning';
    if (statusStr.includes('Ideation')) return 'default';
    return 'default';
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📋' },
    { id: 'artifacts', label: 'Artifacts', icon: '📁' },
    { id: 'financials', label: 'Financials', icon: '💰' },
    { id: 'timeline', label: 'Timeline', icon: '📅' },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-50 to-blue-50 px-6 py-4 border-b">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <h2 className="text-2xl font-bold text-gray-900">{String(project.name)}</h2>
                <Badge variant={getStatusColor(project.status)}>{String(project.status)}</Badge>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
                <span className="flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {String(project.location)}, {String(project.state)}
                </span>
                <span className="flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Led by {String(project.lead)}
                </span>
                {Boolean(project.websiteLinks) && (
                  <a
                    href={String(project.websiteLinks)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center text-primary-600 hover:text-primary-700"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    Website
                  </a>
                )}
              </div>

              {/* Themes */}
              {Boolean(project.themes && Array.isArray(project.themes) && (project.themes as string[]).length > 0) && (
                <div className="flex flex-wrap gap-1 mt-3">
                  {(project.themes as string[]).map((theme, index) => (
                    <Badge key={index} variant="default" className="text-xs">
                      {theme}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <Button variant="ghost" onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b bg-gray-50">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'overview' | 'artifacts' | 'financials' | 'timeline')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto max-h-[60vh]">
          {isLoadingDetails ? (
            <div className="flex items-center justify-center p-12">
              <LoadingSpinner size="lg" />
              <span className="ml-3 text-gray-600">Loading project details...</span>
            </div>
          ) : (
            <div className="p-6">
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Project Description */}
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Project Description</h3>
                    <p className="text-gray-700 leading-relaxed">
                      {String(project.description || 'No description available.')}
                    </p>
                  </Card>

                  {/* AI Summary */}
                  {Boolean(project.aiSummary) && (
                    <Card className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                        <span className="mr-2">🤖</span>
                        AI Summary
                      </h3>
                      <p className="text-gray-700 leading-relaxed">
                        {String(project.aiSummary)}
                      </p>
                    </Card>
                  )}

                  {/* Quick Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="p-4 text-center">
                      <div className="text-2xl font-bold text-green-600">{formatCurrency((project.revenueActual as number) || 0)}</div>
                      <div className="text-sm text-gray-600">Revenue Generated</div>
                    </Card>
                    <Card className="p-4 text-center">
                      <div className="text-2xl font-bold text-blue-600">{Array.isArray(project.artifacts) ? project.artifacts.length : 0}</div>
                      <div className="text-sm text-gray-600">Artifacts</div>
                    </Card>
                    <Card className="p-4 text-center">
                      <div className="text-2xl font-bold text-purple-600">{Array.isArray(project.partnerOrganizations) ? project.partnerOrganizations.length : 0}</div>
                      <div className="text-sm text-gray-600">Partners</div>
                    </Card>
                  </div>
                </div>
              )}

              {activeTab === 'artifacts' && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-gray-900">Project Artifacts</h3>
                    <Badge variant="default">{Array.isArray(project.artifacts) ? project.artifacts.length : 0} items</Badge>
                  </div>
                  {Array.isArray(project.artifacts) && project.artifacts.length > 0 ? (
                    <ArtifactGrid
                      artifacts={project.artifacts as unknown as import('../../types').Artifact[]}
                      onArtifactClick={(artifact) => {
                        // Handle artifact click - could open another modal or navigate
                        console.log('Artifact clicked:', artifact);
                      }}
                    />
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      No artifacts available for this project.
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'financials' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Actual Revenue:</span>
                          <span className="font-semibold text-green-600">{formatCurrency((project.revenueActual as number) || 0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Potential Revenue:</span>
                          <span className="font-semibold text-blue-600">{formatCurrency((project.revenuePotential as number) || 0)}</span>
                        </div>
                        <div className="flex justify-between pt-2 border-t">
                          <span className="text-gray-600">Growth Potential:</span>
                          <span className="font-semibold">
                            {(project.revenueActual as number) > 0 ?
                              `${((((project.revenuePotential as number) - (project.revenueActual as number)) / (project.revenueActual as number)) * 100).toFixed(1)}%` :
                              'N/A'
                            }
                          </span>
                        </div>
                      </div>
                    </Card>

                    <Card className="p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Related Opportunities</h3>
                      <div className="text-2xl font-bold text-purple-600 mb-2">
                        {Array.isArray(project.relatedOpportunities) ? project.relatedOpportunities.length : 0}
                      </div>
                      <p className="text-sm text-gray-600">
                        Active funding opportunities linked to this project
                      </p>
                    </Card>
                  </div>
                </div>
              )}

              {activeTab === 'timeline' && (
                <div className="space-y-6">
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Timeline</h3>
                    <div className="space-y-4">
                      {Boolean(project.startDate) && (
                        <div className="flex items-center space-x-3">
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          <div>
                            <div className="font-medium">Project Started</div>
                            <div className="text-sm text-gray-600">{new Date(project.startDate as string | Date).toLocaleDateString()}</div>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <div>
                          <div className="font-medium">Last Updated</div>
                          <div className="text-sm text-gray-600">{new Date(project.lastModified as string | Date).toLocaleDateString()}</div>
                        </div>
                      </div>

                      {Boolean(project.endDate) && (
                        <div className="flex items-center space-x-3">
                          <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                          <div>
                            <div className="font-medium">Target Completion</div>
                            <div className="text-sm text-gray-600">{new Date(project.endDate as string | Date).toLocaleDateString()}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default ProjectDetailModal;