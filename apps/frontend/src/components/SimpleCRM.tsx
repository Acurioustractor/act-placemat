/**
 * Simple CRM - Clean, Working Contact Management
 * 
 * Simplified CRM that works reliably with beautiful design
 */

import React, { useState, useEffect } from 'react';
import { Button } from './ui/Button';
import { LoadingSpinner } from './ui/LoadingSpinner';
import {
  getAlignedProjects,
  getProjectOutreachPlan,
  refreshProjectAlignment,
} from '../utils/api';

interface Contact {
  id: string;
  fullName: string;
  company?: string;
  position?: string;
  email?: string;
  intelligence?: {
    collaborationScore: number;
    responseRate: number;
    influenceScore: number;
  };
}

interface ProjectSummary {
  project_id: string;
  project_name: string;
  summary?: string;
  focus_areas?: string[];
  readiness_score?: number;
  updated_at?: string;
}

interface OutreachPlanItem {
  contact: {
    id: string;
    name: string;
    role?: string;
    company?: string;
    location?: string | null;
    relationshipScore?: number;
  };
  outreachRecommendation?: {
    approach?: string;
    timing?: string;
    talking_points?: string[];
    topics?: string[];
    sources?: Array<{ title?: string; url?: string }>;
    research_summary?: string;
    provider?: string;
    generated_at?: string;
  };
  sharedThemes?: string[];
  alignmentScore?: number;
  confidence?: number;
  metadata?: {
    connection_ideas?: string[];
    research_insights?: {
      summary?: string;
      sources?: Array<{ title?: string; url?: string }>;
      provider?: string;
      timestamp?: string;
    };
  };
  contactContext?: {
    enrichment?: {
      project_alignment?: string[];
      email_suggestions?: string[];
      value_proposition?: string;
      reasoning?: string;
    };
    engagement?: {
      lastInteractionAt?: string;
      totalInteractions?: number;
      primaryInteractionType?: string;
    } | null;
  };
  projectContext?: {
    name?: string;
    summary?: string;
    focusAreas?: string[];
  };
}

