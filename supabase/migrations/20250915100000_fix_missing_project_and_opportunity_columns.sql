-- Fix missing columns causing PGRST204 schema cache errors
-- This migration addresses the specific errors:
-- 1. "Could not find the 'end_date' column of 'projects' in the schema cache"
-- 2. "Could not find the 'archived' column of 'opportunities' in the schema cache"

-- Add end_date column to projects table
-- Based on the Notion schema where projects have an 'End Date' field
ALTER TABLE IF EXISTS public.projects
  ADD COLUMN IF NOT EXISTS end_date DATE;

-- Add archived column to opportunities table (if not already present)
-- This column is used by services for soft-hiding records
ALTER TABLE IF EXISTS public.opportunities
  ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT FALSE;

-- Ensure updated_at exists on opportunities table and auto-updates
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='opportunities' AND column_name='updated_at'
  ) THEN
    ALTER TABLE public.opportunities ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END $$;

-- Ensure updated_at exists on projects table and auto-updates (if not already present)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='projects' AND column_name='updated_at'
  ) THEN
    ALTER TABLE public.projects ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END $$;

-- Add trigger to auto-update updated_at column for opportunities
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_opportunities_updated_at'
  ) THEN
    CREATE TRIGGER update_opportunities_updated_at
      BEFORE UPDATE ON opportunities
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Add trigger to auto-update updated_at column for projects
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_projects_updated_at'
  ) THEN
    CREATE TRIGGER update_projects_updated_at
      BEFORE UPDATE ON projects
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Notify PostgREST to reload schema cache (Supabase)
-- Will be ignored if NOTIFY privileges are restricted
DO $$ 
BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
EXCEPTION 
  WHEN OTHERS THEN
    -- ignore if not permitted
    NULL;
END $$;