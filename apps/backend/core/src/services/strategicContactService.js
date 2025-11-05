/**
 * Strategic Contact Service
 * Supabase-first contact management with automatic tier assignment
 * Implements the tiered contact hierarchy architecture
 */

import { createClient } from '@supabase/supabase-js';
import notionService from './notionService.js';
import logger from '../utils/logger.js';

class StrategicContactService {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
  }

  /**
   * Process Gmail discoveries - Supabase-first flow
   * @param {string} projectId - Notion project ID
   * @param {string} projectName - Project name
   * @param {Array} people - Discovered people from Gmail
   * @param {Array} organizations - Discovered organizations from Gmail
   */
  async processGmailDiscoveries(projectId, projectName, people, organizations) {
    logger.info(`📧 Processing Gmail discoveries for ${projectName}`);
    logger.info(`   People: ${people.length}, Organizations: ${organizations.length}`);

    const results = {
      people: {
        created: 0,
        updated: 0,
        tierAssignments: { critical: 0, high: 0, medium: 0, low: 0 },
        notionPromotionCandidates: []
      },
      organizations: {
        created: 0,
        updated: 0
      }
    };

    // Process people
    for (const person of people) {
      try {
        const result = await this.upsertPerson(person, projectId, projectName);

        if (result.created) results.people.created++;
        if (result.updated) results.people.updated++;

        results.people.tierAssignments[result.tier]++;

        if (result.shouldPromoteToNotion) {
          results.people.notionPromotionCandidates.push({
            personId: result.personId,
            email: person.email,
            tier: result.tier,
            compositeScore: result.compositeScore
          });
        }
      } catch (error) {
        logger.error(`   ❌ Error processing person ${person.email}:`, error.message);
      }
    }

    // Process organizations
    for (const org of organizations) {
      try {
        const result = await this.upsertOrganization(org, projectId, projectName);

        if (result.created) results.organizations.created++;
        if (result.updated) results.organizations.updated++;
      } catch (error) {
        logger.error(`   ❌ Error processing organization ${org.name}:`, error.message);
      }
    }

    return results;
  }

  /**
   * Upsert a person to Supabase with automatic tier assignment
   */
  async upsertPerson(person, projectId, projectName) {
    // 1. Find or create person in person_identity_map
    let personRecord = await this.findPersonByEmail(person.email);

    const personData = {
      email: person.email,
      full_name: person.name || person.email.split('@')[0],
      data_source: 'gmail',
      discovered_via: `project:${projectName}`,
      updated_at: new Date().toISOString()
    };

    if (!personRecord) {
      // Create new person
      const { data, error } = await this.supabase
        .from('person_identity_map')
        .insert([{
          ...personData,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;
      personRecord = data;
      logger.info(`   ✅ Created person: ${person.email}`);
    } else {
      // Update existing person
      const { data, error } = await this.supabase
        .from('person_identity_map')
        .update(personData)
        .eq('person_id', personRecord.person_id)
        .select()
        .single();

      if (error) throw error;
      personRecord = data;
      logger.info(`   ✓ Updated person: ${person.email}`);
    }

    // 2. Create interaction record
    await this.createInteractionRecord({
      person_id: personRecord.person_id,
      interaction_type: 'email',
      description: `Discovered via Gmail mining for project: ${projectName}`,
      metadata: {
        project_id: projectId,
        project_name: projectName,
        mention_count: person.mentionCount,
        confidence: person.confidence
      }
    });

    // 3. Link to project
    await this.linkPersonToProject({
      person_id: personRecord.person_id,
      project_id: projectId,
      project_name: projectName,
      connection_type: 'email_contact',
      relevance_score: person.confidence,
      mention_count: person.mentionCount
    });

    // 4. Calculate intelligence scores
    const scores = await this.updateIntelligenceScores(personRecord.person_id, {
      mentionCount: person.mentionCount,
      confidence: person.confidence
    });

    // 5. Assign engagement tier
    const tier = await this.assignTier(personRecord.person_id);

    // 6. Check if should promote to Notion
    const shouldPromoteToNotion = await this.shouldPromoteToNotion(personRecord.person_id);

    return {
      personId: personRecord.person_id,
      created: !personRecord.updated_at || personRecord.created_at === personRecord.updated_at,
      updated: true,
      tier,
      compositeScore: scores.composite_score,
      shouldPromoteToNotion
    };
  }

  /**
   * Upsert an organization to Supabase
   */
  async upsertOrganization(org, projectId, projectName) {
    // Check if organization exists in linkedin_contacts (using domain)
    const { data: existing, error: findError } = await this.supabase
      .from('linkedin_contacts')
      .select('*')
      .eq('current_company', org.name)
      .maybeSingle();

    if (findError && findError.code !== 'PGRST116') throw findError;

    const orgData = {
      first_name: org.name,
      last_name: '(Organization)',
      current_company: org.name,
      email_address: `contact@${org.domain}`,
      data_source: 'gmail',
      relationship_score: org.confidence,
      strategic_value: org.confidence > 0.8 ? 'high' : org.confidence > 0.6 ? 'medium' : 'low'
    };

    let orgRecord;
    if (!existing) {
      const { data, error } = await this.supabase
        .from('linkedin_contacts')
        .insert([orgData])
        .select()
        .single();

      if (error) throw error;
      orgRecord = data;
      logger.info(`   ✅ Created organization: ${org.name}`);
    } else {
      const { data, error } = await this.supabase
        .from('linkedin_contacts')
        .update(orgData)
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      orgRecord = data;
      logger.info(`   ✓ Updated organization: ${org.name}`);
    }

    // Link organization to project
    await this.supabase
      .from('linkedin_project_connections')
      .upsert([{
        contact_id: orgRecord.id,
        notion_project_id: projectId,
        project_name: projectName,
        connection_type: 'organization',
        relevance_score: org.confidence,
        contact_status: 'identified'
      }], {
        onConflict: 'contact_id,notion_project_id'
      });

    return {
      orgId: orgRecord.id,
      created: !existing,
      updated: true
    };
  }

  /**
   * Find person by email
   */
  async findPersonByEmail(email) {
    const { data, error } = await this.supabase
      .from('person_identity_map')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  /**
   * Create interaction record
   */
  async createInteractionRecord(interaction) {
    const { error } = await this.supabase
      .from('contact_interactions')
      .insert([{
        ...interaction,
        interaction_date: new Date().toISOString()
      }]);

    if (error) throw error;
  }

  /**
   * Link person to project
   */
  async linkPersonToProject({ person_id, project_id, project_name, connection_type, relevance_score, mention_count }) {
    const { error } = await this.supabase
      .from('linkedin_project_connections')
      .upsert([{
        contact_id: person_id,
        notion_project_id: project_id,
        project_name: project_name,
        connection_type: connection_type,
        relevance_score: relevance_score,
        contact_status: 'active',
        recommended_action: mention_count >= 10 ? 'high_priority_followup' : 'standard_engagement'
      }], {
        onConflict: 'contact_id,notion_project_id'
      });

    if (error) throw error;
  }

  /**
   * Update intelligence scores for a person
   */
  async updateIntelligenceScores(personId, context = {}) {
    const { mentionCount = 0, confidence = 0.5 } = context;

    // Calculate scores based on mention frequency and confidence
    const influenceScore = Math.min(100, Math.round(50 + (mentionCount * 3)));
    const accessibilityScore = Math.min(100, Math.round(confidence * 100));
    const alignmentScore = Math.min(100, Math.round(50 + (mentionCount * 2)));
    const timingScore = 80; // Recent discovery = good timing
    const strategicValueScore = Math.min(100, Math.round(confidence * 80 + mentionCount * 2));

    // Composite score (weighted average)
    const compositeScore = Math.round(
      influenceScore * 0.30 +
      alignmentScore * 0.25 +
      accessibilityScore * 0.20 +
      timingScore * 0.15 +
      strategicValueScore * 0.10
    );

    const { data, error } = await this.supabase
      .from('contact_intelligence_scores')
      .upsert([{
        person_id: personId,
        influence_score: influenceScore,
        accessibility_score: accessibilityScore,
        alignment_score: alignmentScore,
        timing_score: timingScore,
        strategic_value_score: strategicValueScore,
        composite_score: compositeScore,
        engagement_readiness: Math.min(100, Math.round(compositeScore * 0.9)),
        response_likelihood: Math.min(100, Math.round(confidence * 85)),
        confidence_level: confidence,
        last_calculated: new Date().toISOString()
      }], {
        onConflict: 'person_id'
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Assign engagement tier using Supabase function
   */
  async assignTier(personId) {
    const { data, error } = await this.supabase
      .rpc('assign_engagement_tier', { person_uuid: personId });

    if (error) throw error;
    return data; // Returns 'critical', 'high', 'medium', or 'low'
  }

  /**
   * Check if person should be promoted to Notion
   */
  async shouldPromoteToNotion(personId) {
    const { data, error } = await this.supabase
      .rpc('should_promote_to_notion', { person_uuid: personId });

    if (error) throw error;
    return data;
  }

  /**
   * Get Notion promotion candidates
   */
  async getNotionPromotionCandidates(limit = 50) {
    const { data, error } = await this.supabase
      .from('vw_notion_promotion_candidates')
      .select('*')
      .limit(limit);

    if (error) throw error;
    return data;
  }

  /**
   * Get newsletter segments
   */
  async getNewsletterSegments(tier = null) {
    let query = this.supabase
      .from('vw_newsletter_segments')
      .select('*');

    if (tier) {
      query = query.eq('engagement_priority', tier);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  /**
   * Get tier distribution statistics
   */
  async getTierStats() {
    const { data, error } = await this.supabase
      .from('vw_engagement_tier_stats')
      .select('*');

    if (error) throw error;
    return data;
  }

  /**
   * Promote person to Notion
   */
  async promoteToNotion(personId, projectId = null) {
    // Get person data from Supabase
    const { data: person, error: personError } = await this.supabase
      .from('person_identity_map')
      .select(`
        *,
        contact_intelligence_scores(*),
        linkedin_project_connections(*)
      `)
      .eq('person_id', personId)
      .single();

    if (personError) throw personError;

    // Check if already in Notion
    if (person.notion_person_id) {
      logger.info(`Person already in Notion: ${person.email}`);
      return { alreadyInNotion: true, notionId: person.notion_person_id };
    }

    // Create in Notion People database
    const notionPerson = await notionService.createPerson({
      name: person.full_name,
      email: person.email,
      role: person.current_position || 'Contact',
      tags: person.alignment_tags || [],
      status: 'Active',
      source: 'Gmail Discovery (Auto-promoted)',
      notes: `Composite Score: ${person.contact_intelligence_scores?.composite_score || 'N/A'}\nTier: ${person.engagement_priority}\nProjects: ${person.linkedin_project_connections?.length || 0}`
    });

    // Store bidirectional link
    await this.supabase
      .from('person_identity_map')
      .update({ notion_person_id: notionPerson.id })
      .eq('person_id', personId);

    // Link to projects in Notion
    if (projectId) {
      await notionService.linkPersonToProject(notionPerson.id, projectId);
    } else {
      // Link to all associated projects
      for (const projectConn of person.linkedin_project_connections || []) {
        if (projectConn.notion_project_id) {
          await notionService.linkPersonToProject(notionPerson.id, projectConn.notion_project_id);
        }
      }
    }

    logger.info(`✅ Promoted ${person.email} to Notion (${notionPerson.id})`);

    return {
      alreadyInNotion: false,
      notionId: notionPerson.id,
      supabaseId: personId
    };
  }

  /**
   * Batch assign tiers for all contacts
   */
  async batchAssignTiers() {
    logger.info('🔄 Running batch tier assignment...');

    const { data, error } = await this.supabase
      .rpc('batch_assign_engagement_tiers');

    if (error) throw error;

    logger.info('✅ Batch tier assignment complete:');
    data.forEach(row => {
      logger.info(`   ${row.tier}: ${row.count} contacts`);
    });

    return data;
  }
}

export default new StrategicContactService();
