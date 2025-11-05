import type { Project } from '../types/project'
import { ProjectTypeBadge } from './ProjectTypeBadge'

interface EnhancedProjectCardProps {
  project: Project
  onSelect: (id: string) => void
}

export function EnhancedProjectCard({ project, onSelect }: EnhancedProjectCardProps) {
  // Calculate days until next milestone
  const getDaysUntilMilestone = () => {
    if (!project.nextMilestoneDate) return null
    const today = new Date()
    const milestone = new Date(project.nextMilestoneDate)
    const diffTime = milestone.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const daysUntil = getDaysUntilMilestone()
  const storytellerCount = project.storytellerCount || project.storytellers?.length || 0
  const hasInfrastructure = project.communityLaborMetrics
  const hasStorytelling = project.storytellingMetrics
  const hasGrantMetrics = project.grantDependencyMetrics

  // Extract location
  const location = project.relatedPlaces?.[0]?.indigenousName ||
                   project.relatedPlaces?.[0]?.displayName ||
                   project.location

  return (
    <div
      onClick={() => onSelect(project.id)}
      className="group relative overflow-hidden rounded-2xl border border-clay-200 bg-white shadow-sm transition-all duration-300 hover:shadow-xl hover:scale-[1.02] cursor-pointer"
    >
      {/* Cover Image with Gradient Overlay */}
      <div className="relative h-48 overflow-hidden bg-gradient-to-br from-brand-100 to-ocean-100">
        {project.coverImage ? (
          <>
            <img
              src={project.coverImage}
              alt={project.name}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          </>
        ) : (
          <div className="h-full w-full flex items-center justify-center text-6xl opacity-30">
            {project.projectType === 'infrastructure-building' ? '🏗️' :
             project.projectType === 'storytelling' ? '📖' : '✨'}
          </div>
        )}

        {/* Project Type Badge - Floating */}
        {project.projectType && (
          <div className="absolute top-4 left-4">
            <ProjectTypeBadge type={project.projectType} size="md" />
          </div>
        )}

        {/* Urgency Indicator */}
        {daysUntil !== null && daysUntil >= 0 && daysUntil <= 30 && (
          <div className="absolute top-4 right-4 rounded-full bg-orange-500 px-3 py-1.5 text-xs font-bold text-white shadow-lg">
            {daysUntil === 0 ? 'TODAY' : `${daysUntil}d`}
          </div>
        )}

        {/* Location - Bottom Overlay */}
        {location && (
          <div className="absolute bottom-4 left-4 flex items-center gap-2 text-white">
            <span className="text-sm opacity-90">📍</span>
            <span className="text-sm font-medium drop-shadow-lg">{location}</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-6 space-y-4">
        {/* Project Name & Status */}
        <div>
          <h3 className="text-xl font-bold text-clay-900 mb-1 line-clamp-2 group-hover:text-brand-700 transition-colors">
            {project.name}
          </h3>
          {project.status && (
            <div className="text-xs text-clay-600 font-medium">
              {project.status}
            </div>
          )}
        </div>

        {/* PEOPLE & IMPACT - The good stuff! */}
        <div className="grid grid-cols-2 gap-3">
          {/* Storytellers */}
          {storytellerCount > 0 && (
            <div className="rounded-lg bg-ocean-50 border border-ocean-200 p-3">
              <div className="text-2xl font-bold text-ocean-900">{storytellerCount}</div>
              <div className="text-xs text-ocean-700 font-medium">
                {storytellerCount === 1 ? 'Storyteller' : 'Storytellers'}
              </div>
            </div>
          )}

          {/* Community Value */}
          {hasInfrastructure && project.communityLaborMetrics.communityValueCreated && (
            <div className="rounded-lg bg-brand-50 border border-brand-200 p-3">
              <div className="text-2xl font-bold text-brand-900">
                ${Math.round(project.communityLaborMetrics.communityValueCreated / 1000)}k
              </div>
              <div className="text-xs text-brand-700 font-medium">
                Community Value
              </div>
            </div>
          )}

          {/* Story Reach */}
          {hasStorytelling && project.storytellingMetrics.totalCurrentReach && (
            <div className="rounded-lg bg-purple-50 border border-purple-200 p-3">
              <div className="text-2xl font-bold text-purple-900">
                {(project.storytellingMetrics.totalCurrentReach / 1000).toFixed(0)}k
              </div>
              <div className="text-xs text-purple-700 font-medium">
                Story Reach
              </div>
            </div>
          )}

          {/* Young People Involved */}
          {hasInfrastructure && project.communityLaborMetrics.youngPeople?.count && (
            <div className="rounded-lg bg-green-50 border border-green-200 p-3">
              <div className="text-2xl font-bold text-green-900">
                {project.communityLaborMetrics.youngPeople.count}
              </div>
              <div className="text-xs text-green-700 font-medium">
                Young People
              </div>
            </div>
          )}

          {/* Partner Count */}
          {project.partnerCount && project.partnerCount > 0 && (
            <div className="rounded-lg bg-clay-50 border border-clay-200 p-3">
              <div className="text-2xl font-bold text-clay-900">{project.partnerCount}</div>
              <div className="text-xs text-clay-700 font-medium">
                {project.partnerCount === 1 ? 'Partner' : 'Partners'}
              </div>
            </div>
          )}
        </div>

        {/* Employment Outcomes - BIG DEAL! */}
        {hasInfrastructure && project.communityLaborMetrics.employabilityOutcomes && (
          <div className="rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 border border-green-300 p-3">
            <div className="flex items-start gap-2">
              <span className="text-lg">💼</span>
              <div className="flex-1 text-sm text-green-900 font-medium">
                {project.communityLaborMetrics.employabilityOutcomes}
              </div>
            </div>
          </div>
        )}

        {/* Grant Dependency Path */}
        {hasGrantMetrics && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-clay-600 font-medium">Moving to Market</span>
              <span className={`font-bold ${
                project.grantDependencyMetrics.grantDependencyPercentage > 70 ? 'text-orange-600' :
                project.grantDependencyMetrics.grantDependencyPercentage > 50 ? 'text-yellow-600' :
                'text-green-600'
              }`}>
                {Math.round(100 - project.grantDependencyMetrics.grantDependencyPercentage)}% market
              </span>
            </div>
            <div className="h-2 bg-clay-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-500"
                style={{
                  width: `${100 - project.grantDependencyMetrics.grantDependencyPercentage}%`
                }}
              />
            </div>
          </div>
        )}

        {/* Core Values - Visual Tags */}
        {project.themes && project.themes.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {project.themes.slice(0, 4).map((theme, idx) => (
              <span
                key={idx}
                className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-clay-100 text-clay-700 border border-clay-200"
              >
                {theme}
              </span>
            ))}
            {project.themes.length > 4 && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-clay-50 text-clay-500">
                +{project.themes.length - 4} more
              </span>
            )}
          </div>
        )}

        {/* AI Summary - Condensed */}
        {project.aiSummary && (
          <p className="text-sm text-clay-700 leading-relaxed line-clamp-3">
            {project.aiSummary}
          </p>
        )}

        {/* Action Footer */}
        <div className="pt-3 border-t border-clay-100 flex items-center justify-between">
          <div className="text-xs text-clay-500">
            Updated {new Date(project.updatedAt || Date.now()).toLocaleDateString('en-AU', {
              day: 'numeric',
              month: 'short'
            })}
          </div>
          <button className="text-sm font-semibold text-brand-700 hover:text-brand-900 transition-colors group-hover:translate-x-1 transition-transform">
            View full story →
          </button>
        </div>
      </div>

      {/* Hover Glow Effect */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-brand-500/0 to-ocean-500/0 group-hover:from-brand-500/5 group-hover:to-ocean-500/5 transition-all duration-300 pointer-events-none" />
    </div>
  )
}
