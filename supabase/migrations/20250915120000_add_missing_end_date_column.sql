-- Add missing end_date column to projects table
-- This fixes the schema issue causing Supabase upsert failures

ALTER TABLE projects
ADD COLUMN IF NOT EXISTS end_date DATE;

-- Add index for performance if needed
CREATE INDEX IF NOT EXISTS idx_projects_end_date ON projects(end_date);

-- Add comment
COMMENT ON COLUMN projects.end_date IS 'Project end date - added to fix schema mismatch';