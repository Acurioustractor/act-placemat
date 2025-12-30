import express from 'express';

export default function intelligenceLayerRoutes(app, supabaseClient) {
  const router = express.Router();

  if (!supabaseClient) {
    router.use((req, res) => {
      res.status(503).json({ error: 'Supabase client unavailable' });
    });
    app.use('/api/intelligence', router);
    return;
  }

  router.get('/briefings', async (req, res) => {
    const { data, error } = await supabaseClient
      .from('intelligence_briefings')
      .select('*')
      .order('generated_at', { ascending: false })
      .limit(20);

    if (error) {
      return res.status(500).json({ error: error.message });
    }
    res.json({ success: true, count: data.length, items: data });
  });

  router.post('/briefings', async (req, res) => {
    const payload = {
      summary: req.body.summary,
      highlights: req.body.highlights || [],
      metrics: req.body.metrics || {},
      created_by: req.body.created_by || 'synthesis-agent',
      metadata: req.body.metadata || {},
    };

    if (!payload.summary) {
      return res.status(400).json({ error: 'summary is required' });
    }

    const { data, error } = await supabaseClient.from('intelligence_briefings').insert(payload).select().single();
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    res.status(201).json({ success: true, item: data });
  });

  router.get('/geo-alerts', async (req, res) => {
    const { data, error } = await supabaseClient
      .from('intelligence_geo_alerts')
      .select('*')
      .order('triggered_at', { ascending: false })
      .limit(50);
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    res.json({ success: true, count: data.length, items: data });
  });

  router.post('/geo-alerts', async (req, res) => {
    const payload = {
      region: req.body.region,
      stage: req.body.stage,
      severity: req.body.severity || 'medium',
      projects: req.body.projects || [],
      recommendation: req.body.recommendation,
      metadata: req.body.metadata || {},
    };
    if (!payload.region) {
      return res.status(400).json({ error: 'region is required' });
    }
    const { data, error } = await supabaseClient.from('intelligence_geo_alerts').insert(payload).select().single();
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    res.status(201).json({ success: true, item: data });
  });

  router.get('/project-pairings', async (req, res) => {
    const projectId = req.query.project_id;
    let query = supabaseClient.from('project_pairings').select('*').order('created_at', { ascending: false }).limit(100);
    if (projectId) {
      query = query.or(`project_id.eq.${projectId},partner_project_id.eq.${projectId}`);
    }
    const { data, error } = await query;
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    res.json({ success: true, count: data.length, items: data });
  });

  router.post('/project-pairings', async (req, res) => {
    const payload = {
      project_id: req.body.project_id,
      partner_project_id: req.body.partner_project_id,
      reason: req.body.reason,
      similarity: req.body.similarity,
      metadata: req.body.metadata || {},
    };
    if (!payload.project_id || !payload.partner_project_id) {
      return res.status(400).json({ error: 'project_id and partner_project_id are required' });
    }
    const { data, error } = await supabaseClient.from('project_pairings').insert(payload).select().single();
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    res.status(201).json({ success: true, item: data });
  });

  router.get('/project-research/:projectId', async (req, res) => {
    const { projectId } = req.params;
    const { data, error } = await supabaseClient
      .from('project_research')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    res.json({ success: true, count: data.length, items: data });
  });

  router.post('/project-research', async (req, res) => {
    const payload = {
      project_id: req.body.project_id,
      source: req.body.source,
      url: req.body.url,
      summary: req.body.summary,
      metadata: req.body.metadata || {},
    };
    if (!payload.project_id || !payload.source) {
      return res.status(400).json({ error: 'project_id and source are required' });
    }
    const { data, error } = await supabaseClient.from('project_research').insert(payload).select().single();
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    res.status(201).json({ success: true, item: data });
  });

  router.get('/refusals', async (req, res) => {
    const { data, error } = await supabaseClient
      .from('intelligence_refusals')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    res.json({ success: true, count: data.length, items: data });
  });

  router.post('/refusals', async (req, res) => {
    const payload = {
      agent: req.body.agent,
      prompt: req.body.prompt,
      reason: req.body.reason,
      metadata: req.body.metadata || {},
    };

    if (!payload.agent || !payload.prompt || !payload.reason) {
      return res.status(400).json({ error: 'agent, prompt, and reason are required' });
    }

    const { data, error } = await supabaseClient.from('intelligence_refusals').insert(payload).select().single();
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    res.status(201).json({ success: true, item: data });
  });

  app.use('/api/intelligence', router);
}
