-- Enhanced Stories Table Integration for Blog Functionality
-- This extends your existing stories table to support rich blog content
-- while maintaining compatibility with your current system

-- First, let's enhance the existing stories table structure
-- (Run this to add blog functionality to existing stories)

-- Add blog-specific columns to existing stories table
ALTER TABLE stories 
ADD COLUMN IF NOT EXISTS story_type TEXT DEFAULT 'story' CHECK (story_type IN ('story', 'blog', 'case-study', 'update'));

ALTER TABLE stories 
ADD COLUMN IF NOT EXISTS content_blocks JSONB DEFAULT '[]'::jsonb;

ALTER TABLE stories 
ADD COLUMN IF NOT EXISTS featured_image_url TEXT;

ALTER TABLE stories 
ADD COLUMN IF NOT EXISTS reading_time_minutes INTEGER DEFAULT 5;

ALTER TABLE stories 
ADD COLUMN IF NOT EXISTS excerpt TEXT;

ALTER TABLE stories 
ADD COLUMN IF NOT EXISTS slug TEXT;

ALTER TABLE stories 
ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT false;

ALTER TABLE stories 
ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;

ALTER TABLE stories 
ADD COLUMN IF NOT EXISTS share_count INTEGER DEFAULT 0;

ALTER TABLE stories 
ADD COLUMN IF NOT EXISTS author_name TEXT;

ALTER TABLE stories 
ADD COLUMN IF NOT EXISTS author_role TEXT;

ALTER TABLE stories 
ADD COLUMN IF NOT EXISTS community_contributors TEXT[] DEFAULT '{}';

ALTER TABLE stories 
ADD COLUMN IF NOT EXISTS acknowledgements TEXT;

ALTER TABLE stories 
ADD COLUMN IF NOT EXISTS blog_category TEXT;

-- Add search capabilities
ALTER TABLE stories 
ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Create function to update search vector
CREATE OR REPLACE FUNCTION update_stories_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
                        setweight(to_tsvector('english', COALESCE(NEW.excerpt, '')), 'B') ||
                        setweight(to_tsvector('english', COALESCE(NEW.content, '')), 'C') ||
                        setweight(to_tsvector('english', COALESCE(NEW.content_blocks::text, '')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update search vector
DROP TRIGGER IF EXISTS update_stories_search_trigger ON stories;
CREATE TRIGGER update_stories_search_trigger
    BEFORE INSERT OR UPDATE ON stories
    FOR EACH ROW EXECUTE FUNCTION update_stories_search_vector();

-- Create unique index on slug for blog stories
CREATE UNIQUE INDEX IF NOT EXISTS idx_stories_slug_unique 
ON stories(slug) 
WHERE slug IS NOT NULL AND story_type IN ('blog', 'case-study', 'update');

-- Create indexes for blog functionality
CREATE INDEX IF NOT EXISTS idx_stories_type ON stories(story_type);
CREATE INDEX IF NOT EXISTS idx_stories_blog_category ON stories(blog_category) WHERE story_type IN ('blog', 'case-study', 'update');
CREATE INDEX IF NOT EXISTS idx_stories_featured ON stories(featured, created_at DESC) WHERE story_type IN ('blog', 'case-study', 'update');
CREATE INDEX IF NOT EXISTS idx_stories_search ON stories USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_stories_published_blogs ON stories(created_at DESC) WHERE story_type IN ('blog', 'case-study', 'update');

-- Story Media Assets Table (for rich content)
CREATE TABLE IF NOT EXISTS story_media_assets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
    
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
    
    -- Positioning in content
    content_block_id TEXT, -- Links to specific content block
    order_index INTEGER DEFAULT 0,
    
    -- Processing status
    processing_status TEXT DEFAULT 'ready' CHECK (processing_status IN ('uploading', 'processing', 'ready', 'error')),
    thumbnail_url TEXT, -- For videos and large images
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Story Community Responses (for engagement)
CREATE TABLE IF NOT EXISTS story_responses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
    
    -- Response details
    responder_name TEXT NOT NULL,
    responder_email TEXT, -- Optional, for notifications
    responder_organisation TEXT,
    responder_location TEXT,
    
    -- Content
    response_text TEXT NOT NULL,
    response_type TEXT DEFAULT 'comment' CHECK (response_type IN ('comment', 'reflection', 'connection', 'question', 'story-response')),
    
    -- Moderation
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'featured')),
    moderator_notes TEXT,
    
    -- Connection to their own story
    related_story_id UUID REFERENCES stories(id), -- If response connects to their own story
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create indexes for media and responses
CREATE INDEX IF NOT EXISTS idx_story_media_story ON story_media_assets(story_id);
CREATE INDEX IF NOT EXISTS idx_story_media_type ON story_media_assets(file_type);
CREATE INDEX IF NOT EXISTS idx_story_responses_story ON story_responses(story_id);
CREATE INDEX IF NOT EXISTS idx_story_responses_status ON story_responses(status);

