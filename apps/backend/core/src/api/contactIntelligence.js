/**
 * Contact Intelligence API
 *
 * RESTful API for contact management and intelligence operations
 * Integrates with existing ACT infrastructure and AI services
 */

import express from 'express';
import ContactIntelligenceService from '../services/contactIntelligenceService.js';
import { authenticate } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';
import multer from 'multer';
import csv from 'csv-parser';
import { Readable } from 'stream';

const router = express.Router();
const contactIntelligence = new ContactIntelligenceService();

// Configure multer for CSV file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'), false);
    }
  }
});

// Authentication is applied at the app level via optionalAuth
// No additional authentication needed here

/**
 * GET /api/contact-intelligence/initialize
 * Initialize the database schema and return system status
 */
router.get('/initialize', async (req, res) => {
  try {
    const initResult = await contactIntelligence.initializeDatabase();
    res.json({
      success: true,
      message: 'Database initialization completed',
      data: initResult,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('❌ Database initialization failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initialize database',
      message: error.message
    });
  }
});

/**
 * POST /api/contact-intelligence/create-schema
 * Force create database schema (temporary endpoint)
 */
router.post('/create-schema', async (req, res) => {
  try {
    logger.info('🔧 Force creating Contact Intelligence schema...'); // trigger restart

    // Create person_identity_map table directly using SQL
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS person_identity_map (
        person_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        full_name TEXT,
        email TEXT UNIQUE,
        contact_data JSONB DEFAULT '{}',
        youth_justice_relevance_score INTEGER DEFAULT 0,
        engagement_priority TEXT DEFAULT 'low',
        sector TEXT,
        organization_type TEXT,
        location_region TEXT,
        indigenous_affiliation BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS contact_interactions (
        interaction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        person_id UUID REFERENCES person_identity_map(person_id) ON DELETE CASCADE,
        interaction_type TEXT NOT NULL,
        interaction_date TIMESTAMPTZ DEFAULT NOW(),
        details JSONB DEFAULT '{}',
        outcome TEXT,
        next_action TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS contact_campaigns (
        campaign_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        campaign_name TEXT NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'planning',
        target_sector TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE OR REPLACE VIEW contact_dashboard_summary AS
      SELECT
        COUNT(*) as total_contacts,
        COUNT(*) FILTER (WHERE engagement_priority = 'high') as high_priority,
        COUNT(*) FILTER (WHERE engagement_priority = 'critical') as critical_priority,
        COUNT(*) FILTER (WHERE sector = 'government') as government_contacts,
        COUNT(*) FILTER (WHERE sector = 'media') as media_contacts,
        COUNT(*) FILTER (WHERE indigenous_affiliation = true) as indigenous_contacts,
        COALESCE(AVG(youth_justice_relevance_score), 0) as avg_relevance_score
      FROM person_identity_map;
    `;

    // Execute SQL using raw query
    const result = await contactIntelligence.supabase.rpc('exec_sql', {
      sql_query: createTableSQL
    });

    if (result.error) {
      logger.error('❌ Schema creation failed:', result.error);
      return res.status(500).json({
        success: false,
        error: 'Schema creation failed',
        message: result.error.message,
        details: result.error
      });
    }

    logger.info('✅ Schema created successfully');

    // Test the tables
    const testQuery = await contactIntelligence.supabase
      .from('person_identity_map')
      .select('*')
      .limit(1);

    res.json({
      success: true,
      message: 'Database schema created successfully',
      data: {
        schema_created: true,
        test_query_success: !testQuery.error,
        test_error: testQuery.error?.message || null
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('❌ Schema creation exception:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create schema',
      message: error.message
    });
  }
});

/**
 * GET /api/contact-intelligence/dashboard
 * Get dashboard overview with key metrics and recent activity
 */
router.get('/dashboard', async (req, res) => {
  try {
    const dashboardData = await contactIntelligence.getDashboardData();
    res.json({
      success: true,
      data: dashboardData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('❌ Dashboard data fetch failed:', error);

    // Return mock data if database tables don't exist yet
    const mockData = {
      total_contacts: 0,
      high_priority: 0,
      critical_priority: 0,
      government_contacts: 0,
      media_contacts: 0,
      indigenous_contacts: 0,
      avg_relevance_score: 0,
      recent_activity: [],
      top_sectors: [],
      engagement_pipeline: {
        pending: 0,
        in_progress: 0,
        completed: 0
      },
      needs_initialization: true
    };

    res.json({
      success: true,
      data: mockData,
      message: 'Using mock data - database needs initialization',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/contact-intelligence/contacts
 * Get contacts with filtering, sorting, and pagination
 */
router.get('/contacts', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      sector,
      engagement_priority,
      indigenous_affiliation,
      search,
      sort = 'relationship_score',
      order = 'desc'
    } = req.query;

    // Use existing linkedin_contacts table instead of missing view
    let query = contactIntelligence.supabase
      .from('linkedin_contacts')
      .select('*');

    // Apply filters using LinkedIn table fields
    if (sector) {
      query = query.eq('industry', sector); // Use industry instead of sector
    }
    if (engagement_priority) {
      query = query.eq('strategic_value', engagement_priority); // Use strategic_value instead of engagement_priority
    }
    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    // Apply sorting
    query = query.order(sort, { ascending: order === 'asc' });

    // Apply pagination
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    res.json({
      success: true,
      data: data || [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count || data?.length || 0,
        total_pages: Math.ceil((count || data?.length || 0) / limit)
      }
    });

  } catch (error) {
    logger.error('❌ Contacts fetch failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch contacts',
      message: error.message
    });
  }
});

/**
 * GET /api/contact-intelligence/contacts/:id
 * Get detailed contact information including interactions and scores
 */
router.get('/contacts/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Get contact details
    const { data: contact, error: contactError } = await contactIntelligence.supabase
      .from('person_identity_map')
      .select(`
        *,
        contact_intelligence_scores(*),
        contact_interactions(*),
        contact_tasks(*),
        contact_campaign_assignments(
          *,
          contact_campaigns(*)
        )
      `)
      .eq('person_id', id)
      .single();

    if (contactError) throw contactError;

    if (!contact) {
      return res.status(404).json({
        success: false,
        error: 'Contact not found'
      });
    }

    // Get relationship data
    const { data: relationships, error: relationshipsError } = await contactIntelligence.supabase
      .from('contact_relationships')
      .select(`
        *,
        person_b:person_identity_map!contact_relationships_person_b_id_fkey(full_name, email, sector)
      `)
      .eq('person_a_id', id);

    if (relationshipsError) {
      logger.warn('⚠️ Failed to fetch relationships:', relationshipsError);
    }

    // Get research history
    const { data: researchHistory, error: researchError } = await contactIntelligence.supabase
      .from('contact_research_log')
      .select('*')
      .eq('person_id', id)
      .order('research_date', { ascending: false })
      .limit(10);

    if (researchError) {
      logger.warn('⚠️ Failed to fetch research history:', researchError);
    }

    res.json({
      success: true,
      data: {
        ...contact,
        relationships: relationships || [],
        research_history: researchHistory || []
      }
    });

  } catch (error) {
    logger.error('❌ Contact detail fetch failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch contact details',
      message: error.message
    });
  }
});

/**
 * POST /api/contact-intelligence/contacts/:id/enrich
 * Trigger AI enrichment for a specific contact
 */
router.post('/contacts/:id/enrich', async (req, res) => {
  try {
    const { id } = req.params;
    const { full_enrichment = false } = req.body;

    let result;
    if (full_enrichment) {
      result = await contactIntelligence.enrichContactFull(id);
    } else {
      result = await contactIntelligence.enrichContactBasic(id);
    }

    if (result && (result.success !== false)) {
      res.json({
        success: true,
        message: 'Contact enrichment completed',
        data: result
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Enrichment failed',
        message: result?.error || 'Unknown error'
      });
    }

  } catch (error) {
    logger.error('❌ Contact enrichment failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to enrich contact',
      message: error.message
    });
  }
});

/**
 * POST /api/contact-intelligence/contacts/:id/interactions
 * Record a new interaction with a contact
 */
router.post('/contacts/:id/interactions', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      interaction_type,
      subject,
      description,
      outcome,
      sentiment_score,
      follow_up_required = false,
      follow_up_date,
      metadata = {}
    } = req.body;

    const { data, error } = await contactIntelligence.supabase
      .from('contact_interactions')
      .insert({
        person_id: id,
        interaction_type,
        subject,
        description,
        outcome,
        sentiment_score,
        follow_up_required,
        follow_up_date,
        metadata,
        created_by: req.user?.email || 'system'
      })
      .select()
      .single();

    if (error) throw error;

    // Update contact intelligence scores based on new interaction
    await contactIntelligence.updateIntelligenceScores(id, {
      influence: 0, // Will be recalculated
      accessibility: 0,
      alignment: 0,
      timing: 0,
      strategicValue: 0
    });

    res.status(201).json({
      success: true,
      message: 'Interaction recorded successfully',
      data
    });

  } catch (error) {
    logger.error('❌ Failed to record interaction:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to record interaction',
      message: error.message
    });
  }
});

/**
 * POST /api/contact-intelligence/contacts/:id/tasks
 * Create a new task for a contact
 */
router.post('/contacts/:id/tasks', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      task_type,
      title,
      description,
      priority = 'medium',
      due_date,
      campaign_id
    } = req.body;

    const { data, error } = await contactIntelligence.supabase
      .from('contact_tasks')
      .insert({
        person_id: id,
        campaign_id,
        task_type,
        title,
        description,
        priority,
        due_date,
        assigned_to: req.user?.email || 'system'
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data
    });

  } catch (error) {
    logger.error('❌ Failed to create task:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create task',
      message: error.message
    });
  }
});

/**
 * POST /api/contact-intelligence/import/csv
 * Import contacts from CSV file
 */
router.post('/import/csv', upload.single('csvFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No CSV file provided'
      });
    }

    const { enable_ai_enrichment = 'false', batch_size = '50' } = req.body;

    // Parse CSV data
    const csvData = [];
    const stream = Readable.from(req.file.buffer);

    await new Promise((resolve, reject) => {
      stream
        .pipe(csv())
        .on('data', (data) => csvData.push(data))
        .on('end', resolve)
        .on('error', reject);
    });

    if (csvData.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'CSV file is empty or invalid'
      });
    }

    // Start import process
    const importOptions = {
      enableAIEnrichment: enable_ai_enrichment === 'true',
      batchSize: parseInt(batch_size)
    };

    // For large imports, run asynchronously and return immediately
    if (csvData.length > 100) {
      // Start async import
      contactIntelligence.importAndEnrichContacts(csvData, importOptions)
        .then(results => {
          logger.info(`✅ Async import completed: ${results.imported} imported, ${results.enriched} enriched`);
        })
        .catch(error => {
          logger.error('❌ Async import failed:', error);
        });

      res.json({
        success: true,
        message: `Large import started for ${csvData.length} contacts. Processing asynchronously.`,
        estimated_time: `${Math.ceil(csvData.length / 50) * 2} minutes`,
        async: true
      });

    } else {
      // For small imports, process synchronously
      const results = await contactIntelligence.importAndEnrichContacts(csvData, importOptions);

      res.json({
        success: true,
        message: 'Import completed successfully',
        data: results,
        async: false
      });
    }

  } catch (error) {
    logger.error('❌ CSV import failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to import CSV',
      message: error.message
    });
  }
});

/**
 * GET /api/contact-intelligence/campaigns
 * Get all campaigns with statistics
 */
router.get('/campaigns', async (req, res) => {
  try {
    const { data, error } = await contactIntelligence.supabase
      .from('contact_campaigns')
      .select(`
        *,
        contact_campaign_assignments(count)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      data: data || []
    });

  } catch (error) {
    logger.error('❌ Failed to fetch campaigns:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch campaigns',
      message: error.message
    });
  }
});

/**
 * POST /api/contact-intelligence/campaigns
 * Create a new campaign
 */
router.post('/campaigns', async (req, res) => {
  try {
    const {
      campaign_name,
      campaign_type,
      description,
      target_audience = {},
      success_metrics = {},
      start_date,
      end_date,
      expected_outcomes
    } = req.body;

    const { data, error } = await contactIntelligence.supabase
      .from('contact_campaigns')
      .insert({
        campaign_name,
        campaign_type,
        description,
        target_audience,
        success_metrics,
        start_date,
        end_date,
        expected_outcomes,
        created_by: req.user?.email || 'system'
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      message: 'Campaign created successfully',
      data
    });

  } catch (error) {
    logger.error('❌ Failed to create campaign:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create campaign',
      message: error.message
    });
  }
});

