-- ACT Public Dashboard - Initial Schema Migration
-- Creates all core tables for community-centered platform

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- =============================================
-- CORE STORYTELLING TABLES
-- =============================================

-- Stories: The heart of community impact narrative
CREATE TABLE IF NOT EXISTS stories (
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
    community_voice BOOLEAN DEFAULT false,
    featured BOOLEAN DEFAULT false,
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    view_count INTEGER DEFAULT 0,
    consent_verified BOOLEAN DEFAULT false,
    impact_metrics JSONB,
    related_projects UUID[],
    ethical_review_status TEXT DEFAULT 'pending'
);

-- Metrics: Evidence-based impact tracking
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
-- PROJECT & PROGRAM TRACKING
-- =============================================

-- Projects: Seeds growing into programs
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

-- Project Updates: Living progress narrative
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
-- PARTNERSHIP & COMMUNITY NETWORK
-- =============================================

-- Partners: The ecosystem of collaboration
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- COMMUNITY ENGAGEMENT & PARTICIPATION
-- =============================================

-- Newsletter Subscribers: Building community connection
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    first_name TEXT,
    last_name TEXT,
    source TEXT,
    interests TEXT[],
    location TEXT,
    subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    consent_marketing BOOLEAN DEFAULT true
);

-- Community Inquiries: Pathways to collaboration
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

-- Volunteer Interest: Community contribution pathways
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
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Stories indexes
CREATE INDEX IF NOT EXISTS idx_stories_published_featured ON stories(published_at DESC, featured);
CREATE INDEX IF NOT EXISTS idx_stories_tags ON stories USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_stories_slug ON stories(slug);

-- Projects indexes
CREATE INDEX IF NOT EXISTS idx_projects_status_featured ON projects(status, featured);
CREATE INDEX IF NOT EXISTS idx_projects_pillar ON projects(pillar);
CREATE INDEX IF NOT EXISTS idx_projects_slug ON projects(slug);

-- Metrics indexes
CREATE INDEX IF NOT EXISTS idx_metrics_category_featured ON metrics(category, featured);
CREATE INDEX IF NOT EXISTS idx_metrics_period ON metrics(period_end DESC);

-- Partners indexes
CREATE INDEX IF NOT EXISTS idx_partners_type_featured ON partners(type, featured);
CREATE INDEX IF NOT EXISTS idx_partners_relationship ON partners(relationship_strength);