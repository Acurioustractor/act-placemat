-- ACT Public Dashboard - Supabase Database Schema
-- A revolutionary community engagement platform built on empathy, innovation, and open collaboration

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- Enable Row Level Security
ALTER DATABASE postgres SET row_security = on;

-- =============================================
-- CORE STORYTELLING TABLES
-- =============================================

-- Stories: The heart of community impact narrative
CREATE TABLE stories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    excerpt TEXT,
    body_md TEXT NOT NULL,
    hero_image_url TEXT,
    hero_image_caption TEXT,
    hero_image_credit TEXT,
    tags TEXT[] DEFAULT '{}',
    author TEXT,
    community_voice BOOLEAN DEFAULT false, -- True if written by community member
    featured BOOLEAN DEFAULT false,
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    view_count INTEGER DEFAULT 0,
    consent_verified BOOLEAN DEFAULT false,
    impact_metrics JSONB, -- Associated metrics for this story
    related_projects UUID[], -- Array of project IDs
    ethical_review_status TEXT DEFAULT 'pending' -- pending, approved, needs_revision
);

-- Metrics: Evidence-based impact tracking
CREATE TABLE metrics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    label TEXT NOT NULL,
    value NUMERIC NOT NULL,
    unit TEXT NOT NULL,
    category TEXT NOT NULL, -- community, environment, innovation, wellbeing
    subcategory TEXT,
    period_start DATE,
    period_end DATE,
    method_note TEXT,
    data_source TEXT,
    confidence_level TEXT DEFAULT 'high', -- high, medium, low
    featured BOOLEAN DEFAULT false,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- PROJECT & PROGRAM TRACKING
-- =============================================

