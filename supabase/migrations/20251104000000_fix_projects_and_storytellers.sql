-- Fix Missing Projects and Storytellers Tables
-- Date: 2025-11-04
-- Purpose: Add projects and storytellers tables that server.js expects

BEGIN;

-- ============================================
-- PART 1: Create projects table with expected schema
-- ============================================

CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notion_id TEXT,
  notion_project_id TEXT,
  name TEXT NOT NULL,
  summary TEXT,
  description TEXT,
  status TEXT,
  organization_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_notion_id ON public.projects(notion_id);
CREATE INDEX IF NOT EXISTS idx_projects_notion_project_id ON public.projects(notion_project_id);
CREATE INDEX IF NOT EXISTS idx_projects_name ON public.projects(name);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);

-- Add unique constraint on notion_id if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'projects_notion_id_unique'
  ) THEN
    ALTER TABLE public.projects ADD CONSTRAINT projects_notion_id_unique UNIQUE (notion_id);
  END IF;
END $$;

-- ============================================
-- PART 2: Create storytellers table
-- ============================================

CREATE TABLE IF NOT EXISTS public.storytellers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  notion_id TEXT,
  full_name TEXT NOT NULL,
  bio TEXT,
  expertise_areas TEXT[] DEFAULT '{}',
  profile_image_url TEXT,
  media_type TEXT,
  consent_given BOOLEAN DEFAULT FALSE,
  consent_date TIMESTAMPTZ,
  consent_expiry TIMESTAMPTZ,
  contact_email TEXT,
  contact_phone TEXT,
  location TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_storytellers_project_id ON public.storytellers(project_id);
CREATE INDEX IF NOT EXISTS idx_storytellers_consent ON public.storytellers(consent_given);
CREATE INDEX IF NOT EXISTS idx_storytellers_name ON public.storytellers(full_name);

-- ============================================
-- PART 3: Create updated_at triggers
-- ============================================

-- Function already exists from previous migration, but create if not
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_projects_updated') THEN
    CREATE TRIGGER trg_projects_updated
      BEFORE UPDATE ON public.projects
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_storytellers_updated') THEN
    CREATE TRIGGER trg_storytellers_updated
      BEFORE UPDATE ON public.storytellers
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- ============================================
-- PART 4: Enable Row Level Security (RLS)
-- ============================================

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storytellers ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
DROP POLICY IF EXISTS "Service role has full access to projects" ON public.projects;
CREATE POLICY "Service role has full access to projects" ON public.projects
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role has full access to storytellers" ON public.storytellers;
CREATE POLICY "Service role has full access to storytellers" ON public.storytellers
  FOR ALL USING (true) WITH CHECK (true);

-- Allow authenticated users to read
DROP POLICY IF EXISTS "Authenticated users can read projects" ON public.projects;
CREATE POLICY "Authenticated users can read projects" ON public.projects
  FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

DROP POLICY IF EXISTS "Authenticated users can read storytellers with consent" ON public.storytellers;
CREATE POLICY "Authenticated users can read storytellers with consent" ON public.storytellers
  FOR SELECT USING (
    (auth.role() = 'authenticated' OR auth.role() = 'service_role')
    AND consent_given = true
  );

-- ============================================
-- PART 5: Sync existing data from notion_projects if available
-- ============================================

-- Only sync if notion_projects exists and has data
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notion_projects') THEN
    -- Insert projects from notion_projects if not already present
    INSERT INTO public.projects (notion_id, notion_project_id, name, summary, status, created_at)
    SELECT
      np.notion_id,
      np.notion_id as notion_project_id,
      COALESCE(np.name, 'Untitled Project') as name,
      COALESCE(np.data->>'summary', np.data->>'description', '') as summary,
      COALESCE(np.data->>'status', 'Active') as status,
      np.created_at
    FROM notion_projects np
    WHERE NOT EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.notion_id = np.notion_id
    );

    RAISE NOTICE 'Synced projects from notion_projects table';
  END IF;
END $$;

COMMIT;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Migration complete: projects and storytellers tables created';
  RAISE NOTICE '   - projects table ready with summary column';
  RAISE NOTICE '   - storytellers table ready with consent tracking';
  RAISE NOTICE '   - RLS policies enabled for security';
END $$;
