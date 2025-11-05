import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getProjects } from '../../../lib/api';
import { THEME_COLORS, THEME_ICONS } from '../../../constants/themeColors';

interface PageProps {
  params: Promise<{ id: string }>;
}

function formatDate(dateString?: string | null) {
  if (!dateString) return null;
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch {
    return null;
  }
}

export default async function ProjectPage({ params }: PageProps) {
  const { id } = await params;
  const decodedId = decodeURIComponent(id);

  const projects = await getProjects();
  const project = projects.find(p => p.id === decodedId);

  if (!project) {
    notFound();
  }

  const primaryTheme = (project.themes && project.themes[0]) || 'Operations';
  const themeColor = THEME_COLORS[primaryTheme] || '#95A5A6';
  const themeIcon = THEME_ICONS[primaryTheme] || '📋';

  const getHealthStatus = (score: number) => {
    if (score >= 80) return { label: 'Healthy', color: '#27AE60' };
    if (score >= 40) return { label: 'At Risk', color: '#F39C12' };
    return { label: 'Critical', color: '#E74C3C' };
  };

  const healthScore = project.autonomyScore;
  const health = healthScore !== undefined
    ? getHealthStatus(healthScore)
    : { label: 'Unknown', color: '#95A5A6' };

  const hasTimeline = project.startDate || project.endDate || project.nextMilestoneDate;
  const hasImpactMetrics = (project.storytellerCount && project.storytellerCount > 0) ||
                           (project.supporters && project.supporters > 0) ||
                           (project.partnerCount && project.partnerCount > 0);
  const hasResources = (project.relatedResources && project.relatedResources.length > 0) ||
                       (project.relatedArtifacts && project.relatedArtifacts.length > 0) ||
                       project.notionUrl;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Hero Section */}
      <div
        className="relative h-96 bg-gradient-to-br flex items-end"
        style={{
          background: project.coverImage
            ? `linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.7)), url(${project.coverImage}) center/cover`
            : `linear-gradient(135deg, ${themeColor}88, ${themeColor})`
        }}
      >
        <div className="absolute top-8 left-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white/90 backdrop-blur-sm rounded-lg text-gray-800 font-semibold hover:bg-white transition-all shadow-md"
          >
            ← Back to Portfolio
          </Link>
        </div>

        <div className="container mx-auto px-8 pb-12">
          <div className="flex items-center gap-4 mb-4">
            <div className="text-6xl">{themeIcon}</div>
            <h1 className="text-5xl font-bold text-white drop-shadow-lg">
              {project.name}
            </h1>
          </div>

          {project.status && (
            <div className="inline-block px-4 py-2 bg-white/90 backdrop-blur-sm rounded-full text-sm font-semibold text-gray-800">
              {project.status}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            {(project.aiSummary || project.description) && (
              <div className="bg-white rounded-xl p-8 shadow-md">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">About</h2>
                <p className="text-gray-700 leading-relaxed text-lg whitespace-pre-wrap">
                  {project.aiSummary || project.description}
                </p>
              </div>
            )}

            {/* Timeline & Milestones */}
            {hasTimeline && (
              <div className="bg-white rounded-xl p-8 shadow-md">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">📅 Timeline</h2>
                <div className="space-y-4">
                  {project.startDate && (
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-green-500 mt-2"></div>
                      <div>
                        <p className="font-semibold text-gray-800">Start Date</p>
                        <p className="text-gray-600">{formatDate(project.startDate)}</p>
                      </div>
                    </div>
                  )}
                  {project.nextMilestoneDate && (
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-blue-500 mt-2"></div>
                      <div>
                        <p className="font-semibold text-gray-800">Next Milestone</p>
                        <p className="text-gray-600">{formatDate(project.nextMilestoneDate)}</p>
                      </div>
                    </div>
                  )}
                  {project.endDate && (
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-red-500 mt-2"></div>
                      <div>
                        <p className="font-semibold text-gray-800">End Date</p>
                        <p className="text-gray-600">{formatDate(project.endDate)}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Impact Metrics */}
            {hasImpactMetrics && (
              <div className="bg-white rounded-xl p-8 shadow-md">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">📊 Impact</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {project.storytellerCount && project.storytellerCount > 0 && (
                    <div className="text-center">
                      <div className="text-4xl font-bold" style={{ color: themeColor }}>
                        {project.storytellerCount}
                      </div>
                      <p className="text-gray-600 mt-2">Storytellers</p>
                    </div>
                  )}
                  {project.supporters && project.supporters > 0 && (
                    <div className="text-center">
                      <div className="text-4xl font-bold" style={{ color: themeColor }}>
                        {project.supporters}
                      </div>
                      <p className="text-gray-600 mt-2">Supporters</p>
                    </div>
                  )}
                  {project.partnerCount && project.partnerCount > 0 && (
                    <div className="text-center">
                      <div className="text-4xl font-bold" style={{ color: themeColor }}>
                        {project.partnerCount}
                      </div>
                      <p className="text-gray-600 mt-2">Partners</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Themes */}
            {project.themes && project.themes.length > 0 && (
              <div className="bg-white rounded-xl p-8 shadow-md">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Themes</h2>
                <div className="flex gap-3 flex-wrap">
                  {project.themes.map(theme => (
                    <span
                      key={theme}
                      className="px-4 py-2 border-2 rounded-lg text-sm font-semibold bg-white"
                      style={{
                        borderColor: THEME_COLORS[theme] || '#95A5A6',
                        color: THEME_COLORS[theme] || '#95A5A6'
                      }}
                    >
                      {THEME_ICONS[theme] || '📋'} {theme}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Get Involved / Contact */}
            {(project.projectLead || project.lead || project.notionUrl) && (
              <div className="bg-white rounded-xl p-6 shadow-md">
                <h3 className="text-lg font-bold text-gray-800 mb-4">🤝 Get Involved</h3>
                <div className="space-y-3">
                  {(project.projectLead || project.lead) && (
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Project Lead</p>
                      <p className="font-medium text-gray-800">
                        {typeof project.projectLead === 'object' && project.projectLead !== null
                          ? (project.projectLead as any).name
                          : project.projectLead || project.lead}
                      </p>
                    </div>
                  )}
                  {project.notionUrl && (
                    <a
                      href={project.notionUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full px-4 py-2 bg-gray-800 text-white text-center rounded-lg font-semibold hover:bg-gray-900 transition-colors"
                    >
                      View in Notion →
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Funding */}
            {project.funding && (
              <div className="bg-white rounded-xl p-6 shadow-md">
                <h3 className="text-lg font-bold text-gray-800 mb-3">💰 Funding</h3>
                <p className="text-gray-700">{project.funding}</p>
              </div>
            )}

            {/* Health Indicator */}
            {healthScore !== undefined && (
              <div className="bg-white rounded-xl p-6 shadow-md">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Project Health</h3>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-2xl font-bold" style={{ color: health.color }}>
                    {healthScore}/100
                  </span>
                  <span className="text-sm font-semibold text-gray-600">
                    {health.label}
                  </span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${healthScore}%`,
                      background: health.color
                    }}
                  />
                </div>
              </div>
            )}

            {/* Resources & Links */}
            {hasResources && (
              <div className="bg-white rounded-xl p-6 shadow-md">
                <h3 className="text-lg font-bold text-gray-800 mb-3">📚 Resources</h3>
                <div className="space-y-2">
                  {project.relatedResources && project.relatedResources.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold text-gray-600 mb-1">Documents</p>
                      <p className="text-gray-700">{project.relatedResources.length} resources</p>
                    </div>
                  )}
                  {project.relatedArtifacts && project.relatedArtifacts.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold text-gray-600 mb-1">Artifacts</p>
                      <p className="text-gray-700">{project.relatedArtifacts.length} artifacts</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Location */}
            {project.relatedPlaces && project.relatedPlaces.length > 0 && (
              <div className="bg-white rounded-xl p-6 shadow-md">
                <h3 className="text-lg font-bold text-gray-800 mb-3">📍 Location</h3>
                <div className="space-y-2">
                  {project.relatedPlaces.map((place, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-gray-700">
                      <span className="text-xl">📍</span>
                      <span className="font-medium">{place.displayName}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Organizations */}
            {project.relatedOrganisations && project.relatedOrganisations.length > 0 && (
              <div className="bg-white rounded-xl p-6 shadow-md">
                <h3 className="text-lg font-bold text-gray-800 mb-3">🏢 Organizations</h3>
                <div className="space-y-2">
                  {project.relatedOrganisations.map((org, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-gray-700">
                      <span className="text-xl">🏢</span>
                      <span className="font-medium">{org}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* People */}
            {project.relatedPeople && project.relatedPeople.length > 0 && (
              <div className="bg-white rounded-xl p-6 shadow-md">
                <h3 className="text-lg font-bold text-gray-800 mb-3">👥 People</h3>
                <div className="space-y-2">
                  {project.relatedPeople.map((person, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-gray-700">
                      <span className="text-xl">👤</span>
                      <span className="font-medium">{person}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