/**
 * POST /api/contact-intelligence/campaigns/:id/assign
 * Assign contacts to a campaign
 */
router.post('/campaigns/:id/assign', async (req, res) => {
  try {
    const { id: campaignId } = req.params;
    const { contact_ids, priority_score = 50, custom_approach } = req.body;

    if (!Array.isArray(contact_ids) || contact_ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'contact_ids must be a non-empty array'
      });
    }

    const assignments = contact_ids.map(personId => ({
      person_id: personId,
      campaign_id: campaignId,
      priority_score,
      custom_approach,
      assigned_to: req.user?.email || 'system'
    }));

    const { data, error } = await contactIntelligence.supabase
      .from('contact_campaign_assignments')
      .insert(assignments)
      .select();

    if (error) throw error;

    res.status(201).json({
      success: true,
      message: `Assigned ${contact_ids.length} contacts to campaign`,
      data
    });

  } catch (error) {
    logger.error('❌ Failed to assign contacts to campaign:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to assign contacts to campaign',
      message: error.message
    });
  }
});

/**
 * GET /api/contact-intelligence/analytics/sectors
 * Get analytics breakdown by sector
 */
router.get('/analytics/sectors', async (req, res) => {
  try {
    const { data, error } = await contactIntelligence.supabase
      .from('linkedin_contacts')
      .select('industry, strategic_value, relationship_score')
      .not('email_address', 'is', null);

    if (error) throw error;

    // Group and analyze by sector
    const sectorAnalytics = {};
    data.forEach(contact => {
      const sector = contact.industry || 'unknown';
      if (!sectorAnalytics[sector]) {
        sectorAnalytics[sector] = {
          total: 0,
          high_priority: 0,
          indigenous: 0,
          avg_youth_justice_score: 0,
          scores: []
        };
      }

      sectorAnalytics[sector].total++;
      if (contact.strategic_value === 'high' || contact.strategic_value === 'critical') {
        sectorAnalytics[sector].high_priority++;
      }
      if (contact.relationship_score) {
        sectorAnalytics[sector].scores.push(parseFloat(contact.relationship_score));
      }
    });

    // Calculate averages
    Object.keys(sectorAnalytics).forEach(sector => {
      const scores = sectorAnalytics[sector].scores;
      sectorAnalytics[sector].avg_youth_justice_score = scores.length > 0
        ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
        : 0;
      delete sectorAnalytics[sector].scores; // Remove raw scores from response
    });

    res.json({
      success: true,
      data: sectorAnalytics
    });

  } catch (error) {
    logger.error('❌ Failed to get sector analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get sector analytics',
      message: error.message
    });
  }
});