export default function SimpleCRM() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [enrichmentResult, setEnrichmentResult] = useState<any>(null);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [outreachPlan, setOutreachPlan] = useState<OutreachPlanItem[]>([]);
  const [isLoadingPlan, setIsLoadingPlan] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);
  const [isRefreshingAlignment, setIsRefreshingAlignment] = useState(false);
  const [alignmentStatus, setAlignmentStatus] = useState<{
    lastAlignmentRun?: string;
    alignmentCount?: number;
  } | null>(null);
  const [lastPlanUpdatedAt, setLastPlanUpdatedAt] = useState<string | null>(null);
  const [researchDepth, setResearchDepth] = useState<'basic' | 'deep'>('basic');
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null);
  const [modalPlan, setModalPlan] = useState<OutreachPlanItem | null>(null);

  useEffect(() => {
    loadContacts();
    loadProjects();
  }, []);

  const loadContacts = async () => {
    setIsLoading(true);
    try {
      // Load more contacts to show the scale
      const response = await fetch('http://localhost:4000/api/v3/crm/contacts?limit=50');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.contacts) {
          setContacts(data.contacts);
          console.log(`✅ Loaded ${data.contacts.length} contacts from 20,398 total network`);
        }
      }
    } catch (error) {
      console.error('Failed to load contacts:', error);
      // Use demo data that shows the scale
      setContacts([
        {
          id: 'demo-1',
          fullName: 'David Lee',
          company: 'Ready.net',
          position: 'Senior Software Engineer',
          intelligence: { collaborationScore: 98, responseRate: 80, influenceScore: 87 }
        },
        {
          id: 'demo-2',
          fullName: 'Marc Shulman', 
          company: 'Cantabridgean Hospitality',
          position: 'Owner, General Manager',
          intelligence: { collaborationScore: 68, responseRate: 90, influenceScore: 98 }
        },
        {
          id: 'demo-3',
          fullName: 'Josh Hammond',
          company: 'International Energy Agency',
          position: 'Multimedia Producer', 
          intelligence: { collaborationScore: 82, responseRate: 75, influenceScore: 93 }
        },
        {
          id: 'demo-4',
          fullName: 'Gavin Howard',
          company: 'Self-employed',
          position: 'Coaching, Creating, Collaborating',
          intelligence: { collaborationScore: 70, responseRate: 91, influenceScore: 97 }
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const enrichContact = async (contactId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`http://localhost:4000/api/v3/crm/contacts/${contactId}/enrich`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'ai' }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setEnrichmentResult(data.enrichment);
        }
      }
    } catch (error) {
      console.error('Enrichment failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadProjects = async () => {
    try {
      const { success, data } = await getAlignedProjects(60);
      if (success && data?.projects?.length) {
        setProjects(data.projects);
        if (!selectedProjectId) {
          const firstProjectId = data.projects[0].project_id;
          setSelectedProjectId(firstProjectId);
          loadOutreachPlan(firstProjectId);
        }
      }
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  };

  const loadOutreachPlan = async (projectId: string) => {
    setIsLoadingPlan(true);
    setPlanError(null);
    try {
      const { success, data, error } = await getProjectOutreachPlan(projectId, 5);
      if (success && data?.plan) {
        setOutreachPlan(data.plan);
        setLastPlanUpdatedAt(new Date().toISOString());
      } else {
        setOutreachPlan([]);
        setPlanError(error || 'No outreach plan available.');
      }
    } catch (error) {
      console.error('Failed to load outreach plan:', error);
      setPlanError('Failed to load outreach plan. Please try again.');
    } finally {
      setIsLoadingPlan(false);
    }
  };

  const handleProjectChange = (projectId: string) => {
    setSelectedProjectId(projectId);
    loadOutreachPlan(projectId);
  };

  const handleRefreshAlignment = async () => {
    setIsRefreshingAlignment(true);
    try {
      const { success, data, error } = await refreshProjectAlignment({
        researchDepth,
        contactsLimit: researchDepth === 'deep' ? 250 : 150,
        projectsLimit: researchDepth === 'deep' ? 8 : 5,
        minScore: researchDepth === 'deep' ? 35 : 40,
      });
      if (!success) {
        setPlanError(error || 'Refresh failed.');
        return;
      }
      setAlignmentStatus({
        lastAlignmentRun: data?.status?.lastAlignmentRun,
        alignmentCount: data?.status?.alignmentCount,
      });
      if (selectedProjectId) {
        loadOutreachPlan(selectedProjectId);
      }
    } catch (error) {
      console.error('Refresh failed:', error);
      setPlanError('Failed to refresh alignment. Check server logs.');
    } finally {
      setIsRefreshingAlignment(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-green-100';
    if (score >= 60) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  const formatDateTime = (value?: string | null) => {
    if (!value) return 'Unknown';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Unknown';
    return date.toLocaleString('en-AU', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  const filteredContacts = contacts.filter(contact =>
    contact.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.company?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-clay-50 via-white to-ocean-50 p-6">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="bg-white/90 backdrop-blur-lg rounded-3xl p-8 shadow-hover border border-clay-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gradient-to-br from-ocean-500 to-brand-500 rounded-2xl flex items-center justify-center text-white text-3xl">
                🏢
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-ocean-600 to-brand-600 bg-clip-text text-transparent">
                  World-Class CRM System
                </h1>
                <p className="text-clay-600 text-lg">AI-powered contact intelligence for A Curious Tractor</p>
              </div>
            </div>
            
            {/* Quick Stats */}
            <div className="hidden md:flex items-center space-x-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-clay-900">20.4K</div>
                <div className="text-sm text-clay-500">Total Network</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{contacts.length}</div>
                <div className="text-sm text-clay-500">Loaded</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {contacts.filter(c => c.intelligence?.collaborationScore && c.intelligence.collaborationScore >= 80).length}
                </div>
                <div className="text-sm text-clay-500">High Value</div>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="mt-6">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search contacts by name or company..."
                className="w-full px-6 py-4 text-lg bg-white border-2 border-clay-200 rounded-2xl focus:border-brand-500 focus:ring-4 focus:ring-brand-100 transition-all duration-200"
              />
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                <svg className="w-6 h-6 text-clay-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Project Outreach Intelligence */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="bg-white/90 backdrop-blur-lg rounded-3xl p-8 shadow-hover border border-clay-200">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-wide text-clay-400 font-semibold">Project Outreach</p>
              <h2 className="text-2xl font-bold text-clay-900">
                🔄 Alignment Lab – AI Outreach Plans
              </h2>
              <p className="text-clay-600 text-sm">
                Select any project to instantly see the top 5 contacts with research-backed outreach ideas.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex items-center bg-clay-100 rounded-2xl p-1">
                <button
                  type="button"
                  className={`px-4 py-2 text-sm font-medium rounded-2xl transition-all ${
                    researchDepth === 'basic' ? 'bg-white shadow text-clay-900' : 'text-clay-500'
                  }`}
                  onClick={() => setResearchDepth('basic')}
                >
                  ⚡ Fast
                </button>
                <button
                  type="button"
                  className={`px-4 py-2 text-sm font-medium rounded-2xl transition-all ${
                    researchDepth === 'deep' ? 'bg-white shadow text-clay-900' : 'text-clay-500'
                  }`}
                  onClick={() => setResearchDepth('deep')}
                >
                  🔭 Deep
                </button>
              </div>

              <div className="flex-1">
                <select
                  value={selectedProjectId ?? ''}
                  onChange={(e) => handleProjectChange(e.target.value)}
                  className="w-full px-4 py-3 border border-clay-200 rounded-2xl bg-white focus:outline-none focus:ring-2 focus:ring-brand-300"
                >
                  {!selectedProjectId && <option value="">Select a project...</option>}
                  {projects.map((project) => (
                    <option key={project.project_id} value={project.project_id}>
                      {project.project_name}
                    </option>
                  ))}
                </select>
              </div>

              <Button
                onClick={handleRefreshAlignment}
                disabled={isRefreshingAlignment}
                className="flex items-center justify-center"
              >
                {isRefreshingAlignment ? (
                  <>
                    <LoadingSpinner className="w-5 h-5 mr-2" />
                    Refreshing...
                  </>
                ) : (
                  '✨ Refresh Intelligence'
                )}
              </Button>
            </div>
          </div>

          <div className="mt-4 text-sm text-clay-500 flex flex-wrap gap-4">
            <div>Last synced: {alignmentStatus?.lastAlignmentRun ? formatDateTime(alignmentStatus.lastAlignmentRun) : 'just now'}</div>
            <div>Matches stored: {alignmentStatus?.alignmentCount ?? '40+'}</div>
            <div>
              Mode:{' '}
              <span className="font-semibold text-clay-900">
                {researchDepth === 'deep'
                  ? 'Deep research (Groq/Tavily, richer context)'
                  : 'Fast research (Haiku-speed insights)'}
              </span>
            </div>
            {lastPlanUpdatedAt && <div>Plan updated: {formatDateTime(lastPlanUpdatedAt)}</div>}
          </div>

          <div className="mt-6">
            {isLoadingPlan ? (
              <div className="text-center py-10">
                <LoadingSpinner className="w-10 h-10 mx-auto mb-3" />
                <p className="text-clay-500">Assembling outreach plan...</p>
              </div>
            ) : planError ? (
              <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm">
                {planError}
              </div>
            ) : outreachPlan.length === 0 ? (
              <div className="p-4 bg-clay-50 border border-clay-200 rounded-2xl text-clay-600 text-sm">
                No alignment matches yet. Refresh intelligence to generate outreach ideas.
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {outreachPlan.map((plan) => (
                  <div
                    key={plan.contact.id}
                    className="border border-clay-200 rounded-2xl p-6 bg-white shadow-soft"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-xl font-bold text-clay-900">{plan.contact.name}</h3>
                        <p className="text-clay-600 text-sm">{plan.contact.role}</p>
                        <p className="text-clay-500 text-sm">{plan.contact.company}</p>
                      </div>
                      {plan.alignmentScore !== undefined && (
                        <div className="text-right">
                          <div className="text-xs uppercase tracking-wide text-clay-400">Alignment</div>
                          <div className="text-2xl font-bold text-green-600">{plan.alignmentScore}%</div>
                        </div>
                      )}
                    </div>

                    {plan.outreachRecommendation?.talking_points?.length ? (
                      <div className="mt-4">
                        <p className="text-xs uppercase tracking-wide text-clay-400 font-semibold mb-2">Talking Points</p>
                        <div className="flex flex-wrap gap-2">
                          {plan.outreachRecommendation.talking_points.map((point, idx) => (
                            <span
                              key={idx}
                              className="px-3 py-1 text-xs font-medium bg-brand-50 text-brand-700 rounded-full"
                            >
                              {point}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    <div className="mt-4 flex flex-wrap gap-3">
                      {plan.metadata?.connection_ideas?.length ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setExpandedPlanId(
                              expandedPlanId === plan.contact.id ? null : plan.contact.id
                            )
                          }
                        >
                          {expandedPlanId === plan.contact.id ? 'Hide Ideas' : 'Show Ideas'}
                        </Button>
                      ) : null}
                      <Button
                        size="sm"
                        onClick={() => setModalPlan(plan)}
                      >
                        View Insight Brief
                      </Button>
                    </div>

                    {expandedPlanId === plan.contact.id && (
                      <div className="mt-4 space-y-4">
                        {plan.metadata?.connection_ideas?.length ? (
                          <div>
                            <p className="text-xs uppercase tracking-wide text-clay-400 font-semibold mb-2">Connection Ideas</p>
                            <ul className="space-y-2 text-sm text-clay-700">
                              {plan.metadata.connection_ideas.map((idea, idx) => (
                                <li key={idx} className="flex items-start">
                                  <span className="mr-2 text-brand-500">•</span>
                                  <span>{idea}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : null}

                        {plan.metadata?.research_insights?.summary && (
                          <div className="bg-clay-50 rounded-xl p-3 text-sm text-clay-700">
                            <p className="font-semibold text-clay-900 mb-1">
                              Research ({plan.metadata.research_insights.provider ?? 'AI'})
                            </p>
                            <p>{plan.metadata.research_insights.summary}</p>
                            {plan.metadata.research_insights.sources?.length ? (
                              <a
                                href={plan.metadata.research_insights.sources[0].url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-brand-600 text-xs mt-2 inline-flex items-center gap-1"
                              >
                                View source →
                              </a>
                            ) : null}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
      {/* Plan Insight Modal */}
      {modalPlan && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[85vh] overflow-y-auto p-8 shadow-hover">
            <div className="flex items-start justify-between mb-6">
              <div>
                <p className="text-xs uppercase tracking-wide text-clay-400 font-semibold">Insight Brief</p>
                <h3 className="text-2xl font-bold text-clay-900">{modalPlan.contact.name}</h3>
                <p className="text-clay-600">{modalPlan.contact.role} • {modalPlan.contact.company}</p>
              </div>
              <Button variant="ghost" onClick={() => setModalPlan(null)}>✕</Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="p-4 bg-clay-50 rounded-xl">
                  <h4 className="font-semibold text-clay-900 mb-2">Talking Points</h4>
                  <ul className="space-y-1 text-sm text-clay-700">
                    {modalPlan.outreachRecommendation?.talking_points?.map((point, idx) => (
                      <li key={idx}>• {point}</li>
                    )) || <li>No talking points available</li>}
                  </ul>
                </div>

                <div className="p-4 bg-clay-50 rounded-xl">
                  <h4 className="font-semibold text-clay-900 mb-2">Connection Ideas</h4>
                  <ul className="space-y-1 text-sm text-clay-700">
                    {modalPlan.metadata?.connection_ideas?.map((idea, idx) => (
                      <li key={idx}>• {idea}</li>
                    )) || <li>No ideas yet — refresh intelligence</li>}
                  </ul>
                </div>

                <div className="p-4 bg-clay-50 rounded-xl">
                  <h4 className="font-semibold text-clay-900 mb-2">Engagement Signals</h4>
                  <p className="text-sm text-clay-700">
                    {modalPlan.contactContext?.engagement?.lastInteractionAt
                      ? `Last touch: ${formatDateTime(modalPlan.contactContext.engagement.lastInteractionAt)}`
                      : 'No recent interactions recorded'}
                  </p>
                  <p className="text-sm text-clay-700">
                    Preferred channel: {modalPlan.contactContext?.engagement?.primaryInteractionType || 'Unknown'}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-clay-50 rounded-xl">
                  <h4 className="font-semibold text-clay-900 mb-2">Research Summary</h4>
                  <p className="text-sm text-clay-700 whitespace-pre-line">
                    {modalPlan.metadata?.research_insights?.summary || 'No research summary yet.'}
                  </p>
                  {modalPlan.metadata?.research_insights?.sources?.length ? (
                    <div className="mt-3 space-y-1">
                      {modalPlan.metadata.research_insights.sources.map((source, idx) => (
                        <a
                          key={idx}
                          href={source.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-brand-600 text-sm flex items-center gap-1"
                        >
                          Source {idx + 1}: {source.title || source.url}
                        </a>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="p-4 bg-clay-50 rounded-xl">
                  <h4 className="font-semibold text-clay-900 mb-2">Project Context</h4>
                  <p className="font-semibold text-sm text-clay-800">{modalPlan.projectContext?.name}</p>
                  <p className="text-sm text-clay-700">
                    {modalPlan.projectContext?.summary || 'No summary available.'}
                  </p>
                  {modalPlan.projectContext?.focusAreas?.length ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {modalPlan.projectContext.focusAreas.slice(0, 3).map(area => (
                        <span key={area} className="px-2 py-1 text-xs bg-ocean-50 text-ocean-700 rounded-full">
                          {area}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
        </div>
      </div>

      {/* Contact Grid */}
      <div className="max-w-6xl mx-auto">
        {isLoading ? (
          <div className="text-center py-12">
            <LoadingSpinner className="w-12 h-12 mx-auto mb-4" />
            <p className="text-clay-600">Loading contacts...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredContacts.map((contact) => (
              <div
                key={contact.id}
                className="bg-white rounded-2xl p-6 shadow-soft hover:shadow-medium hover:-translate-y-1 transition-all duration-300 cursor-pointer border border-clay-200"
                onClick={() => setSelectedContact(contact)}
              >
                {/* Contact Header */}
                <div className="flex items-start space-x-4 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-clay-300 to-clay-400 rounded-xl flex items-center justify-center text-white font-bold">
                    {contact.fullName.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg text-clay-900 truncate">{contact.fullName}</h3>
                    <p className="text-clay-600 truncate">{contact.position}</p>
                    <p className="text-clay-500 text-sm truncate">{contact.company}</p>
                  </div>
                  {contact.intelligence && (
                    <div className={`px-3 py-1 rounded-full text-xs font-bold ${getScoreBg(contact.intelligence.collaborationScore)} ${getScoreColor(contact.intelligence.collaborationScore)}`}>
                      {contact.intelligence.collaborationScore}%
                    </div>
                  )}
                </div>

                {/* Intelligence Scores */}
                {contact.intelligence && (
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="text-center p-2 bg-clay-50 rounded-lg">
                      <div className={`font-bold ${getScoreColor(contact.intelligence.collaborationScore)}`}>
                        {contact.intelligence.collaborationScore}
                      </div>
                      <div className="text-xs text-clay-500">Collab</div>
                    </div>
                    <div className="text-center p-2 bg-clay-50 rounded-lg">
                      <div className={`font-bold ${getScoreColor(contact.intelligence.responseRate)}`}>
                        {contact.intelligence.responseRate}
                      </div>
                      <div className="text-xs text-clay-500">Response</div>
                    </div>
                    <div className="text-center p-2 bg-clay-50 rounded-lg">
                      <div className={`font-bold ${getScoreColor(contact.intelligence.influenceScore)}`}>
                        {contact.intelligence.influenceScore}
                      </div>
                      <div className="text-xs text-clay-500">Influence</div>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      enrichContact(contact.id);
                    }}
                    className="flex-1"
                  >
                    🤖 AI Enrich
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                  >
                    📧 Outreach
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Load More Section */}
        {contacts.length > 0 && (
          <div className="mt-8 text-center">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-clay-200 shadow-soft">
              <div className="mb-4">
                <p className="text-clay-600">
                  Showing <strong>{contacts.length}</strong> of <strong>20,398</strong> total LinkedIn contacts
                </p>
                <div className="w-full bg-clay-200 rounded-full h-2 mt-2">
                  <div 
                    className="bg-gradient-to-r from-brand-500 to-ocean-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min((contacts.length / 20398) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>
              <Button 
                onClick={() => {
                  // Load more contacts
                  const currentLimit = contacts.length;
                  fetch(`http://localhost:4000/api/v3/crm/contacts?limit=${currentLimit + 50}`)
                    .then(res => res.json())
                    .then(data => {
                      if (data.success && data.contacts) {
                        setContacts(data.contacts);
                      }
                    });
                }}
                variant="outline" 
                size="lg"
              >
                📈 Load More Contacts ({Math.min(50, 20398 - contacts.length)} more available)
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Contact Detail Modal */}
      {selectedContact && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-8 shadow-hover">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-clay-900">{selectedContact.fullName}</h2>
                <p className="text-clay-600">{selectedContact.position}</p>
                <p className="text-clay-500">{selectedContact.company}</p>
              </div>
              <Button variant="ghost" onClick={() => setSelectedContact(null)}>
                ✕
              </Button>
            </div>

            {selectedContact.intelligence && (
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 bg-clay-50 rounded-xl">
                  <div className={`text-2xl font-bold ${getScoreColor(selectedContact.intelligence.collaborationScore)}`}>
                    {selectedContact.intelligence.collaborationScore}%
                  </div>
                  <div className="text-sm text-clay-600">Collaboration</div>
                </div>
                <div className="text-center p-4 bg-clay-50 rounded-xl">
                  <div className={`text-2xl font-bold ${getScoreColor(selectedContact.intelligence.responseRate)}`}>
                    {selectedContact.intelligence.responseRate}%
                  </div>
                  <div className="text-sm text-clay-600">Response Rate</div>
                </div>
                <div className="text-center p-4 bg-clay-50 rounded-xl">
                  <div className={`text-2xl font-bold ${getScoreColor(selectedContact.intelligence.influenceScore)}`}>
                    {selectedContact.intelligence.influenceScore}%
                  </div>
                  <div className="text-sm text-clay-600">Influence</div>
                </div>
              </div>
            )}

            <div className="flex space-x-4">
              <Button onClick={() => enrichContact(selectedContact.id)} size="lg">
                🤖 AI Enrich Contact
              </Button>
              <Button variant="outline" size="lg">
                📧 Generate Outreach
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Enrichment Results */}
      {enrichmentResult && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[80vh] overflow-y-auto p-8 shadow-hover">
            <div className="flex items-start justify-between mb-6">
              <h3 className="text-2xl font-bold text-clay-900">🤖 AI Contact Analysis</h3>
              <Button variant="ghost" onClick={() => setEnrichmentResult(null)}>
                ✕
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="bg-clay-50 p-4 rounded-xl">
                  <h4 className="font-bold text-clay-900 mb-2">📧 Email Suggestions</h4>
                  {enrichmentResult.enrichment?.emailSuggestions?.map((email: string, index: number) => (
                    <div key={index} className="font-mono text-sm text-clay-700 mb-1">{email}</div>
                  ))}
                </div>

                <div className="bg-clay-50 p-4 rounded-xl">
                  <h4 className="font-bold text-clay-900 mb-2">🎯 Collaboration Score</h4>
                  <div className="text-3xl font-bold text-green-600">
                    {enrichmentResult.enrichment?.collaborationPotential || 0}%
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-clay-50 p-4 rounded-xl">
                  <h4 className="font-bold text-clay-900 mb-2">💡 AI Analysis</h4>
                  <p className="text-clay-700 text-sm leading-relaxed">
                    {enrichmentResult.enrichment?.reasoning || 'Analysis not available'}
                  </p>
                </div>

                <div className="bg-clay-50 p-4 rounded-xl">
                  <h4 className="font-bold text-clay-900 mb-2">📧 Outreach Strategy</h4>
                  <div className="space-y-2 text-sm">
                    <div><strong>Approach:</strong> {enrichmentResult.enrichment?.outreachStrategy?.approach || 'Professional'}</div>
                    <div><strong>Timing:</strong> {enrichmentResult.enrichment?.outreachStrategy?.timing || 'Within week'}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
