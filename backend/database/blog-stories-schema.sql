-- Empathy Ledger Blog Stories Integration Schema
-- Extending the existing stories architecture to support blog posts
-- Tagged as "The Empathy Ledger" stories with enhanced blog functionality

-- Blog Posts Table (extends the stories concept)
CREATE TABLE IF NOT EXISTS empathy_ledger_blog_posts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    story_id UUID REFERENCES stories(id) ON DELETE CASCADE, -- Links to existing stories table
    
    -- Blog-specific metadata
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL, -- URL-friendly title
    excerpt TEXT, -- Short summary for previews
    reading_time_minutes INTEGER DEFAULT 5,
    
    -- Content structure
    content_blocks JSONB DEFAULT '[]'::jsonb, -- Structured content with media
    seo_title TEXT,
    seo_description TEXT,
    featured_image_url TEXT,
    
    -- Blog categorisation
    blog_category TEXT DEFAULT 'empathy-ledger', -- 'empathy-ledger', 'community-stories', 'case-studies'
    tags TEXT[] DEFAULT '{}',
    
    -- Publishing workflow
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'published', 'archived')),
    published_at TIMESTAMP WITH TIME ZONE,
    featured BOOLEAN DEFAULT false,
    
    -- Attribution and community connection
    author_name TEXT NOT NULL DEFAULT 'A Curious Tractor',
    author_role TEXT DEFAULT 'Empathy Ledger Team',
    community_contributors TEXT[], -- Names of community members involved
    acknowledgements TEXT, -- Cultural protocols and thanks
    
    -- Engagement tracking
    view_count INTEGER DEFAULT 0,
    share_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    
    -- Search
    search_vector tsvector GENERATED ALWAYS AS (
        setweight(to_tsvector('english', title), 'A') ||
        setweight(to_tsvector('english', COALESCE(excerpt, '')), 'B') ||
        setweight(to_tsvector('english', content_blocks::text), 'C')
    ) STORED
);

-- Blog Media Assets (for rich content)
CREATE TABLE IF NOT EXISTS blog_media_assets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    blog_post_id UUID REFERENCES empathy_ledger_blog_posts(id) ON DELETE CASCADE,
    
    -- Media details
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_type TEXT NOT NULL, -- 'image', 'video', 'audio', 'document'
    file_size_bytes INTEGER,
    mime_type TEXT,
    
    -- Media metadata
    alt_text TEXT, -- For accessibility
    caption TEXT,
    credit TEXT, -- Photo/video credits
    cultural_protocols TEXT, -- Specific cultural considerations
    
    -- Positioning
    order_index INTEGER DEFAULT 0,
    content_block_id TEXT, -- Links to specific content block
    
    -- Processing status
    processing_status TEXT DEFAULT 'uploaded' CHECK (processing_status IN ('uploaded', 'processing', 'ready', 'error')),
    thumbnail_url TEXT, -- For videos and large images
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Blog Comments/Community Responses (optional engagement)
CREATE TABLE IF NOT EXISTS blog_community_responses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    blog_post_id UUID REFERENCES empathy_ledger_blog_posts(id) ON DELETE CASCADE,
    
    -- Response details
    responder_name TEXT NOT NULL,
    responder_email TEXT, -- Optional, for notifications
    responder_organisation TEXT,
    
    -- Content
    response_text TEXT NOT NULL,
    response_type TEXT DEFAULT 'comment' CHECK (response_type IN ('comment', 'reflection', 'connection', 'question')),
    
    -- Moderation
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'featured')),
    moderator_notes TEXT,
    
    -- Connection to broader community
    related_story_id UUID REFERENCES stories(id), -- If response connects to their own story
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Blog Categories for organisation
CREATE TABLE IF NOT EXISTS blog_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    color_theme TEXT DEFAULT 'emerald', -- For UI theming
    icon TEXT, -- Icon name for UI
    sort_order INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Insert default categories
INSERT INTO blog_categories (name, slug, description, color_theme, icon, sort_order) VALUES
('The Empathy Ledger', 'empathy-ledger', 'Stories from the A Curious Tractor team about building empathy-driven technology', 'emerald', 'heart', 1),
('Community Voices', 'community-voices', 'Stories directly from community members and partners', 'teal', 'users', 2),
('Case Studies', 'case-studies', 'Deep dives into specific projects and their community impact', 'blue', 'book-open', 3),
('Platform Updates', 'platform-updates', 'Technical updates and new features for the Empathy Ledger platform', 'purple', 'code', 4),
('Reflections', 'reflections', 'Thoughtful pieces on community-led change and technology ethics', 'green', 'message-circle', 5)
ON CONFLICT (slug) DO NOTHING;

