/**
 * GHL Action Sync Service
 *
 * Pushes AI-generated actions to GHL contacts:
 * - Updates custom fields (project_links, project_role, relationship_score, suggested_action)
 * - Adds contacts to pipelines (Relationship Nurture, Thank You, Project Onboarding)
 * - Manages smart list segmentation via tags
 *
 * Architecture: "Notion for visibility. GHL for action. AI for intelligence."
 *
 * Gracefully degrades if GHL credentials are not configured.
 */

import { logger } from '../../utils/logger.js';
import { createClient } from '@supabase/supabase-js';

const GHL_API_BASE = 'https://services.leadconnectorhq.com';

class GhlActionSyncService {
  constructor() {
    this.apiKey = process.env.GHL_API_KEY;
    this.locationId = process.env.GHL_LOCATION_ID;
    this.customFieldIds = null; // Cached after first lookup
    this.pipelineIds = null; // Cached after first lookup

    // Supabase clients for data access
    this.mainDb = null;
    this.ghlDb = null;
  }

  /**
   * Check if service is configured
   */
  isConfigured() {
    return !!(this.apiKey && this.locationId);
  }

  /**
   * Get Supabase client for main database
   */
  getMainDb() {
    if (!this.mainDb && process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      this.mainDb = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
    }
    return this.mainDb;
  }

  /**
   * Get Supabase client for GHL database
   */
  getGhlDb() {
    if (!this.ghlDb) {
      const url = process.env.SUPABASE_SHARED_URL || process.env.SUPABASE_URL;
      const key = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (url && key) {
        this.ghlDb = createClient(url, key);
      }
    }
    return this.ghlDb;
  }