/**
 * GET /api/contact-intelligence/metrics
 * Get service performance metrics
 */
router.get('/metrics', async (req, res) => {
  try {
    const metrics = contactIntelligence.getServiceMetrics();
    res.json({
      success: true,
      data: metrics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('❌ Failed to get metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get metrics',
      message: error.message
    });
  }
});

/**
 * POST /api/contact-intelligence/flag
 * Flag a contact with priority level and notes
 */
router.post('/flag', async (req, res) => {
  try {
    const {
      person_id,
      email,
      flag_type = 'priority',
      priority_level = 'high',
      flag_reason,
      notes,
      project_relevance,
      follow_up_action
    } = req.body;

    if (!person_id && !email) {
      return res.status(400).json({
        success: false,
        error: 'Either person_id or email is required'
      });
    }

    // Find contact if only email provided
    let contactId = person_id;
    if (!contactId && email) {
      const { data: contact, error: findError } = await contactIntelligence.supabase
        .from('person_identity_map')
        .select('person_id')
        .eq('email', email)
        .single();

      if (findError || !contact) {
        return res.status(404).json({
          success: false,
          error: 'Contact not found'
        });
      }
      contactId = contact.person_id;
    }

    // Update the contact's priority level
    const { error: updateError } = await contactIntelligence.supabase
      .from('person_identity_map')
      .update({
        engagement_priority: priority_level,
        updated_at: new Date().toISOString()
      })
      .eq('person_id', contactId);

    if (updateError) throw updateError;

    // Record the flagging as an interaction
    const { data: interaction, error: interactionError } = await contactIntelligence.supabase
      .from('contact_interactions')
      .insert({
        person_id: contactId,
        interaction_type: 'flagged',
        subject: `Contact flagged as ${priority_level} priority`,
        description: notes || flag_reason,
        outcome: `Flagged for ${flag_type}: ${flag_reason}`,
        metadata: {
          flag_type,
          priority_level,
          project_relevance,
          follow_up_action,
          flagged_by: req.user?.email || 'system',
          flagged_at: new Date().toISOString()
        },
        follow_up_required: !!follow_up_action,
        created_by: req.user?.email || 'system'
      })
      .select()
      .single();

    if (interactionError) {
      logger.warn('⚠️ Failed to record flagging interaction:', interactionError);
    }

    res.json({
      success: true,
      message: `Contact flagged as ${priority_level} priority`,
      data: {
        person_id: contactId,
        flag_type,
        priority_level,
        interaction_recorded: !interactionError,
        interaction_id: interaction?.interaction_id
      }
    });

  } catch (error) {
    logger.error('❌ Failed to flag contact:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to flag contact',
      message: error.message
    });
  }
});

