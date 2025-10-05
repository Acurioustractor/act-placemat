-- Restore required JSON data columns and metadata for Notion sync tables

-- notion_projects setup
CREATE TABLE IF NOT EXISTS public.notion_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notion_id TEXT UNIQUE,
  name TEXT,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  type TEXT DEFAULT 'projects',
  last_synced TIMESTAMPTZ DEFAULT NOW(),
  sync_version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.notion_projects
  ADD COLUMN IF NOT EXISTS notion_id TEXT,
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS data JSONB,
  ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'projects',
  ADD COLUMN IF NOT EXISTS last_synced TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS sync_version INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

UPDATE public.notion_projects SET data = '{}'::jsonb WHERE data IS NULL;

ALTER TABLE public.notion_projects
  ALTER COLUMN data SET DEFAULT '{}'::jsonb,
  ALTER COLUMN data SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notion_projects_notion_id ON public.notion_projects(notion_id);
CREATE INDEX IF NOT EXISTS idx_notion_projects_last_synced ON public.notion_projects(last_synced DESC);
CREATE INDEX IF NOT EXISTS idx_notion_projects_data_gin ON public.notion_projects USING GIN (data);

-- notion_opportunities setup
CREATE TABLE IF NOT EXISTS public.notion_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notion_id TEXT UNIQUE,
  name TEXT,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  type TEXT DEFAULT 'opportunities',
  last_synced TIMESTAMPTZ DEFAULT NOW(),
  sync_version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.notion_opportunities
  ADD COLUMN IF NOT EXISTS notion_id TEXT,
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS data JSONB,
  ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'opportunities',
  ADD COLUMN IF NOT EXISTS last_synced TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS sync_version INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

UPDATE public.notion_opportunities SET data = '{}'::jsonb WHERE data IS NULL;

ALTER TABLE public.notion_opportunities
  ALTER COLUMN data SET DEFAULT '{}'::jsonb,
  ALTER COLUMN data SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notion_opportunities_notion_id ON public.notion_opportunities(notion_id);
CREATE INDEX IF NOT EXISTS idx_notion_opportunities_last_synced ON public.notion_opportunities(last_synced DESC);
CREATE INDEX IF NOT EXISTS idx_notion_opportunities_data_gin ON public.notion_opportunities USING GIN (data);

-- notion_organizations setup
CREATE TABLE IF NOT EXISTS public.notion_organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notion_id TEXT UNIQUE,
  name TEXT,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  type TEXT DEFAULT 'organizations',
  last_synced TIMESTAMPTZ DEFAULT NOW(),
  sync_version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.notion_organizations
  ADD COLUMN IF NOT EXISTS notion_id TEXT,
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS data JSONB,
  ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'organizations',
  ADD COLUMN IF NOT EXISTS last_synced TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS sync_version INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

UPDATE public.notion_organizations SET data = '{}'::jsonb WHERE data IS NULL;

ALTER TABLE public.notion_organizations
  ALTER COLUMN data SET DEFAULT '{}'::jsonb,
  ALTER COLUMN data SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notion_organizations_notion_id ON public.notion_organizations(notion_id);
CREATE INDEX IF NOT EXISTS idx_notion_organizations_last_synced ON public.notion_organizations(last_synced DESC);
CREATE INDEX IF NOT EXISTS idx_notion_organizations_data_gin ON public.notion_organizations USING GIN (data);

-- Ensure updated_at triggers are present
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_notion_projects_updated') THEN
    CREATE TRIGGER trg_notion_projects_updated
      BEFORE UPDATE ON public.notion_projects
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_notion_opportunities_updated') THEN
    CREATE TRIGGER trg_notion_opportunities_updated
      BEFORE UPDATE ON public.notion_opportunities
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_notion_organizations_updated') THEN
    CREATE TRIGGER trg_notion_organizations_updated
      BEFORE UPDATE ON public.notion_organizations
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;
