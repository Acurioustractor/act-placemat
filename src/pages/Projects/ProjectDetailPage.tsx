import { useParams, useNavigate } from 'react-router-dom';
import { Card, Badge, Button, LoadingSpinner } from '../../components/ui';
import { useProjects } from '../../hooks';
import { PROJECT_AREAS } from '../../constants';
import { formatCurrency } from '../../utils/formatting';

/**
 * Project detail page showing comprehensive project information
 */
const ProjectDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: projects = [], isLoading } = useProjects();
  
  const project = projects.find(p => p.id === id);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Project Not Found</h2>
        <p className="text-gray-600 mb-6">The project you're looking for doesn't exist or has been removed.</p>
        <Button onClick={() => navigate('/projects')}>
          Back to Projects
        </Button>
      </div>
    );
  }

  // Get area configuration
  const areaConfig = PROJECT_AREAS.find(a => a.value === project.area);

  // Get status badge variant
  const getStatusVariant = (status: string): 'success' | 'warning' | 'danger' | 'default' => {
    if (status?.includes('Active')) return 'success';
    if (status?.includes('Ideation')) return 'warning';
    if (status?.includes('Sunsetting')) return 'danger';
    return 'default';
  };

  // Calculate progress percentage
  const progressPercentage = project.revenueActual > 0 && project.revenuePotential > 0 
    ? Math.min((project.revenueActual / project.revenuePotential) * 100, 100)
    : null;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-4">
          <div 
            className="w-2 h-20 rounded-full flex-shrink-0" 
            style={{ backgroundColor: areaConfig?.color || '#6B7280' }}
          />
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{project.name}</h1>
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <div className="flex items-center">
                <span className="mr-1">{areaConfig?.icon}</span>
                <span>{areaConfig?.label}</span>
              </div>
              {project.location && (
                <>
                  <span>•</span>
                  <span>{project.location}</span>
                </>
              )}
              {project.state && (
                <>
                  <span>•</span>
                  <span>{project.state}</span>
                </>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <Badge variant={getStatusVariant(project.status)} size="lg">
            {project.status}
          </Badge>
          <Button variant="secondary" onClick={() => navigate('/projects')}>
            Back to Projects
          </Button>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column - Main Info */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Project Description */}
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Project Overview</h3>
              <p className="text-gray-700 leading-relaxed">
                {project.description || 'No description available.'}
              </p>
            </div>
          </Card>

          {/* AI Summary */}
          {project.aiSummary && (
            <Card>
              <div className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <span className="mr-2">🤖</span>
                  AI Summary
                </h3>
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-gray-800 leading-relaxed">
                    {project.aiSummary}
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Revenue & Progress */}
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Financial Overview</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="text-sm text-gray-600 mb-1">Actual Revenue</div>
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(project.revenueActual)}
                  </div>
                </div>
                
                <div>
                  <div className="text-sm text-gray-600 mb-1">Potential Revenue</div>
                  <div className="text-2xl font-bold text-blue-600">
                    {formatCurrency(project.revenuePotential)}
                  </div>
                </div>
              </div>

              {progressPercentage !== null && (
                <div className="mt-6">
                  <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>Revenue Achievement</span>
                    <span>{progressPercentage.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-green-500 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <div>
                  <div className="text-sm text-gray-600 mb-1">Actual Incoming</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {formatCurrency(project.actualIncoming)}
                  </div>
                </div>
                
                <div>
                  <div className="text-sm text-gray-600 mb-1">Potential Incoming</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {formatCurrency(project.potentialIncoming)}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column - Properties & Metadata */}
        <div className="space-y-6">
          
          {/* Key Properties */}
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Project Properties</h3>
              
              <div className="space-y-4">
                {/* Core Values */}
                {project.coreValues && (
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-2">Core Values</div>
                    <Badge variant="outline" className="bg-purple-50 text-purple-700">
                      {project.coreValues}
                    </Badge>
                  </div>
                )}

                {/* Themes */}
                {project.themes && project.themes.length > 0 && (
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-2">Themes</div>
                    <div className="flex flex-wrap gap-2">
                      {project.themes.map((theme, index) => (
                        <Badge key={index} variant="outline" className="bg-blue-50 text-blue-700">
                          {theme}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Place */}
                {project.place && (
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-2">Place</div>
                    <Badge variant="outline" className="bg-green-50 text-green-700">
                      {project.place}
                    </Badge>
                  </div>
                )}

                {/* Geographic Info */}
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-2">Location</div>
                  <div className="space-y-2">
                    {project.state && (
                      <Badge variant="outline" className="bg-orange-50 text-orange-700 mr-2">
                        {project.state}
                      </Badge>
                    )}
                    {project.location && (
                      <Badge variant="outline" className="bg-gray-50 text-gray-700">
                        {project.location}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Team & Dates */}
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Team & Timeline</h3>
              
              <div className="space-y-4">
                {/* Project Lead */}
                {project.lead && (
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-1">Project Lead</div>
                    <div className="text-gray-900">{project.lead}</div>
                  </div>
                )}

                {/* Next Milestone */}
                {project.nextMilestone && (
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-1">Next Milestone</div>
                    <div className="text-gray-900">
                      {new Date(project.nextMilestone).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </div>
                  </div>
                )}

                {/* Start/End Dates */}
                {(project.startDate || project.endDate) && (
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-2">Timeline</div>
                    <div className="space-y-1 text-sm text-gray-600">
                      {project.startDate && (
                        <div>Started: {new Date(project.startDate).toLocaleDateString()}</div>
                      )}
                      {project.endDate && (
                        <div>Ends: {new Date(project.endDate).toLocaleDateString()}</div>
                      )}
                    </div>
                  </div>
                )}

                {/* Last Modified */}
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-1">Last Updated</div>
                  <div className="text-sm text-gray-600">
                    {new Date(project.lastModified).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Quick Actions */}
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <Button variant="outline" className="w-full" disabled>
                  View in Notion
                </Button>
                <Button variant="outline" className="w-full" disabled>
                  Export Summary
                </Button>
                <Button variant="outline" className="w-full" disabled>
                  Generate Report
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ProjectDetailPage;