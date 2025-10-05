import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Load environment variables FIRST - from project root like stable server
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '../../.env');
config({ path: envPath });

// Now import modules that need env vars
import express from 'express';
import SupabaseNotionSync from './core/src/services/supabaseNotionSync.js';

const router = express.Router();
const app = express();

app.use(express.json());
app.use(express.static('public'));

// Initialize sync service
const sync = new SupabaseNotionSync();
await sync.initialize();

console.log('✅ Intelligence Briefing API initialized');

// Daily briefing endpoint
app.get('/api/intelligence/briefing/daily', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get ALL contact cadence metrics (not just 100)
    const cadenceMetrics = await sync.getContactCadenceMetrics({ limit: 1000 });

    // Get Notion people
    const notionPeople = await sync.getAllNotionPeople();

    // Match contacts
    const matches = await sync.matchContactsByEmail(cadenceMetrics, notionPeople);

    // Calculate due today
    const dueToday = matches.filter(match => {
      const nextDue = sync.calculateNextContactDue(match.supabaseContact);
      if (!nextDue) return false;
      const dueDate = new Date(nextDue);
      return dueDate <= today;
    });

    // Calculate overdue
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const overdue = matches.filter(match => {
      const nextDue = sync.calculateNextContactDue(match.supabaseContact);
      if (!nextDue) return false;
      const dueDate = new Date(nextDue);
      return dueDate < today;
    });

    // Calculate upcoming (next 7 days)
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const upcoming = matches.filter(match => {
      const nextDue = sync.calculateNextContactDue(match.supabaseContact);
      if (!nextDue) return false;
      const dueDate = new Date(nextDue);
      return dueDate > today && dueDate <= nextWeek;
    });

    res.json({
      generated_at: new Date().toISOString(),
      metrics: {
        total_active_relationships: matches.length,
        due_today: dueToday.length,
        overdue: overdue.length,
        upcoming_this_week: upcoming.length,
        total_contacts: cadenceMetrics.length
      },
      priority_outreach: dueToday.map(m => ({
        name: m.notionPerson.name,
        email: m.notionPerson.email,
        company: m.supabaseContact.current_company || 'Unknown',
        position: m.supabaseContact.current_position || 'Unknown',
        last_contact: m.supabaseContact.last_interaction,
        days_since_contact: m.supabaseContact.days_since_interaction,
        cadence_days: m.supabaseContact.interaction_cadence_days,
        next_due: sync.calculateNextContactDue(m.supabaseContact)
      })),
      overdue_contacts: overdue.map(m => ({
        name: m.notionPerson.name,
        email: m.notionPerson.email,
        company: m.supabaseContact.current_company || 'Unknown',
        last_contact: m.supabaseContact.last_interaction,
        days_overdue: Math.floor((today - new Date(sync.calculateNextContactDue(m.supabaseContact))) / (1000 * 60 * 60 * 24))
      })),
      upcoming_contacts: upcoming.map(m => ({
        name: m.notionPerson.name,
        email: m.notionPerson.email,
        company: m.supabaseContact.current_company || 'Unknown',
        next_due: sync.calculateNextContactDue(m.supabaseContact),
        days_until_due: Math.floor((new Date(sync.calculateNextContactDue(m.supabaseContact)) - today) / (1000 * 60 * 60 * 24))
      }))
    });
  } catch (error) {
    console.error('Error generating daily briefing:', error);
    res.status(500).json({
      error: 'Failed to generate briefing',
      message: error.message
    });
  }
});

// Project network endpoint
app.get('/api/intelligence/projects/network', async (req, res) => {
  try {
    const { data: projects, error } = await sync.supabase
      .from('project_support_graph')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      total_projects: projects.length,
      projects: projects.map(p => ({
        project_name: p.project_name,
        total_supporters: p.supporter_count || 0,
        key_supporters: p.top_supporters || [],
        collaboration_score: p.network_strength || 0,
        created_at: p.created_at
      }))
    });
  } catch (error) {
    console.error('Error fetching project network:', error);
    res.status(500).json({
      error: 'Failed to fetch project network',
      message: error.message
    });
  }
});

const PORT = process.env.INTELLIGENCE_API_PORT || 4001;
app.listen(PORT, () => {
  console.log(`🧠 Intelligence Briefing API running on http://localhost:${PORT}`);
  console.log(`📊 Daily briefing: http://localhost:${PORT}/api/intelligence/briefing/daily`);
  console.log(`🌐 Project network: http://localhost:${PORT}/api/intelligence/projects/network`);
  console.log(`📱 Dashboard: http://localhost:${PORT}/intelligence-dashboard.html`);
});
