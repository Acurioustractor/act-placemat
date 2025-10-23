/**
 * Morning Brief API - Daily Intelligence Digest
 *
 * Features:
 * - Priority actions from calendar and tasks
 * - Upcoming opportunities and deadlines
 * - Relationship health alerts
 * - Today's schedule
 *
 * Data Sources:
 * - Google Calendar (meetings, events)
 * - Notion (opportunities, projects)
 * - Supabase (contacts, relationships)
 * - Gmail (communication patterns)
 */

import { createClient } from '@supabase/supabase-js';
import { Client } from '@notionhq/client';
import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize clients
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const notion = NOTION_TOKEN ? new Client({ auth: NOTION_TOKEN }) : null;
const OPPORTUNITIES_DB = process.env.NOTION_OPPORTUNITIES_DATABASE_ID;
const PROJECTS_DB = process.env.NOTION_PROJECTS_DATABASE_ID || '177ebcf981cf80dd9514f1ec32f3314c';

// Initialize Google Calendar and Gmail
let calendar = null;
let gmail = null;
try {
  const GMAIL_CLIENT_ID = process.env.GMAIL_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
  const GMAIL_CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;
  // Fixed: Token file is in apps/backend/, not project root
  const TOKEN_PATH = path.join(__dirname, '../../.gmail_tokens.json');

  console.log(`🔍 Looking for Gmail tokens at: ${TOKEN_PATH}`);
  console.log(`   File exists: ${fs.existsSync(TOKEN_PATH)}`);

  if (GMAIL_CLIENT_ID && GMAIL_CLIENT_SECRET && fs.existsSync(TOKEN_PATH)) {
    const tokens = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
    const oauth2Client = new google.auth.OAuth2(
      GMAIL_CLIENT_ID,
      GMAIL_CLIENT_SECRET,
      'http://localhost:4000/auth/google/callback'
    );
    oauth2Client.setCredentials(tokens);
    calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    console.log('✅ Google Calendar and Gmail clients initialized');
  } else {
    console.log('⚠️  Google APIs not configured (missing credentials or token file)');
  }
} catch (error) {
  console.log('⚠️  Google APIs error:', error.message);
}

// Cache for morning brief (30 minute TTL - refreshes every half hour)
let briefCache = {
  data: null,
  lastFetch: 0,
  ttl: 30 * 60 * 1000 // 30 minutes
};

/**
 * Get upcoming opportunities with deadlines
 */
async function getUpcomingOpportunities() {
  try {
    // Try to fetch from Notion opportunities database
    if (notion && OPPORTUNITIES_DB) {
      const response = await notion.databases.query({
        database_id: OPPORTUNITIES_DB,
        filter: {
          property: 'Status',
          status: {
            does_not_equal: 'Closed'
          }
        },
        sorts: [
          {
            property: 'Deadline',
            direction: 'ascending'
          }
        ],
        page_size: 5
      });

      return response.results.map(page => ({
        title: page.properties.Name?.title?.[0]?.plain_text || 'Untitled',
        source: page.properties.Source?.select?.name || 'Unknown',
        deadline: page.properties.Deadline?.date?.start || null,
        match_score: page.properties['Match Score']?.number || null
      }));
    }

    return [];
  } catch (error) {
    console.error('Error fetching opportunities:', error.message);
    return [];
  }
}

/**
 * Get active projects requiring attention
 */
async function getPriorityProjects() {
  if (!notion || !PROJECTS_DB) {
    console.log('⚠️  Notion client or database ID not configured');
    return [];
  }

  try {
    // Query without filters first - Notion projects don't have a consistent Status property
    const response = await notion.databases.query({
      database_id: PROJECTS_DB,
      sorts: [
        {
          property: 'Last edited time',
          direction: 'descending'
        }
      ],
      page_size: 3
    });

    return response.results.map(page => {
      const title = page.properties.Name?.title?.[0]?.plain_text || 'Untitled';
      const lastEdited = new Date(page.last_edited_time);
      const daysAgo = Math.floor((Date.now() - lastEdited.getTime()) / (1000 * 60 * 60 * 24));

      return {
        type: 'project_update',
        title: `Check in on ${title}`,
        description: `Last updated ${daysAgo} days ago - may need attention`,
        urgency: daysAgo > 7 ? 'high' : 'medium'
      };
    });
  } catch (error) {
    console.error('Error fetching priority projects:', error.message);
    return [];
  }
}

/**
 * Get today's calendar events from Google Calendar
 */
async function getTodaysCalendar() {
  if (!calendar) return [];

  try {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: startOfDay.toISOString(),
      timeMax: endOfDay.toISOString(),
      maxResults: 10,
      singleEvents: true,
      orderBy: 'startTime'
    });

    const events = response.data.items || [];

    return events.map(event => ({
      id: event.id,
      title: event.summary || 'Untitled Event',
      start: event.start.dateTime || event.start.date,
      end: event.end.dateTime || event.end.date,
      location: event.location || null,
      attendees: event.attendees?.length || 0,
      link: event.hangoutLink || event.htmlLink
    }));
  } catch (error) {
    console.error('Error fetching calendar events:', error.message);
    return [];
  }
}

/**
 * Get communication insights from Gmail
 */