/**
 * POST /api/contact-intelligence/unflag
 * Remove flag from a contact
 */
router.post('/unflag', async (req, res) => {
  try {
    const { person_id, email, notes } = req.body;

    if (!person_id && !email) {
      return res.status(400).json({
        success: false,
        error: 'Either person_id or email is required'
      });
    }

    // Find contact if only email provided
    let contactId = person_id;
    if (!contactId && email) {
      const { data: contact, error: findError } = await contactIntelligence.supabase
        .from('person_identity_map')
        .select('person_id')
        .eq('email', email)
        .single();

      if (findError || !contact) {
        return res.status(404).json({
          success: false,
          error: 'Contact not found'
        });
      }
      contactId = contact.person_id;
    }

    // Reset priority to normal
    const { error: updateError } = await contactIntelligence.supabase
      .from('person_identity_map')
      .update({
        engagement_priority: 'medium',
        updated_at: new Date().toISOString()
      })
      .eq('person_id', contactId);

    if (updateError) throw updateError;

    // Record the unflagging as an interaction
    const { data: interaction, error: interactionError } = await contactIntelligence.supabase
      .from('contact_interactions')
      .insert({
        person_id: contactId,
        interaction_type: 'unflagged',
        subject: 'Contact flag removed',
        description: notes || 'Contact priority reset to normal',
        outcome: 'Flag removed - priority reset to medium',
        metadata: {
          unflagged_by: req.user?.email || 'system',
          unflagged_at: new Date().toISOString()
        },
        created_by: req.user?.email || 'system'
      })
      .select()
      .single();

    if (interactionError) {
      logger.warn('⚠️ Failed to record unflagging interaction:', interactionError);
    }

    res.json({
      success: true,
      message: 'Contact flag removed',
      data: {
        person_id: contactId,
        interaction_recorded: !interactionError,
        interaction_id: interaction?.interaction_id
      }
    });

  } catch (error) {
    logger.error('❌ Failed to unflag contact:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to unflag contact',
      message: error.message
    });
  }
});

