-- Relationship Intelligence & Outreach Automation schema

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Contact cadence metrics derived from touchpoints
CREATE TABLE IF NOT EXISTS public.contact_cadence_metrics (
  contact_id TEXT PRIMARY KEY,
  last_interaction TIMESTAMPTZ,
  days_since_last INTEGER,
  touchpoints_last_7 INTEGER DEFAULT 0,
  touchpoints_last_30 INTEGER DEFAULT 0,
  touchpoints_last_90 INTEGER DEFAULT 0,
  total_touchpoints INTEGER DEFAULT 0,
  active_sources TEXT[] DEFAULT ARRAY[]::TEXT[],
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project support graph (per project snapshot of supporters & context)
CREATE TABLE IF NOT EXISTS public.project_support_graph (
  project_id UUID PRIMARY KEY,
  notion_project_id TEXT,
  project_name TEXT,
  project_status TEXT,
  urgency_score NUMERIC,
  funding_gap NUMERIC,
  upcoming_milestone DATE,
  supporters JSONB DEFAULT '[]'::JSONB,
  keyword_highlights TEXT[] DEFAULT ARRAY[]::TEXT[],
  last_calculated TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contact-centric recommendations
CREATE TABLE IF NOT EXISTS public.contact_support_recommendations (
  contact_id TEXT PRIMARY KEY,
  recommendations JSONB DEFAULT '[]'::JSONB,
  pinned_count INTEGER DEFAULT 0,
  total_recommendations INTEGER DEFAULT 0,
  last_generated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Outreach task pipeline
CREATE TABLE IF NOT EXISTS public.outreach_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id TEXT,
  project_id UUID,
  project_name TEXT,
  contact_name TEXT,
  status TEXT DEFAULT 'draft', -- draft, ready, scheduled, sent, completed, skipped
  priority TEXT DEFAULT 'normal',
  recommended_channel TEXT, -- email, call, meeting, linkedin
  scheduled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  owner TEXT,
  ai_brief JSONB,
  draft_message TEXT,
  message_metadata JSONB,
  response_status TEXT,
  response_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_outreach_tasks_contact ON public.outreach_tasks(contact_id);
CREATE INDEX IF NOT EXISTS idx_outreach_tasks_project ON public.outreach_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_outreach_tasks_status ON public.outreach_tasks(status);

-- Project health history snapshots
CREATE TABLE IF NOT EXISTS public.project_health_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID,
  notion_project_id TEXT,
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  health_score NUMERIC,
  urgency_score NUMERIC,
  critical_factors TEXT[] DEFAULT ARRAY[]::TEXT[],
  status TEXT,
  notes TEXT,
  raw_payload JSONB
);

CREATE INDEX IF NOT EXISTS idx_project_health_history_project ON public.project_health_history(project_id, recorded_at DESC);

-- Financial summary per project
CREATE TABLE IF NOT EXISTS public.financial_project_summaries (
  project_id UUID PRIMARY KEY,
  notion_project_id TEXT,
  project_name TEXT,
  total_actual NUMERIC DEFAULT 0,
  total_potential NUMERIC DEFAULT 0,
  runway_days INTEGER,
  top_funders JSONB DEFAULT '[]'::JSONB,
  concentration_risk BOOLEAN DEFAULT FALSE,
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger to auto-update updated_at columns
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_contact_cadence_metrics_updated
  BEFORE UPDATE ON public.contact_cadence_metrics
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_project_support_graph_updated
  BEFORE UPDATE ON public.project_support_graph
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_contact_support_recommendations_updated
  BEFORE UPDATE ON public.contact_support_recommendations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_outreach_tasks_updated
  BEFORE UPDATE ON public.outreach_tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Contact support preferences (manual overrides for recommendations)
CREATE TABLE IF NOT EXISTS public.contact_support_preferences (
  contact_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pinned', 'ignored')),
  notes TEXT,
  pinned_rank INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (contact_id, project_id)
);

CREATE TRIGGER trg_contact_support_preferences_updated
  BEFORE UPDATE ON public.contact_support_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_financial_project_summaries_updated
  BEFORE UPDATE ON public.financial_project_summaries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Convenience view for dashboard summaries
CREATE OR REPLACE VIEW public.project_support_overview AS
SELECT 
  psg.project_id,
  psg.project_name,
  psg.project_status,
  psg.urgency_score,
  psg.funding_gap,
  psg.upcoming_milestone,
  jsonb_array_length(psg.supporters) AS supporter_slots,
  fps.total_actual,
  fps.total_potential,
  fps.concentration_risk,
  fps.last_updated AS financial_last_updated
FROM public.project_support_graph psg
LEFT JOIN public.financial_project_summaries fps ON fps.project_id = psg.project_id;
