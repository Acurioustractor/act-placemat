/**
 * Contact Intelligence Dashboard API
 * Endpoints for viewing and managing strategic contacts
 */

import express from 'express';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

// Lazy-load Supabase client to avoid initialization errors
let supabase = null;
const getSupabase = () => {
  if (!supabase && process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
  }
  return supabase;
};

// Cache for project names (loaded from Notion API)
const projectNamesCache = new Map();
let projectsCacheLoaded = false;

// Helper function to get project names using Notion API
async function getProjectNames(projectIds) {
  if (projectIds.length === 0) return {};

  // Load all projects from Notion API once
  if (!projectsCacheLoaded) {
    try {
      const response = await fetch('http://localhost:4000/api/real/projects');
      const data = await response.json();

      if (data.success && data.projects) {
        data.projects.forEach(project => {
          projectNamesCache.set(project.id, project.name);
        });
        projectsCacheLoaded = true;
        console.log(`✅ Loaded ${projectNamesCache.size} project names into cache`);
      }
    } catch (err) {
      console.error('Error loading project names from Notion API:', err);
    }
  }

  // Build result map
  const result = {};
  projectIds.forEach(id => {
    result[id] = projectNamesCache.get(id) || 'Unknown Project';
  });

  return result;
}

/**
 * GET /api/contact-intelligence/stats
 * Get tier distribution statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const sb = getSupabase();
    if (!sb) {
      return res.status(503).json({ success: false, error: 'Supabase not configured' });
    }
    const { data, error } = await sb
      .from('vw_engagement_tier_stats')
      .select('*');

    if (error) throw error;

    res.json({
      success: true,
      stats: data
    });
  } catch (error) {
    console.error('Error fetching tier stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/contact-intelligence/promotion-candidates
 * Get contacts ready for Notion promotion
 */
