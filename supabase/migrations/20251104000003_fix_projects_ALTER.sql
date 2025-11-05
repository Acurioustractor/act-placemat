-- Fix Projects and Storytellers Tables (ALTER VERSION)
-- Date: 2025-11-04
-- This version ALTERS existing tables instead of creating new ones
-- Works even if tables already exist with missing columns

BEGIN;

-- ============================================
-- PART 1: Create or alter projects table
-- ============================================

-- Create table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add all columns if they don't exist
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS notion_id TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS notion_project_id TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS summary TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS status TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS organization_id UUID;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_projects_notion_id ON public.projects(notion_id);
CREATE INDEX IF NOT EXISTS idx_projects_notion_project_id ON public.projects(notion_project_id);
CREATE INDEX IF NOT EXISTS idx_projects_name ON public.projects(name);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);

-- Add unique constraint only if notion_id column exists
DO $$
BEGIN
  -- Check if notion_id column exists (it should after ALTER above)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'projects'
    AND column_name = 'notion_id'
  ) THEN
    -- Add constraint if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'projects_notion_id_unique'
    ) THEN
      ALTER TABLE public.projects ADD CONSTRAINT projects_notion_id_unique UNIQUE (notion_id);
      RAISE NOTICE 'Added unique constraint on projects.notion_id';
    END IF;
  END IF;
END $$;

-- ============================================
-- PART 2: Create or alter storytellers table
-- ============================================

-- Create table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.storytellers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add all columns if they don't exist
ALTER TABLE public.storytellers ADD COLUMN IF NOT EXISTS project_id UUID;
ALTER TABLE public.storytellers ADD COLUMN IF NOT EXISTS notion_id TEXT;
ALTER TABLE public.storytellers ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE public.storytellers ADD COLUMN IF NOT EXISTS expertise_areas TEXT[] DEFAULT '{}';
ALTER TABLE public.storytellers ADD COLUMN IF NOT EXISTS profile_image_url TEXT;
ALTER TABLE public.storytellers ADD COLUMN IF NOT EXISTS media_type TEXT;
ALTER TABLE public.storytellers ADD COLUMN IF NOT EXISTS consent_given BOOLEAN DEFAULT FALSE;
ALTER TABLE public.storytellers ADD COLUMN IF NOT EXISTS consent_date TIMESTAMPTZ;
ALTER TABLE public.storytellers ADD COLUMN IF NOT EXISTS consent_expiry TIMESTAMPTZ;
ALTER TABLE public.storytellers ADD COLUMN IF NOT EXISTS contact_email TEXT;
ALTER TABLE public.storytellers ADD COLUMN IF NOT EXISTS contact_phone TEXT;
ALTER TABLE public.storytellers ADD COLUMN IF NOT EXISTS location TEXT;

-- Add foreign key constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'storytellers_project_id_fkey'
  ) THEN
    ALTER TABLE public.storytellers
      ADD CONSTRAINT storytellers_project_id_fkey
      FOREIGN KEY (project_id)
      REFERENCES public.projects(id)
      ON DELETE CASCADE;
    RAISE NOTICE 'Added foreign key constraint on storytellers.project_id';
  END IF;
END $$;

-- Create indexes
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
  DROP TRIGGER IF EXISTS trg_projects_updated ON public.projects;
  CREATE TRIGGER trg_projects_updated
    BEFORE UPDATE ON public.projects
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

  DROP TRIGGER IF EXISTS trg_storytellers_updated ON public.storytellers;
  CREATE TRIGGER trg_storytellers_updated
    BEFORE UPDATE ON public.storytellers
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

  RAISE NOTICE 'Created update triggers';
END $$;

-- ============================================
-- PART 4: RLS Policies
-- ============================================

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storytellers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies and recreate
DROP POLICY IF EXISTS "Service role has full access to projects" ON public.projects;
CREATE POLICY "Service role has full access to projects" ON public.projects
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role has full access to storytellers" ON public.storytellers;
CREATE POLICY "Service role has full access to storytellers" ON public.storytellers
  FOR ALL USING (true) WITH CHECK (true);

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
DECLARE
  projects_count INTEGER;
  storytellers_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO projects_count FROM public.projects;
  SELECT COUNT(*) INTO storytellers_count FROM public.storytellers;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ MIGRATION COMPLETE!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Tables updated:';
  RAISE NOTICE '  ✓ public.projects (% rows)', projects_count;
  RAISE NOTICE '  ✓ public.storytellers (% rows)', storytellers_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Columns ensured:';
  RAISE NOTICE '  ✓ projects.notion_id';
  RAISE NOTICE '  ✓ projects.notion_project_id';
  RAISE NOTICE '  ✓ projects.summary ← THIS WAS MISSING!';
  RAISE NOTICE '  ✓ projects.description';
  RAISE NOTICE '  ✓ projects.status';
  RAISE NOTICE '  ✓ All storyteller columns';
  RAISE NOTICE '';
  RAISE NOTICE 'Security:';
  RAISE NOTICE '  ✓ RLS policies enabled';
  RAISE NOTICE '  ✓ Service role has full access';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Next: Restart your backend server';
  RAISE NOTICE '   pkill -f "node server.js"';
  RAISE NOTICE '   cd apps/backend && node server.js';
  RAISE NOTICE '';
END $$;
