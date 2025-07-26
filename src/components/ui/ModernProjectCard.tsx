import { useState } from 'react';
import Badge from './Badge';
import Button from './Button';

interface Project {
  id: string;
  name: string;
  description: string;
  status: string;
  themes: string[];
  lead: string;
  location: string;
  state: string;
  revenueActual: number;
  revenuePotential: number;
  artifacts?: any[];
  lastModified: Date;
}

interface ModernProjectCardProps {
  project: Project;
  onClick: (project: Project) => void;
  className?: string;
  variant?: 'default' | 'compact' | 'featured';
}

const ModernProjectCard = ({ 
  project, 
  onClick, 
  className = '', 
  variant = 'default' 
}: ModernProjectCardProps) => {
  const [isHovered, setIsHovered] = useState(false);

  const getStatusColor = (status: string) => {
    if (status?.includes('Active')) return 'success';
    if (status?.includes('Transferred')) return 'primary';
    if (status?.includes('Sunsetting')) return 'warning';
    if (status?.includes('Ideation')) return 'default';
    return 'default';
  };

  const getThemeColor = (theme: string) => {
    const themeColors: Record<string, string> = {
      'Economic Freedom': '#10b981',
      'Storytelling': '#3b82f6',
      'Operations': '#64748b',
      'Youth Justice': '#8b5cf6',
      'Health and wellbeing': '#06b6d4',
      'Indigenous': '#f59e0b',
      'Global community': '#ef4444'
    };
    return themeColors[theme] || '#6b7280';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const calculateProgress = () => {
    if (project.revenuePotential === 0) return 0;
    return Math.min((project.revenueActual / project.revenuePotential) * 100, 100);
  };

  if (variant === 'compact') {
    return (
      <div
        className={`card-modern p-4 cursor-pointer group ${className}`}
        onClick={() => onClick(project)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900 line-clamp-1 group-hover:text-primary-600 transition-colors">
            {project.name}
          </h3>
          <Badge variant={getStatusColor(project.status)} className="ml-2 flex-shrink-0">
            {project.status?.replace(/[\u{1F300}-\u{1F9FF}]/gu, '')}
          </Badge>
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">{project.location}</span>
          <span className="font-medium text-green-600">
            {formatCurrency(project.revenueActual)}
          </span>
        </div>
      </div>
    );
  }

  if (variant === 'featured') {
    return (
      <div
        className={`card-modern p-6 cursor-pointer group bg-gradient-to-br from-white via-primary-50/50 to-blue-50/50 border-primary-200/50 ${className}`}
        onClick={() => onClick(project)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <h3 className="text-lg font-bold text-gray-900 group-hover:text-primary-600 transition-colors line-clamp-2">
                {project.name}
              </h3>
              <Badge variant={getStatusColor(project.status)}>
                {project.status}
              </Badge>
            </div>
            <p className="text-sm text-gray-600 line-clamp-2 mb-3">
              {project.description}
            </p>
          </div>
          
          <div className={`ml-4 transition-transform duration-300 ${isHovered ? 'scale-110' : ''}`}>
            <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
          </div>
        </div>

        {/* Revenue Progress */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-600">Revenue Progress</span>
            <span className="font-semibold text-gray-900">{calculateProgress().toFixed(0)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
            <div
              className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${calculateProgress()}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>{formatCurrency(project.revenueActual)} actual</span>
            <span>{formatCurrency(project.revenuePotential)} potential</span>
          </div>
        </div>

        {/* Themes */}
        {project.themes && project.themes.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {project.themes.slice(0, 3).map((theme, index) => (
              <div
                key={index}
                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-white/60 backdrop-blur-sm border"
                style={{ 
                  borderColor: getThemeColor(theme) + '40',
                  color: getThemeColor(theme)
                }}
              >
                <div
                  className="w-2 h-2 rounded-full mr-1"
                  style={{ backgroundColor: getThemeColor(theme) }}
                />
                {theme}
              </div>
            ))}
            {project.themes.length > 3 && (
              <span className="text-xs text-gray-500 px-2 py-1">
                +{project.themes.length - 3} more
              </span>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200/50">
          <div className="flex items-center text-sm text-gray-500">
            <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {project.location}, {project.state}
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            className={`opacity-0 group-hover:opacity-100 transition-all duration-300 ${
              isHovered ? 'translate-x-0' : 'translate-x-2'
            }`}
            onClick={(e) => {
              e.stopPropagation();
              onClick(project);
            }}
          >
            View Details
            <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Button>
        </div>
      </div>
    );
  }

  // Default variant
  return (
    <div
      className={`card-modern p-5 cursor-pointer group overflow-hidden ${className}`}
      onClick={() => onClick(project)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 group-hover:text-primary-600 transition-colors line-clamp-2 mb-1">
            {project.name}
          </h3>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="truncate">{project.lead}</span>
          </div>
        </div>
        
        <Badge variant={getStatusColor(project.status)} className="ml-2 flex-shrink-0">
          {project.status?.replace(/[\u{1F300}-\u{1F9FF}]/gu, '')}
        </Badge>
      </div>

      {/* Description */}
      <p className="text-sm text-gray-600 line-clamp-2 mb-4">
        {project.description}
      </p>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-3 border border-green-200/50">
          <div className="text-lg font-bold text-green-700">
            {formatCurrency(project.revenueActual)}
          </div>
          <div className="text-xs text-green-600">Revenue Generated</div>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-3 border border-blue-200/50">
          <div className="text-lg font-bold text-blue-700">
            {project.artifacts?.length || 0}
          </div>
          <div className="text-xs text-blue-600">Artifacts</div>
        </div>
      </div>

      {/* Themes */}
      {project.themes && project.themes.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-4">
          {project.themes.slice(0, 2).map((theme, index) => (
            <div
              key={index}
              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100"
              style={{ color: getThemeColor(theme) }}
            >
              <div
                className="w-2 h-2 rounded-full mr-1"
                style={{ backgroundColor: getThemeColor(theme) }}
              />
              {theme}
            </div>
          ))}
          {project.themes.length > 2 && (
            <span className="text-xs text-gray-500 px-2 py-1">
              +{project.themes.length - 2}
            </span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <div className="flex items-center text-sm text-gray-500">
          <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="truncate">{project.location}</span>
        </div>
        
        <div className="text-xs text-gray-400">
          {new Date(project.lastModified).toLocaleDateString()}
        </div>
      </div>

      {/* Hover overlay */}
      <div className={`absolute inset-0 bg-gradient-to-br from-primary-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-xl`} />
    </div>
  );
};

export default ModernProjectCard;