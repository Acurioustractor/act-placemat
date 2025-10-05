-- Empathy Ledger Platform: Optimal Multi-Tenant Architecture
-- Zero manual management, infinite scale, trial-ready with ACT

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Helper function for short IDs
CREATE OR REPLACE FUNCTION generate_short_id(length INTEGER DEFAULT 8)
RETURNS TEXT AS $$
BEGIN
    RETURN substr(replace(gen_random_uuid()::text, '-', ''), 1, length);
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- ORGANIZATIONS: Auto-Managing Platform Core
-- =============================================

CREATE TABLE IF NOT EXISTS organizations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,           -- 'act', 'justice-hub'
    name TEXT NOT NULL,
    storage_prefix TEXT UNIQUE NOT NULL, -- Auto-generated: 'act-abc12345'
    
    -- Platform management
    subscription_tier TEXT DEFAULT 'starter' CHECK (subscription_tier IN ('starter', 'professional', 'enterprise')),
    storage_quota_gb INTEGER DEFAULT 10,
    storage_used_gb NUMERIC DEFAULT 0,
    api_calls_this_month INTEGER DEFAULT 0,
    
    -- Contact & billing
    primary_contact_email TEXT,
    billing_email TEXT,
    domain TEXT,
    
    -- Auto-management timestamps
    first_upload_at TIMESTAMP WITH TIME ZONE,
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Auto-generate storage prefix on insert
CREATE OR REPLACE FUNCTION generate_storage_prefix()
RETURNS TRIGGER AS $$
BEGIN
    -- Generate unique storage prefix: slug + short random ID
    NEW.storage_prefix = NEW.slug || '-' || generate_short_id(8);
    
    -- Ensure uniqueness (very unlikely to collide, but safety first)
    WHILE EXISTS (SELECT 1 FROM organizations WHERE storage_prefix = NEW.storage_prefix) LOOP
        NEW.storage_prefix = NEW.slug || '-' || generate_short_id(8);
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_generate_storage_prefix
    BEFORE INSERT ON organizations
    FOR EACH ROW
    EXECUTE FUNCTION generate_storage_prefix();

-- =============================================
-- MEDIA ITEMS: Organization-Scoped Content
-- =============================================

CREATE TABLE IF NOT EXISTS media_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Auto-managed storage paths
    bucket_name TEXT DEFAULT 'empathy-ledger-media',
    storage_path TEXT NOT NULL,     -- 'act-abc123/photos/community/file.jpg'
    file_url TEXT NOT NULL,         -- Full public URL
    thumbnail_url TEXT,             -- Auto-generated thumbnail URL
    
    -- Media metadata
    file_type TEXT NOT NULL CHECK (file_type IN ('photo', 'video', 'document')),
    file_size BIGINT,
    dimensions JSON,                -- {width, height, duration}
    mime_type TEXT,
    original_filename TEXT,
    
    -- Content classification (organization-aware)
    title TEXT,
    description TEXT,
    content_category TEXT DEFAULT 'community', -- community, projects, stories, impact, profiles
    content_subcategory TEXT,                   -- Dynamic based on org needs
    
    -- AI & Manual Tags (organization-scoped)
    ai_tags TEXT[],
    manual_tags TEXT[],
    ai_confidence NUMERIC DEFAULT 0,
    ai_processed BOOLEAN DEFAULT FALSE,
    impact_themes TEXT[],
    
    -- Rights & Attribution
    photographer TEXT,
    consent_verified BOOLEAN DEFAULT FALSE,
    community_approved BOOLEAN DEFAULT FALSE,
    attribution_required BOOLEAN DEFAULT TRUE,
    usage_rights TEXT DEFAULT 'community-approved',
    
    -- Geographic & temporal context
    location_data JSON,
    capture_date DATE,
    emotional_tone TEXT,
    
    -- Content connections (within organization)
    project_ids UUID[],
    story_ids UUID[],
    storyteller_ids UUID[],
    
    -- Auto-managed
    processed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- MEDIA COLLECTIONS: Organization-Scoped Galleries
-- =============================================

