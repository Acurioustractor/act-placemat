-- Year in Review Content Management System
-- Migration: 20251216_review_projects.sql

-- =============================================
-- REVIEW PROJECTS TABLE
-- Stores rich content for timeline entries with dedicated story pages
-- =============================================

CREATE TABLE IF NOT EXISTS review_projects (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    year INTEGER NOT NULL DEFAULT 2025,
    timeline_entry_id TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,

    -- Basic Info
    title TEXT NOT NULL,
    subtitle TEXT,

    -- Hero Section
    hero_image_id UUID REFERENCES media_items(id) ON DELETE SET NULL,
    hero_video_url TEXT,
    hero_video_type TEXT CHECK (hero_video_type IN ('loom', 'youtube', 'vimeo', 'direct')),
    hero_caption TEXT,

    -- Rich Content (Block-based JSON)
    content_blocks JSONB NOT NULL DEFAULT '[]',

    -- Metadata
    is_featured BOOLEAN DEFAULT FALSE,
    featured_order INTEGER,
    is_published BOOLEAN DEFAULT FALSE,
    published_at TIMESTAMP WITH TIME ZONE,

    -- SEO
    meta_title TEXT,
    meta_description TEXT,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_review_projects_year ON review_projects(year);
CREATE INDEX IF NOT EXISTS idx_review_projects_slug ON review_projects(slug);
CREATE INDEX IF NOT EXISTS idx_review_projects_timeline_entry ON review_projects(timeline_entry_id);
CREATE INDEX IF NOT EXISTS idx_review_projects_published ON review_projects(is_published, year);
CREATE INDEX IF NOT EXISTS idx_review_projects_featured ON review_projects(is_featured, featured_order);

-- =============================================
-- REVIEW MEDIA LINKS TABLE
-- Flexible many-to-many linking of media to Year in Review content
-- =============================================

CREATE TABLE IF NOT EXISTS review_media_links (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    media_id UUID NOT NULL REFERENCES media_items(id) ON DELETE CASCADE,

    -- Linkable entity (polymorphic)
    link_type TEXT NOT NULL CHECK (link_type IN (
        'timeline_entry',
        'review_project',
        'content_block',
        'season',
        'hero'
    )),
    link_id TEXT NOT NULL,

    -- Display options
    display_order INTEGER DEFAULT 0,
    caption TEXT,
    alt_text TEXT,
    is_hero BOOLEAN DEFAULT FALSE,
    is_featured BOOLEAN DEFAULT FALSE,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Ensure unique media-link combinations
    UNIQUE(media_id, link_type, link_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_review_media_links_entity ON review_media_links(link_type, link_id);
CREATE INDEX IF NOT EXISTS idx_review_media_links_media ON review_media_links(media_id);
CREATE INDEX IF NOT EXISTS idx_review_media_links_hero ON review_media_links(is_hero) WHERE is_hero = TRUE;

-- =============================================
-- REVIEW VIDEOS TABLE
-- Track external video embeds throughout the Year in Review
-- =============================================

CREATE TABLE IF NOT EXISTS review_videos (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    year INTEGER NOT NULL DEFAULT 2025,

    -- Video Details
    platform TEXT NOT NULL CHECK (platform IN ('loom', 'youtube', 'vimeo', 'direct')),
    video_id TEXT NOT NULL,
    embed_url TEXT NOT NULL,
    thumbnail_url TEXT,
    title TEXT,
    description TEXT,
    duration_seconds INTEGER,

    -- Link to content
    link_type TEXT NOT NULL CHECK (link_type IN (
        'timeline_entry',
        'review_project',
        'content_block',
        'season',
        'standalone'
    )),
    link_id TEXT,

    -- Display
    display_order INTEGER DEFAULT 0,
    is_featured BOOLEAN DEFAULT FALSE,
    autoplay BOOLEAN DEFAULT FALSE,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_review_videos_year ON review_videos(year);
CREATE INDEX IF NOT EXISTS idx_review_videos_link ON review_videos(link_type, link_id);
CREATE INDEX IF NOT EXISTS idx_review_videos_platform ON review_videos(platform);
CREATE INDEX IF NOT EXISTS idx_review_videos_featured ON review_videos(is_featured) WHERE is_featured = TRUE;

-- =============================================
-- EXTEND MEDIA_ITEMS TABLE
-- Add fields for Year in Review categorization
-- =============================================

ALTER TABLE media_items ADD COLUMN IF NOT EXISTS year_in_review_year INTEGER;
ALTER TABLE media_items ADD COLUMN IF NOT EXISTS timeline_entry_id TEXT;
ALTER TABLE media_items ADD COLUMN IF NOT EXISTS is_hero_image BOOLEAN DEFAULT FALSE;
ALTER TABLE media_items ADD COLUMN IF NOT EXISTS season_index INTEGER CHECK (season_index >= 0 AND season_index <= 3);
ALTER TABLE media_items ADD COLUMN IF NOT EXISTS review_tags TEXT[];

-- Indexes for new columns
CREATE INDEX IF NOT EXISTS idx_media_items_year_review ON media_items(year_in_review_year) WHERE year_in_review_year IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_media_items_timeline_entry ON media_items(timeline_entry_id) WHERE timeline_entry_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_media_items_review_tags ON media_items USING GIN(review_tags) WHERE review_tags IS NOT NULL;

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Function to get all media for a Year in Review entity
CREATE OR REPLACE FUNCTION get_review_media(
    p_link_type TEXT,
    p_link_id TEXT
)
RETURNS TABLE (
    id UUID,
    file_url TEXT,
    file_type TEXT,
    title TEXT,
    description TEXT,
    thumbnail_url TEXT,
    caption TEXT,
    display_order INTEGER,
    is_hero BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        m.id,
        m.file_url,
        m.file_type,
        m.title,
        m.description,
        m.thumbnail_url,
        rml.caption,
        rml.display_order,
        rml.is_hero
    FROM media_items m
    JOIN review_media_links rml ON m.id = rml.media_id
    WHERE rml.link_type = p_link_type AND rml.link_id = p_link_id
    ORDER BY rml.is_hero DESC, rml.display_order ASC;
END;
$$ LANGUAGE plpgsql;

-- Function to get project by slug
CREATE OR REPLACE FUNCTION get_review_project(p_slug TEXT)
RETURNS TABLE (
    id UUID,
    year INTEGER,
    timeline_entry_id TEXT,
    slug TEXT,
    title TEXT,
    subtitle TEXT,
    hero_image_url TEXT,
    hero_video_url TEXT,
    hero_video_type TEXT,
    content_blocks JSONB,
    is_featured BOOLEAN,
    is_published BOOLEAN,
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        rp.id,
        rp.year,
        rp.timeline_entry_id,
        rp.slug,
        rp.title,
        rp.subtitle,
        m.file_url as hero_image_url,
        rp.hero_video_url,
        rp.hero_video_type,
        rp.content_blocks,
        rp.is_featured,
        rp.is_published,
        rp.published_at,
        rp.created_at,
        rp.updated_at
    FROM review_projects rp
    LEFT JOIN media_items m ON rp.hero_image_id = m.id
    WHERE rp.slug = p_slug;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- TRIGGERS
-- =============================================

-- Update timestamp trigger for review_projects
CREATE TRIGGER update_review_projects_updated_at
    BEFORE UPDATE ON review_projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Update timestamp trigger for review_videos
CREATE TRIGGER update_review_videos_updated_at
    BEFORE UPDATE ON review_videos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

-- Enable RLS
ALTER TABLE review_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_media_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_videos ENABLE ROW LEVEL SECURITY;

-- Public can view published projects
CREATE POLICY "Public can view published review projects" ON review_projects
    FOR SELECT USING (is_published = true);

-- Public can view media links
CREATE POLICY "Public can view review media links" ON review_media_links
    FOR SELECT USING (true);

-- Public can view videos
CREATE POLICY "Public can view review videos" ON review_videos
    FOR SELECT USING (true);

-- Service role has full access (for admin operations)
CREATE POLICY "Service role has full access to review_projects" ON review_projects
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to review_media_links" ON review_media_links
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to review_videos" ON review_videos
    FOR ALL USING (auth.role() = 'service_role');

-- =============================================
-- VIEWS
-- =============================================

-- View for published review projects with hero media
CREATE OR REPLACE VIEW public_review_projects AS
SELECT
    rp.id,
    rp.year,
    rp.timeline_entry_id,
    rp.slug,
    rp.title,
    rp.subtitle,
    m.file_url as hero_image_url,
    m.thumbnail_url as hero_thumbnail_url,
    rp.hero_video_url,
    rp.hero_video_type,
    rp.hero_caption,
    rp.content_blocks,
    rp.is_featured,
    rp.featured_order,
    rp.meta_title,
    rp.meta_description,
    rp.published_at,
    rp.created_at,
    rp.updated_at
FROM review_projects rp
LEFT JOIN media_items m ON rp.hero_image_id = m.id
WHERE rp.is_published = true
ORDER BY rp.featured_order NULLS LAST, rp.created_at DESC;

-- View for timeline entries with media counts
CREATE OR REPLACE VIEW review_timeline_entries_with_media AS
SELECT
    rml.link_id as timeline_entry_id,
    COUNT(rml.id) as media_count,
    COUNT(CASE WHEN rml.is_hero THEN 1 END) as hero_count,
    BOOL_OR(rml.is_hero) as has_hero,
    array_agg(m.file_url ORDER BY rml.display_order) FILTER (WHERE m.file_url IS NOT NULL) as media_urls,
    (SELECT m2.file_url FROM media_items m2
     JOIN review_media_links rml2 ON m2.id = rml2.media_id
     WHERE rml2.link_type = 'timeline_entry'
       AND rml2.link_id = rml.link_id
       AND rml2.is_hero = true
     LIMIT 1) as hero_image_url
FROM review_media_links rml
JOIN media_items m ON rml.media_id = m.id
WHERE rml.link_type = 'timeline_entry'
GROUP BY rml.link_id;