router.get('/promotion-candidates', async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const sb = getSupabase();
    if (!sb) {
      return res.status(503).json({ success: false, error: 'Supabase not configured' });
    }

    // Fetch contacts with project interactions
    const { data, error } = await sb
      .from('person_identity_map')
      .select(`
        person_id,
        full_name,
        email,
        current_position,
        current_company,
        sector,
        engagement_priority,
        created_at,
        contact_intelligence_scores (
          composite_score,
          influence_score,
          strategic_value_score
        ),
        contact_interactions (
          metadata,
          interaction_type
        )
      `)
      .eq('engagement_priority', 'critical')
      .is('notion_person_id', null)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    if (error) throw error;

    // Transform the data to match the frontend interface
    const candidates = data.map(contact => {
      const scores = contact.contact_intelligence_scores?.[0] || {};
      // Extract project_id from metadata and transform interactions
      const interactions = (contact.contact_interactions || []).map(interaction => ({
        project_id: interaction.metadata?.project_id || null,
        interaction_type: interaction.interaction_type
      })).filter(i => i.project_id); // Only include interactions with project_id

      return {
        person_id: contact.person_id,
        full_name: contact.full_name,
        email: contact.email,
        current_position: contact.current_position,
        current_company: contact.current_company,
        sector: contact.sector,
        engagement_priority: contact.engagement_priority,
        composite_score: scores.composite_score || 0,
        influence_score: scores.influence_score || 0,
        strategic_value_score: scores.strategic_value_score || 0,
        total_interactions: contact.contact_interactions?.length || 0,
        created_at: contact.created_at,
        contact_interactions: interactions
      };
    });

    res.json({
      success: true,
      candidates,
      count: candidates.length
    });
  } catch (error) {
    console.error('Error fetching promotion candidates:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/contact-intelligence/contacts
 * Get all contacts with filters
 */
router.get('/contacts', async (req, res) => {
  try {
    const {
      tier,
      sector,
      search,
      limit = 100,
      offset = 0
    } = req.query;

    const sb = getSupabase();
    if (!sb) {
      return res.status(503).json({ success: false, error: 'Supabase not configured' });
    }

    let query = sb
      .from('person_identity_map')
      .select(`
        person_id,
        full_name,
        email,
        current_position,
        current_company,
        sector,
        engagement_priority,
        indigenous_affiliation,
        notion_person_id,
        created_at,
        contact_intelligence_scores (
          composite_score,
          influence_score,
          accessibility_score,
          strategic_value_score
        ),
        contact_interactions (
          metadata,
          interaction_type
        )
      `)
      .not('email', 'is', null)
      .order('created_at', { ascending: false });

    // Apply filters
    if (tier) {
      query = query.eq('engagement_priority', tier);
    }

    if (sector) {
      query = query.eq('sector', sector);
    }

    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,current_company.ilike.%${search}%`);
    }

    // Pagination
    query = query.range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    // Transform contacts to extract project_id from metadata
    const transformedContacts = data.map(contact => {
      const interactions = (contact.contact_interactions || []).map(i => ({
        project_id: i.metadata?.project_id || null,
        interaction_type: i.interaction_type
      })).filter(i => i.project_id);

      return {
        ...contact,
        contact_interactions: interactions
      };
    });

    // Get all unique project IDs
    const allProjectIds = [...new Set(
      transformedContacts.flatMap(c =>
        c.contact_interactions.map(i => i.project_id)
      )
    )];

    // Fetch project names
    const projectNames = await getProjectNames(allProjectIds);

    // Add project names to interactions
    const contactsWithNames = transformedContacts.map(contact => ({
      ...contact,
      contact_interactions: contact.contact_interactions.map(i => ({
        ...i,
        project_name: projectNames[i.project_id] || 'Unknown Project'
      }))
    }));

    res.json({
      success: true,
      contacts: contactsWithNames,
      count: contactsWithNames.length,
      total: count
    });
  } catch (error) {
    console.error('Error fetching contacts:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/contact-intelligence/contact/:id
 * Get detailed contact information
 */
router.get('/contact/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const sb = getSupabase();
    if (!sb) {
      return res.status(503).json({ success: false, error: 'Supabase not configured' });
    }

    // Get contact details
    const { data: contact, error: contactError } = await sb
      .from('person_identity_map')
      .select(`
        *,
        contact_intelligence_scores (*),
        contact_interactions (
          interaction_type,
          interaction_date,
          subject,
          description,
          outcome
        )
      `)
      .eq('person_id', id)
      .single();

    if (contactError) throw contactError;

    // Get project connections
    const { data: projects, error: projectsError } = await sb
      .from('linkedin_project_connections')
      .select(`
        project_name,
        connection_type,
        relevance_score,
        contact_status
      `)
      .eq('contact_id', id);

    if (projectsError) throw projectsError;

    res.json({
      success: true,
      contact: {
        ...contact,
        projects: projects || []
      }
    });
  } catch (error) {
    console.error('Error fetching contact details:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/contact-intelligence/promote/:id
 * Promote contact to Notion
 */
router.post('/promote/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { projectId } = req.body;

    // Import strategicContactService
    const strategicContactService = req.app.locals.strategicContactService;

    if (!strategicContactService) {
      return res.status(500).json({
        success: false,
        error: 'Strategic contact service not available'
      });
    }

    const result = await strategicContactService.promoteToNotion(id, projectId);

    res.json({
      success: true,
      result
    });
  } catch (error) {
    console.error('Error promoting contact:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/contact-intelligence/newsletter-segments
 * Get newsletter audience segments
 */
router.get('/newsletter-segments', async (req, res) => {
  try {
    const { tier } = req.query;

    const sb = getSupabase();
    if (!sb) {
      return res.status(503).json({ success: false, error: 'Supabase not configured' });
    }

    let query = sb
      .from('vw_newsletter_segments')
      .select('*');

    if (tier) {
      query = query.eq('engagement_priority', tier);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Group by newsletter type
    const segments = data.reduce((acc, contact) => {
      const type = contact.newsletter_type;
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(contact);
      return acc;
    }, {});

    res.json({
      success: true,
      segments,
      total: data.length
    });
  } catch (error) {
    console.error('Error fetching newsletter segments:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/contact-intelligence/run-gmail-discovery
 * Trigger Gmail discovery for a project
 */
router.post('/run-gmail-discovery', async (req, res) => {
  try {
    const { projectId, projectName, lookbackDays = 365 } = req.body;

    if (!projectId || !projectName) {
      return res.status(400).json({
        success: false,
        error: 'projectId and projectName are required'
      });
    }

    // This would trigger the Gmail discovery script
    // For now, return a message that it needs to be run manually
    res.json({
      success: true,
      message: 'Gmail discovery needs to be run manually via script',
      command: `node scripts/gmail-discover-strategic.mjs "${projectName}" "${projectId}" ${lookbackDays}`
    });
  } catch (error) {
    console.error('Error triggering Gmail discovery:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/contact-intelligence/network-stats
 * Get complete network statistics (LinkedIn + Gmail + Project Links)
 */
router.get('/network-stats', async (req, res) => {
  try {
    const sb = getSupabase();
    if (!sb) {
      return res.status(503).json({ success: false, error: 'Supabase not configured' });
    }

    // Get total contacts
    const { count: totalContacts } = await sb
      .from('person_identity_map')
      .select('*', { count: 'exact', head: true });

    // Get LinkedIn contacts
    const { count: linkedinCount } = await sb
      .from('linkedin_contacts')
      .select('*', { count: 'exact', head: true });

    // Get contacts with email
    const { count: withEmail } = await sb
      .from('person_identity_map')
      .select('*', { count: 'exact', head: true })
      .not('email', 'is', null);

    // Load contact-project links from file
    let linkStats = {
      total_links: 0,
      high_priority: 0,
      medium_priority: 0,
      low_priority: 0
    };

    try {
      const fs = await import('fs');
      const summaryData = JSON.parse(fs.readFileSync('/tmp/improved_contact_project_summary.json', 'utf8'));
      linkStats = summaryData.stats;
    } catch (error) {
      console.warn('Could not load link stats:', error.message);
    }

    res.json({
      success: true,
      stats: {
        total_contacts: totalContacts || 0,
        linkedin_contacts: linkedinCount || 0,
        gmail_contacts: (totalContacts || 0) - (linkedinCount || 0),
        contacts_with_email: withEmail || 0,
        project_links: linkStats.total_links,
        high_priority_links: linkStats.high_priority,
        medium_priority_links: linkStats.medium_priority,
        low_priority_links: linkStats.low_priority
      }
    });
  } catch (error) {
    console.error('Error fetching network stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/contact-intelligence/projects-with-links
 * Get all projects with their contact link counts
 */
router.get('/projects-with-links', async (req, res) => {
  try {
    const sb = getSupabase();
    if (!sb) {
      return res.status(503).json({ success: false, error: 'Supabase not configured' });
    }

    // Get all projects
    const { data: projects, error } = await sb
      .from('projects')
      .select('*')
      .order('name');

    if (error) throw error;

    // Load links from file
    let contactProjectLinks = [];
    try {
      const fs = await import('fs');
      const linksData = JSON.parse(fs.readFileSync('/tmp/improved_contact_project_links.json', 'utf8'));
      contactProjectLinks = linksData;
    } catch (error) {
      console.warn('Could not load contact-project links:', error.message);
    }

    // Group links by project
    const linksByProject = {};
    contactProjectLinks.forEach(link => {
      if (!linksByProject[link.project_id]) {
        linksByProject[link.project_id] = [];
      }
      linksByProject[link.project_id].push(link);
    });

    // Add counts to each project
    const projectsWithCounts = projects.map(project => {
      const links = linksByProject[project.id] || [];
      const highPriority = links.filter(l => l.priority === 'high').length;
      const mediumPriority = links.filter(l => l.priority === 'medium').length;
      const lowPriority = links.filter(l => l.priority === 'low').length;

      return {
        ...project,
        contact_count: links.length,
        high_priority: highPriority,
        medium_priority: mediumPriority,
        low_priority: lowPriority
      };
    });

    res.json({
      success: true,
      projects: projectsWithCounts,
      total: projectsWithCounts.length
    });
  } catch (error) {
    console.error('Error fetching projects with links:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/contact-intelligence/project-contacts/:projectId
 * Get all contacts linked to a specific project
 */
router.get('/project-contacts/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { priority, limit = 100, offset = 0 } = req.query;

    const sb = getSupabase();
    if (!sb) {
      return res.status(503).json({ success: false, error: 'Supabase not configured' });
    }

    // Get project
    const { data: project, error: projectError } = await sb
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (projectError) throw projectError;

    // Load links from file
    let contactProjectLinks = [];
    try {
      const fs = await import('fs');
      const linksData = JSON.parse(fs.readFileSync('/tmp/improved_contact_project_links.json', 'utf8'));
      contactProjectLinks = linksData;
    } catch (error) {
      console.warn('Could not load contact-project links:', error.message);
      return res.json({
        success: true,
        project,
        contacts: [],
        stats: { total_contacts: 0, high_priority: 0, medium_priority: 0, low_priority: 0 }
      });
    }

    // Filter links for this project
    let links = contactProjectLinks.filter(l => l.project_id === projectId);

    // Filter by priority if specified
    if (priority && priority !== 'all') {
      links = links.filter(l => l.priority === priority);
    }

    // Sort by match strength
    links.sort((a, b) => b.match_strength - a.match_strength);

    // Stats
    const stats = {
      total_contacts: links.length,
      high_priority: links.filter(l => l.priority === 'high').length,
      medium_priority: links.filter(l => l.priority === 'medium').length,
      low_priority: links.filter(l => l.priority === 'low').length
    };

    // Paginate
    const paginatedLinks = links.slice(parseInt(offset), parseInt(offset) + parseInt(limit));

    // Get person data
    const personIds = paginatedLinks.map(l => l.person_id);
    const { data: people, error: peopleError } = await sb
      .from('person_identity_map')
      .select('*')
      .in('person_id', personIds);

    if (peopleError) throw peopleError;

    // Merge link data with person data
    const contactsWithLinks = paginatedLinks.map(link => {
      const person = people.find(p => p.person_id === link.person_id) || {};
      return {
        ...person,
        link: {
          match_strength: link.match_strength,
          priority: link.priority,
          match_reasons: link.match_reasons
        }
      };
    });

    res.json({
      success: true,
      project,
      contacts: contactsWithLinks,
      stats,
      pagination: {
        offset: parseInt(offset),
        limit: parseInt(limit),
        total: stats.total_contacts
      }
    });
  } catch (error) {
    console.error('Error fetching project contacts:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
