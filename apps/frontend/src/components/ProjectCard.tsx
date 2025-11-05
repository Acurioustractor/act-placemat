import { motion } from 'framer-motion';
import { Project } from '../types/project';
import { THEME_COLORS, THEME_ICONS } from '../constants/themeColors';

interface ProjectCardProps {
  project: Project;
}

export function ProjectCard({ project }: ProjectCardProps) {
  // Get primary theme color
  const primaryTheme = project.themes[0] || 'Operations';
  const themeColor = THEME_COLORS[primaryTheme] || '#95A5A6';
  const themeIcon = THEME_ICONS[primaryTheme] || '📋';

  // Health status
  const getHealthStatus = (score: number) => {
    if (score >= 80) return { label: 'Healthy', color: '#27AE60' };
    if (score >= 40) return { label: 'At Risk', color: '#F39C12' };
    return { label: 'Critical', color: '#E74C3C' };
  };

  const health = project.healthScore !== undefined
    ? getHealthStatus(project.healthScore)
    : { label: 'Unknown', color: '#95A5A6' };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -4, boxShadow: '0 8px 20px rgba(0,0,0,0.12)' }}
      className="bg-white rounded-xl overflow-hidden shadow-md border-t-4 flex flex-col h-full"
      style={{ borderTopColor: themeColor }}
    >
      {/* Cover Image or Color Block */}
      <div
        className="h-44 bg-gradient-to-br flex items-center justify-center relative"
        style={{
          background: project.coverImageUrl
            ? `url(${project.coverImageUrl}) center/cover`
            : `linear-gradient(135deg, ${themeColor}22, ${themeColor}44)`
        }}
      >
        {!project.coverImageUrl && (
          <div className="text-5xl filter drop-shadow-md">{themeIcon}</div>
        )}
      </div>

      {/* Content */}
      <div className="p-5 flex flex-col gap-3 flex-1">
        <h3 className="text-xl font-bold text-gray-800 leading-tight line-clamp-2">
          {project.name}
        </h3>

        {/* Metadata */}
        <div className="flex gap-3 flex-wrap text-sm text-gray-600">
          {project.places.length > 0 && (
            <span className="flex items-center gap-1">
              📍 {project.places[0].name}
            </span>
          )}
          {project.organizations.length > 0 && (
            <span className="flex items-center gap-1">
              🏢 {project.organizations[0].name}
            </span>
          )}
        </div>

        {/* Status Badge */}
        {project.status && (
          <div className="inline-block px-3 py-1 bg-gray-100 rounded-full text-sm font-semibold text-gray-700 w-fit">
            {project.status}
          </div>
        )}

        {/* Theme Tags */}
        <div className="flex gap-2 flex-wrap">
          {project.themes.slice(0, 3).map(theme => (
            <span
              key={theme}
              className="px-2.5 py-1 border-2 rounded-lg text-xs font-semibold bg-white"
              style={{
                borderColor: THEME_COLORS[theme] || '#95A5A6',
                color: THEME_COLORS[theme] || '#95A5A6'
              }}
            >
              {theme}
            </span>
          ))}
          {project.themes.length > 3 && (
            <span className="px-2.5 py-1 bg-gray-100 rounded-lg text-xs font-semibold text-gray-600">
              +{project.themes.length - 3}
            </span>
          )}
        </div>

        {/* Health Indicator */}
        {project.healthScore !== undefined && (
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-sm font-semibold text-gray-800">
              <span>Health</span>
              <span style={{ color: health.color }}>
                {project.healthScore}/100
              </span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${project.healthScore}%`,
                  background: health.color
                }}
              />
            </div>
          </div>
        )}

        {/* Beautiful Obsolescence Score */}
        {project.beautifulObsolescenceScore !== undefined && (
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-sm font-semibold text-gray-800">
              <span>Beautiful Obsolescence</span>
              <span className="text-purple-600">
                {project.beautifulObsolescenceScore}/100
              </span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-blue-500 to-purple-600"
                style={{ width: `${project.beautifulObsolescenceScore}%` }}
              />
            </div>
          </div>
        )}

        {/* Summary */}
        {project.summary && (
          <p className="text-sm leading-relaxed text-gray-600 line-clamp-3">
            {project.summary}
          </p>
        )}

        {/* CTA Button */}
        <motion.button
          className="mt-auto w-full py-3 bg-gray-800 text-white rounded-lg font-semibold hover:bg-gray-900 transition-colors"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            // For now, just log. Later can navigate to detail page
            console.log('View project:', project.id);
          }}
        >
          View Project →
        </motion.button>
      </div>
    </motion.div>
  );
}
