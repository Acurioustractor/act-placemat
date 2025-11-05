import { ProjectTypeBadge } from './ProjectTypeBadge'
import type { Project } from '../types/project'

interface ProjectsTableProps {
  projects: Project[]
  onSelectProject: (projectId: string) => void
}

export function ProjectsTable({ projects, onSelectProject }: ProjectsTableProps) {
  const formatCurrency = (value?: number) => {
    if (!value) return '$0'
    return `$${(value / 1000).toFixed(0)}k`
  }

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return '-'
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const getImpactSummary = (project: Project) => {
    const parts = []
    if (project.communityLaborMetrics?.youngPeople?.count) {
      parts.push(`${project.communityLaborMetrics.youngPeople.count} youth`)
    }
    if (project.communityLaborMetrics?.communityValueCreated) {
      parts.push(`${formatCurrency(project.communityLaborMetrics.communityValueCreated)} value`)
    }
    if (project.storytellingMetrics?.activeStorytellers) {
      parts.push(`${project.storytellingMetrics.activeStorytellers} storytellers`)
    }
    return parts.length > 0 ? parts.join(' • ') : '-'
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-clay-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-clay-200">
        <thead className="bg-clay-50">
          <tr>
            <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-clay-700">
              Project
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-clay-700">
              Type
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-clay-700">
              Status
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-clay-700">
              Themes
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-clay-700">
              Impact
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-clay-700">
              Funding
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-clay-700">
              Next Milestone
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-clay-100 bg-white">
          {projects.map((project) => {
            const totalFunding = (project.actualIncoming || 0) + (project.potentialIncoming || 0)
            const themes = project.themes || project.tags || []

            return (
              <tr
                key={project.id}
                onClick={() => onSelectProject(project.id)}
                className="cursor-pointer transition hover:bg-clay-50"
              >
                <td className="px-4 py-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      {project.cover_url ? (
                        <img
                          className="h-10 w-10 rounded-lg object-cover"
                          src={project.cover_url}
                          alt=""
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-brand-100 to-ocean-100" />
                      )}
                    </div>
                    <div className="ml-3">
                      <div className="text-sm font-medium text-clay-900">
                        {project.name}
                      </div>
                      {project.projectLead && (
                        <div className="text-xs text-clay-500">
                          {typeof project.projectLead === 'object' && project.projectLead.name
                            ? project.projectLead.name
                            : project.lead || project.projectLead}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  {project.projectType && (
                    <ProjectTypeBadge type={project.projectType} size="sm" />
                  )}
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                    project.status?.toLowerCase().includes('active') || project.status?.includes('🔥')
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-clay-100 text-clay-700'
                  }`}>
                    {project.status || 'Unknown'}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <div className="flex flex-wrap gap-1 max-w-xs">
                    {themes.slice(0, 2).map((theme, idx) => (
                      <span
                        key={idx}
                        className="inline-flex rounded-md bg-ocean-50 px-2 py-0.5 text-xs text-ocean-800"
                      >
                        {theme}
                      </span>
                    ))}
                    {themes.length > 2 && (
                      <span className="inline-flex rounded-md bg-clay-100 px-2 py-0.5 text-xs text-clay-600">
                        +{themes.length - 2}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-4 text-sm text-clay-700">
                  {getImpactSummary(project)}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-clay-900 font-medium">
                  {formatCurrency(totalFunding)}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-clay-600">
                  {formatDate(project.nextMilestoneDate)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {projects.length === 0 && (
        <div className="px-4 py-12 text-center">
          <p className="text-sm text-clay-500">No projects match your filters</p>
        </div>
      )}
    </div>
  )
}