-- Update triggers for timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_story_media_updated_at BEFORE UPDATE ON story_media_assets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_story_responses_updated_at BEFORE UPDATE ON story_responses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to generate slug from title
CREATE OR REPLACE FUNCTION generate_story_slug(title_text TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN lower(
        regexp_replace(
            regexp_replace(title_text, '[^a-zA-Z0-9\s-]', '', 'g'),
            '\s+', '-', 'g'
        )
    );
END;
$$ LANGUAGE plpgsql;

-- Function to increment view count
CREATE OR REPLACE FUNCTION increment_story_view_count(story_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE stories 
  SET view_count = COALESCE(view_count, 0) + 1 
  WHERE id = story_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get stories with optional blog filtering
CREATE OR REPLACE FUNCTION get_stories_with_filters(
    limit_count INTEGER DEFAULT 10,
    offset_count INTEGER DEFAULT 0,
    story_type_filter TEXT DEFAULT NULL,
    category_filter TEXT DEFAULT NULL,
    featured_only BOOLEAN DEFAULT FALSE,
    search_term TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    slug TEXT,
    excerpt TEXT,
    content TEXT,
    content_blocks JSONB,
    featured_image_url TEXT,
    story_type TEXT,
    blog_category TEXT,
    tags TEXT[],
    featured BOOLEAN,
    author_name TEXT,
    author_role TEXT,
    community_contributors TEXT[],
    view_count INTEGER,
    reading_time_minutes INTEGER,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    media_count BIGINT,
    response_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.title,
        s.slug,
        s.excerpt,
        s.content,
        s.content_blocks,
        s.featured_image_url,
        s.story_type,
        s.blog_category,
        s.tags,
        s.featured,
        s.author_name,
        s.author_role,
        s.community_contributors,
        COALESCE(s.view_count, 0) as view_count,
        COALESCE(s.reading_time_minutes, 5) as reading_time_minutes,
        s.created_at,
        s.updated_at,
        COALESCE(media.count, 0) as media_count,
        COALESCE(responses.count, 0) as response_count
    FROM stories s
    LEFT JOIN (
        SELECT story_id, COUNT(*) as count 
        FROM story_media_assets 
        GROUP BY story_id
    ) media ON s.id = media.story_id
    LEFT JOIN (
        SELECT story_id, COUNT(*) as count 
        FROM story_responses 
        WHERE status IN ('approved', 'featured')
        GROUP BY story_id
    ) responses ON s.id = responses.story_id
    WHERE 
        (story_type_filter IS NULL OR s.story_type = story_type_filter)
        AND (category_filter IS NULL OR s.blog_category = category_filter)
        AND (featured_only = FALSE OR s.featured = TRUE)
        AND (search_term IS NULL OR s.search_vector @@ plainto_tsquery('english', search_term))
    ORDER BY 
        CASE WHEN featured_only THEN s.featured ELSE FALSE END DESC,
        s.created_at DESC
    LIMIT limit_count
    OFFSET offset_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update existing RLS policies to include new columns
DROP POLICY IF EXISTS "Users can view their own stories" ON stories;
DROP POLICY IF EXISTS "Users can insert their own stories" ON stories;
DROP POLICY IF EXISTS "Users can update their own stories" ON stories;

-- Enable RLS if not already enabled
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_responses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for stories (updated)
CREATE POLICY "Anyone can view published stories" ON stories
    FOR SELECT USING (
        CASE 
            WHEN story_type IN ('blog', 'case-study', 'update') THEN true -- Blogs are public
            ELSE auth.uid() = user_id -- Original stories require user ownership
        END
    );

CREATE POLICY "Users can create stories" ON stories
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own stories" ON stories
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own stories" ON stories
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for media assets
CREATE POLICY "Anyone can view media for published stories" ON story_media_assets
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM stories 
            WHERE id = story_media_assets.story_id 
            AND (
                story_type IN ('blog', 'case-study', 'update') 
                OR auth.uid() = user_id
            )
        )
    );

CREATE POLICY "Users can manage media for their stories" ON story_media_assets
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM stories 
            WHERE id = story_media_assets.story_id 
            AND auth.uid() = user_id
        )
    );

