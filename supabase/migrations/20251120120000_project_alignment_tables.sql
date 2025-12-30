-- Project Intelligence & Alignment Tables
-- Supports backend project enrichment + contact alignment

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Project Intelligence
-- ============================================

CREATE TABLE IF NOT EXISTS project_intelligence (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL,
  notion_page_id TEXT,
  project_name TEXT NOT NULL,
  summary TEXT,
  focus_areas TEXT[] DEFAULT '{}',
  communities TEXT[] DEFAULT '{}',
  strategic_alignment TEXT[] DEFAULT '{}',
  required_support TEXT[] DEFAULT '{}',
  partner_targets TEXT[] DEFAULT '{}',
  risk_level TEXT DEFAULT 'unknown',
  readiness_score INTEGER DEFAULT 60 CHECK (readiness_score BETWEEN 0 AND 100),
  intelligence JSONB NOT NULL DEFAULT '{}'::jsonb,
  embedding REAL[] DEFAULT '{}',
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id)
);

-- ============================================
-- Project ↔ Contact Alignment
-- ============================================

CREATE TABLE IF NOT EXISTS project_contact_alignment (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL,
  contact_id UUID NOT NULL,
  alignment_score NUMERIC(5,2) NOT NULL DEFAULT 50,
  confidence INTEGER DEFAULT 70 CHECK (confidence BETWEEN 0 AND 100),
  shared_themes TEXT[] DEFAULT '{}',
  contact_context JSONB DEFAULT '{}'::jsonb,
  project_context JSONB DEFAULT '{}'::jsonb,
  outreach_recommendation JSONB DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, contact_id)
);

-- ============================================
-- Indexes
-- ============================================

CREATE INDEX IF NOT EXISTS idx_project_intelligence_project
  ON project_intelligence(project_id);

CREATE INDEX IF NOT EXISTS idx_project_intelligence_focus
  ON project_intelligence USING GIN (focus_areas);

CREATE INDEX IF NOT EXISTS idx_project_contact_alignment_project
  ON project_contact_alignment(project_id);

CREATE INDEX IF NOT EXISTS idx_project_contact_alignment_contact
  ON project_contact_alignment(contact_id);

CREATE INDEX IF NOT EXISTS idx_project_contact_alignment_score
  ON project_contact_alignment(alignment_score DESC);

