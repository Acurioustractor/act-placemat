-- ACT Media Management System
-- Revolutionary content management for photos, videos, and stories

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
-- HELPER FUNCTIONS
-- =============================================

-- Function to get media by tags
CREATE OR REPLACE FUNCTION get_media_by_tags(
    tag_list TEXT[],
    match_type TEXT DEFAULT 'any' -- 'any' or 'all'
)
RETURNS TABLE (
    id UUID,
    file_url TEXT,
    title TEXT,
    ai_tags TEXT[],
    manual_tags TEXT[]
) AS $$
BEGIN
    IF match_type = 'all' THEN
        RETURN QUERY
        SELECT m.id, m.file_url, m.title, m.ai_tags, m.manual_tags
        FROM media_items m
        WHERE m.ai_tags @> tag_list OR m.manual_tags @> tag_list;
    ELSE
        RETURN QUERY
        SELECT m.id, m.file_url, m.title, m.ai_tags, m.manual_tags
        FROM media_items m
        WHERE m.ai_tags && tag_list OR m.manual_tags && tag_list;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to update media tags
CREATE OR REPLACE FUNCTION update_media_tags(
    media_item_id UUID,
    new_ai_tags TEXT[],
    new_manual_tags TEXT[],
    confidence_score NUMERIC DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE media_items 
    SET 
        ai_tags = COALESCE(new_ai_tags, ai_tags),
        manual_tags = COALESCE(new_manual_tags, manual_tags),
        ai_confidence = COALESCE(confidence_score, ai_confidence),
        ai_processed = CASE WHEN new_ai_tags IS NOT NULL THEN TRUE ELSE ai_processed END,
        updated_at = NOW()
    WHERE id = media_item_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function to create media collection
CREATE OR REPLACE FUNCTION create_media_collection(
    collection_name TEXT,
    collection_description TEXT DEFAULT NULL,
    collection_type TEXT DEFAULT 'gallery',
    related_project_id UUID DEFAULT NULL,
    media_ids UUID[] DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    new_collection_id UUID;
    media_id UUID;
BEGIN
    -- Create the collection
    INSERT INTO media_collections (name, description, type, project_id)
    VALUES (collection_name, collection_description, collection_type, related_project_id)
    RETURNING id INTO new_collection_id;
    
    -- Add media items if provided
    IF media_ids IS NOT NULL THEN
        FOREACH media_id IN ARRAY media_ids
        LOOP
            INSERT INTO collection_media (collection_id, media_id)
            VALUES (new_collection_id, media_id);
        END LOOP;
    END IF;
    
    RETURN new_collection_id;
END;
$$ LANGUAGE plpgsql;

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

-- Policies for authenticated users (ACT team)
-- Note: These would be refined based on actual authentication system

-- =============================================
-- SAMPLE DATA FOR TESTING
-- =============================================

-- Insert sample media items
INSERT INTO media_items (
    file_url, file_type, title, description, alt_text,
    manual_tags, impact_themes, photographer, consent_verified, community_approved
) VALUES 
(
    'https://example.com/photos/goods-distribution.jpg',
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
    'https://example.com/photos/bed-project.jpg',
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
    'https://example.com/videos/sarah-story.mp4',
    'video',
    'Sarah\'s Healthcare Story',
    'Sarah Chen shares her experience supporting refugee families in healthcare access',
    'Video interview with Sarah Chen about refugee healthcare support',
    ARRAY['healthcare', 'refugees', 'story', 'interview'],
    ARRAY['healthcare', 'community-support', 'refugees'],
    'ACT Video Team',
    true,
    true
);

-- Create sample collections
SELECT create_media_collection(
    'Goods Project Gallery',
    'Photos and videos from the community goods distribution project',
    'gallery',
    NULL, -- We'll link to actual project IDs later
    ARRAY[
        (SELECT id FROM media_items WHERE title = 'Community Goods Distribution'),
        (SELECT id FROM media_items WHERE title = 'The Great Bed Project')
    ]
);

SELECT create_media_collection(
    'Community Stories Videos',
    'Video interviews and stories from community members',
    'story-collection',
    NULL,
    ARRAY[
        (SELECT id FROM media_items WHERE title = 'Sarah\'s Healthcare Story')
    ]
);

-- =============================================
-- TRIGGERS FOR AUTOMATION
-- =============================================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_media_items_updated_at
    BEFORE UPDATE ON media_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_media_collections_updated_at
    BEFORE UPDATE ON media_collections
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- VIEWS FOR COMMON QUERIES
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