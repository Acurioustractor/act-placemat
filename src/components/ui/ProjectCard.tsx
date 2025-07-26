import { Badge, Card } from './';
import { Project, ProjectStatus } from '../../types';
import { PROJECT_AREAS } from '../../constants';

interface ProjectCardProps {
  project: Project;
  onClick?: (project: Project) => void;
  className?: string;
}

/**
 * ProjectCard component for displaying project information
 */
const ProjectCard = ({ project, onClick, className = '' }: ProjectCardProps) => {
  // Get status badge variant
  const getStatusVariant = (status: string): 'success' | 'warning' | 'danger' | 'default' => {
    switch (status) {
      case ProjectStatus.ACTIVE:
        return 'success';
      case ProjectStatus.TRANSFERRED:
        return 'success';
      case ProjectStatus.IDEATION:
        return 'warning';
      case ProjectStatus.SUNSETTING:
        return 'danger';
      default:
        return 'default';
    }
  };

  // Get area configuration
  const getAreaConfig = (area: string) => {
    return PROJECT_AREAS.find(a => a.value === area);
  };

  const areaConfig = getAreaConfig(project.area);

  // Format revenue
  const formatRevenue = (amount: number): string => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(0)}K`;
    } else {
      return `$${amount.toLocaleString()}`;
    }
  };

  // Calculate progress percentage if applicable
  const getProgressPercentage = (): number | null => {
    if (project.revenueActual > 0 && project.revenuePotential > 0) {
      return Math.min((project.revenueActual / project.revenuePotential) * 100, 100);
    }
    return null;
  };

  const progressPercentage = getProgressPercentage();

  return (
    <Card
      hoverable
      className={`flex flex-col h-full ${className}`}
      onClick={() => onClick?.(project)}
    >
      {/* Header with area indicator */}
      <div className="flex items-start mb-3">
        <div 
          className="w-1 h-16 rounded-full mr-3 flex-shrink-0" 
          style={{ backgroundColor: areaConfig?.color || '#6B7280' }}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-1">
            <h3 className="text-lg font-semibold text-gray-900 truncate pr-2">
              {project.name}
            </h3>
            <Badge variant={getStatusVariant(project.status)} size="sm">
              {project.status}
            </Badge>
          </div>
          
          {/* Area and location */}
          <div className="flex items-center text-sm text-gray-500 mb-2">
            <span className="mr-1">{areaConfig?.icon}</span>
            <span className="truncate">{areaConfig?.label}</span>
            {project.location && (
              <>
                <span className="mx-2">•</span>
                <span className="truncate">{project.location}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-gray-600 line-clamp-3 mb-4 flex-1">
        {project.description}
      </p>

      {/* Revenue section */}
      <div className="space-y-3 mt-auto">
        <div className="flex items-center justify-between">
          <div className="text-sm">
            <span className="text-gray-500">Revenue:</span>
            <span className="font-semibold text-gray-900 ml-1">
              {formatRevenue(project.revenueActual)}
            </span>
            {project.revenuePotential > project.revenueActual && (
              <span className="text-gray-500 ml-1">
                / {formatRevenue(project.revenuePotential)}
              </span>
            )}
          </div>
          
          {/* Revenue progress bar */}
          {progressPercentage !== null && (
            <div className="flex-1 ml-3">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Key Properties as Tags */}
        <div className="flex flex-wrap gap-1">
          {/* Status Badge (already shown above, but included for consistency) */}
          
          {/* Theme badges */}
          {project.themes && project.themes.slice(0, 2).map((theme, index) => (
            <Badge 
              key={`theme-${index}`} 
              variant="outline" 
              size="xs"
              className="text-xs bg-blue-50 text-blue-700"
            >
              {theme}
            </Badge>
          ))}
          
          {/* Core Values */}
          {project.coreValues && (
            <Badge 
              variant="outline" 
              size="xs"
              className="text-xs bg-purple-50 text-purple-700"
            >
              {project.coreValues}
            </Badge>
          )}
          
          {/* Place */}
          {project.place && (
            <Badge 
              variant="outline" 
              size="xs"
              className="text-xs bg-green-50 text-green-700"
            >
              {project.place}
            </Badge>
          )}
          
          {/* State */}
          {project.state && (
            <Badge 
              variant="outline" 
              size="xs"
              className="text-xs bg-orange-50 text-orange-700"
            >
              {project.state}
            </Badge>
          )}
        </div>

        {/* Next milestone */}
        {project.nextMilestone && (
          <div className="text-xs text-gray-500 border-t pt-2">
            <span className="font-medium">Next milestone:</span>{' '}
            {new Date(project.nextMilestone).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            })}
          </div>
        )}

        {/* Team lead */}
        {project.lead && (
          <div className="text-xs text-gray-500">
            <span className="font-medium">Lead:</span> {project.lead}
          </div>
        )}
      </div>
    </Card>
  );
};

export default ProjectCard;