async function getGmailCommunicationInsights() {
  if (!gmail) return { unanswered_emails: [], recent_threads: 0 };

  try {
    // Get messages from the last 7 days that need response
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const after = Math.floor(sevenDaysAgo.getTime() / 1000);

    const response = await gmail.users.messages.list({
      userId: 'me',
      q: `is:inbox -from:me after:${after}`,
      maxResults: 10
    });

    const messages = response.data.messages || [];

    // Get details for each message
    const unansweredEmails = await Promise.all(
      messages.slice(0, 5).map(async (msg) => {
        try {
          const detail = await gmail.users.messages.get({
            userId: 'me',
            id: msg.id,
            format: 'metadata',
            metadataHeaders: ['From', 'Subject', 'Date']
          });

          const headers = detail.data.payload.headers;
          const from = headers.find(h => h.name === 'From')?.value || 'Unknown';
          const subject = headers.find(h => h.name === 'Subject')?.value || 'No Subject';
          const date = headers.find(h => h.name === 'Date')?.value;

          return {
            from: from.replace(/<.*>/, '').trim(),
            subject,
            date: date ? new Date(date).toLocaleDateString() : 'Unknown',
            threadId: msg.threadId
          };
        } catch (err) {
          console.error('Error fetching email details:', err.message);
          return null;
        }
      })
    );

    return {
      unanswered_emails: unansweredEmails.filter(e => e !== null),
      recent_threads: messages.length
    };
  } catch (error) {
    console.error('Error fetching Gmail insights:', error.message);
    return { unanswered_emails: [], recent_threads: 0 };
  }
}

/**
 * Get relationship alerts (contacts not contacted recently)
 */
async function getRelationshipAlerts() {
  if (!supabase) return [];

  try {
    // Get contacts with email but no recent contact
    // In a real implementation, you'd track last contact date
    const { data, error } = await supabase
      .from('linkedin_contacts')
      .select('id, full_name, email_address, current_company')
      .not('email_address', 'is', null)
      .limit(10); // Get extra to account for filtering

    if (error) throw error;

    // Filter out contacts with invalid names and map to alerts
    return (data || [])
      .filter(contact => {
        const name = (contact.full_name || '').trim();
        return name.length >= 3 && /[a-zA-Z]/.test(name);
      })
      .slice(0, 3) // Take top 3 after filtering
      .map(contact => ({
        contact_name: contact.full_name,
        last_contact: '2025-08-15', // Placeholder - would come from Gmail analysis
        days_since: 51, // Placeholder
        suggested_action: `Quick check-in about ${contact.current_company || 'recent projects'}`
      }));
  } catch (error) {
    console.error('Error fetching relationship alerts:', error.message);
    return [];
  }
}

/**
 * Generate morning brief
 */
async function generateMorningBrief() {
  const now = Date.now();

  // Return cached data if valid
  if (briefCache.data && (now - briefCache.lastFetch) < briefCache.ttl) {
    console.log('📋 Returning cached morning brief');
    return briefCache.data;
  }

  try {
    console.log('📋 Generating morning brief...');

    const [opportunities, priorityProjects, relationshipAlerts, calendarEvents, gmailInsights] = await Promise.all([
      getUpcomingOpportunities(),
      getPriorityProjects(),
      getRelationshipAlerts(),
      getTodaysCalendar(),
      getGmailCommunicationInsights()
    ]);

    const brief = {
      date: new Date().toLocaleDateString('en-AU', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      greeting: `Good morning, Ben! 🌅`,
      priority_actions: [
        ...priorityProjects,
        // Add opportunity deadline reminders
        ...opportunities
          .filter(opp => opp.deadline)
          .map(opp => {
            const deadline = new Date(opp.deadline);
            const daysUntil = Math.ceil((deadline - Date.now()) / (1000 * 60 * 60 * 24));

            return {
              type: 'grant',
              title: `${opp.title} - Due ${daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `in ${daysUntil} days`}`,
              description: `${opp.source}${opp.match_score ? ` - ${opp.match_score}% match` : ''}`,
              urgency: daysUntil <= 1 ? 'high' : daysUntil <= 7 ? 'medium' : 'low'
            };
          })
      ].slice(0, 5), // Top 5 priorities
      opportunities: opportunities.slice(0, 3),
      relationship_alerts: relationshipAlerts,
      calendar_today: calendarEvents,
      communication_insights: gmailInsights
    };

    // Update cache
    briefCache.data = brief;
    briefCache.lastFetch = now;

    console.log(`✅ Morning brief generated: ${brief.priority_actions.length} actions, ${brief.opportunities.length} opportunities`);
    return brief;

  } catch (error) {
    console.error('❌ Error generating morning brief:', error);
    throw error;
  }
}

/**
 * Register routes
 */
export default function registerMorningBriefRoutes(app) {
  // Get morning brief
  app.get('/api/intelligence/morning-brief', async (req, res) => {
    try {
      const brief = await generateMorningBrief();
      res.json(brief);
    } catch (error) {
      console.error('Error getting morning brief:', error);
      res.status(500).json({
        error: 'Failed to generate morning brief',
        message: error.message
      });
    }
  });

  // Refresh morning brief (clears cache)
  app.post('/api/intelligence/morning-brief/refresh', async (req, res) => {
    try {
      briefCache.data = null;
      briefCache.lastFetch = 0;

      const brief = await generateMorningBrief();
      res.json({
        success: true,
        brief
      });
    } catch (error) {
      console.error('Error refreshing morning brief:', error);
      res.status(500).json({
        error: 'Failed to refresh morning brief',
        message: error.message
      });
    }
  });

  console.log('✅ Morning Brief API routes registered');
}
