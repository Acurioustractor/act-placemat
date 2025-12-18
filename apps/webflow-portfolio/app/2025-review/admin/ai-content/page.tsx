'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  getAIStatus,
  generateProjectStory,
  generateTimelineDescription,
  generateTimelineIdeas,
  bulkGenerateProjectStories,
  type GeneratedProjectContent,
  type TimelineSuggestion,
  type ContentBlock,
} from '../../../../lib/yearInReviewApi';
import { getReviewProjects, createReviewProject, updateReviewProject } from '../../../../lib/reviewProjectsApi';
import type { ReviewProject, TimelineEntry } from '../../../../types/yearInReview';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

type TabType = 'project-stories' | 'timeline-descriptions' | 'timeline-ideas' | 'bulk';

interface NotionProject {
  id: string;
  name: string;
  description?: string;
  aiSummary?: string;
  area?: string;
  status?: string;
  themes?: string[];
  place?: string;
}

export default function AIContentGenerationPage() {
  // AI status
  const [aiStatus, setAiStatus] = useState<{
    available: boolean;
    providers: Record<string, { available: boolean; model?: string; quality?: string }>;
  } | null>(null);

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('project-stories');

  // Data
  const [notionProjects, setNotionProjects] = useState<NotionProject[]>([]);
  const [reviewProjects, setReviewProjects] = useState<ReviewProject[]>([]);
  const [timelineEntries, setTimelineEntries] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Project story generation state
  const [selectedProject, setSelectedProject] = useState<NotionProject | null>(null);
  const [generationDepth, setGenerationDepth] = useState<'brief' | 'standard' | 'detailed'>('standard');
  const [includeQuote, setIncludeQuote] = useState(true);
  const [focusAreas, setFocusAreas] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<GeneratedProjectContent | null>(null);
  const [generationProvider, setGenerationProvider] = useState<string>('');

  // Timeline description state
  const [selectedEntry, setSelectedEntry] = useState<TimelineEntry | null>(null);
  const [descriptionStyle, setDescriptionStyle] = useState<'narrative' | 'bullet' | 'impact'>('narrative');
  const [generatedDescription, setGeneratedDescription] = useState<{
    description: string;
    suggestedTitle?: string;
    suggestedTags?: string[];
  } | null>(null);

  // Timeline ideas state
  const [ideaSeason, setIdeaSeason] = useState<number | null>(null);
  const [ideaType, setIdeaType] = useState<string | null>(null);
  const [ideaCount, setIdeaCount] = useState(5);
  const [timelineSuggestions, setTimelineSuggestions] = useState<TimelineSuggestion[]>([]);
  const [timelineAnalysis, setTimelineAnalysis] = useState<{
    typeBreakdown: Record<string, number>;
    monthBreakdown: Record<number, number>;
    gaps: string[];
  } | null>(null);

  // Bulk generation state
  const [bulkSelectedProjects, setBulkSelectedProjects] = useState<Set<string>>(new Set());
  const [bulkResults, setBulkResults] = useState<Array<{
    projectId: string;
    projectName: string;
    success: boolean;
    generated?: GeneratedProjectContent;
    error?: string;
  }>>([]);
  const [bulkGenerating, setBulkGenerating] = useState(false);

  // Load initial data
  useEffect(() => {
    async function loadData() {
      try {
        // Check AI status
        try {
          const status = await getAIStatus();
          setAiStatus(status);
        } catch (e) {
          console.error('Failed to check AI status:', e);
          setAiStatus({ available: false, providers: {} });
        }

        // Load Notion projects
        const projectsRes = await fetch(`${API_BASE}/api/real/projects`);
        if (projectsRes.ok) {
          const data = await projectsRes.json();
          const projects = (data.projects || [])
            .filter((p: NotionProject) => p.name && p.name !== 'Unknown')
            .sort((a: NotionProject, b: NotionProject) => a.name.localeCompare(b.name));
          setNotionProjects(projects);
        }

        // Load review projects
        const reviewProjectsData = await getReviewProjects(2025, true).catch(() => []);
        setReviewProjects(reviewProjectsData);

        // Load timeline entries
        const timelineRes = await fetch(`${API_BASE}/api/year-in-review/2025`);
        if (timelineRes.ok) {
          const timelineData = await timelineRes.json();
          const entries = timelineData.timeline?.flatMap((s: { entries: TimelineEntry[] }) => s.entries) || [];
          setTimelineEntries(entries);
        }
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  // Generate project story
  const handleGenerateProjectStory = async () => {
    if (!selectedProject) return;

    setGenerating(true);
    setGeneratedContent(null);

    try {
      const result = await generateProjectStory(
        {
          name: selectedProject.name,
          description: selectedProject.description,
          aiSummary: selectedProject.aiSummary,
          area: selectedProject.area,
          status: selectedProject.status,
          themes: selectedProject.themes,
          place: selectedProject.place,
        },
        { depth: generationDepth, includeQuote, focusAreas }
      );

      if (result.success && result.generated) {
        setGeneratedContent(result.generated);
        setGenerationProvider(result.ai?.provider || 'unknown');
      } else {
        alert(`Generation failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Generation error:', error);
      alert('Failed to generate content. Check console for details.');
    } finally {
      setGenerating(false);
    }
  };

  // Generate timeline description
  const handleGenerateDescription = async () => {
    if (!selectedEntry) return;

    setGenerating(true);
    setGeneratedDescription(null);

    try {
      const result = await generateTimelineDescription(
        {
          title: selectedEntry.title,
          description: selectedEntry.description,
          source: selectedEntry.source,
          type: selectedEntry.type,
          date: selectedEntry.date,
          tags: selectedEntry.tags,
          metadata: selectedEntry.metadata,
        },
        { style: descriptionStyle }
      );

      if (result.success && result.generated) {
        setGeneratedDescription(result.generated);
      } else {
        alert(`Generation failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Generation error:', error);
      alert('Failed to generate description. Check console for details.');
    } finally {
      setGenerating(false);
    }
  };

  // Generate timeline ideas
  const handleGenerateIdeas = async () => {
    setGenerating(true);
    setTimelineSuggestions([]);

    try {
      const result = await generateTimelineIdeas(
        timelineEntries,
        { projects: notionProjects.map(p => ({ id: p.id, name: p.name })) },
        { count: ideaCount, season: ideaSeason, type: ideaType }
      );

      if (result.success) {
        setTimelineSuggestions(result.suggestions);
        setTimelineAnalysis(result.analysis || null);
      } else {
        alert(`Generation failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Generation error:', error);
      alert('Failed to generate ideas. Check console for details.');
    } finally {
      setGenerating(false);
    }
  };

  // Bulk generate
  const handleBulkGenerate = async () => {
    const selected = notionProjects.filter(p => bulkSelectedProjects.has(p.id));
    if (selected.length === 0) {
      alert('Please select at least one project');
      return;
    }

    setBulkGenerating(true);
    setBulkResults([]);

    try {
      const result = await bulkGenerateProjectStories(
        selected.map(p => ({
          id: p.id,
          name: p.name,
          description: p.description,
          area: p.area,
          themes: p.themes,
        })),
        { depth: generationDepth }
      );

      setBulkResults(result.results);
    } catch (error) {
      console.error('Bulk generation error:', error);
      alert('Bulk generation failed. Check console for details.');
    } finally {
      setBulkGenerating(false);
    }
  };

  // Save generated content to a review project
  const handleSaveToProject = async () => {
    if (!selectedProject || !generatedContent) return;

    try {
      // Check if project already has a review project
      const existingProject = reviewProjects.find(
        p => p.title === selectedProject.name
      );

      if (existingProject) {
        // Update existing project
        await updateReviewProject(2025, existingProject.slug, {
          subtitle: generatedContent.subtitle,
          contentBlocks: generatedContent.contentBlocks,
          metaDescription: generatedContent.metaDescription,
        });
        alert('Project updated successfully!');
      } else {
        // Create new project with a timeline entry ID placeholder
        const timelineEntry = timelineEntries.find(
          e => e.title.includes(selectedProject.name) || selectedProject.name.includes(e.title.replace('Project Started: ', ''))
        );

        if (!timelineEntry) {
          alert('No matching timeline entry found. Please create a timeline entry first.');
          return;
        }

        await createReviewProject(2025, {
          timelineEntryId: timelineEntry.id,
          title: selectedProject.name,
          subtitle: generatedContent.subtitle,
          contentBlocks: generatedContent.contentBlocks,
        });
        alert('New project page created successfully!');
      }

      // Refresh projects
      const updated = await getReviewProjects(2025, true).catch(() => []);
      setReviewProjects(updated);
    } catch (error) {
      console.error('Save error:', error);
      alert('Failed to save. Check console for details.');
    }
  };

  // Render content blocks preview
  const renderContentBlocks = (blocks: ContentBlock[]) => {
    return blocks.map((block, idx) => {
      switch (block.type) {
        case 'heading':
          const HeadingTag = `h${block.data.level || 2}` as keyof JSX.IntrinsicElements;
          return (
            <HeadingTag key={idx} className="text-lg font-semibold mt-4 mb-2 text-gray-800">
              {block.data.text}
            </HeadingTag>
          );
        case 'paragraph':
          return (
            <p key={idx} className="text-gray-700 mb-3 leading-relaxed">
              {block.data.text}
            </p>
          );
        case 'quote':
          return (
            <blockquote key={idx} className="border-l-4 border-amber-500 pl-4 italic my-4 bg-amber-50 p-3 rounded-r">
              <p className="text-gray-700">{block.data.quoteText}</p>
              {block.data.quoteAuthor && (
                <footer className="text-sm text-gray-500 mt-2">— {block.data.quoteAuthor}</footer>
              )}
            </blockquote>
          );
        default:
          return null;
      }
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">AI Content Generation</h1>
              <p className="text-sm text-gray-500">Generate rich content for Year in Review</p>
            </div>
            <div className="flex items-center gap-4">
              {/* AI Status */}
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
                aiStatus?.available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                <span className={`w-2 h-2 rounded-full ${aiStatus?.available ? 'bg-green-500' : 'bg-red-500'}`} />
                {aiStatus?.available ? 'AI Available' : 'AI Unavailable'}
              </div>
              <Link
                href="/2025-review/admin"
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Back to Admin
              </Link>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-4">
            {[
              { id: 'project-stories' as TabType, label: 'Project Stories' },
              { id: 'timeline-descriptions' as TabType, label: 'Timeline Descriptions' },
              { id: 'timeline-ideas' as TabType, label: 'Timeline Ideas' },
              { id: 'bulk' as TabType, label: 'Bulk Generate' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition ${
                  activeTab === tab.id
                    ? 'bg-white text-gray-900 border-t border-x border-gray-200'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Project Stories Tab */}
        {activeTab === 'project-stories' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Configuration */}
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold mb-4">Select Project</h2>
                <select
                  value={selectedProject?.id || ''}
                  onChange={(e) => {
                    const project = notionProjects.find(p => p.id === e.target.value);
                    setSelectedProject(project || null);
                    setGeneratedContent(null);
                  }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="">Choose a project...</option>
                  {notionProjects.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.status ? `(${p.status})` : ''}
                    </option>
                  ))}
                </select>

                {selectedProject && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg text-sm">
                    <p><strong>Area:</strong> {selectedProject.area || 'Not set'}</p>
                    <p><strong>Status:</strong> {selectedProject.status || 'Not set'}</p>
                    <p><strong>Description:</strong> {selectedProject.description?.substring(0, 200) || 'None'}...</p>
                    {selectedProject.themes && selectedProject.themes.length > 0 && (
                      <div className="flex gap-1 flex-wrap mt-2">
                        {selectedProject.themes.map(t => (
                          <span key={t} className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs">{t}</span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold mb-4">Generation Options</h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Content Depth</label>
                    <select
                      value={generationDepth}
                      onChange={(e) => setGenerationDepth(e.target.value as typeof generationDepth)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    >
                      <option value="brief">Brief (2 paragraphs)</option>
                      <option value="standard">Standard (4 paragraphs)</option>
                      <option value="detailed">Detailed (6 paragraphs)</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="includeQuote"
                      checked={includeQuote}
                      onChange={(e) => setIncludeQuote(e.target.checked)}
                      className="rounded"
                    />
                    <label htmlFor="includeQuote" className="text-sm text-gray-700">
                      Include quote
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Focus Areas (optional)</label>
                    <div className="flex flex-wrap gap-2">
                      {['impact', 'community', 'learnings', 'innovation', 'partnerships'].map(area => (
                        <button
                          key={area}
                          onClick={() => setFocusAreas(prev =>
                            prev.includes(area) ? prev.filter(a => a !== area) : [...prev, area]
                          )}
                          className={`px-3 py-1 rounded-full text-sm transition ${
                            focusAreas.includes(area)
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {area}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleGenerateProjectStory}
                  disabled={!selectedProject || generating || !aiStatus?.available}
                  className="w-full mt-6 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {generating ? 'Generating...' : 'Generate Content'}
                </button>
              </div>
            </div>

            {/* Right: Preview */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Generated Content</h2>
                {generationProvider && (
                  <span className="text-xs text-gray-500">via {generationProvider}</span>
                )}
              </div>

              {generatedContent ? (
                <div className="space-y-4">
                  {generatedContent.subtitle && (
                    <p className="text-lg text-gray-600 italic">{generatedContent.subtitle}</p>
                  )}

                  <div className="prose prose-sm max-w-none">
                    {renderContentBlocks(generatedContent.contentBlocks)}
                  </div>

                  {generatedContent.suggestedTags && generatedContent.suggestedTags.length > 0 && (
                    <div className="flex gap-1 flex-wrap pt-4 border-t">
                      {generatedContent.suggestedTags.map(tag => (
                        <span key={tag} className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2 pt-4 border-t">
                    <button
                      onClick={handleSaveToProject}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
                    >
                      Save to Project
                    </button>
                    <button
                      onClick={() => navigator.clipboard.writeText(JSON.stringify(generatedContent, null, 2))}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
                    >
                      Copy JSON
                    </button>
                    <button
                      onClick={handleGenerateProjectStory}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
                    >
                      Regenerate
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <p>Select a project and generate content to see preview</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Timeline Descriptions Tab */}
        {activeTab === 'timeline-descriptions' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold mb-4">Select Timeline Entry</h2>
                <select
                  value={selectedEntry?.id || ''}
                  onChange={(e) => {
                    const entry = timelineEntries.find(e2 => e2.id === e.target.value);
                    setSelectedEntry(entry || null);
                    setGeneratedDescription(null);
                  }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="">Choose an entry...</option>
                  {timelineEntries.map(e => (
                    <option key={e.id} value={e.id}>
                      {e.title.substring(0, 60)}...
                    </option>
                  ))}
                </select>

                {selectedEntry && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg text-sm">
                    <p><strong>Current:</strong> {selectedEntry.description?.substring(0, 200) || 'No description'}</p>
                    <p><strong>Type:</strong> {selectedEntry.type}</p>
                    <p><strong>Source:</strong> {selectedEntry.source}</p>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold mb-4">Style</h2>
                <div className="flex gap-2">
                  {[
                    { id: 'narrative', label: 'Narrative' },
                    { id: 'bullet', label: 'Bullet Points' },
                    { id: 'impact', label: 'Impact Focus' },
                  ].map(style => (
                    <button
                      key={style.id}
                      onClick={() => setDescriptionStyle(style.id as typeof descriptionStyle)}
                      className={`px-4 py-2 rounded-lg text-sm transition ${
                        descriptionStyle === style.id
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {style.label}
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleGenerateDescription}
                  disabled={!selectedEntry || generating || !aiStatus?.available}
                  className="w-full mt-6 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {generating ? 'Generating...' : 'Generate Description'}
                </button>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4">Generated Description</h2>
              {generatedDescription ? (
                <div className="space-y-4">
                  <p className="text-gray-700">{generatedDescription.description}</p>

                  {generatedDescription.suggestedTitle && (
                    <div className="p-3 bg-yellow-50 rounded-lg">
                      <p className="text-sm text-yellow-800">
                        <strong>Suggested title:</strong> {generatedDescription.suggestedTitle}
                      </p>
                    </div>
                  )}

                  {generatedDescription.suggestedTags && (
                    <div className="flex gap-1 flex-wrap">
                      {generatedDescription.suggestedTags.map(tag => (
                        <span key={tag} className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <button
                    onClick={() => navigator.clipboard.writeText(generatedDescription.description)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
                  >
                    Copy Description
                  </button>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <p>Select an entry and generate to see preview</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Timeline Ideas Tab */}
        {activeTab === 'timeline-ideas' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4">Generate Timeline Ideas</h2>
              <p className="text-sm text-gray-500 mb-4">
                AI will analyze your existing timeline and suggest new entries to fill gaps and add depth.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Season Filter</label>
                  <select
                    value={ideaSeason ?? ''}
                    onChange={(e) => setIdeaSeason(e.target.value ? parseInt(e.target.value) : null)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="">All seasons</option>
                    <option value="0">Planting (Jan-Mar)</option>
                    <option value="1">Growing (Apr-Jun)</option>
                    <option value="2">Harvesting (Jul-Sep)</option>
                    <option value="3">Resting (Oct-Dec)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type Filter</label>
                  <select
                    value={ideaType ?? ''}
                    onChange={(e) => setIdeaType(e.target.value || null)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="">All types</option>
                    <option value="project">Project</option>
                    <option value="milestone">Milestone</option>
                    <option value="partnership">Partnership</option>
                    <option value="funding">Funding</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Number of Ideas</label>
                  <select
                    value={ideaCount}
                    onChange={(e) => setIdeaCount(parseInt(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="3">3 ideas</option>
                    <option value="5">5 ideas</option>
                    <option value="10">10 ideas</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    onClick={handleGenerateIdeas}
                    disabled={generating || !aiStatus?.available}
                    className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {generating ? 'Analyzing...' : 'Generate Ideas'}
                  </button>
                </div>
              </div>
            </div>

            {timelineAnalysis && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-4">Timeline Analysis</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Entry Types</h4>
                    <div className="space-y-1">
                      {Object.entries(timelineAnalysis.typeBreakdown).map(([type, count]) => (
                        <div key={type} className="flex justify-between text-sm">
                          <span className="text-gray-600">{type}</span>
                          <span className="font-medium">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Monthly Distribution</h4>
                    <div className="flex gap-1 h-16 items-end">
                      {Array.from({ length: 12 }).map((_, m) => (
                        <div
                          key={m}
                          className="flex-1 bg-blue-500 rounded-t"
                          style={{
                            height: `${Math.min(100, (timelineAnalysis.monthBreakdown[m] || 0) * 20)}%`,
                          }}
                          title={`Month ${m + 1}: ${timelineAnalysis.monthBreakdown[m] || 0} entries`}
                        />
                      ))}
                    </div>
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                      <span>Jan</span>
                      <span>Jun</span>
                      <span>Dec</span>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Identified Gaps</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {timelineAnalysis.gaps.slice(0, 4).map((gap, i) => (
                        <li key={i}>{gap}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {timelineSuggestions.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Suggested Entries</h3>
                {timelineSuggestions.map((suggestion, idx) => (
                  <div key={idx} className="bg-white rounded-lg shadow-sm p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">{suggestion.title}</h4>
                        <p className="text-gray-600 mt-1">{suggestion.description}</p>
                        <div className="flex gap-2 mt-3 flex-wrap">
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs">
                            {suggestion.type}
                          </span>
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
                            {suggestion.suggestedDate}
                          </span>
                          {suggestion.tags.map(tag => (
                            <span key={tag} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 p-3 bg-yellow-50 rounded-lg text-sm text-yellow-800">
                      <strong>Why:</strong> {suggestion.reasoning}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Bulk Generation Tab */}
        {activeTab === 'bulk' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold">Bulk Generate Project Stories</h2>
                  <p className="text-sm text-gray-500">Select multiple projects to generate content for</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setBulkSelectedProjects(new Set(notionProjects.map(p => p.id)))}
                    className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded"
                  >
                    Select All
                  </button>
                  <button
                    onClick={() => setBulkSelectedProjects(new Set())}
                    className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div className="max-h-64 overflow-y-auto border rounded-lg">
                {notionProjects.map(project => (
                  <label
                    key={project.id}
                    className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                  >
                    <input
                      type="checkbox"
                      checked={bulkSelectedProjects.has(project.id)}
                      onChange={(e) => {
                        const newSet = new Set(bulkSelectedProjects);
                        if (e.target.checked) {
                          newSet.add(project.id);
                        } else {
                          newSet.delete(project.id);
                        }
                        setBulkSelectedProjects(newSet);
                      }}
                      className="rounded"
                    />
                    <span className="flex-1 text-sm">{project.name}</span>
                    {project.status && (
                      <span className="text-xs text-gray-400">{project.status}</span>
                    )}
                  </label>
                ))}
              </div>

              <div className="flex items-center gap-4 mt-4">
                <select
                  value={generationDepth}
                  onChange={(e) => setGenerationDepth(e.target.value as typeof generationDepth)}
                  className="border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="brief">Brief</option>
                  <option value="standard">Standard</option>
                  <option value="detailed">Detailed</option>
                </select>

                <button
                  onClick={handleBulkGenerate}
                  disabled={bulkSelectedProjects.size === 0 || bulkGenerating || !aiStatus?.available}
                  className="px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {bulkGenerating
                    ? 'Generating...'
                    : `Generate for ${bulkSelectedProjects.size} Projects`}
                </button>
              </div>
            </div>

            {bulkResults.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Results</h3>
                {bulkResults.map((result, idx) => (
                  <div
                    key={idx}
                    className={`bg-white rounded-lg shadow-sm p-6 ${
                      result.success ? 'border-l-4 border-green-500' : 'border-l-4 border-red-500'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold">{result.projectName}</h4>
                        {result.success ? (
                          <p className="text-green-600 text-sm">Generated successfully</p>
                        ) : (
                          <p className="text-red-600 text-sm">{result.error}</p>
                        )}
                      </div>
                      {result.success && result.generated && (
                        <button
                          onClick={() => {
                            setSelectedProject(notionProjects.find(p => p.id === result.projectId) || null);
                            setGeneratedContent(result.generated!);
                            setActiveTab('project-stories');
                          }}
                          className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                        >
                          View & Edit
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
