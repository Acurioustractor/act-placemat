-- Create table for storing enriched contact intelligence insights (e.g., LinkedIn context)
CREATE TABLE IF NOT EXISTS public.contact_intelligence_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'linkedin',
  headline TEXT,
  current_company TEXT,
  "current_role" TEXT,
  last_post_title TEXT,
  last_post_url TEXT,
  last_post_published_at TIMESTAMPTZ,
  highlights JSONB DEFAULT '[]'::jsonb,
  enriched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contact_intelligence_insights_contact ON public.contact_intelligence_insights(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_intelligence_insights_enriched ON public.contact_intelligence_insights(enriched_at DESC);

CREATE TRIGGER trg_contact_intelligence_insights_updated
  BEFORE UPDATE ON public.contact_intelligence_insights
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