/**
 * GET /api/contact-intelligence/flagged
 * Get all flagged contacts
 */
router.get('/flagged', async (req, res) => {
  try {
    const {
      priority_level,
      limit = 50,
      offset = 0
    } = req.query;

    let query = contactIntelligence.supabase
      .from('person_identity_map')
      .select(`
        person_id,
        full_name,
        email,
        engagement_priority,
        sector,
        organization_type,
        youth_justice_relevance_score,
        updated_at,
        contact_interactions!inner (
          interaction_id,
          interaction_type,
          subject,
          description,
          metadata,
          interaction_date
        )
      `)
      .in('engagement_priority', ['high', 'critical'])
      .order('updated_at', { ascending: false });

    if (priority_level) {
      query = query.eq('engagement_priority', priority_level);
    }

    if (limit) {
      query = query.range(offset, offset + parseInt(limit) - 1);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Get recent flagging interactions for each contact
    const enrichedData = await Promise.all((data || []).map(async (contact) => {
      const { data: flagInteractions, error: flagError } = await contactIntelligence.supabase
        .from('contact_interactions')
        .select('*')
        .eq('person_id', contact.person_id)
        .in('interaction_type', ['flagged', 'unflagged'])
        .order('interaction_date', { ascending: false })
        .limit(1);

      return {
        ...contact,
        last_flag_interaction: flagInteractions?.[0] || null,
        flag_error: flagError
      };
    }));

    res.json({
      success: true,
      data: enrichedData,
      count: data?.length || 0
    });

  } catch (error) {
    logger.error('❌ Failed to get flagged contacts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get flagged contacts',
      message: error.message
    });
  }
});