-- Create indices for performance
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON empathy_ledger_blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published_at ON empathy_ledger_blog_posts(published_at DESC) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_blog_posts_featured ON empathy_ledger_blog_posts(featured, published_at DESC) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_blog_posts_category ON empathy_ledger_blog_posts(blog_category);
CREATE INDEX IF NOT EXISTS idx_blog_posts_search ON empathy_ledger_blog_posts USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_blog_posts_tags ON empathy_ledger_blog_posts USING GIN(tags);

CREATE INDEX IF NOT EXISTS idx_blog_media_post ON blog_media_assets(blog_post_id);
CREATE INDEX IF NOT EXISTS idx_blog_media_type ON blog_media_assets(file_type);

CREATE INDEX IF NOT EXISTS idx_blog_responses_post ON blog_community_responses(blog_post_id);
CREATE INDEX IF NOT EXISTS idx_blog_responses_status ON blog_community_responses(status);

-- Update triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_blog_posts_updated_at BEFORE UPDATE ON empathy_ledger_blog_posts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_blog_media_updated_at BEFORE UPDATE ON blog_media_assets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_blog_responses_updated_at BEFORE UPDATE ON blog_community_responses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) for multi-tenant support
ALTER TABLE empathy_ledger_blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_community_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Blog posts - public read, authenticated write
CREATE POLICY "Blog posts are viewable by everyone" ON empathy_ledger_blog_posts
    FOR SELECT USING (status = 'published');

CREATE POLICY "Authenticated users can manage blog posts" ON empathy_ledger_blog_posts
    FOR ALL USING (auth.role() = 'authenticated');

-- Media assets - public read for published posts
CREATE POLICY "Blog media is viewable for published posts" ON blog_media_assets
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM empathy_ledger_blog_posts 
            WHERE id = blog_media_assets.blog_post_id 
            AND status = 'published'
        )
    );

CREATE POLICY "Authenticated users can manage blog media" ON blog_media_assets
    FOR ALL USING (auth.role() = 'authenticated');

-- Community responses - public read, moderated write
CREATE POLICY "Approved blog responses are viewable by everyone" ON blog_community_responses
    FOR SELECT USING (status = 'approved' OR status = 'featured');

CREATE POLICY "Anyone can submit blog responses" ON blog_community_responses
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated users can moderate responses" ON blog_community_responses
    FOR ALL USING (auth.role() = 'authenticated');

-- Categories - public read
CREATE POLICY "Blog categories are viewable by everyone" ON blog_categories
    FOR SELECT USING (active = true);

CREATE POLICY "Authenticated users can manage categories" ON blog_categories
    FOR ALL USING (auth.role() = 'authenticated');

-- Create a function to get blog posts with full details
CREATE OR REPLACE FUNCTION get_published_blog_posts(
    limit_count INTEGER DEFAULT 10,
    offset_count INTEGER DEFAULT 0,
    category_filter TEXT DEFAULT NULL,
    featured_only BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    slug TEXT,
    excerpt TEXT,
    reading_time_minutes INTEGER,
    featured_image_url TEXT,
    blog_category TEXT,
    tags TEXT[],
    published_at TIMESTAMP WITH TIME ZONE,
    featured BOOLEAN,
    author_name TEXT,
    author_role TEXT,
    view_count INTEGER,
    media_count BIGINT,
    response_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        bp.id,
        bp.title,
        bp.slug,
        bp.excerpt,
        bp.reading_time_minutes,
        bp.featured_image_url,
        bp.blog_category,
        bp.tags,
        bp.published_at,
        bp.featured,
        bp.author_name,
        bp.author_role,
        bp.view_count,
        COALESCE(media.count, 0) as media_count,
        COALESCE(responses.count, 0) as response_count
    FROM empathy_ledger_blog_posts bp
    LEFT JOIN (
        SELECT blog_post_id, COUNT(*) as count 
        FROM blog_media_assets 
        GROUP BY blog_post_id
    ) media ON bp.id = media.blog_post_id
    LEFT JOIN (
        SELECT blog_post_id, COUNT(*) as count 
        FROM blog_community_responses 
        WHERE status IN ('approved', 'featured')
        GROUP BY blog_post_id
    ) responses ON bp.id = responses.blog_post_id
    WHERE bp.status = 'published'
    AND (category_filter IS NULL OR bp.blog_category = category_filter)
    AND (featured_only = FALSE OR bp.featured = TRUE)
    ORDER BY bp.featured DESC, bp.published_at DESC
    LIMIT limit_count
    OFFSET offset_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON SCHEMA public IS 'Empathy Ledger Blog Stories Integration - Extends stories architecture for community-controlled blogging';