  /**
   * Make authenticated GHL API request
   * @param {string} endpoint - API endpoint
   * @param {Object} options - Fetch options
   * @returns {Object} Response data
   */
  async ghlRequest(endpoint, options = {}) {
    if (!this.isConfigured()) {
      throw new Error('GHL API not configured. Set GHL_API_KEY and GHL_LOCATION_ID.');
    }

    const url = endpoint.startsWith('http') ? endpoint : `${GHL_API_BASE}${endpoint}`;

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Version': '2021-07-28',
          'Content-Type': 'application/json',
          ...options.headers
        }
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`GHL API error ${response.status}: ${error}`);
      }

      return response.json();
    } catch (error) {
      logger.error('GHL request failed', { endpoint, error: error.message });
      throw error;
    }
  }

  /**
   * Get custom field IDs from GHL
   */
  async getCustomFieldIds() {
    if (this.customFieldIds) return this.customFieldIds;

    try {
      const data = await this.ghlRequest(`/locations/${this.locationId}/customFields`);

      const fields = {};
      const keyMap = {
        'project_links': 'projectLinks',
        'Project Links': 'projectLinks',
        'project_role': 'projectRole',
        'Project Role': 'projectRole',
        'relationship_score': 'relationshipScore',
        'Relationship Score': 'relationshipScore',
        'suggested_action': 'suggestedAction',
        'Suggested Action': 'suggestedAction',
        'last_ai_action': 'lastAiAction',
        'Last AI Action': 'lastAiAction'
      };

      for (const field of data.customFields || []) {
        const normalizedKey = keyMap[field.name] || keyMap[field.fieldKey];
        if (normalizedKey) {
          fields[normalizedKey] = {
            id: field.id,
            fieldKey: field.fieldKey,
            dataType: field.dataType,
            options: field.options
          };
        }
      }

      this.customFieldIds = fields;
      return fields;
    } catch (error) {
      logger.warn('Could not fetch custom field IDs', { error: error.message });
      return {};
    }
  }

  /**
   * Get pipeline IDs from database
   */
  async getPipelineIds() {
    if (this.pipelineIds) return this.pipelineIds;

    const db = this.getGhlDb();
    if (!db) {
      logger.warn('GHL database not configured');
      return {};
    }

    try {
      const { data: pipelines } = await db
        .from('ghl_pipelines')
        .select('id, ghl_id, name, stages');

      const pipelineMap = {};
      const keyMap = {
        'Relationship Nurture': 'relationshipNurture',
        'Thank You': 'thankYou',
        'Project Onboarding': 'projectOnboarding',
        'Supporters & Donors': 'supportersDonors',
        'Festivals': 'festivals',
        'Grants': 'grants'
      };

      for (const pipeline of pipelines || []) {
        const key = keyMap[pipeline.name] || pipeline.name.toLowerCase().replace(/\s+/g, '');
        pipelineMap[key] = {
          id: pipeline.ghl_id,
          name: pipeline.name,
          stages: pipeline.stages
        };
      }

      this.pipelineIds = pipelineMap;
      return pipelineMap;
    } catch (error) {
      logger.error('Failed to get pipeline IDs', { error: error.message });
      return {};
    }
  }

  /**
   * Update contact custom fields in GHL
   * @param {string} ghlContactId - GHL contact ID
   * @param {Object} fields - Fields to update
   */
  async updateContactFields(ghlContactId, fields) {
    const customFieldIds = await this.getCustomFieldIds();
    const customFields = [];

    if (fields.projectLinks && customFieldIds.projectLinks) {
      customFields.push({
        id: customFieldIds.projectLinks.id,
        value: Array.isArray(fields.projectLinks) ? fields.projectLinks : [fields.projectLinks]
      });
    }

    if (fields.projectRole && customFieldIds.projectRole) {
      customFields.push({
        id: customFieldIds.projectRole.id,
        value: fields.projectRole
      });
    }

    if (fields.relationshipScore !== undefined && customFieldIds.relationshipScore) {
      customFields.push({
        id: customFieldIds.relationshipScore.id,
        value: fields.relationshipScore.toString()
      });
    }

    if (fields.suggestedAction && customFieldIds.suggestedAction) {
      customFields.push({
        id: customFieldIds.suggestedAction.id,
        value: fields.suggestedAction
      });
    }

    if (customFieldIds.lastAiAction) {
      customFields.push({
        id: customFieldIds.lastAiAction.id,
        value: new Date().toISOString().split('T')[0]
      });
    }

    if (customFields.length === 0) {
      logger.warn('No custom fields configured in GHL');
      return null;
    }

    const result = await this.ghlRequest(`/contacts/${ghlContactId}`, {
      method: 'PUT',
      body: JSON.stringify({ customFields })
    });

    await this.logAction(ghlContactId, 'update_fields', fields);
    return result;
  }

  /**
   * Add contact to a pipeline stage
   * @param {string} ghlContactId - GHL contact ID
   * @param {string} pipelineName - Pipeline name key
   * @param {string} stageName - Stage name
   */
  async addToPipeline(ghlContactId, pipelineName, stageName) {
    const pipelines = await this.getPipelineIds();
    const pipeline = pipelines[pipelineName];

    if (!pipeline) {
      throw new Error(`Pipeline not found: ${pipelineName}. Available: ${Object.keys(pipelines).join(', ')}`);
    }

    // Find the stage ID
    let stageId = null;
    if (pipeline.stages) {
      const stage = pipeline.stages.find(s =>
        s.name.toLowerCase() === stageName.toLowerCase()
      );
      stageId = stage?.id;
    }

    if (!stageId) {
      logger.warn(`Stage "${stageName}" not found in pipeline "${pipelineName}", using first stage`);
      stageId = pipeline.stages?.[0]?.id;
    }

    const result = await this.ghlRequest('/opportunities/', {
      method: 'POST',
      body: JSON.stringify({
        pipelineId: pipeline.id,
        locationId: this.locationId,
        contactId: ghlContactId,
        pipelineStageId: stageId,
        name: `${pipelineName} - ${new Date().toLocaleDateString()}`,
        status: 'open'
      })
    });

    await this.logAction(ghlContactId, 'add_to_pipeline', { pipelineName, stageName });
    return result;
  }

  /**
   * Update contact tags
   * @param {string} ghlContactId - GHL contact ID
   * @param {string[]} tagsToAdd - Tags to add
   * @param {string[]} tagsToRemove - Tags to remove
   */
  async updateTags(ghlContactId, tagsToAdd = [], tagsToRemove = []) {
    const contact = await this.ghlRequest(`/contacts/${ghlContactId}`);
    const currentTags = contact.contact?.tags || [];

    const newTags = [
      ...currentTags.filter(t => !tagsToRemove.includes(t)),
      ...tagsToAdd.filter(t => !currentTags.includes(t))
    ];

    const result = await this.ghlRequest(`/contacts/${ghlContactId}`, {
      method: 'PUT',
      body: JSON.stringify({ tags: newTags })
    });

    await this.logAction(ghlContactId, 'update_tags', { added: tagsToAdd, removed: tagsToRemove });
    return result;
  }

  /**
   * Log action to database for tracking
   */
  async logAction(ghlContactId, actionType, details) {
    const db = this.getMainDb();
    if (!db) return;

    try {
      await db.from('ghl_action_log').insert({
        ghl_contact_id: ghlContactId,
        action_type: actionType,
        details,
        created_at: new Date().toISOString()
      });
    } catch (error) {
      // Table might not exist - that's okay
      logger.debug('Could not log action', { error: error.message });
    }
  }

  /**
   * Push AI-generated action to a contact
   * @param {Object} contact - Contact data with ghl_id
   * @param {Object} action - Action to push
   * @returns {Object} Results summary
   */
  async pushAction(contact, action) {
    if (!this.isConfigured()) {
      logger.warn('GHL API not configured - skipping action push');
      return {
        contact: `${contact.first_name} ${contact.last_name}`,
        skipped: true,
        reason: 'GHL not configured'
      };
    }

    const ghlId = contact.ghl_id || contact.id;
    const results = {
      contact: `${contact.first_name} ${contact.last_name}`,
      ghlId,
      updates: [],
      errors: []
    };

    // 1. Update relationship score
    if (action.relationshipScore !== undefined) {
      try {
        await this.updateContactFields(ghlId, {
          relationshipScore: action.relationshipScore
        });
        results.updates.push('relationship_score');
      } catch (e) {
        results.errors.push(`relationship_score: ${e.message}`);
      }
    }

    // 2. Update suggested action
    if (action.suggestedAction) {
      try {
        await this.updateContactFields(ghlId, {
          suggestedAction: action.suggestedAction
        });
        results.updates.push('suggested_action');
      } catch (e) {
        results.errors.push(`suggested_action: ${e.message}`);
      }
    }

    // 3. Link to projects
    if (action.projectLinks && action.projectLinks.length > 0) {
      try {
        await this.updateContactFields(ghlId, {
          projectLinks: action.projectLinks,
          projectRole: action.projectRole || 'Advisor'
        });
        results.updates.push('project_links');
      } catch (e) {
        results.errors.push(`project_links: ${e.message}`);
      }
    }

    // 4. Add to pipeline
    if (action.addToPipeline) {
      try {
        await this.addToPipeline(ghlId, action.addToPipeline.pipeline, action.addToPipeline.stage);
        results.updates.push(`pipeline:${action.addToPipeline.pipeline}`);
      } catch (e) {
        results.errors.push(`pipeline: ${e.message}`);
      }
    }

    // 5. Update tags
    if (action.addTags || action.removeTags) {
      try {
        await this.updateTags(ghlId, action.addTags || [], action.removeTags || []);
        results.updates.push('tags');
      } catch (e) {
        results.errors.push(`tags: ${e.message}`);
      }
    }

    return results;
  }

  /**
   * Get contacts needing follow-up based on relationship health
   * @param {number} daysThreshold - Days since last contact
   * @returns {Object[]} Contacts needing action
   */
  async getContactsNeedingAction(daysThreshold = 25) {
    const db = this.getGhlDb();
    if (!db) {
      logger.warn('GHL database not configured');
      return [];
    }

    try {
      const { data: contacts } = await db
        .from('ghl_contacts')
        .select('id, ghl_id, first_name, last_name, email, phone, tags, company_name, projects')
        .eq('sync_status', 'synced')
        .not('email', 'is', null);

      const mainDb = this.getMainDb();
      const results = [];
      const now = new Date();

      for (const contact of contacts || []) {
        let daysSince = null;
        let lastSubject = null;

        // Get last communication if main db is available
        if (mainDb) {
          const { data: lastComm } = await mainDb
            .from('contact_communications')
            .select('occurred_at, direction, subject')
            .eq('ghl_contact_id', contact.id)
            .order('occurred_at', { ascending: false })
            .limit(1)
            .single();

          if (lastComm) {
            daysSince = Math.floor((now - new Date(lastComm.occurred_at)) / (1000 * 60 * 60 * 24));
            lastSubject = lastComm.subject;
          }
        }

        // Calculate relationship score (0-100)
        let relationshipScore = 0;
        if (daysSince !== null) {
          if (daysSince <= 7) relationshipScore = 100;
          else if (daysSince <= 14) relationshipScore = 80;
          else if (daysSince <= 21) relationshipScore = 60;
          else if (daysSince <= 30) relationshipScore = 40;
          else if (daysSince <= 60) relationshipScore = 20;
          else relationshipScore = 0;
        }

        // Determine if action needed
        if (daysSince === null || daysSince > daysThreshold) {
          results.push({
            contact,
            daysSince,
            relationshipScore,
            lastSubject,
            suggestedAction: daysSince === null
              ? 'Initial outreach - introduce yourself and ACT'
              : daysSince > 60
                ? `Re-engage - last contact ${daysSince} days ago about "${lastSubject}"`
                : `Follow up - ${daysSince} days since last contact`
          });
        }
      }

      return results.sort((a, b) => (b.daysSince || 999) - (a.daysSince || 999));
    } catch (error) {
      logger.error('Failed to get contacts needing action', { error: error.message });
      return [];
    }
  }

  /**
   * Sync relationship health to GHL for all contacts needing attention
   * @returns {Object} Sync results
   */
  async syncRelationshipHealth() {
    if (!this.isConfigured()) {
      logger.warn('GHL API not configured - skipping sync');
      return { synced: 0, errors: 0, skipped: true };
    }

    const contacts = await this.getContactsNeedingAction();
    logger.info(`Found ${contacts.length} contacts needing attention`);

    let synced = 0;
    let errors = 0;

    for (const { contact, relationshipScore, suggestedAction } of contacts) {
      try {
        await this.pushAction(contact, {
          relationshipScore,
          suggestedAction,
          addTags: relationshipScore < 40 ? ['AI-Flagged', 'Needs-Attention'] : ['AI-Flagged']
        });
        synced++;
      } catch (e) {
        logger.error(`Error syncing ${contact.first_name} ${contact.last_name}`, { error: e.message });
        errors++;
      }
    }

    return { synced, errors, total: contacts.length };
  }

  /**
   * Get service status
   * @returns {Object} Status information
   */
  async getStatus() {
    const status = {
      configured: this.isConfigured(),
      locationId: this.locationId || null,
      pipelines: [],
      customFields: [],
      contactsNeedingAction: 0
    };

    if (!this.isConfigured()) {
      status.message = 'GHL API not configured. Set GHL_API_KEY and GHL_LOCATION_ID.';
      return status;
    }

    try {
      const pipelines = await this.getPipelineIds();
      status.pipelines = Object.entries(pipelines).map(([key, p]) => ({
        key,
        name: p.name,
        stages: p.stages?.map(s => s.name) || []
      }));

      const fields = await this.getCustomFieldIds();
      status.customFields = Object.keys(fields);

      const contacts = await this.getContactsNeedingAction();
      status.contactsNeedingAction = contacts.length;
    } catch (error) {
      status.error = error.message;
    }

    return status;
  }
}

// Export singleton instance
const ghlActionSyncService = new GhlActionSyncService();
export default ghlActionSyncService;
export { GhlActionSyncService };
