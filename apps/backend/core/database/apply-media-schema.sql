-- ACT Media Management System - Supabase Setup
-- Copy and paste this into your Supabase SQL Editor

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- MEDIA ITEMS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS media_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    file_url TEXT NOT NULL,
    file_type TEXT NOT NULL CHECK (file_type IN ('photo', 'video', 'document')),
    title TEXT,
    description TEXT,
    alt_text TEXT,
    file_size BIGINT,
    dimensions JSON, -- {width, height, duration}
    
    -- Content Connections
    project_ids UUID[],
    story_ids UUID[],
    storyteller_ids UUID[],
    organization_ids UUID[],
    
    -- AI & Manual Tags
    ai_tags TEXT[],
    manual_tags TEXT[],
    ai_confidence NUMERIC DEFAULT 0,
    ai_processed BOOLEAN DEFAULT FALSE,
    
    -- Rights & Attribution
    photographer TEXT,
    consent_verified BOOLEAN DEFAULT FALSE,
    usage_rights TEXT DEFAULT 'community-approved',
    attribution_required BOOLEAN DEFAULT TRUE,
    community_approved BOOLEAN DEFAULT FALSE,
    
    -- Context & Impact
    location_data JSON,
    capture_date DATE,
    impact_themes TEXT[],
    emotional_tone TEXT,
    
    -- Technical
    processed BOOLEAN DEFAULT FALSE,
    thumbnail_url TEXT,
    compressed_url TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- MEDIA COLLECTIONS (GALLERIES)
-- =============================================

