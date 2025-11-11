import { useMemo } from 'react';
import { useProjects } from '../../hooks';
import { LoadingSpinner } from '../../components/ui';
import { prepareProjectForShowcase } from '../../utils/showcaseDataMapper';

/**
 * Admin page to analyze project data and show what's available for showcase
 */
const ProjectAnalysisPage = () => {
  const { data: projects = [], isLoading } = useProjects();

  // Analyze field population
  const analysis = useMemo(() => {
    if (projects.length === 0) return null;

    const fieldStats = {
      description: { name: 'Description', count: 0, examples: [] as string[] },
      aiSummary: { name: 'AI Summary', count: 0, examples: [] as string[] },
      heroVideoUrl: { name: 'Hero Video URL', count: 0, examples: [] as string[] },
      heroImageUrl: { name: 'Hero Image', count: 0, examples: [] as string[] },
      galleryImages: { name: 'Gallery Images', count: 0, examples: [] as string[] },
      websiteLinks: { name: 'Website Links', count: 0, examples: [] as string[] },
      location: { name: 'Location', count: 0, examples: [] as string[] },
      state: { name: 'State', count: 0, examples: [] as string[] },
      revenueActual: { name: 'Revenue', count: 0, examples: [] as string[] },
      partnerOrganizations: { name: 'Partners', count: 0, examples: [] as string[] },
      themes: { name: 'Themes', count: 0, examples: [] as string[] },
    };

    projects.forEach(project => {
      if (project.description) {
        fieldStats.description.count++;
        if (fieldStats.description.examples.length < 2) {
          fieldStats.description.examples.push(project.description.substring(0, 50) + '...');
        }
      }
      if (project.aiSummary) {
        fieldStats.aiSummary.count++;
        if (fieldStats.aiSummary.examples.length < 2) {
          fieldStats.aiSummary.examples.push(project.aiSummary.substring(0, 50) + '...');
        }
      }
      if (project.heroVideoUrl) fieldStats.heroVideoUrl.count++;
      if (project.heroImageUrl) fieldStats.heroImageUrl.count++;
      if (project.galleryImages && project.galleryImages.length > 0) {
        fieldStats.galleryImages.count++;
        if (fieldStats.galleryImages.examples.length < 2) {
          fieldStats.galleryImages.examples.push(`${project.galleryImages.length} images`);
        }
      }
      if (project.websiteLinks) fieldStats.websiteLinks.count++;
      if (project.location) fieldStats.location.count++;
      if (project.state) fieldStats.state.count++;
      if (project.revenueActual && project.revenueActual > 0) fieldStats.revenueActual.count++;
      if (project.partnerOrganizations && project.partnerOrganizations.length > 0) {
        fieldStats.partnerOrganizations.count++;
        if (fieldStats.partnerOrganizations.examples.length < 2) {
          fieldStats.partnerOrganizations.examples.push(`${project.partnerOrganizations.length} partners`);
        }
      }
      if (project.themes && project.themes.length > 0) {
        fieldStats.themes.count++;
        if (fieldStats.themes.examples.length < 2) {
          fieldStats.themes.examples.push(project.themes.join(', '));
        }
      }
    });

    // Categorize projects
    const activeProjects = projects.filter(p => p.status === 'Active');
    const projectsWithDescriptions = projects.filter(p => p.description || p.aiSummary);
    const projectsWithImages = projects.filter(p => p.heroImageUrl || (p.galleryImages && p.galleryImages.length > 0));
    const projectsWithLocation = projects.filter(p => p.location);

    const showcaseReady = activeProjects.filter(p =>
      (p.description || p.aiSummary) &&
      (p.heroImageUrl || (p.galleryImages && p.galleryImages.length > 0))
    );

    const needsDescription = activeProjects.filter(p => !p.description && !p.aiSummary);
    const needsImages = activeProjects.filter(p => !p.heroImageUrl && (!p.galleryImages || p.galleryImages.length === 0));
    const needsLocation = activeProjects.filter(p => !p.location);

    return {
      fieldStats,
      activeProjects,
      projectsWithDescriptions,
      projectsWithImages,
      projectsWithLocation,
      showcaseReady,
      needsDescription,
      needsImages,
      needsLocation,
    };
  }, [projects]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="p-8">
        <h1 className="text-3xl font-bold mb-4">No Projects Found</h1>
        <p>Add some projects in Notion to see analysis.</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-4xl font-bold mb-8">📊 Project Data Analysis</h1>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="text-3xl font-bold text-blue-600">{projects.length}</div>
          <div className="text-sm text-gray-600">Total Projects</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="text-3xl font-bold text-green-600">{analysis.activeProjects.length}</div>
          <div className="text-sm text-gray-600">Active Projects</div>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
          <div className="text-3xl font-bold text-purple-600">{analysis.showcaseReady.length}</div>
          <div className="text-sm text-gray-600">Showcase Ready</div>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
          <div className="text-3xl font-bold text-orange-600">
            {Math.round((analysis.showcaseReady.length / projects.length) * 100)}%
          </div>
          <div className="text-sm text-gray-600">Completion Rate</div>
        </div>
      </div>

      {/* Field Analysis */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold mb-6">📈 Field Population</h2>
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Field
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Progress
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Count
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {Object.values(analysis.fieldStats).map((stat) => {
                const percentage = Math.round((stat.count / projects.length) * 100);
                return (
                  <tr key={stat.name}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {stat.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-blue-600 h-full rounded-full"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-600 w-12 text-right">{percentage}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                      {stat.count}/{projects.length}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Showcase Ready Projects */}
      {analysis.showcaseReady.length > 0 && (
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6">✅ Showcase Ready ({analysis.showcaseReady.length})</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {analysis.showcaseReady.map(project => {
              const enhanced = prepareProjectForShowcase(project);
              return (
                <div key={project.id} className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="font-semibold text-green-900 mb-2">{project.name}</div>
                  <div className="text-sm text-green-700 space-y-1">
                    {enhanced.impactStats && (
                      <div>📊 {Object.keys(enhanced.impactStats).length} stats auto-extracted</div>
                    )}
                    {enhanced.testimonials && enhanced.testimonials.length > 0 && (
                      <div>💬 {enhanced.testimonials.length} testimonials found</div>
                    )}
                    {enhanced.galleryImages && (
                      <div>📸 {enhanced.galleryImages.length} images</div>
                    )}
                    <a
                      href={`/showcase/${enhanced.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block mt-2 text-green-600 hover:text-green-800 underline"
                    >
                      View Showcase →
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Projects Needing Work */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        {/* Needs Description */}
        {analysis.needsDescription.length > 0 && (
          <div>
            <h3 className="text-lg font-bold mb-4 text-red-600">
              📝 Need Description ({analysis.needsDescription.length})
            </h3>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-2">
              {analysis.needsDescription.slice(0, 5).map(project => (
                <div key={project.id} className="text-sm text-red-900">
                  • {project.name}
                </div>
              ))}
              {analysis.needsDescription.length > 5 && (
                <div className="text-sm text-red-600 italic">
                  + {analysis.needsDescription.length - 5} more
                </div>
              )}
            </div>
          </div>
        )}

        {/* Needs Images */}
        {analysis.needsImages.length > 0 && (
          <div>
            <h3 className="text-lg font-bold mb-4 text-orange-600">
              📸 Need Images ({analysis.needsImages.length})
            </h3>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 space-y-2">
              {analysis.needsImages.slice(0, 5).map(project => (
                <div key={project.id} className="text-sm text-orange-900">
                  • {project.name}
                </div>
              ))}
              {analysis.needsImages.length > 5 && (
                <div className="text-sm text-orange-600 italic">
                  + {analysis.needsImages.length - 5} more
                </div>
              )}
            </div>
          </div>
        )}

        {/* Needs Location */}
        {analysis.needsLocation.length > 0 && (
          <div>
            <h3 className="text-lg font-bold mb-4 text-yellow-600">
              📍 Need Location ({analysis.needsLocation.length})
            </h3>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-2">
              {analysis.needsLocation.slice(0, 5).map(project => (
                <div key={project.id} className="text-sm text-yellow-900">
                  • {project.name}
                </div>
              ))}
              {analysis.needsLocation.length > 5 && (
                <div className="text-sm text-yellow-600 italic">
                  + {analysis.needsLocation.length - 5} more
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Quick Wins */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-4">🎯 Quick Wins for Better Showcase</h2>
        <div className="space-y-3 text-gray-700">
          <div className="flex items-start gap-3">
            <span className="text-2xl">1️⃣</span>
            <div>
              <strong>Add Descriptions</strong> - Write rich descriptions with numbers ("50 people", "12 locations") to enable auto-extraction of impact stats
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-2xl">2️⃣</span>
            <div>
              <strong>Upload Photos</strong> - Add 3-5 images to "Gallery Images" field for top {Math.min(5, analysis.needsImages.length)} projects
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-2xl">3️⃣</span>
            <div>
              <strong>Add Locations</strong> - Fill in "Location" field (e.g., "Canberra", "Sydney") for map visualization
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-2xl">4️⃣</span>
            <div>
              <strong>Include Quotes</strong> - Add testimonials in descriptions: "This changed my life!" - Person Name
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-2xl">5️⃣</span>
            <div>
              <strong>Use Keywords</strong> - Include "challenge", "approach", "impact" in descriptions for better auto-extraction
            </div>
          </div>
        </div>
      </div>

      {/* All Projects List */}
      <div className="mt-12">
        <h2 className="text-2xl font-bold mb-6">📋 All Projects ({projects.length})</h2>
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Description</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Images</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Location</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Auto-Extracted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {projects.map(project => {
                  const enhanced = prepareProjectForShowcase(project);
                  const hasDescription = !!(project.description || project.aiSummary);
                  const hasImages = !!(project.heroImageUrl || (project.galleryImages && project.galleryImages.length > 0));
                  const hasLocation = !!project.location;
                  const statsCount = enhanced.impactStats ? Object.keys(enhanced.impactStats).length : 0;
                  const testimonialsCount = enhanced.testimonials?.length || 0;

                  return (
                    <tr key={project.id} className={project.status === 'Active' ? 'bg-green-50' : ''}>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {project.name}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          project.status === 'Active' ? 'bg-green-100 text-green-800' :
                          project.status === 'Completed' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {project.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-center">
                        {hasDescription ? '✅' : '❌'}
                      </td>
                      <td className="px-6 py-4 text-sm text-center">
                        {hasImages ? '✅' : '❌'}
                      </td>
                      <td className="px-6 py-4 text-sm text-center">
                        {hasLocation ? '✅' : '❌'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {statsCount > 0 && <div>📊 {statsCount} stats</div>}
                        {testimonialsCount > 0 && <div>💬 {testimonialsCount} testimonials</div>}
                        {statsCount === 0 && testimonialsCount === 0 && <div className="text-gray-400">None</div>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectAnalysisPage;