-- Projects: Seeds growing into programs
CREATE TABLE projects (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL DEFAULT 'seed', -- seed, sprouting, growing, harvesting, completed, dormant
    summary TEXT NOT NULL,
    description_md TEXT,
    image_url TEXT,
    pillar TEXT NOT NULL, -- justice, wellbeing, innovation, environment
    geography TEXT,
    start_date DATE,
    end_date DATE,
    next_milestone_date DATE,
    next_milestone_description TEXT,
    community_partner TEXT,
    lead_organization TEXT,
    funding_status TEXT, -- exploring, applied, funded, complete
    funding_amount NUMERIC,
    tags TEXT[] DEFAULT '{}',
    featured BOOLEAN DEFAULT false,
    public_visible BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Project Updates: Living progress narrative
CREATE TABLE project_updates (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body_md TEXT NOT NULL,
    image_url TEXT,
    update_type TEXT DEFAULT 'progress', -- progress, milestone, challenge, celebration, learning
    published_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    author TEXT,
    community_contributed BOOLEAN DEFAULT false
);

-- =============================================
-- PARTNERSHIP & COMMUNITY NETWORK
-- =============================================

-- Partners: The ecosystem of collaboration
CREATE TABLE partners (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- community, talent, funder, government, alliance
    category TEXT, -- indigenous_led, youth_focused, environmental, etc.
    logo_url TEXT,
    website_url TEXT,
    description TEXT,
    collaboration_focus TEXT,
    location TEXT,
    partnership_since DATE,
    featured BOOLEAN DEFAULT false,
    relationship_strength TEXT DEFAULT 'emerging', -- emerging, active, deep, cornerstone
    public_visible BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Partner Testimonials: Community voices about collaboration
CREATE TABLE partner_testimonials (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    partner_id UUID REFERENCES partners(id) ON DELETE CASCADE,
    testimonial_text TEXT NOT NULL,
    author_name TEXT NOT NULL,
    author_role TEXT,
    given_date DATE DEFAULT CURRENT_DATE,
    featured BOOLEAN DEFAULT false,
    consent_verified BOOLEAN DEFAULT false
);

-- =============================================
-- COMMUNITY ENGAGEMENT & PARTICIPATION
-- =============================================

-- Newsletter Subscribers: Building community connection
CREATE TABLE newsletter_subscribers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    first_name TEXT,
    last_name TEXT,
    source TEXT, -- website, event, referral, etc.
    interests TEXT[], -- justice, environment, innovation, storytelling
    location TEXT,
    subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    consent_marketing BOOLEAN DEFAULT true
);

-- Community Inquiries: Pathways to collaboration
CREATE TABLE community_inquiries (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    organization TEXT,
    inquiry_type TEXT NOT NULL, -- partnership, volunteer, story_share, funding, general
    subject TEXT,
    message TEXT NOT NULL,
    location TEXT,
    how_heard TEXT,
    follow_up_consent BOOLEAN DEFAULT true,
    status TEXT DEFAULT 'new', -- new, acknowledged, in_discussion, resolved, archived
    assigned_to TEXT,
    response_sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Volunteer Interest: Community contribution pathways
CREATE TABLE volunteer_interest (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    skills TEXT[],
    interests TEXT[],
    availability TEXT,
    location TEXT,
    experience_level TEXT, -- beginner, intermediate, experienced, expert
    preferred_contribution TEXT, -- storytelling, design, tech, community_outreach, events
    message TEXT,
    status TEXT DEFAULT 'pending', -- pending, contacted, onboarded, active, inactive
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- MEDIA & CONTENT MANAGEMENT
-- =============================================

-- Media Assets: Ethical and consented visual storytelling
CREATE TABLE media_assets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    file_url TEXT NOT NULL,
    file_type TEXT NOT NULL, -- image, video, audio, document
    title TEXT,
    caption TEXT,
    alt_text TEXT,
    credit TEXT,
    location_taken TEXT,
    date_taken DATE,
    consent_verified BOOLEAN DEFAULT false,
    consent_expiry DATE,
    usage_rights TEXT, -- full, limited, attribution_required
    tags TEXT[] DEFAULT '{}',
    featured BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Content Calendar: Strategic storytelling planning
CREATE TABLE content_calendar (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    content_type TEXT NOT NULL, -- story, update, metric_spotlight, partner_feature
    planned_date DATE NOT NULL,
    status TEXT DEFAULT 'planned', -- planned, in_progress, ready, published, cancelled
    assigned_to TEXT,
    notes TEXT,
    related_project UUID REFERENCES projects(id),
    related_story UUID REFERENCES stories(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- ANALYTICS & INSIGHTS
-- =============================================

-- Website Analytics: Understanding community engagement
CREATE TABLE website_analytics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    page_path TEXT NOT NULL,
    visitor_id TEXT, -- Anonymous visitor tracking
    event_type TEXT NOT NULL, -- page_view, story_read, form_submit, newsletter_signup
    event_data JSONB,
    referrer TEXT,
    device_type TEXT,
    location_country TEXT,
    session_duration INTEGER,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Stories indexes
CREATE INDEX idx_stories_published_featured ON stories(published_at DESC, featured);
CREATE INDEX idx_stories_tags ON stories USING GIN(tags);
CREATE INDEX idx_stories_slug ON stories(slug);

-- Projects indexes
CREATE INDEX idx_projects_status_featured ON projects(status, featured);
CREATE INDEX idx_projects_pillar ON projects(pillar);
CREATE INDEX idx_projects_slug ON projects(slug);

-- Metrics indexes
CREATE INDEX idx_metrics_category_featured ON metrics(category, featured);
CREATE INDEX idx_metrics_period ON metrics(period_end DESC);

-- Partners indexes
CREATE INDEX idx_partners_type_featured ON partners(type, featured);
CREATE INDEX idx_partners_relationship ON partners(relationship_strength);

-- Analytics indexes
CREATE INDEX idx_analytics_timestamp ON website_analytics(timestamp DESC);
CREATE INDEX idx_analytics_event_type ON website_analytics(event_type);

-- =============================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE volunteer_interest ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_calendar ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_analytics ENABLE ROW LEVEL SECURITY;

-- Public read policies for content
CREATE POLICY "Public can view published stories" ON stories
    FOR SELECT USING (published_at IS NOT NULL AND published_at <= NOW());

CREATE POLICY "Public can view metrics" ON metrics
    FOR SELECT USING (true);

CREATE POLICY "Public can view visible projects" ON projects
    FOR SELECT USING (public_visible = true);

CREATE POLICY "Public can view project updates" ON project_updates
    FOR SELECT USING (
        project_id IN (SELECT id FROM projects WHERE public_visible = true)
    );

CREATE POLICY "Public can view visible partners" ON partners
    FOR SELECT USING (public_visible = true);

CREATE POLICY "Public can view partner testimonials" ON partner_testimonials
    FOR SELECT USING (
        partner_id IN (SELECT id FROM partners WHERE public_visible = true)
    );

-- Admin policies (using service role)
CREATE POLICY "Service role has full access" ON stories
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access" ON metrics
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access" ON projects
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access" ON project_updates
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access" ON partners
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access" ON partner_testimonials
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access" ON newsletter_subscribers
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access" ON community_inquiries
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access" ON volunteer_interest
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access" ON media_assets
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access" ON content_calendar
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access" ON website_analytics
    FOR ALL USING (auth.role() = 'service_role');

-- Public insert policies for forms
CREATE POLICY "Anyone can subscribe to newsletter" ON newsletter_subscribers
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can submit inquiries" ON community_inquiries
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can express volunteer interest" ON volunteer_interest
    FOR INSERT WITH CHECK (true);

-- =============================================
-- FUNCTIONS FOR COMMON OPERATIONS
-- =============================================

-- Update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update triggers
CREATE TRIGGER update_stories_updated_at BEFORE UPDATE ON stories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_metrics_updated_at BEFORE UPDATE ON metrics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_partners_updated_at BEFORE UPDATE ON partners
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to get featured content for homepage
CREATE OR REPLACE FUNCTION get_homepage_content()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'featured_stories', (
            SELECT json_agg(row_to_json(s))
            FROM (
                SELECT id, title, slug, excerpt, hero_image_url, published_at, tags, author
                FROM stories 
                WHERE featured = true AND published_at IS NOT NULL AND published_at <= NOW()
                ORDER BY published_at DESC
                LIMIT 3
            ) s
        ),
        'key_metrics', (
            SELECT json_agg(row_to_json(m))
            FROM (
                SELECT label, value, unit, category
                FROM metrics 
                WHERE featured = true
                ORDER BY display_order, created_at DESC
                LIMIT 6
            ) m
        ),
        'active_projects', (
            SELECT json_agg(row_to_json(p))
            FROM (
                SELECT id, name, slug, summary, image_url, status, pillar
                FROM projects 
                WHERE status IN ('sprouting', 'growing') AND public_visible = true
                ORDER BY updated_at DESC
                LIMIT 4
            ) p
        ),
        'featured_partners', (
            SELECT json_agg(row_to_json(part))
            FROM (
                SELECT name, type, logo_url, description
                FROM partners 
                WHERE featured = true AND public_visible = true
                ORDER BY relationship_strength DESC, name
                LIMIT 6
            ) part
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to track story views
CREATE OR REPLACE FUNCTION increment_story_views(story_slug TEXT)
RETURNS VOID AS $$
BEGIN
    UPDATE stories 
    SET view_count = view_count + 1 
    WHERE slug = story_slug;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- INITIAL SEED DATA
-- =============================================

-- Insert sample content to demonstrate the platform
INSERT INTO stories (title, slug, excerpt, body_md, hero_image_url, tags, author, featured, published_at, consent_verified) VALUES
(
    'Seeds of Change: How the Great Bed Transformed Community Care',
    'great-bed-community-care',
    'When Elders in remote communities struggled with hospital beds that couldn''t be properly cleaned, a listening circle became an innovation lab.',
    '# The Story Behind the Great Bed

In the heart of a remote community, a simple conversation over tea became the seed of a revolutionary idea. Elders shared their frustration with hospital beds that were impossible to clean properly in their environment. What emerged was not just a product, but a new way of designing with community wisdom at the center.

## Listening First, Building Together

The journey began with what we call a "listening circle" - not a focus group or consultation, but a genuine conversation between equals. Community Elders, healthcare workers, and designers sat together, sharing stories and challenges.

"We don''t need another product designed for us," said Mary, an Elder and community health advocate. "We need something designed with us."

## Innovation Born from Necessity

From these conversations emerged the Great Bed - a hospital bed designed to be completely washable, easy to maintain, and built to last in challenging environments. But more importantly, it represented a new approach: community-led design that honors lived experience.

The bed features:
- Waterproof, antimicrobial materials chosen by community members
- Simple mechanisms that can be repaired locally
- Design elements that respect cultural practices around care

## Impact Beyond the Product

Today, the Great Bed is being piloted in three communities, but its real impact goes deeper. The design process has become a model for other initiatives, showing that the most innovative solutions come from listening to those who understand the problem best.

"This isn''t just about a bed," reflects Sarah, a designer on the project. "It''s about changing how we think about innovation - from extractive to collaborative."

## Growing the Model

The success of the Great Bed has sparked interest from other communities facing similar challenges. We''re now exploring how this community-led design approach can address other needs - from accessible housing to sustainable energy solutions.

*This story was developed with full consent and collaboration from the community members involved.*',
    'https://example.com/great-bed-hero.jpg',
    ARRAY['goods', 'remote-communities', 'health', 'design', 'elders'],
    'Community Design Team',
    true,
    NOW() - INTERVAL '2 weeks',
    true
),
(
    'First 10 Voices: The 170 Ripples Project Takes Shape',
    '170-ripples-first-voices',
    'Youth justice practitioners share their vision for the next 20 years of community-led change.',
    '# Amplifying Frontline Wisdom

The 170 Ripples project was born from a simple recognition: the people closest to youth justice challenges often have the clearest vision for solutions. Our goal is to gather 170 voices from across the community - practitioners, young people, families, and allies - to map a 20-year vision for transformation.

## The First 10 Voices

In our initial conversations, powerful themes emerged:

**"We need to stop treating symptoms and start growing solutions from the ground up."** - Maya, youth worker

**"Every young person has a story worth hearing. Our job is to create the conditions where they can tell it safely."** - James, former system-involved youth, now advocate

**"Families know their children best. Why don''t we design systems that trust that knowledge?"** - Rosa, parent advocate

## Common Threads

Across all conversations, three clear priorities emerged:

1. **Relationship-centered approaches** that prioritize connection over punishment
2. **Community ownership** of solutions rather than top-down interventions  
3. **Cultural responsiveness** that honors diverse ways of understanding healing

## Building the Vision Together

Each conversation adds another ripple to our understanding. We''re not just collecting opinions - we''re weaving together a tapestry of wisdom that will guide practical action.

The next phase involves deeper community conversations, bringing voices together to identify concrete next steps for transformation.

*All quotes shared with permission. Names changed for privacy where requested.*',
    'https://example.com/ripples-hero.jpg',
    ARRAY['youth-justice', 'practitioners', 'community-voices', '170-ripples'],
    'Ripples Research Team',
    true,
    NOW() - INTERVAL '1 week',
    true
);

-- Insert sample metrics
INSERT INTO metrics (label, value, unit, category, subcategory, featured, display_order, method_note) VALUES
('Communities Actively Engaged', 7, 'communities', 'community', 'partnerships', true, 1, 'Deep partnerships with ongoing projects'),
('Stories Published', 18, 'stories', 'community', 'storytelling', true, 2, 'Community-generated narratives with full consent'),
('Youth Justice Practitioners Consulted', 47, 'people', 'community', 'consultation', true, 3, 'Part of 170 Ripples project'),
('Design Prototypes Co-Created', 3, 'prototypes', 'innovation', 'design', true, 4, 'Community-led design processes'),
('Volunteer Hours Contributed', 320, 'hours', 'community', 'engagement', true, 5, 'Skilled volunteers across projects'),
('Funding Secured for Community Projects', 85000, 'AUD', 'impact', 'funding', true, 6, 'Direct funding to community-led initiatives');

-- Insert sample projects
INSERT INTO projects (name, slug, status, summary, pillar, geography, start_date, next_milestone_date, next_milestone_description, featured, tags) VALUES
(
    'JusticeHub',
    'justice-hub',
    'growing',
    'A community-driven platform connecting young people with holistic support services and peer networks.',
    'justice',
    'Victoria, Australia',
    '2024-06-01',
    '2025-09-15',
    'Beta platform launch with first cohort of 50 young people',
    true,
    ARRAY['youth-justice', 'platform', 'peer-support']
),
(
    'Goods: The Great Bed',
    'goods-great-bed',
    'sprouting',
    'Co-designing washable, maintainable hospital beds with remote community Elders.',
    'wellbeing',
    'Remote Australia',
    '2024-08-01',
    '2025-10-30',
    'Complete first production run and begin community pilots',
    true,
    ARRAY['goods', 'design', 'health', 'remote-communities']
),
(
    '170 Ripples',
    '170-ripples',
    'growing',
    'Gathering 170 voices to map a 20-year vision for community-led youth justice transformation.',
    'justice',
    'National',
    '2024-05-01',
    '2025-11-01',
    'Complete all 170 interviews and publish synthesis report',
    true,
    ARRAY['youth-justice', 'research', 'community-voices', 'policy']
);

-- Insert sample partners
INSERT INTO partners (name, type, description, relationship_strength, featured, partnership_since) VALUES
(
    'First Nations Youth Justice Alliance',
    'community',
    'Leading Indigenous-led organization working on culturally responsive youth justice approaches.',
    'cornerstone',
    true,
    '2023-03-01'
),
(
    'Community Health Innovation Network',
    'alliance',
    'Collaborative network focused on community-driven health solutions in underserved areas.',
    'active',
    true,
    '2024-01-15'
),
(
    'The Catalyst Foundation',
    'funder',
    'Impact-focused foundation supporting grassroots innovation in social justice.',
    'active',
    true,
    '2024-02-01'
),
(
    'Design Justice Collective',
    'talent',
    'Community of designers committed to equity-centered design practices.',
    'deep',
    true,
    '2023-09-01'
);

-- =============================================
-- FINAL SETUP NOTES
-- =============================================

-- To complete setup:
-- 1. Configure Supabase Storage buckets for media files
-- 2. Set up email integration for form notifications
-- 3. Configure analytics tracking
-- 4. Create admin user accounts
-- 5. Test all RLS policies

COMMENT ON DATABASE postgres IS 'ACT Public Dashboard - Building community-led change through story, data, and connection';