CREATE TABLE IF NOT EXISTS media_collections (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    
    name TEXT NOT NULL,
    description TEXT,
    type TEXT DEFAULT 'gallery' CHECK (type IN ('gallery', 'slideshow', 'story-collection', 'project-showcase', 'auto-curated')),
    
    -- Auto-curation for platform intelligence
    auto_generated BOOLEAN DEFAULT FALSE,
    generation_criteria JSONB,     -- AI curation rules
    auto_refresh BOOLEAN DEFAULT FALSE,
    
    -- Display settings
    featured BOOLEAN DEFAULT FALSE,
    public_visible BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    cover_image_id UUID REFERENCES media_items(id),
    settings JSON DEFAULT '{}',
    
    -- Content connections
    project_id UUID,
    story_id UUID,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- COLLECTION MEDIA: Enhanced Relationships
-- =============================================

CREATE TABLE IF NOT EXISTS collection_media (
    collection_id UUID REFERENCES media_collections(id) ON DELETE CASCADE,
    media_id UUID REFERENCES media_items(id) ON DELETE CASCADE,
    
    sort_order INTEGER DEFAULT 0,
    caption TEXT,
    featured_in_collection BOOLEAN DEFAULT FALSE,
    auto_added BOOLEAN DEFAULT FALSE,   -- Added by AI curation
    auto_score NUMERIC,                 -- AI relevance score
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (collection_id, media_id)
);

-- =============================================
-- USAGE TRACKING: Platform Analytics
-- =============================================

CREATE TABLE IF NOT EXISTS media_usage (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    media_id UUID REFERENCES media_items(id) ON DELETE CASCADE,
    
    used_in_type TEXT NOT NULL,     -- 'story', 'project', 'homepage', 'gallery', 'email'
    used_in_id UUID,
    usage_context TEXT,             -- 'hero-image', 'gallery-item', 'thumbnail', 'social-share'
    
    -- Analytics
    view_count INTEGER DEFAULT 0,
    download_count INTEGER DEFAULT 0,
    share_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- PROCESSING JOBS: AI & Media Processing
-- =============================================

CREATE TABLE IF NOT EXISTS media_processing_jobs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    media_id UUID REFERENCES media_items(id) ON DELETE CASCADE,
    
    job_type TEXT NOT NULL, -- 'thumbnail', 'compress', 'ai-tag', 'face-blur', 'transcribe'
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    
    -- Job details
    input_data JSON,
    result_data JSON,
    error_message TEXT,
    processing_duration_ms INTEGER,
    
    -- Timestamps
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- ORGANIZATION CONTEXT MANAGEMENT
-- =============================================

-- Function to get current organization ID from session
CREATE OR REPLACE FUNCTION get_current_organization_id()
RETURNS UUID AS $$
BEGIN
    RETURN COALESCE(
        current_setting('app.current_organization_id', true)::UUID,
        -- Fallback to ACT for development/trial
        (SELECT id FROM organizations WHERE slug = 'act' LIMIT 1)
    );
END;
$$ LANGUAGE plpgsql;

-- Function to set organization context
CREATE OR REPLACE FUNCTION set_organization_context(org_slug TEXT)
RETURNS VOID AS $$
DECLARE
    org_id UUID;
BEGIN
    SELECT id INTO org_id FROM organizations WHERE slug = org_slug;
    
    IF org_id IS NULL THEN
        RAISE EXCEPTION 'Organization % not found', org_slug;
    END IF;
    
    PERFORM set_config('app.current_organization_id', org_id::text, true);
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- ROW LEVEL SECURITY: Complete Isolation
-- =============================================

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_processing_jobs ENABLE ROW LEVEL SECURITY;

-- Organizations: Users can only see their own organization
CREATE POLICY "Users see their own organization" ON organizations
    FOR ALL USING (id = get_current_organization_id());

-- Media items: Complete organization isolation
CREATE POLICY "Organization media isolation" ON media_items
    FOR ALL USING (organization_id = get_current_organization_id());

-- Collections: Organization isolation
CREATE POLICY "Organization collection isolation" ON media_collections
    FOR ALL USING (organization_id = get_current_organization_id());

-- Collection media: Inherit from collections
CREATE POLICY "Organization collection media isolation" ON collection_media
    FOR ALL USING (
        collection_id IN (
            SELECT id FROM media_collections 
            WHERE organization_id = get_current_organization_id()
        )
    );

-- Usage tracking: Organization isolation
CREATE POLICY "Organization usage isolation" ON media_usage
    FOR ALL USING (organization_id = get_current_organization_id());

-- Processing jobs: Organization isolation
CREATE POLICY "Organization processing isolation" ON media_processing_jobs
    FOR ALL USING (organization_id = get_current_organization_id());

-- Service role policies (for backend API full access)
CREATE POLICY "Service role full access organizations" ON organizations
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access media" ON media_items
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access collections" ON media_collections
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access collection_media" ON collection_media
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access usage" ON media_usage
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access processing" ON media_processing_jobs
    FOR ALL USING (auth.role() = 'service_role');

-- =============================================
-- PERFORMANCE INDEXES
-- =============================================

-- Organizations
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_storage_prefix ON organizations(storage_prefix);
CREATE INDEX IF NOT EXISTS idx_organizations_last_activity ON organizations(last_activity_at DESC);

-- Media items (organization-scoped)
CREATE INDEX IF NOT EXISTS idx_media_items_org_type ON media_items(organization_id, file_type);
CREATE INDEX IF NOT EXISTS idx_media_items_org_category ON media_items(organization_id, content_category);
CREATE INDEX IF NOT EXISTS idx_media_items_org_created ON media_items(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_items_storage_path ON media_items(storage_path);
CREATE INDEX IF NOT EXISTS idx_media_items_tags ON media_items USING GIN(manual_tags);
CREATE INDEX IF NOT EXISTS idx_media_items_ai_tags ON media_items USING GIN(ai_tags);
CREATE INDEX IF NOT EXISTS idx_media_items_themes ON media_items USING GIN(impact_themes);
CREATE INDEX IF NOT EXISTS idx_media_items_projects ON media_items USING GIN(project_ids);

-- Collections
CREATE INDEX IF NOT EXISTS idx_collections_org_featured ON media_collections(organization_id, featured, public_visible);
CREATE INDEX IF NOT EXISTS idx_collections_org_type ON media_collections(organization_id, type);

-- Collection media
CREATE INDEX IF NOT EXISTS idx_collection_media_sort ON collection_media(collection_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_collection_media_auto ON collection_media(auto_added, auto_score DESC);

-- Usage tracking
CREATE INDEX IF NOT EXISTS idx_usage_org_type ON media_usage(organization_id, used_in_type);
CREATE INDEX IF NOT EXISTS idx_usage_media_count ON media_usage(media_id, view_count DESC);

-- =============================================
-- HELPER VIEWS FOR COMMON QUERIES
-- =============================================

-- Public media view (organization-aware)
CREATE OR REPLACE VIEW public_media_with_collections AS
SELECT 
    m.id,
    m.organization_id,
    m.file_url,
    m.thumbnail_url,
    m.file_type,
    m.title,
    m.description,
    m.content_category,
    m.content_subcategory,
    m.manual_tags,
    m.impact_themes,
    m.photographer,
    m.capture_date,
    m.created_at,
    
    -- Organization context
    o.slug as organization_slug,
    o.name as organization_name,
    
    -- Collections this media appears in
    COALESCE(
        json_agg(
            json_build_object(
                'collection_id', c.id,
                'collection_name', c.name,
                'collection_type', c.type,
                'sort_order', cm.sort_order
            ) ORDER BY cm.sort_order
        ) FILTER (WHERE c.id IS NOT NULL),
        '[]'::json
    ) as collections

FROM media_items m
JOIN organizations o ON m.organization_id = o.id
LEFT JOIN collection_media cm ON m.id = cm.media_id
LEFT JOIN media_collections c ON cm.collection_id = c.id AND c.public_visible = true

WHERE m.community_approved = true 
  AND m.consent_verified = true

GROUP BY m.id, o.slug, o.name;

-- Organization statistics view
CREATE OR REPLACE VIEW organization_stats AS
SELECT 
    o.id,
    o.slug,
    o.name,
    o.storage_used_gb,
    o.storage_quota_gb,
    
    -- Media counts
    COUNT(m.id) as total_media_items,
    COUNT(m.id) FILTER (WHERE m.file_type = 'photo') as photo_count,
    COUNT(m.id) FILTER (WHERE m.file_type = 'video') as video_count,
    COUNT(DISTINCT c.id) as collection_count,
    
    -- Activity metrics
    MAX(m.created_at) as last_upload,
    COUNT(m.id) FILTER (WHERE m.created_at > NOW() - INTERVAL '30 days') as uploads_this_month,
    
    -- Usage metrics
    COALESCE(SUM(u.view_count), 0) as total_views,
    COALESCE(SUM(u.download_count), 0) as total_downloads

FROM organizations o
LEFT JOIN media_items m ON o.id = m.organization_id
LEFT JOIN media_collections c ON o.id = c.organization_id
LEFT JOIN media_usage u ON m.id = u.media_id

GROUP BY o.id, o.slug, o.name, o.storage_used_gb, o.storage_quota_gb;

-- =============================================
-- INSERT ACT AS FIRST ORGANIZATION
-- =============================================

-- Create ACT organization for trial
INSERT INTO organizations (slug, name, primary_contact_email) 
VALUES ('act', 'A Curious Tractor', 'hello@acurioustractor.org')
ON CONFLICT (slug) DO NOTHING;

-- =============================================
-- AUTOMATION TRIGGERS
-- =============================================

-- Update organization activity on media uploads
CREATE OR REPLACE FUNCTION update_organization_activity()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE organizations 
    SET 
        last_activity_at = NOW(),
        first_upload_at = COALESCE(first_upload_at, NOW())
    WHERE id = NEW.organization_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_org_activity_on_media_insert
    AFTER INSERT ON media_items
    FOR EACH ROW
    EXECUTE FUNCTION update_organization_activity();

-- Auto-update timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_organizations_timestamp
    BEFORE UPDATE ON organizations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_media_items_timestamp
    BEFORE UPDATE ON media_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_media_collections_timestamp
    BEFORE UPDATE ON media_collections
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();