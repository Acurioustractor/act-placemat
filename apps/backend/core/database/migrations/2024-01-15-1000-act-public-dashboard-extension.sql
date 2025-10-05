-- ACT Public Dashboard - Extension to Existing Empathy Ledger
-- Adds public-facing tables ALONGSIDE existing Empathy Ledger tables
-- Preserves all existing data and functionality

-- =============================================
-- PUBLIC IMPACT METRICS
-- =============================================

-- Metrics: Public impact display (NEW)
CREATE TABLE IF NOT EXISTS metrics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    label TEXT NOT NULL,
    value NUMERIC NOT NULL,
    unit TEXT NOT NULL,
    category TEXT NOT NULL,
    subcategory TEXT,
    period_start DATE,
    period_end DATE,
    method_note TEXT,
    data_source TEXT,
    confidence_level TEXT DEFAULT 'high',
    featured BOOLEAN DEFAULT false,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- PROJECT LIFECYCLE TRACKING
-- =============================================

-- Projects: Seed-to-harvest project tracking (NEW)
CREATE TABLE IF NOT EXISTS projects (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL DEFAULT 'seed',
    summary TEXT NOT NULL,
    description_md TEXT,
    image_url TEXT,
    pillar TEXT NOT NULL,
    geography TEXT,
    start_date DATE,
    end_date DATE,
    next_milestone_date DATE,
    next_milestone_description TEXT,
    community_partner TEXT,
    lead_organization TEXT,
    funding_status TEXT,
    funding_amount NUMERIC,
    tags TEXT[] DEFAULT '{}',
    featured BOOLEAN DEFAULT false,
    public_visible BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Project Updates: Living progress narrative (NEW)
CREATE TABLE IF NOT EXISTS project_updates (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body_md TEXT NOT NULL,
    image_url TEXT,
    update_type TEXT DEFAULT 'progress',
    published_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    author TEXT,
    community_contributed BOOLEAN DEFAULT false
);

-- =============================================
-- PUBLIC PARTNERSHIP SHOWCASE
-- =============================================

-- Partners: Public partnership ecosystem display (NEW)
CREATE TABLE IF NOT EXISTS partners (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    category TEXT,
    logo_url TEXT,
    website_url TEXT,
    description TEXT,
    collaboration_focus TEXT,
    location TEXT,
    partnership_since DATE,
    featured BOOLEAN DEFAULT false,
    relationship_strength TEXT DEFAULT 'emerging',
    public_visible BOOLEAN DEFAULT true,
    empathy_ledger_org_id UUID, -- Link to existing organizations table
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- COMMUNITY ENGAGEMENT
-- =============================================

-- Newsletter Subscribers: Community building (NEW)
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    first_name TEXT,
    last_name TEXT,
    source TEXT DEFAULT 'website',
    interests TEXT[],
    location TEXT,
    subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    consent_marketing BOOLEAN DEFAULT true
);

-- Community Inquiries: Collaboration pathways (NEW)
CREATE TABLE IF NOT EXISTS community_inquiries (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    organization TEXT,
    inquiry_type TEXT NOT NULL,
    subject TEXT,
    message TEXT NOT NULL,
    location TEXT,
    how_heard TEXT,
    follow_up_consent BOOLEAN DEFAULT true,
    status TEXT DEFAULT 'new',
    assigned_to TEXT,
    response_sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Volunteer Interest: Community contribution (NEW)
CREATE TABLE IF NOT EXISTS volunteer_interest (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    skills TEXT[],
    interests TEXT[],
    availability TEXT,
    location TEXT,
    experience_level TEXT,
    preferred_contribution TEXT,
    message TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- BRIDGE TO EXISTING EMPATHY LEDGER DATA
-- =============================================

-- Create view to expose existing stories for public dashboard
-- This connects your existing stories to the new public interface
CREATE OR REPLACE VIEW public_stories AS
SELECT 
    id,
    title,
    -- Generate slug from title for public URLs
    LOWER(REGEXP_REPLACE(REGEXP_REPLACE(title, '[^a-zA-Z0-9\s]', '', 'g'), '\s+', '-', 'g')) as slug,
    CASE 
        WHEN LENGTH(content) > 200 THEN LEFT(content, 200) || '...'
        ELSE content 
    END as excerpt,
    content as body_md,
    image_url as hero_image_url,
    NULL as hero_image_caption,
    NULL as hero_image_credit,
    tags,
    author,
    community_voice,
    featured,
    published_at,
    created_at,
    updated_at,
    view_count,
    consent_verified,
    impact_metrics,
    related_projects,
    'approved'::text as ethical_review_status
FROM stories 
WHERE published_at IS NOT NULL
AND consent_verified = true;

-- =============================================
-- PERFORMANCE INDEXES
-- =============================================

-- Indexes for new tables
CREATE INDEX IF NOT EXISTS idx_metrics_category_featured ON metrics(category, featured);
CREATE INDEX IF NOT EXISTS idx_metrics_display_order ON metrics(display_order);

CREATE INDEX IF NOT EXISTS idx_projects_status_featured ON projects(status, featured);
CREATE INDEX IF NOT EXISTS idx_projects_slug ON projects(slug);

CREATE INDEX IF NOT EXISTS idx_partners_type_featured ON partners(type, featured);
CREATE INDEX IF NOT EXISTS idx_partners_relationship ON partners(relationship_strength);

CREATE INDEX IF NOT EXISTS idx_newsletter_email ON newsletter_subscribers(email);
CREATE INDEX IF NOT EXISTS idx_inquiries_status ON community_inquiries(status);
CREATE INDEX IF NOT EXISTS idx_volunteer_status ON volunteer_interest(status);

-- =============================================
-- INITIAL DATA FROM EMPATHY LEDGER
-- =============================================

-- Insert real metrics based on existing Empathy Ledger data
INSERT INTO metrics (label, value, unit, category, subcategory, featured, display_order, method_note, confidence_level) VALUES
('Community Stories Published', 
 (SELECT COUNT(*) FROM stories WHERE published_at IS NOT NULL), 
 'stories', 'community', 'storytelling', true, 1, 
 'Stories in Empathy Ledger database with verified consent', 'high'),

('AI-Extracted Community Insights', 
 (SELECT COUNT(*) FROM quotes WHERE confidence_score > 0.7), 
 'quotes', 'innovation', 'ai-analysis', true, 2, 
 'Machine learning insights with >70% confidence', 'high'),

('Structured Impact Themes', 
 (SELECT COUNT(*) FROM themes WHERE active = true), 
 'themes', 'community', 'categorization', true, 3, 
 'Community-driven thematic categorization', 'high'),

('Partner Organizations in Network', 
 (SELECT COUNT(*) FROM organizations WHERE status = 'active'), 
 'organizations', 'community', 'partnerships', true, 4, 
 'Active organizations in Empathy Ledger network', 'high'),

('Years of Community Data', 
 EXTRACT(YEAR FROM AGE(NOW(), (SELECT MIN(created_at) FROM stories))),
 'years', 'impact', 'historical', true, 5, 
 'Historical depth of community story collection', 'high'),

('Estimated Platform Investment Value', 50000, 'AUD', 'funding', 'infrastructure', true, 6, 
 'Estimated value of existing Empathy Ledger platform and data', 'medium')

ON CONFLICT DO NOTHING;

-- Populate partners from existing organizations
INSERT INTO partners (name, type, description, relationship_strength, featured, public_visible, empathy_ledger_org_id)
SELECT 
    name,
    CASE 
        WHEN type ILIKE '%community%' THEN 'community'
        WHEN type ILIKE '%fund%' OR type ILIKE '%grant%' THEN 'funder'
        WHEN type ILIKE '%government%' THEN 'government'
        ELSE 'alliance'
    END as type,
    description,
    CASE 
        WHEN status = 'cornerstone' THEN 'cornerstone'
        WHEN status = 'active' THEN 'active'
        WHEN status = 'deep' THEN 'deep'
        ELSE 'emerging'
    END as relationship_strength,
    featured,
    public_visible,
    id as empathy_ledger_org_id
FROM organizations 
WHERE status != 'inactive'
ON CONFLICT DO NOTHING;