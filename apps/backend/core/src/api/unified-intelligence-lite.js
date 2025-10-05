import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export function setupUnifiedIntelligenceLite(app) {
  console.log('🧠 Setting up Lite Intelligence endpoints')

  app.get('/api/intelligence/dashboard', async (_req, res) => {
    try {
      const [projects, storytellers, opportunities] = await Promise.all([
        supabase.from('projects').select('id, status').limit(1000),
        supabase.from('storytellers').select('id, consent_given').limit(1000),
        supabase.from('opportunities').select('id, status').limit(1000)
      ])

      const activeProjects = (projects.data || []).filter((p) => p.status === 'active').length
      const consentedStorytellers = (storytellers.data || []).filter((s) => s.consent_given).length
      const openOpportunities = (opportunities.data || []).filter((o) => o.status === 'open').length

      res.json({
        success: true,
        metrics: {
          activeProjects,
          consentedStorytellers,
          openOpportunities
        },
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      res.status(500).json({ error: 'intelligence_failed', message: error.message })
    }
  })

  app.get('/api/intelligence/data-sources', (_req, res) => {
    res.json({
      sources: {
        supabase: { healthy: true },
        notion: { healthy: Boolean(process.env.NOTION_TOKEN) },
        gmail: { healthy: Boolean(process.env.GMAIL_CLIENT_ID && process.env.GMAIL_CLIENT_SECRET) }
      },
      timestamp: new Date().toISOString()
    })
  })
}

export default {
  setupUnifiedIntelligenceLite
};