CREATE TABLE IF NOT EXISTS media_collections (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    type TEXT DEFAULT 'gallery' CHECK (type IN ('gallery', 'slideshow', 'story-collection', 'project-showcase')),
    
    -- Connections
    project_id UUID,
    story_id UUID,
    organization_id UUID,
    
    -- Display
    featured BOOLEAN DEFAULT FALSE,
    public_visible BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    cover_image_id UUID,
    
    -- Settings
    settings JSON DEFAULT '{}', -- display preferences, auto-play, etc.
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- COLLECTION MEDIA (MANY-TO-MANY)
-- =============================================

CREATE TABLE IF NOT EXISTS collection_media (
    collection_id UUID REFERENCES media_collections(id) ON DELETE CASCADE,
    media_id UUID REFERENCES media_items(id) ON DELETE CASCADE,
    sort_order INTEGER DEFAULT 0,
    caption TEXT,
    featured_in_collection BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (collection_id, media_id)
);

-- =============================================
-- MEDIA USAGE TRACKING
-- =============================================

CREATE TABLE IF NOT EXISTS media_usage (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    media_id UUID REFERENCES media_items(id) ON DELETE CASCADE,
    used_in_type TEXT NOT NULL, -- 'story', 'project', 'homepage', 'gallery'
    used_in_id UUID,
    usage_context TEXT, -- 'hero-image', 'gallery-item', 'thumbnail', etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- MEDIA PROCESSING JOBS
-- =============================================

CREATE TABLE IF NOT EXISTS media_processing_jobs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    media_id UUID REFERENCES media_items(id) ON DELETE CASCADE,
    job_type TEXT NOT NULL, -- 'thumbnail', 'compress', 'ai-tag', 'face-blur'
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    result_data JSON,
    error_message TEXT,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Media Items
CREATE INDEX IF NOT EXISTS idx_media_items_file_type ON media_items(file_type);
CREATE INDEX IF NOT EXISTS idx_media_items_project_ids ON media_items USING GIN(project_ids);
CREATE INDEX IF NOT EXISTS idx_media_items_story_ids ON media_items USING GIN(story_ids);
CREATE INDEX IF NOT EXISTS idx_media_items_ai_tags ON media_items USING GIN(ai_tags);
CREATE INDEX IF NOT EXISTS idx_media_items_manual_tags ON media_items USING GIN(manual_tags);
CREATE INDEX IF NOT EXISTS idx_media_items_impact_themes ON media_items USING GIN(impact_themes);
CREATE INDEX IF NOT EXISTS idx_media_items_consent ON media_items(consent_verified, community_approved);
CREATE INDEX IF NOT EXISTS idx_media_items_created ON media_items(created_at DESC);

-- Collections
CREATE INDEX IF NOT EXISTS idx_media_collections_type ON media_collections(type);
CREATE INDEX IF NOT EXISTS idx_media_collections_featured ON media_collections(featured, public_visible);
CREATE INDEX IF NOT EXISTS idx_media_collections_project ON media_collections(project_id);

-- Collection Media
CREATE INDEX IF NOT EXISTS idx_collection_media_sort ON collection_media(collection_id, sort_order);

-- Usage Tracking
CREATE INDEX IF NOT EXISTS idx_media_usage_media ON media_usage(media_id);
CREATE INDEX IF NOT EXISTS idx_media_usage_type ON media_usage(used_in_type, used_in_id);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

-- Enable RLS
ALTER TABLE media_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_media ENABLE ROW LEVEL SECURITY;

-- Policies for public read access to approved content
CREATE POLICY "Public can view approved media" ON media_items
    FOR SELECT USING (community_approved = true AND consent_verified = true);

CREATE POLICY "Public can view public collections" ON media_collections
    FOR SELECT USING (public_visible = true);

CREATE POLICY "Public can view collection media" ON collection_media
    FOR SELECT USING (
        collection_id IN (
            SELECT id FROM media_collections WHERE public_visible = true
        )
    );

-- =============================================
-- HELPER VIEWS
-- =============================================

-- View for public media with collections
CREATE OR REPLACE VIEW public_media_with_collections AS
SELECT 
    m.id,
    m.file_url,
    m.file_type,
    m.title,
    m.description,
    m.alt_text,
    m.thumbnail_url,
    m.manual_tags,
    m.impact_themes,
    m.photographer,
    m.capture_date,
    COALESCE(
        json_agg(
            json_build_object(
                'collection_id', c.id,
                'collection_name', c.name,
                'collection_type', c.type
            )
        ) FILTER (WHERE c.id IS NOT NULL),
        '[]'::json
    ) as collections
FROM media_items m
LEFT JOIN collection_media cm ON m.id = cm.media_id
LEFT JOIN media_collections c ON cm.collection_id = c.id AND c.public_visible = true
WHERE m.community_approved = true AND m.consent_verified = true
GROUP BY m.id, m.file_url, m.file_type, m.title, m.description, m.alt_text, 
         m.thumbnail_url, m.manual_tags, m.impact_themes, m.photographer, m.capture_date;

-- =============================================
-- SAMPLE DATA FOR TESTING
-- =============================================

-- Insert sample media items
INSERT INTO media_items (
    file_url, file_type, title, description, alt_text,
    manual_tags, impact_themes, photographer, consent_verified, community_approved
) VALUES 
(
    'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=800&h=600&fit=crop',
    'photo',
    'Community Goods Distribution',
    'Volunteers distributing essential goods to families in remote communities',
    'Volunteers handing boxes of goods to community members outdoors',
    ARRAY['goods', 'distribution', 'community', 'volunteers'],
    ARRAY['goods', 'community-support', 'rural'],
    'ACT Community Team',
    true,
    true
),
(
    'https://images.unsplash.com/photo-1581833971358-2c8b550f87b3?w=800&h=600&fit=crop',
    'photo',
    'The Great Bed Project',
    'Custom-designed beds being delivered to elders in remote communities',
    'Indigenous elders receiving specially designed beds for better health outcomes',
    ARRAY['beds', 'elders', 'health', 'innovation'],
    ARRAY['goods', 'health', 'elders', 'innovation'],
    'David Williams',
    true,
    true
),
(
    'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=800&h=600&fit=crop',
    'photo',
    'Healthcare Community Gathering',
    'Sarah Chen facilitating a community health workshop for refugee families',
    'Community health worker leading a group discussion in a circle setting',
    ARRAY['healthcare', 'refugees', 'workshop', 'community'],
    ARRAY['healthcare', 'community-support', 'refugees'],
    'ACT Photography Team',
    true,
    true
);

-- Create sample collections
INSERT INTO media_collections (name, description, type, featured, public_visible) VALUES
(
    'Featured Impact Stories',
    'Highlighting the most powerful visual stories of community-led change',
    'story-collection',
    true,
    true
),
(
    'Goods Project Gallery',
    'Photos and documentation from the community goods distribution initiative',
    'gallery',
    true,
    true
),
(
    'Community Voices',
    'Faces and stories from our incredible community members',
    'gallery',
    false,
    true
);

-- Link media to collections
INSERT INTO collection_media (collection_id, media_id, sort_order) VALUES
-- Featured Impact Stories
(
    (SELECT id FROM media_collections WHERE name = 'Featured Impact Stories'),
    (SELECT id FROM media_items WHERE title = 'Community Goods Distribution'),
    0
),
(
    (SELECT id FROM media_collections WHERE name = 'Featured Impact Stories'),
    (SELECT id FROM media_items WHERE title = 'The Great Bed Project'),
    1
),
-- Goods Project Gallery
(
    (SELECT id FROM media_collections WHERE name = 'Goods Project Gallery'),
    (SELECT id FROM media_items WHERE title = 'Community Goods Distribution'),
    0
),
(
    (SELECT id FROM media_collections WHERE name = 'Goods Project Gallery'),
    (SELECT id FROM media_items WHERE title = 'The Great Bed Project'),
    1
),
-- Community Voices
(
    (SELECT id FROM media_collections WHERE name = 'Community Voices'),
    (SELECT id FROM media_items WHERE title = 'Healthcare Community Gathering'),
    0
);

-- Set cover images for collections
UPDATE media_collections 
SET cover_image_id = (SELECT id FROM media_items WHERE title = 'Community Goods Distribution')
WHERE name = 'Featured Impact Stories';

UPDATE media_collections 
SET cover_image_id = (SELECT id FROM media_items WHERE title = 'Community Goods Distribution')
WHERE name = 'Goods Project Gallery';

UPDATE media_collections 
SET cover_image_id = (SELECT id FROM media_items WHERE title = 'Healthcare Community Gathering')
WHERE name = 'Community Voices';