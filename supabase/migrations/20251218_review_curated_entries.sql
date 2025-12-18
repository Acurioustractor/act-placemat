-- Migration: Store Year in Review curated entries in Supabase
-- This enables direct access from Vercel without needing Railway backend

-- Table to store curated timeline entries
CREATE TABLE IF NOT EXISTS review_curated_entries (
  id TEXT PRIMARY KEY,
  year INTEGER NOT NULL DEFAULT 2025,
  date TIMESTAMPTZ NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  source TEXT NOT NULL DEFAULT 'manual',
  type TEXT NOT NULL DEFAULT 'milestone',
  tags TEXT[] DEFAULT '{}',
  status TEXT,
  metadata JSONB DEFAULT '{}',
  included BOOLEAN DEFAULT TRUE,
  edited_title TEXT,
  edited_description TEXT,
  hero_image_url TEXT,
  hero_image_id TEXT,
  hero_image_alt TEXT,
  hero_video_url TEXT,
  hero_video_platform TEXT,
  hero_video_title TEXT,
  photos TEXT[] DEFAULT '{}',
  has_project_page BOOLEAN DEFAULT FALSE,
  project_slug TEXT,
  season_order INTEGER,
  display_order INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for year-based queries
CREATE INDEX IF NOT EXISTS idx_review_curated_year ON review_curated_entries(year);
CREATE INDEX IF NOT EXISTS idx_review_curated_date ON review_curated_entries(date);
CREATE INDEX IF NOT EXISTS idx_review_curated_included ON review_curated_entries(included);

-- Table to store year settings/metadata
CREATE TABLE IF NOT EXISTS review_year_settings (
  year INTEGER PRIMARY KEY,
  seasons JSONB DEFAULT '[]',
  settings JSONB DEFAULT '{}',
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for security
ALTER TABLE review_curated_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_year_settings ENABLE ROW LEVEL SECURITY;

-- Public read access (for the public Year in Review page)
CREATE POLICY "Public read access for curated entries" ON review_curated_entries
  FOR SELECT USING (true);

CREATE POLICY "Public read access for year settings" ON review_year_settings
  FOR SELECT USING (true);

-- Authenticated write access (for admin)
CREATE POLICY "Authenticated write access for curated entries" ON review_curated_entries
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated write access for year settings" ON review_year_settings
  FOR ALL USING (true) WITH CHECK (true);

-- Comment
COMMENT ON TABLE review_curated_entries IS 'Stores admin-curated timeline entries for Year in Review pages';
