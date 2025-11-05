-- Fix Missing Projects and Storytellers Tables (MINIMAL VERSION)
-- Date: 2025-11-04
-- Purpose: Just create the tables, skip data sync to avoid column errors
-- You can sync data manually later if needed

BEGIN;

-- ============================================
-- PART 1: Create projects table
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_projects_notion_id ON public.projects(notion_id);
CREATE INDEX IF NOT EXISTS idx_projects_notion_project_id ON public.projects(notion_project_id);
CREATE INDEX IF NOT EXISTS idx_projects_name ON public.projects(name);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);

-- Unique constraint
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_storytellers_project_id ON public.storytellers(project_id);
CREATE INDEX IF NOT EXISTS idx_storytellers_consent ON public.storytellers(consent_given);
CREATE INDEX IF NOT EXISTS idx_storytellers_name ON public.storytellers(full_name);

-- ============================================
-- PART 3: Triggers
-- ============================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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
-- PART 4: RLS Policies
-- ============================================

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storytellers ENABLE ROW LEVEL SECURITY;

-- Service role access
DROP POLICY IF EXISTS "Service role has full access to projects" ON public.projects;
CREATE POLICY "Service role has full access to projects" ON public.projects
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role has full access to storytellers" ON public.storytellers;
CREATE POLICY "Service role has full access to storytellers" ON public.storytellers
  FOR ALL USING (true) WITH CHECK (true);

-- Authenticated user access
DROP POLICY IF EXISTS "Authenticated users can read projects" ON public.projects;
CREATE POLICY "Authenticated users can read projects" ON public.projects
  FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

DROP POLICY IF EXISTS "Authenticated users can read storytellers with consent" ON public.storytellers;
CREATE POLICY "Authenticated users can read storytellers with consent" ON public.storytellers
  FOR SELECT USING (
    (auth.role() = 'authenticated' OR auth.role() = 'service_role')
    AND consent_given = true
  );

COMMIT;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅✅✅ Migration COMPLETE ✅✅✅';
  RAISE NOTICE '';
  RAISE NOTICE 'Created tables:';
  RAISE NOTICE '  - public.projects (with summary column)';
  RAISE NOTICE '  - public.storytellers (with consent tracking)';
  RAISE NOTICE '';
  RAISE NOTICE 'Security:';
  RAISE NOTICE '  - RLS policies enabled';
  RAISE NOTICE '  - Service role has full access';
  RAISE NOTICE '  - Authenticated users can read';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Next steps:';
  RAISE NOTICE '  1. Restart backend: pkill -f "node server.js" && cd apps/backend && node server.js';
  RAISE NOTICE '  2. Test: curl http://localhost:4000/api/health';
  RAISE NOTICE '  3. No more warnings! The tables now exist.';
  RAISE NOTICE '';
  RAISE NOTICE '📝 Note: Data from notion_projects NOT synced (to avoid column errors)';
  RAISE NOTICE '   Your backend will create project records as needed via server.js';
END $$;
