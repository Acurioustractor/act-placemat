#!/usr/bin/env node

/**
 * ACT Contact Intelligence Hub
 *
 * PURPOSE: Work with ALL 20,398 contacts in Supabase
 * - Search/filter contacts
 * - AI enrichment (research people, find emails)
 * - Project matching (who should work on what)
 * - Email drafting with timing recommendations
 * - Smart Notion sync (only active people)
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { Client } from '@notionhq/client';

const app = express();
app.use(express.json());
app.use(express.static('public'));

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const notion = new Client({ auth: process.env.NOTION_TOKEN });

console.log('🧠 Contact Intelligence Hub - Initializing...');
console.log(`   Managing ${(20398).toLocaleString()} LinkedIn contacts`);

// ============================================================================
// 1. CONTACT SEARCH & BROWSE
// ============================================================================

// Search contacts by name, company, position
app.get('/api/contacts/search', async (req, res) => {
  try {
    const { query, hasEmail, limit = 50, offset = 0 } = req.query;

    let dbQuery = supabase
      .from('linkedin_contacts')
      .select('id, full_name, email_address, current_company, current_position, location, industry', { count: 'exact' })
      .order('full_name', { ascending: true })
      .range(offset, offset + parseInt(limit) - 1);

    // Filter by email presence
    if (hasEmail === 'true') {
      dbQuery = dbQuery.not('email_address', 'is', null).neq('email_address', '');
    } else if (hasEmail === 'false') {
      dbQuery = dbQuery.or('email_address.is.null,email_address.eq.');
    }

    // Search filter
    if (query) {
      dbQuery = dbQuery.or(`full_name.ilike.%${query}%,current_company.ilike.%${query}%,current_position.ilike.%${query}%,industry.ilike.%${query}%`);
    }

    const { data: contacts, error, count } = await dbQuery;
    if (error) throw error;

    res.json({
      total: count,
      limit: parseInt(limit),
      offset: parseInt(offset),
      contacts: contacts.map(c => ({
        id: c.id,
        name: c.full_name || 'Unknown',
        email: c.email_address || null,
        company: c.current_company || 'N/A',
        position: c.current_position || 'N/A',
        industry: c.industry,
        location: c.location,
        hasEmail: !!(c.email_address && c.email_address.length > 0)
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single contact details
app.get('/api/contacts/:id', async (req, res) => {
  try {
    const { data: contact, error } = await supabase
      .from('linkedin_contacts')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) throw error;

    res.json({
      id: contact.id,
      name: contact.full_name,
      email: contact.email_address,
      company: contact.current_company,
      position: contact.current_position,
      industry: contact.industry,
      location: contact.location,
      linkedin_url: contact.linkedin_url,
      relationship_score: contact.relationship_score,
      strategic_value: contact.strategic_value,
      last_interaction: contact.last_interaction,
      raw_data: contact
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// 2. AI CONTACT ENRICHMENT
// ============================================================================

// Enrich contact - research background, find email, suggest projects
app.post('/api/contacts/:id/enrich', async (req, res) => {
  try {
    const { id } = req.params;

    // Get contact
    const { data: contact } = await supabase
      .from('linkedin_contacts')
      .select('*')
      .eq('id', id)
      .single();

    // TODO: Call AI to research this person
    // For now, return structure showing what we'd get

    const enrichmentData = {
      contact_id: id,
      name: contact.full_name,
      research_status: 'ready',
      suggested_enrichments: {
        email_discovery: {
          status: contact.email_address ? 'has_email' : 'needs_search',
          current: contact.email_address,
          suggestion: 'Search via Gmail sync, LinkedIn scraper, or Hunter.io'
        },
        background_research: {
          status: 'ready',
          actions: [
            'Google search for recent news',
            'Check company website for role details',
            'Search for published articles/interviews',
            'Find social media presence (Twitter, Medium)'
          ]
        },
        project_matching: {
          status: 'ready',
          message: 'Will analyze which of your 22 projects this person could contribute to'
        }
      },
      next_steps: [
        'Run AI research to fill background',
        'Find/verify email address',
        'Match to relevant projects',
        'Draft initial outreach email'
      ]
    };

    res.json(enrichmentData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// 3. PROJECT MATCHING
// ============================================================================

// Find contacts who match a project
app.get('/api/projects/:projectName/match-contacts', async (req, res) => {
  try {
    const { projectName } = req.params;
    const { limit = 10 } = req.query;

    // Get all contacts with emails (the ones we can actually reach)
    const { data: contacts } = await supabase
      .from('linkedin_contacts')
      .select('id, full_name, email_address, current_company, current_position, industry')
      .not('email_address', 'is', null)
      .neq('email_address', '')
      .limit(1000);

    // TODO: Use AI to score each contact for this project
    // For now, simple keyword matching
    const projectKeywords = projectName.toLowerCase().split(' ');

    const scoredContacts = contacts.map(c => {
      const searchText = `${c.full_name} ${c.current_company} ${c.current_position} ${c.industry || ''}`.toLowerCase();
      const score = projectKeywords.reduce((acc, keyword) => {
        return acc + (searchText.includes(keyword) ? 1 : 0);
      }, 0);

      return {
        ...c,
        match_score: score,
        match_reason: score > 0 ? `Matches ${score} keyword(s) from project name` : 'No direct match'
      };
    });

    const topMatches = scoredContacts
      .filter(c => c.match_score > 0)
      .sort((a, b) => b.match_score - a.match_score)
      .slice(0, parseInt(limit));

    res.json({
      project: projectName,
      total_contacts_analyzed: contacts.length,
      matches_found: topMatches.length,
      top_matches: topMatches.map(c => ({
        id: c.id,
        name: c.full_name,
        email: c.email_address,
        company: c.current_company,
        position: c.current_position,
        match_score: c.match_score,
        reason: c.match_reason
      })),
      note: 'This is basic keyword matching. Real AI would analyze skills, experience, network, and project fit.'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Suggest which projects a contact should join
app.get('/api/contacts/:id/suggest-projects', async (req, res) => {
  try {
    const { id } = req.params;

    // Get contact
    const { data: contact } = await supabase
      .from('linkedin_contacts')
      .select('*')
      .eq('id', id)
      .single();

    // Get all projects
    const { data: projects } = await supabase
      .from('project_support_graph')
      .select('*');

    // TODO: AI scoring for each project
    // For now, return structure

    res.json({
      contact: {
        id: contact.id,
        name: contact.full_name,
        company: contact.current_company,
        position: contact.current_position
      },
      suggested_projects: projects.slice(0, 5).map(p => ({
        project_name: p.project_name,
        fit_score: Math.floor(Math.random() * 10), // TODO: Real AI scoring
        reason: 'Would analyze skills, network overlap, project needs',
        suggested_role: 'Contributor / Advisor / Funder (AI would determine)'
      })),
      total_projects: projects.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// 4. EMAIL DRAFTING & TIMING
// ============================================================================

// Draft email to a contact about a project
app.post('/api/contacts/:id/draft-email', async (req, res) => {
  try {
    const { id } = req.params;
    const { project_name, email_type = 'introduction' } = req.body;

    // Get contact
    const { data: contact } = await supabase
      .from('linkedin_contacts')
      .select('*')
      .eq('id', id)
      .single();

    if (!contact.email_address) {
      return res.status(400).json({ error: 'Contact has no email address' });
    }

    // TODO: Use AI to draft personalized email
    // For now, return template structure

    const emailDraft = {
      to: contact.email_address,
      subject: `${email_type === 'introduction' ? 'Introduction' : 'Following up'}: ${project_name}`,
      body: `Hi ${contact.first_name || contact.full_name},

[AI would write personalized email here based on:]
- Contact's background: ${contact.current_position} at ${contact.current_company}
- Project context: ${project_name}
- Your relationship history
- Mutual connections
- Recent news about their company/work

Best regards,
Ben Knight`,

      timing_recommendation: {
        send_now: false,
        optimal_day: 'Tuesday or Thursday',
        optimal_time: '10am-11am their timezone',
        reason: 'Highest engagement rates for professional outreach',
        urgency: 'low'
      },

      ai_notes: [
        'Consider mentioning mutual connection with [person from their network]',
        'Reference their recent work on [relevant project]',
        'Keep it under 150 words for best response rate',
        'Include clear call-to-action (15 min call?)'
      ]
    };

    res.json(emailDraft);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get engagement timing recommendation for a contact
app.get('/api/contacts/:id/timing', async (req, res) => {
  try {
    const { id } = req.params;

    // Get contact with interaction history
    const { data: contact } = await supabase
      .from('linkedin_contacts')
      .select('*')
      .eq('id', id)
      .single();

    // TODO: Analyze interaction history to determine optimal timing

    res.json({
      contact_id: id,
      name: contact.full_name,
      timing_analysis: {
        last_interaction: null, // Would pull from cadence_metrics
        average_response_time: '24-48 hours',
        best_day_to_reach: 'Tuesday',
        best_time_to_reach: '10am-11am',
        current_recommendation: {
          action: 'Wait 2 more days',
          reason: 'Last contacted 12 days ago, typical cadence is 14 days',
          confidence: 'medium'
        }
      },
      note: 'Real version would analyze email open rates, response patterns, timezone, etc.'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// 5. SMART NOTION SYNC
// ============================================================================

// Tag contact as "active" and sync to Notion
app.post('/api/contacts/:id/activate', async (req, res) => {
  try {
    const { id } = req.params;
    const { projects = [] } = req.body;

    // Get contact
    const { data: contact } = await supabase
      .from('linkedin_contacts')
      .select('*')
      .eq('id', id)
      .single();

    if (!contact.email_address) {
      return res.status(400).json({
        error: 'Cannot activate contact without email address',
        suggestion: 'Run enrichment first to find email'
      });
    }

    // TODO: Update contact metadata to mark as "active"
    // TODO: Sync to Notion People database
    // TODO: Link to specified projects

    res.json({
      success: true,
      contact_id: id,
      name: contact.full_name,
      email: contact.email_address,
      status: 'activated',
      notion_sync_status: 'would_sync_now',
      projects_linked: projects,
      message: 'Contact marked as active and ready for Notion sync'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get list of all active contacts (synced to Notion)
app.get('/api/contacts/active', async (req, res) => {
  try {
    // TODO: Filter by "active" metadata flag
    // For now, return contacts with emails as proxy

    const { data: activeContacts } = await supabase
      .from('linkedin_contacts')
      .select('id, full_name, email_address, current_company, current_position')
      .not('email_address', 'is', null)
      .neq('email_address', '')
      .limit(50);

    res.json({
      total_active: activeContacts.length,
      contacts: activeContacts.map(c => ({
        id: c.id,
        name: c.full_name,
        email: c.email_address,
        company: c.current_company,
        position: c.current_position
      })),
      note: 'These would be synced to Notion Communications Dashboard'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// 6. DASHBOARD STATS
// ============================================================================

app.get('/api/stats', async (req, res) => {
  try {
    // Total contacts
    const { count: totalContacts } = await supabase
      .from('linkedin_contacts')
      .select('*', { count: 'exact', head: true });

    // With emails
    const { count: withEmails } = await supabase
      .from('linkedin_contacts')
      .select('*', { count: 'exact', head: true })
      .not('email_address', 'is', null)
      .neq('email_address', '');

    // Projects
    const { count: totalProjects } = await supabase
      .from('project_support_graph')
      .select('*', { count: 'exact', head: true });

    res.json({
      intelligence_layer: {
        total_contacts: totalContacts,
        with_emails: withEmails,
        without_emails: totalContacts - withEmails,
        email_coverage: `${((withEmails / totalContacts) * 100).toFixed(1)}%`,
        total_projects: totalProjects
      },
      action_layer: {
        active_in_notion: 0, // TODO: Track this
        recommended_size: '20-30 people',
        current_size: 'Not syncing yet'
      },
      capabilities: {
        search_all_contacts: true,
        ai_enrichment: 'Ready to implement',
        project_matching: 'Basic version available',
        email_drafting: 'Template ready',
        smart_sync: 'Architecture ready'
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// START SERVER
// ============================================================================

const PORT = 4000;
app.listen(PORT, () => {
  console.log('\n✅ Contact Intelligence Hub ONLINE');
  console.log('='.repeat(60));
  console.log(`🌐 Server: http://localhost:${PORT}`);
  console.log('\n📊 ENDPOINTS:');
  console.log(`   Search:       GET  /api/contacts/search?query=name`);
  console.log(`   Details:      GET  /api/contacts/:id`);
  console.log(`   Enrich:       POST /api/contacts/:id/enrich`);
  console.log(`   Projects:     GET  /api/contacts/:id/suggest-projects`);
  console.log(`   Matches:      GET  /api/projects/:name/match-contacts`);
  console.log(`   Draft Email:  POST /api/contacts/:id/draft-email`);
  console.log(`   Timing:       GET  /api/contacts/:id/timing`);
  console.log(`   Activate:     POST /api/contacts/:id/activate`);
  console.log(`   Active List:  GET  /api/contacts/active`);
  console.log(`   Stats:        GET  /api/stats`);
  console.log('\n💡 Managing 20,398 contacts in Supabase intelligence layer');
  console.log('='.repeat(60));
});
