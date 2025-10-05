-- Align relationship intelligence tables with text-based contact identifiers and add support preferences map

-- Recreate contact cadence metrics with text contact IDs
DROP TABLE IF EXISTS public.contact_cadence_metrics;
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

-- Recreate contact support recommendations with text contact IDs
DROP TABLE IF EXISTS public.contact_support_recommendations;
CREATE TABLE IF NOT EXISTS public.contact_support_recommendations (
  contact_id TEXT PRIMARY KEY,
  recommendations JSONB DEFAULT '[]'::JSONB,
  pinned_count INTEGER DEFAULT 0,
  total_recommendations INTEGER DEFAULT 0,
  last_generated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recreate contact support preferences (overrides)
DROP TABLE IF EXISTS public.contact_support_preferences;
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

-- Rebuild outreach tasks with text contact IDs (project_id left untouched)
DROP TABLE IF EXISTS public.outreach_tasks;
CREATE TABLE IF NOT EXISTS public.outreach_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id TEXT,
  project_id UUID,
  project_name TEXT,
  contact_name TEXT,
  status TEXT DEFAULT 'draft',
  priority TEXT DEFAULT 'normal',
  recommended_channel TEXT,
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

-- Ensure updated_at triggers exist
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

CREATE TRIGGER trg_contact_support_recommendations_updated
  BEFORE UPDATE ON public.contact_support_recommendations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_contact_support_preferences_updated
  BEFORE UPDATE ON public.contact_support_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_outreach_tasks_updated
  BEFORE UPDATE ON public.outreach_tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
