import { useState } from 'react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';

interface Artifact {
  id: string;
  name: string;
  type: string;
  format: string;
  description: string;
  thumbnailUrl?: string;
  fileUrl?: string;
  relatedProjects: string[];
  status: string;
  tags: string[];
  createdBy: string;
  lastModified: Date;
}

interface ArtifactGridProps {
  artifacts: Artifact[];
  onArtifactClick?: (artifact: Artifact) => void;
  className?: string;
}

const ArtifactGrid = ({ artifacts, onArtifactClick, className = '' }: ArtifactGridProps) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const getArtifactIcon = (type: string, format: string) => {
    const typeFormat = `${type}_${format}`.toLowerCase();
    
    if (format?.toLowerCase().includes('image') || format?.toLowerCase().includes('png') || format?.toLowerCase().includes('jpg')) {
      return '🖼️';
    }
    if (format?.toLowerCase().includes('pdf')) {
      return '📄';
    }
    if (format?.toLowerCase().includes('video') || format?.toLowerCase().includes('mp4')) {
      return '🎥';
    }
    if (format?.toLowerCase().includes('presentation') || format?.toLowerCase().includes('ppt')) {
      return '📊';
    }
    if (type?.toLowerCase().includes('research')) {
      return '🔬';
    }
    if (type?.toLowerCase().includes('proposal')) {
      return '📋';
    }
    if (type?.toLowerCase().includes('report')) {
      return '📈';
    }
    return '📁';
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'published':
      case 'complete':
        return 'success';
      case 'in_progress':
      case 'draft':
        return 'warning';
      case 'review':
        return 'primary';
      default:
        return 'default';
    }
  };

  const getThumbnailComponent = (artifact: Artifact) => {
    if (artifact.thumbnailUrl) {
      return (
        <img
          src={artifact.thumbnailUrl}
          alt={artifact.name}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={(e) => {
            // Fallback to icon if image fails to load
            e.currentTarget.style.display = 'none';
            e.currentTarget.nextElementSibling?.classList.remove('hidden');
          }}
        />
      );
    }
    
    return (
      <div className="flex items-center justify-center w-full h-full bg-gradient-to-br from-gray-100 to-gray-200">
        <span className="text-4xl opacity-70">
          {getArtifactIcon(artifact.type, artifact.format)}
        </span>
      </div>
    );
  };

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 ${className}`}>
      {artifacts.map((artifact) => (
        <Card
          key={artifact.id}
          className={`group cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1 overflow-hidden ${
            hoveredId === artifact.id ? 'ring-2 ring-primary-500 ring-opacity-50' : ''
          }`}
          onClick={() => onArtifactClick?.(artifact)}
          onMouseEnter={() => setHoveredId(artifact.id)}
          onMouseLeave={() => setHoveredId(null)}
        >
          {/* Thumbnail/Preview */}
          <div className="relative h-48 overflow-hidden bg-gray-100">
            {getThumbnailComponent(artifact)}
            
            {/* Overlay with quick actions */}
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300 flex items-center justify-center">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex space-x-2">
                {artifact.fileUrl && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="bg-white bg-opacity-90 hover:bg-opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(artifact.fileUrl, '_blank');
                    }}
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    View
                  </Button>
                )}
                <Button
                  variant="primary"
                  size="sm"
                  className="bg-primary-600 bg-opacity-90 hover:bg-opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    onArtifactClick?.(artifact);
                  }}
                >
                  <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Details
                </Button>
              </div>
            </div>

            {/* Status badge */}
            <div className="absolute top-3 right-3">
              <Badge variant={getStatusColor(artifact.status)} className="text-xs">
                {artifact.status}
              </Badge>
            </div>

            {/* Type/Format badge */}
            <div className="absolute top-3 left-3">
              <Badge variant="default" className="text-xs bg-white bg-opacity-90 text-gray-700">
                {artifact.format || artifact.type}
              </Badge>
            </div>
          </div>

          {/* Content */}
          <div className="p-4">
            <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-primary-600 transition-colors">
              {artifact.name}
            </h3>
            
            {artifact.description && (
              <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                {artifact.description}
              </p>
            )}

            {/* Tags */}
            {artifact.tags && artifact.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-3">
                {artifact.tags.slice(0, 3).map((tag, index) => (
                  <Badge
                    key={index}
                    variant="default"
                    className="text-xs bg-gray-100 text-gray-700"
                  >
                    {tag}
                  </Badge>
                ))}
                {artifact.tags.length > 3 && (
                  <Badge variant="default" className="text-xs bg-gray-100 text-gray-700">
                    +{artifact.tags.length - 3}
                  </Badge>
                )}
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>By {artifact.createdBy}</span>
              <span>{new Date(artifact.lastModified).toLocaleDateString()}</span>
            </div>

            {/* Related projects count */}
            {artifact.relatedProjects && artifact.relatedProjects.length > 0 && (
              <div className="mt-2 text-xs text-gray-500">
                <span className="flex items-center">
                  <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  {artifact.relatedProjects.length} project{artifact.relatedProjects.length !== 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
};

export default ArtifactGrid;