/**
 * POST /api/contact-intelligence/link-project
 * Link a contact to a Notion project
 */
router.post('/link-project', async (req, res) => {
  try {
    const {
      person_id,
      email,
      notion_project_id,
      project_title,
      relevance_score = 50,
      role_in_project,
      linkage_reason,
      notes
    } = req.body;

    if (!person_id && !email) {
      return res.status(400).json({
        success: false,
        error: 'Either person_id or email is required'
      });
    }

    if (!notion_project_id && !project_title) {
      return res.status(400).json({
        success: false,
        error: 'Either notion_project_id or project_title is required'
      });
    }

    // Find contact if only email provided
    let contactId = person_id;
    if (!contactId && email) {
      const { data: contact, error: findError } = await contactIntelligence.supabase
        .from('person_identity_map')
        .select('person_id')
        .eq('email', email)
        .single();

      if (findError || !contact) {
        return res.status(404).json({
          success: false,
          error: 'Contact not found'
        });
      }
      contactId = contact.person_id;
    }

    // Check if linkage already exists
    const { data: existingLink } = await contactIntelligence.supabase
      .from('contact_project_linkages')
      .select('*')
      .eq('person_id', contactId)
      .eq('notion_project_id', notion_project_id || 'manual')
      .single();

    if (existingLink) {
      // Update existing linkage
      const { data: updated, error: updateError } = await contactIntelligence.supabase
        .from('contact_project_linkages')
        .update({
          relevance_score,
          role_in_project,
          linkage_reason,
          notes,
          updated_at: new Date().toISOString(),
          updated_by: req.user?.email || 'system'
        })
        .eq('linkage_id', existingLink.linkage_id)
        .select()
        .single();

      if (updateError) throw updateError;

      res.json({
        success: true,
        message: 'Project linkage updated successfully',
        data: updated,
        action: 'updated'
      });
    } else {
      // Create new linkage
      const { data: newLink, error: createError } = await contactIntelligence.supabase
        .from('contact_project_linkages')
        .insert({
          person_id: contactId,
          notion_project_id: notion_project_id || 'manual',
          project_title: project_title || 'Unknown Project',
          relevance_score,
          role_in_project,
          linkage_reason,
          notes,
          linked_by: req.user?.email || 'system'
        })
        .select()
        .single();

      if (createError) throw createError;

      res.status(201).json({
        success: true,
        message: 'Contact linked to project successfully',
        data: newLink,
        action: 'created'
      });
    }

    // Record as interaction
    await contactIntelligence.supabase
      .from('contact_interactions')
      .insert({
        person_id: contactId,
        interaction_type: 'project_linked',
        subject: `Linked to project: ${project_title || notion_project_id}`,
        description: `${linkage_reason || 'Project linkage created'}. Role: ${role_in_project || 'Unknown'}`,
        outcome: `Project linkage established with relevance score: ${relevance_score}`,
        metadata: {
          notion_project_id,
          project_title,
          relevance_score,
          role_in_project,
          linked_by: req.user?.email || 'system'
        },
        created_by: req.user?.email || 'system'
      });

  } catch (error) {
    logger.error('❌ Failed to link contact to project:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to link contact to project',
      message: error.message
    });
  }
});