-- RLS Policies for responses
CREATE POLICY "Anyone can view approved responses" ON story_responses
    FOR SELECT USING (status IN ('approved', 'featured'));

CREATE POLICY "Anyone can submit responses" ON story_responses
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Story owners can moderate responses" ON story_responses
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM stories 
            WHERE id = story_responses.story_id 
            AND auth.uid() = user_id
        )
    );

-- Insert sample blog categories if they don't exist
INSERT INTO stories (
    title,
    slug,
    excerpt,
    content,
    story_type,
    blog_category,
    tags,
    featured,
    author_name,
    author_role,
    reading_time_minutes,
    content_blocks,
    user_id
) VALUES (
    'The Revolution is Community-Led: How A Curious Tractor is Powering Grassroots Change',
    'revolution-community-led-act-powering-change',
    'We''ve discovered something profound in our work with grassroots communities and organisations: the ability to help them transform their knowledge, stories, and programs into living ecosystems.',
    '# The Revolution is Community-Led: How A Curious Tractor is Powering Grassroots Change

*An Empathy Ledger Story by A Curious Tractor*

## The PTO Amplified: From Strategy to Living Ecosystems

We''ve discovered something profound in our work with grassroots communities and organisations: the ability to help them think about their inputs—knowledge, stories, and programs—and transform them into living ecosystems where everyone engaged becomes an active participant in growth.

Through careful listening and authentic relationship-building, we''ve developed patterns that honour people''s stories by giving them database entries that they truly own. This isn''t just data collection—it''s recognition that **their story belongs to them**, they have complete agency over it, yet it syncs to a greater whole that amplifies their voice and impact.

## The Architecture of Empathy: How We Built Our System

### Strategy Backend: The Foundation
We''ve constructed a comprehensive system for A Curious Tractor where we maintain a strategy backend storing all projects and processes. This connects seamlessly to our operations and supports:
- **Community understanding** through authentic relationship tracking
- **Revenue generation** that prioritises community benefit  
- **Project work** guided by community wisdom
- **Notion integration** that keeps everything synchronised

### Supabase Stories Database: Community Voice Central
Our Supabase database serves as the heartbeat of community storytelling. Every story from every project we work with flows through here, ensuring we set them up properly using the **Empathy Ledger methodology**—technology that embodies our values of care, respect, and authentic representation.

## The Meta-Circularity Revolution

Here''s what makes this truly revolutionary: **we can replicate this entire system for our partners**. Each community organisation can have their own website dashboard that they update, supported by our content expertise and ongoing relationship.

**This is about aligning communities with tools that support them** to have the resources and practices needed to compete with systems and large organisations that have worked out the logic of growth and maintaining power over resources and relationships.

## The Future We''re Building Together

**The revolution is community-led.** Our role is to provide the tools, technology, and authentic relationships that amplify what communities are already doing brilliantly.

Through the Empathy Ledger, we''re not just changing how stories are told—we''re **changing who gets to tell them, who benefits from them, and how they create lasting transformation**.

**This is how the future becomes community-controlled: one authentic relationship, one empowered story, one supported leader at a time.**

*🚜 A Curious Tractor: Engineering the Community-Led Future*',
    'blog',
    'empathy-ledger',
    '{"community-led", "empathy-ledger", "grassroots", "transformation"}',
    true,
    'A Curious Tractor',
    'Empathy Ledger Team',
    8,
    '[
        {
            "id": "block-1",
            "type": "text",
            "content": {
                "text": "We''ve discovered something profound in our work with grassroots communities and organisations: the ability to help them think about their inputs—knowledge, stories, and programs—and transform them into living ecosystems where everyone engaged becomes an active participant in growth.",
                "format": "paragraph"
            },
            "order": 0
        },
        {
            "id": "block-2", 
            "type": "quote",
            "content": {
                "text": "The revolution is community-led. Our role is to provide the tools, technology, and authentic relationships that amplify what communities are already doing brilliantly.",
                "attribution": "A Curious Tractor Team",
                "context": "Empathy Ledger Philosophy"
            },
            "order": 1
        }
    ]'::jsonb,
    '00000000-0000-0000-0000-000000000000'::uuid  -- Placeholder user ID
) ON CONFLICT (slug) DO NOTHING;

COMMENT ON TABLE stories IS 'Enhanced stories table supporting both traditional stories and rich blog content with media';
COMMENT ON TABLE story_media_assets IS 'Media assets (images, videos, documents) associated with stories';
COMMENT ON TABLE story_responses IS 'Community responses and engagement with stories';