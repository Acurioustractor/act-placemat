/**
 * Project Alignment Service
 * -------------------------
 * 1. Syncs Notion project intelligence into Supabase `project_intelligence`
 * 2. Builds backend-only project ↔ contact alignment scores
 * 3. Surfaces enriched data for world-class outreach automation
 */

import { createClient } from '@supabase/supabase-js';
import notionService from './notionService.js';
import huggingfaceEmbeddingService from './huggingfaceEmbeddingService.js';
import { FreeResearchAI } from './freeResearchAI.js';
import { logger } from '../utils/logger.js';

const BATCH_SIZE = 50;

class ProjectAlignmentService {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    this.state = {
      lastProjectSync: null,
      lastAlignmentRun: null,
      lastResearchRun: null,
      projectCount: 0,
      alignmentCount: 0,
      isSyncingProjects: false,
      isBuildingAlignments: false,
      lastError: null,
    };

    this.researchAI = this.initializeResearchService();
    this.researchCache = new Map();

    logger.info('🤝 ProjectAlignmentService initialized');
  }

  /**
   * Public orchestrator: sync project intelligence and rebuild alignments
   */
  async refreshAll(options = {}) {
    await this.syncProjectIntelligence(options);
    await this.buildContactAlignments(options);
    return this.getStatus();
  }

  /**
   * Pull latest Notion projects and store structured intelligence in Supabase
   */
  async syncProjectIntelligence(options = {}) {
    if (this.state.isSyncingProjects) {
      throw new Error('Project intelligence sync already running');
    }

    try {
      this.state.isSyncingProjects = true;
      logger.info('🔄 Syncing project intelligence from Notion → Supabase...');

      const projects = await notionService.getProjects({
        useCache: options.useCache ?? false,
        getAllPages: true,
      });

      if (!projects || projects.length === 0) {
        logger.warn('No projects returned from Notion, skipping sync');
        return this.state;
      }

      let synced = 0;
      for (let i = 0; i < projects.length; i += BATCH_SIZE) {
        const batch = projects.slice(i, i + BATCH_SIZE);
        const payload = await Promise.all(
          batch.map(project => this.mapProjectToIntelligence(project))
        );

        const { error } = await this.supabase
          .from('project_intelligence')
          .upsert(payload, { onConflict: 'project_id' });

        if (error) {
          logger.error('Failed to upsert project intelligence batch:', error.message);
          throw error;
        }

        synced += payload.length;
        logger.info(`📦 Project batch synced (${synced}/${projects.length})`);
      }

      this.state.lastProjectSync = new Date().toISOString();
      this.state.projectCount = projects.length;
      logger.info(`✅ Project intelligence sync complete (${projects.length} projects)`);
    } catch (error) {
      this.state.lastError = error.message;
      logger.error('Project intelligence sync failed:', error);
      throw error;
    } finally {
      this.state.isSyncingProjects = false;
    }

  }

  /**
   * Build contact alignments for each enriched project
   */
  async buildContactAlignments(options = {}) {
    if (this.state.isBuildingAlignments) {
      throw new Error('Alignment generation already running');
    }

    const {
      projectsLimit = 60,
      contactsLimit = 500,
      matchesPerProject = 8,
      minScore = 55,
      enableResearch = false,
      researchDepth = 'basic',
      targetProjectId = null,
    } = options;

    try {
      this.state.isBuildingAlignments = true;
      logger.info('🧠 Building contact alignments for enriched projects...');

      let projectQuery = this.supabase
        .from('project_intelligence')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(projectsLimit);

      if (targetProjectId) {
        projectQuery = projectQuery.eq('project_id', targetProjectId);
      }

      const [{ data: projects, error: projectError }, contacts, enrichments] =
        await Promise.all([
          projectQuery,
          this.fetchContacts(contactsLimit),
          this.fetchContactEnrichments(contactsLimit * 2),
        ]);

      if (projectError) {
        if (projectError.code === '42P01') {
          throw new Error(
            'Supabase is missing the project_intelligence table. Run migration 20251120120000_project_alignment_tables.sql via Supabase SQL Editor.'
          );
        }
        throw projectError;
      }

      const signalsMap = await this.fetchContactSignals(
        contacts.map(contact => contact.id)
      );

      if (projectError) throw projectError;

      if (!projects || projects.length === 0) {
        logger.warn('No project intelligence available; run sync first.');
        return this.state;
      }

      const enrichmentMap = new Map(
        enrichments.map(item => [item.contact_id, item])
      );

      let totalAlignments = 0;
      for (const project of projects) {
        const scores = contacts
          .map(contact => {
            const enrichment = enrichmentMap.get(contact.id);
            const signals = signalsMap.get(contact.id) || null;
            const score = this.calculateAlignmentScore(project, contact, enrichment);
            return {
              contact,
              enrichment,
              signals,
              score,
              sharedThemes: this.extractSharedThemes(project, contact, enrichment),
              outreachRecommendation:
                enrichment?.outreach_strategy || this.buildOutreachRecommendation(project, contact),
              connectionIdeas: this.buildInnovativeConnectionIdeas(project, contact, enrichment, signals),
            };
          })
          .filter(result => result.score >= minScore)
          .sort((a, b) => b.score - a.score)
          .slice(0, matchesPerProject);

        if (scores.length === 0) continue;

        if (enableResearch && this.researchAI) {
          await this.enrichMatchesWithResearch(project, scores, {
            depth: researchDepth,
          });
          this.state.lastResearchRun = new Date().toISOString();
        }

        const upsertPayload = scores.map(match => ({
          project_id: project.project_id,
          contact_id: match.contact.id,
          alignment_score: Number(match.score.toFixed(2)),
          confidence: Math.min(99, Math.round(match.score)),
          shared_themes: match.sharedThemes,
          contact_context: this.buildContactContext(match.contact, match.enrichment, match.signals),
          project_context: this.buildProjectContext(project),
          outreach_recommendation: match.outreachRecommendation,
          metadata: {
            reason: `Aligned on ${match.sharedThemes.join(', ')}`,
            generated_at: new Date().toISOString(),
            signals: match.signals || null,
            research_insights: match.researchInsights || null,
            connection_ideas: match.connectionIdeas || null,
          },
        }));

        await this.supabase
          .from('project_contact_alignment')
          .upsert(upsertPayload, { onConflict: 'project_id,contact_id' });

        totalAlignments += upsertPayload.length;
      }

      this.state.lastAlignmentRun = new Date().toISOString();
      this.state.alignmentCount = totalAlignments;

      logger.info(
        `✅ Alignment generation complete (${totalAlignments} matches across ${projects.length} projects)`
      );
    } catch (error) {
      this.state.lastError = error.message;
      logger.error('Failed to build contact alignments:', error);
      throw error;
    } finally {
      this.state.isBuildingAlignments = false;
    }
  }

  /**
   * Fetch CRM contacts with essential metadata
   */
  async fetchContacts(limit = 500) {
    const { data, error } = await this.supabase
      .from('linkedin_contacts')
      .select(
        'id, first_name, last_name, full_name, current_company, current_position, location, relationship_score'
      )
      .order('relationship_score', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  /**
   * Fetch contact enrichment intelligence
   */
  async fetchContactEnrichments(limit = 1000) {
    const { data, error } = await this.supabase
      .from('contact_enrichments')
      .select(
        'contact_id, collaboration_potential, project_alignment, outreach_strategy, email_suggestions, reasoning, value_proposition'
      )
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  /**
   * Convert Notion project → Supabase `project_intelligence` row
   */
  async mapProjectToIntelligence(project) {
    const projectId = project.notionId || project.id;
    if (!projectId) {
      throw new Error('Project lacking Notion ID cannot be synced');
    }

    const focusAreas = this.normalizeArray(
      project.themes || project.tags || project.area || []
    );

    const communities = this.normalizeArray(
      project.relatedPlaces?.map(place => place.name) || []
    );

    const summary =
      project.aiSummary ||
      project.description ||
      `Project: ${project.name} focused on ${focusAreas.slice(0, 3).join(', ')}`;

    let embedding = null;
    if (process.env.HUGGINGFACE_API_KEY) {
      try {
        const embeddingText = `${project.name} ${summary} ${focusAreas.join(', ')}`;
        embedding = await huggingfaceEmbeddingService.generateEmbedding(embeddingText);
      } catch (error) {
        logger.warn(
          `Embedding generation failed for project ${project.name}:`,
          error.message
        );
      }
    }

    const intelligencePayload = {
      project_id: projectId,
      notion_page_id: project.notionId,
      project_name: project.name,
      summary,
      focus_areas: focusAreas,
      communities,
      strategic_alignment: this.normalizeArray(project.coreValues ? [project.coreValues] : []),
      required_support: this.deriveSupportNeeds(project),
      partner_targets: this.normalizeArray(project.relatedOrganisations?.map(org => org.name) || []),
      risk_level: this.estimateRiskLevel(project),
      readiness_score: this.estimateReadinessScore(project),
      intelligence: {
        description: project.description,
        aiSummary: project.aiSummary,
        funding: {
          actual: project.actualIncoming,
          potential: project.potentialIncoming,
          supporters: project.supporters,
        },
        relationships: {
          partnerCount: project.partnerCount,
          organisations: project.relatedOrganisations,
          supporters: project.supporters,
        },
        timeline: {
          nextMilestoneDate: project.nextMilestoneDate,
          status: project.status,
        },
        locations: project.relatedPlaces,
        tags: project.tags,
        data_sources: {
          notion: {
            url: project.notionUrl,
            lastEditedAt: project.notionLastEditedAt,
          },
        },
      },
      last_synced_at: new Date().toISOString(),
    };

    if (embedding && Array.isArray(embedding)) {
      intelligencePayload.embedding = embedding;
    }

    return intelligencePayload;
  }

  /**
   * Compute alignment score (0-100)
   */
  calculateAlignmentScore(project, contact, enrichment) {
    let score = 40;

    const sharedThemes = this.extractSharedThemes(project, contact, enrichment);
    score += Math.min(25, sharedThemes.length * 6);

    // Relationship strength
    if (contact.relationship_score) {
      score += contact.relationship_score * 25;
    }

    // Enrichment collaboration potential
    if (enrichment?.collaboration_potential) {
      score += (enrichment.collaboration_potential - 50) * 0.4;
    }

    // Geographic alignment (watch for null)
    const projectGeos = project.communities || [];
    if (
      projectGeos.length > 0 &&
      contact.location &&
      projectGeos.some(geo =>
        contact.location.toLowerCase().includes(geo.toLowerCase())
      )
    ) {
      score += 10;
    }

    // Government or funding focus
    if (
      project.focus_areas?.some(area =>
        ['government', 'policy', 'grant'].some(keyword =>
          area.toLowerCase().includes(keyword)
        )
      ) &&
      (contact.government_experience || contact.current_position?.includes('Policy'))
    ) {
      score += 8;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Extract shared interest keywords
   */
  extractSharedThemes(project, contact, enrichment) {
    const projectThemes = new Set(
      this.normalizeArray([
        ...(project.focus_areas || []),
        ...(project.strategic_alignment || []),
        ...(project.communities || []),
      ])
    );

    const contactThemes = new Set(
      this.normalizeArray([
        contact.current_position,
        contact.current_company,
        contact.tags,
        contact.interests,
        ...(enrichment?.project_alignment || []),
      ])
    );

    return Array.from(projectThemes).filter(theme => contactThemes.has(theme));
  }

  /**
   * Build structured context for contact
   */
  buildContactContext(contact, enrichment, signals) {
    return {
      name: contact.full_name || `${contact.first_name} ${contact.last_name}`.trim(),
      role: contact.current_position,
      organization: contact.current_company,
      location: contact.location,
      relationshipScore: contact.relationship_score,
      enrichment: enrichment || null,
      engagement: signals || null,
    };
  }

  /**
   * Build structured context for project
   */
  buildProjectContext(project) {
    return {
      name: project.project_name,
      summary: project.summary,
      focusAreas: project.focus_areas,
      communities: project.communities,
      notionPageId: project.notion_page_id,
      status: project.intelligence?.timeline?.status,
    };
  }

  /**
   * Generate default outreach recommendation when enrichment lacks one
   */
  buildOutreachRecommendation(project, contact) {
    return {
      approach: 'professional',
      timing: 'within-week',
      talking_points: [
        `Connect ${contact.current_company || 'their organization'} to ${project.project_name}`,
        `Highlight impact in ${project.focus_areas?.slice(0, 2).join(', ')}`,
      ],
      suggested_asset: project.intelligence?.data_sources?.notion?.url,
    };
  }

  /**
   * Derive required support tags from project data
   */
  deriveSupportNeeds(project) {
    const needs = [];
    if (project.actualIncoming < project.potentialIncoming) {
      needs.push('funding');
    }
    if (project.partnerCount < 3) {
      needs.push('partnerships');
    }
    if (project.storytellingMetrics) {
      needs.push('storytelling');
    }
    return this.normalizeArray(needs);
  }

  /**
   * Estimate risk level using simple heuristics
   */
  estimateRiskLevel(project) {
    if (project.status?.toLowerCase().includes('active')) return 'low';
    if (project.status?.toLowerCase().includes('hold')) return 'high';
    return 'medium';
  }

  /**
   * Estimate readiness score (0-100)
   */
  estimateReadinessScore(project) {
    let score = 60;
    if (project.status?.toLowerCase().includes('active')) score += 15;
    if (project.actualIncoming > 0) score += 10;
    if (project.partnerCount > 2) score += 10;
    return Math.min(95, score);
  }

  normalizeArray(value) {
    if (!value) return [];
    if (Array.isArray(value)) {
      return value
        .filter(Boolean)
        .map(item => {
          if (typeof item === 'string') return item.trim().toLowerCase();
          if (typeof item === 'object') {
            return (
              item.name?.toLowerCase() ||
              item.title?.toLowerCase() ||
              item.label?.toLowerCase() ||
              item.text?.toLowerCase() ||
              null
            );
          }
          return null;
        })
        .filter(Boolean);
    }

    if (typeof value === 'string') {
      return value
        .split(/[,\n]/)
        .map(item => item.trim().toLowerCase())
        .filter(Boolean);
    }

    return [];
  }

  /**
   * Status snapshot for API consumers
   */
  getStatus() {
    return {
      ...this.state,
      lastProjectSync: this.state.lastProjectSync,
      lastAlignmentRun: this.state.lastAlignmentRun,
    };
  }

  /**
   * Fetch enriched projects with optional filters
   */
  async listEnrichedProjects(limit = 50) {
    const { data, error } = await this.supabase
      .from('project_intelligence')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  /**
   * Fetch alignments for a single project
   */
  async getProjectAlignments(projectId, limit = 10) {
    const { data, error } = await this.supabase
      .from('project_contact_alignment')
      .select('*')
      .eq('project_id', projectId)
      .order('alignment_score', { ascending: false })
      .limit(limit);

    if (error) throw error;
    const alignments = data || [];

    const contactIds = Array.from(
      new Set(alignments.map(alignment => alignment.contact_id).filter(Boolean))
    );

    let contactsMap = new Map();
    if (contactIds.length > 0) {
      const { data: contactsData, error: contactsError } = await this.supabase
        .from('linkedin_contacts')
        .select('id, full_name, current_company, current_position, location, relationship_score')
        .in('id', contactIds);

      if (contactsError) {
        logger.warn('⚠️ Failed to fetch contact details for alignments:', contactsError.message);
      } else if (contactsData) {
        contactsMap = new Map(contactsData.map(contact => [contact.id, contact]));
      }
    }

    return alignments.map(alignment => ({
      ...alignment,
      contacts: contactsMap.get(alignment.contact_id) || null,
    }));
  }

  /**
   * Build outreach-ready plan for frontend consumption
   */
  async getProjectOutreachPlan(projectId, limit = 5) {
    const alignments = await this.getProjectAlignments(projectId, limit);

    return (alignments || []).map(alignment => ({
      contact: {
        id: alignment.contact_id,
        name:
          alignment.contacts?.full_name ||
          alignment.contact_context?.name,
        role:
          alignment.contacts?.current_position ||
          alignment.contact_context?.role,
        company:
          alignment.contacts?.current_company ||
          alignment.contact_context?.organization,
        location:
          alignment.contact_context?.location ||
          alignment.contacts?.location,
        relationshipScore:
          alignment.contacts?.relationship_score ??
          alignment.contact_context?.relationshipScore,
      },
      outreachRecommendation: alignment.outreach_recommendation,
      sharedThemes: alignment.shared_themes,
      alignmentScore: alignment.alignment_score,
      confidence: alignment.confidence,
      contactContext: alignment.contact_context,
      projectContext: alignment.project_context,
      metadata: alignment.metadata,
    }));
  }

  initializeResearchService() {
    try {
      const hasProvider =
        process.env.GROQ_API_KEY ||
        process.env.SERPAPI_KEY ||
        process.env.TAVILY_API_KEY;

      if (!hasProvider) {
        logger.warn('⚠️ Research providers not configured; skipping research AI setup');
        return null;
      }

      return new FreeResearchAI();
    } catch (error) {
      logger.warn('⚠️ Failed to initialize research AI:', error.message);
      return null;
    }
  }

  async fetchContactSignals(contactIds = []) {
    if (!contactIds || contactIds.length === 0) {
      return new Map();
    }

    const uniqueIds = Array.from(new Set(contactIds.filter(Boolean)));
    const chunkSize = 500;
    const allInteractions = [];

    for (let i = 0; i < uniqueIds.length; i += chunkSize) {
      const chunk = uniqueIds.slice(i, i + chunkSize);
      try {
        const { data, error } = await this.supabase
          .from('contact_interactions')
          .select('contact_id, interaction_type, sentiment, interaction_date, metadata')
          .in('contact_id', chunk);

        if (error) {
          if (error.code === '42P01') {
            logger.warn(
              '⚠️ contact_interactions table missing; skipping engagement signal enrichment'
            );
            return new Map();
          }
          throw error;
        }
        allInteractions.push(...(data || []));
      } catch (error) {
        logger.warn(
          `⚠️ Failed to fetch contact interaction signals (chunk ${i / chunkSize + 1}):`,
          error.message
        );
        return new Map();
      }
    }

    const grouped = new Map();
    allInteractions.forEach(record => {
      if (!grouped.has(record.contact_id)) {
        grouped.set(record.contact_id, []);
      }
      grouped.get(record.contact_id).push(record);
    });

    const summaryMap = new Map();
    grouped.forEach((records, contactId) => {
      summaryMap.set(contactId, this.summarizeInteractionSignals(records));
    });

    return summaryMap;
  }

  summarizeInteractionSignals(records = []) {
    if (!records || records.length === 0) {
      return null;
    }

    const sorted = [...records].sort(
      (a, b) => new Date(b.interaction_date || b.created_at || Date.now()) -
        new Date(a.interaction_date || a.created_at || Date.now())
    );

    const sentimentCounts = records.reduce(
      (acc, record) => {
        const sentiment = (record.sentiment || 'neutral').toLowerCase();
        if (sentiment === 'positive') acc.positive += 1;
        else if (sentiment === 'negative') acc.negative += 1;
        else acc.neutral += 1;
        return acc;
      },
      { positive: 0, negative: 0, neutral: 0 }
    );

    const interactionTypes = [
      ...new Set(records.map(record => record.interaction_type).filter(Boolean)),
    ];

    const total = records.length || 1;
    return {
      lastInteractionAt:
        sorted[0]?.interaction_date || sorted[0]?.created_at || null,
      totalInteractions: records.length,
      positiveRatio: Number((sentimentCounts.positive / total).toFixed(2)),
      sentiment: sentimentCounts,
      interactionTypes,
      primaryInteractionType: sorted[0]?.interaction_type || interactionTypes[0] || null,
    };
  }

  async enrichMatchesWithResearch(project, matches, options = {}) {
    if (!this.researchAI) return;

    const depth = options.depth || 'basic';

    for (const match of matches) {
      const cacheKey = `${project.project_id}:${match.contact.id}:${depth}`;
      if (this.researchCache.has(cacheKey)) {
        const cached = this.researchCache.get(cacheKey);
        if (cached) {
          match.researchInsights = cached;
          match.outreachRecommendation = this.enhanceOutreachWithResearch(
            project,
            match.contact,
            match.outreachRecommendation,
            cached
          );
          match.connectionIdeas = this.buildInnovativeConnectionIdeas(
            project,
            match.contact,
            match.enrichment,
            match.signals,
            cached
          );
        }
        continue;
      }

      try {
        const insights = await this.generateResearchInsights(
          match.contact,
          project,
          depth
        );
        this.researchCache.set(cacheKey, insights);

        if (insights) {
          match.researchInsights = insights;
          match.outreachRecommendation = this.enhanceOutreachWithResearch(
            project,
            match.contact,
            match.outreachRecommendation,
            insights
          );
          match.connectionIdeas = this.buildInnovativeConnectionIdeas(
            project,
            match.contact,
            match.enrichment,
            match.signals,
            insights
          );
        }
      } catch (error) {
        logger.warn('⚠️ Research enrichment failed:', error.message);
        this.researchCache.set(cacheKey, null);
      }
    }
  }

  async generateResearchInsights(contact, project, depth = 'basic') {
    if (!this.researchAI) return null;

    const contactName =
      contact.full_name ||
      `${contact.first_name || ''} ${contact.last_name || ''}`.trim();

    const query = `${contactName} ${contact.current_company || ''} partnering with ${project.project_name} ${project.focus_areas?.slice(0, 2).join(' ') || ''}`.trim();

    const research = await this.researchAI.research(query, {
      depth: depth === 'deep' ? 'advanced' : 'basic',
      maxResults: depth === 'deep' ? 8 : 5,
    });

    if (!research?.success) {
      return null;
    }

    const summary =
      research.analysis?.content ||
      research.analysis?.summary ||
      research.analysis ||
      research.answer ||
      null;

    return {
      summary,
      highlights: this.extractHighlightsFromResearch(summary),
      sources: (research.sources || []).slice(0, 5),
      provider: research.provider,
      timestamp: research.timestamp,
    };
  }

  enhanceOutreachWithResearch(project, contact, baseRecommendation, researchInsights) {
    const recommendation = {
      ...baseRecommendation,
    };

    if (researchInsights?.summary) {
      recommendation.research_summary = researchInsights.summary.slice(0, 500);
    }

    if (researchInsights?.highlights?.length) {
      recommendation.talking_points = [
        ...(recommendation.talking_points || []),
        ...researchInsights.highlights.slice(0, 3),
      ];
    }

    if (researchInsights?.sources?.length) {
      recommendation.sources = researchInsights.sources;
    }

    recommendation.provider = researchInsights?.provider || recommendation.provider;
    recommendation.generated_at = new Date().toISOString();

    return recommendation;
  }

  buildInnovativeConnectionIdeas(project, contact, enrichment, signals, researchInsights = null) {
    const ideas = [];

    if (signals?.primaryInteractionType) {
      ideas.push(
        `Reconnect via ${signals.primaryInteractionType} where engagement is strongest. Reference the last touch on ${signals.lastInteractionAt?.split('T')[0] || 'recent conversations'}.`
      );
    }

    if (enrichment?.project_alignment?.length && project.focus_areas?.length) {
      ideas.push(
        `Host a micro-roundtable on ${project.focus_areas[0]} highlighting ${contact.current_company || 'their organization'}'s strengths in ${enrichment.project_alignment[0]}.`
      );
    }

    if (project.communities?.length) {
      ideas.push(
        `Invite them to visit ${project.communities[0]} to experience the community impact firsthand.`
      );
    }

    if (researchInsights?.highlights?.length) {
      ideas.push(
        `Reference "${researchInsights.highlights[0]}" from recent coverage to show you're tracking their wins.`
      );
    }

    if ((signals?.sentiment?.positive || 0) > (signals?.sentiment?.negative || 0)) {
      ideas.push('Send a gratitude voice note recapping the impact you have built together.');
    }

    if (signals?.interactionTypes?.length > 1) {
      ideas.push(
        `Escalate the relationship by shifting from ${signals.interactionTypes[0]} to a higher-touch format (micro-dinner, site visit).`
      );
    }

    return Array.from(new Set(ideas)).slice(0, 4);
  }

  extractHighlightsFromResearch(content) {
    if (!content) return [];
    return content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.startsWith('-') || line.startsWith('•'))
      .slice(0, 3);
  }
}

const projectAlignmentService = new ProjectAlignmentService();
export default projectAlignmentService;