/**
 * GET /api/contact-intelligence/project-links/:person_id
 * Get all project links for a contact
 */
router.get('/project-links/:person_id', async (req, res) => {
  try {
    const { person_id } = req.params;

    const { data: links, error } = await contactIntelligence.supabase
      .from('contact_project_linkages')
      .select('*')
      .eq('person_id', person_id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      data: links || [],
      count: links?.length || 0
    });

  } catch (error) {
    logger.error('❌ Failed to get project links:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get project links',
      message: error.message
    });
  }
});

/**
 * DELETE /api/contact-intelligence/project-links/:linkage_id
 * Remove a project linkage
 */
router.delete('/project-links/:linkage_id', async (req, res) => {
  try {
    const { linkage_id } = req.params;

    const { data: deleted, error } = await contactIntelligence.supabase
      .from('contact_project_linkages')
      .delete()
      .eq('linkage_id', linkage_id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      message: 'Project linkage removed successfully',
      data: deleted
    });

  } catch (error) {
    logger.error('❌ Failed to remove project linkage:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove project linkage',
      message: error.message
    });
  }
});

/**
 * POST /api/contact-intelligence/bulk-enrich
 * Trigger bulk enrichment for high-priority contacts
 */
router.post('/bulk-enrich', async (req, res) => {
  try {
    const { limit = 50, priority_only = true } = req.body;

    let query = contactIntelligence.supabase
      .from('person_identity_map')
      .select('person_id, full_name, engagement_priority')
      .not('email', 'is', null)
      .limit(limit);

    if (priority_only) {
      query = query.in('engagement_priority', ['high', 'critical']);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Start bulk enrichment asynchronously
    const enrichmentPromises = data.map(contact =>
      contactIntelligence.enrichContactBasic(contact.person_id)
    );

    // Process in batches to avoid overwhelming the system
    const batchSize = 10;
    const results = [];

    for (let i = 0; i < enrichmentPromises.length; i += batchSize) {
      const batch = enrichmentPromises.slice(i, i + batchSize);
      const batchResults = await Promise.allSettled(batch);
      results.push(...batchResults);

      // Brief pause between batches
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    res.json({
      success: true,
      message: `Bulk enrichment completed: ${successful} successful, ${failed} failed`,
      data: {
        total_processed: data.length,
        successful,
        failed,
        processing_time: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('❌ Bulk enrichment failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to perform bulk enrichment',
      message: error.message
    });
  }
});

// Error handling middleware
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File too large. Maximum size is 10MB.'
      });
    }
  }

  logger.error('❌ Contact Intelligence API error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: error.message
  });
});

export default router;