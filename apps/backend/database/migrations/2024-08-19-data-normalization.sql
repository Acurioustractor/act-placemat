-- Data Normalization and Storage Schema
-- Creates tables for normalized data storage and quality tracking

-- Normalized documents table for storing processed and validated content
CREATE TABLE IF NOT EXISTS normalized_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type TEXT NOT NULL CHECK (source_type IN ('story', 'storyteller', 'document', 'research', 'file', 'notion', 'web')),
  source_id UUID,
  title TEXT,
  content TEXT NOT NULL,
  summary TEXT,
  chunk_index INTEGER DEFAULT 0,
  total_chunks INTEGER DEFAULT 1,
  
  -- Structured metadata
  metadata JSONB DEFAULT '{}',
  
  -- Quality metrics
  quality_metrics JSONB DEFAULT '{
    "completeness": 0,
    "accuracy": 0,
    "consistency": 0,
    "validity": 0
  }',
  
  -- Text analysis features
  text_features JSONB DEFAULT '{
    "word_count": 0,
    "sentence_count": 0,
    "reading_time": 0,
    "complexity_score": 0,
    "sentiment_score": 0,
    "language": "en"
  }',
  
  -- ML features
  embedding VECTOR(1536), -- OpenAI ada-002 dimensions
  embedding_model TEXT DEFAULT 'text-embedding-ada-002',
  
  -- Categorization
  themes TEXT[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  categories TEXT[] DEFAULT '{}',
  
  -- Timestamps
  normalized_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Search optimization
  search_vector TSVECTOR,
  
  -- Constraints
  CONSTRAINT valid_chunk_index CHECK (chunk_index >= 0),
  CONSTRAINT valid_total_chunks CHECK (total_chunks >= 1),
  CONSTRAINT chunk_consistency CHECK (chunk_index < total_chunks)
);

-- Normalized storytellers table for enhanced storyteller profiles
CREATE TABLE IF NOT EXISTS normalized_storytellers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID,
  full_name TEXT NOT NULL,
  bio TEXT,
  transcript TEXT,
  
  -- Structured insights
  key_insights TEXT[] DEFAULT '{}',
  expertise_areas TEXT[] DEFAULT '{}',
  
  -- Metadata and metrics
  metadata JSONB DEFAULT '{
    "total_stories": 0,
    "avg_story_length": 0,
    "engagement_score": 0,
    "expertise_diversity": 0
  }',
  
  -- Quality assessment
  quality_metrics JSONB DEFAULT '{
    "profile_completeness": 0,
    "content_quality": 0,
    "engagement_quality": 0,
    "expertise_credibility": 0
  }',
  
  -- ML features
  embedding VECTOR(1536),
  embedding_model TEXT DEFAULT 'text-embedding-ada-002',
  
  -- Geographic and demographic data
  location_data JSONB DEFAULT '{}',
  demographic_data JSONB DEFAULT '{}',
  
  -- Timestamps
  normalized_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Search optimization
  search_vector TSVECTOR
);

-- Normalized stories table for enhanced story data
CREATE TABLE IF NOT EXISTS normalized_stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID,
  storyteller_id UUID REFERENCES normalized_storytellers(id),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  summary TEXT,
  
  -- Story classification
  themes TEXT[] DEFAULT '{}',
  topics TEXT[] DEFAULT '{}',
  impact_areas TEXT[] DEFAULT '{}',
  
  -- Content analysis
  text_features JSONB DEFAULT '{
    "word_count": 0,
    "sentence_count": 0,
    "paragraph_count": 0,
    "reading_time": 0,
    "complexity_score": 0,
    "sentiment_score": 0,
    "emotional_tone": [],
    "key_phrases": []
  }',
  
  -- Quality and engagement metrics
  quality_metrics JSONB DEFAULT '{
    "content_quality": 0,
    "narrative_structure": 0,
    "emotional_impact": 0,
    "factual_accuracy": 0
  }',
  
  engagement_metrics JSONB DEFAULT '{
    "readability_score": 0,
    "engagement_potential": 0,
    "shareability_score": 0,
    "educational_value": 0
  }',
  
  -- ML features
  embedding VECTOR(1536),
  embedding_model TEXT DEFAULT 'text-embedding-ada-002',
  
  -- Geographic and temporal context
  geographic_context JSONB DEFAULT '{}',
  temporal_context JSONB DEFAULT '{}',
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  normalized_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Search optimization
  search_vector TSVECTOR
);

-- Data quality audit log
CREATE TABLE IF NOT EXISTS data_quality_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  
  -- Quality assessment
  quality_check_type TEXT NOT NULL CHECK (quality_check_type IN ('validation', 'transformation', 'enhancement', 'cleanup')),
  quality_score_before NUMERIC(5,2),
  quality_score_after NUMERIC(5,2),
  
  -- Issue tracking
  issues_found TEXT[] DEFAULT '{}',
  issues_resolved TEXT[] DEFAULT '{}',
  
  -- Metrics breakdown
  quality_dimensions JSONB DEFAULT '{
    "completeness": 0,
    "accuracy": 0,
    "consistency": 0,
    "validity": 0
  }',
  
  -- Processing details
  processing_details JSONB DEFAULT '{}',
  processing_duration_ms INTEGER,
  
  -- Timestamps
  checked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Indexing
  INDEX idx_quality_audit_table_record (table_name, record_id),
  INDEX idx_quality_audit_check_type (quality_check_type),
  INDEX idx_quality_audit_checked_at (checked_at)
);

-- Data transformation log
CREATE TABLE IF NOT EXISTS data_transformation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Source information
  source_type TEXT NOT NULL,
  source_table TEXT,
  source_record_id UUID,
  
  -- Target information
  target_type TEXT NOT NULL,
  target_table TEXT NOT NULL,
  target_record_id UUID,
  
  -- Transformation details
  transformation_pipeline TEXT NOT NULL,
  transformation_config JSONB DEFAULT '{}',
  
  -- Success metrics
  success BOOLEAN DEFAULT false,
  error_message TEXT,
  
  -- Processing stats
  input_size INTEGER,
  output_size INTEGER,
  processing_duration_ms INTEGER,
  
  -- Quality improvement
  quality_score_improvement NUMERIC(5,2),
  
  -- Timestamps
  transformed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Indexing
  INDEX idx_transformation_source (source_type, source_table, source_record_id),
  INDEX idx_transformation_target (target_type, target_table, target_record_id),
  INDEX idx_transformation_pipeline (transformation_pipeline),
  INDEX idx_transformation_success (success),
  INDEX idx_transformation_date (transformed_at)
);

-- Data lineage tracking
CREATE TABLE IF NOT EXISTS data_lineage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Source tracking
  source_system TEXT NOT NULL,
  source_table TEXT NOT NULL,
  source_record_id UUID NOT NULL,
  
  -- Derived data tracking
  derived_table TEXT NOT NULL,
  derived_record_id UUID NOT NULL,
  
  -- Lineage chain
  parent_lineage_id UUID REFERENCES data_lineage(id),
  lineage_depth INTEGER DEFAULT 0,
  
  -- Transformation information
  transformation_type TEXT NOT NULL,
  transformation_details JSONB DEFAULT '{}',
  
  -- Data freshness
  source_last_modified TIMESTAMP WITH TIME ZONE,
  derived_created TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Indexing
  INDEX idx_lineage_source (source_system, source_table, source_record_id),
  INDEX idx_lineage_derived (derived_table, derived_record_id),
  INDEX idx_lineage_parent (parent_lineage_id),
  INDEX idx_lineage_depth (lineage_depth),
  INDEX idx_lineage_type (transformation_type)
);

-- Similarity index for fast vector searches
CREATE TABLE IF NOT EXISTS similarity_index (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Document reference
  document_table TEXT NOT NULL,
  document_id UUID NOT NULL,
  document_type TEXT NOT NULL,
  
  -- Vector data
  embedding VECTOR(1536) NOT NULL,
  embedding_model TEXT DEFAULT 'text-embedding-ada-002',
  
  -- Similarity clusters
  cluster_id UUID,
  cluster_similarity_score NUMERIC(5,4),
  
  -- Content hash for deduplication
  content_hash TEXT,
  
  -- Metadata for search optimization
  content_preview TEXT,
  keywords TEXT[] DEFAULT '{}',
  topics TEXT[] DEFAULT '{}',
  
  -- Performance metrics
  search_frequency INTEGER DEFAULT 0,
  last_accessed TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  indexed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Indexes for vector similarity search
  INDEX idx_similarity_document (document_table, document_id),
  INDEX idx_similarity_type (document_type),
  INDEX idx_similarity_cluster (cluster_id),
  INDEX idx_similarity_hash (content_hash),
  INDEX idx_similarity_keywords USING GIN (keywords),
  INDEX idx_similarity_topics USING GIN (topics)
);

-- Create vector similarity index (requires pgvector extension)
-- CREATE INDEX idx_similarity_embedding ON similarity_index USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Update triggers for search vectors and timestamps
CREATE OR REPLACE FUNCTION update_search_vector() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.content, '')), 'B') ||
    setweight(to_tsvector('english', array_to_string(COALESCE(NEW.themes, '{}'), ' ')), 'C') ||
    setweight(to_tsvector('english', array_to_string(COALESCE(NEW.tags, '{}'), ' ')), 'D');
  
  NEW.updated_at := CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply search vector triggers
DROP TRIGGER IF EXISTS normalized_documents_search_vector_update ON normalized_documents;
CREATE TRIGGER normalized_documents_search_vector_update
  BEFORE INSERT OR UPDATE ON normalized_documents
  FOR EACH ROW EXECUTE FUNCTION update_search_vector();

DROP TRIGGER IF EXISTS normalized_stories_search_vector_update ON normalized_stories;
CREATE TRIGGER normalized_stories_search_vector_update
  BEFORE INSERT OR UPDATE ON normalized_stories
  FOR EACH ROW EXECUTE FUNCTION update_search_vector();

-- Update trigger for storytellers (simpler since no themes/tags)
CREATE OR REPLACE FUNCTION update_storyteller_search_vector() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', COALESCE(NEW.full_name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.bio, '')), 'B') ||
    setweight(to_tsvector('english', array_to_string(COALESCE(NEW.key_insights, '{}'), ' ')), 'C') ||
    setweight(to_tsvector('english', array_to_string(COALESCE(NEW.expertise_areas, '{}'), ' ')), 'D');
  
  NEW.updated_at := CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS normalized_storytellers_search_vector_update ON normalized_storytellers;
CREATE TRIGGER normalized_storytellers_search_vector_update
  BEFORE INSERT OR UPDATE ON normalized_storytellers
  FOR EACH ROW EXECUTE FUNCTION update_storyteller_search_vector();

-- Create search indexes
CREATE INDEX IF NOT EXISTS idx_normalized_documents_search ON normalized_documents USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS idx_normalized_stories_search ON normalized_stories USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS idx_normalized_storytellers_search ON normalized_storytellers USING GIN (search_vector);

-- Additional performance indexes
CREATE INDEX IF NOT EXISTS idx_normalized_documents_source ON normalized_documents (source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_normalized_documents_quality ON normalized_documents USING GIN (quality_metrics);
CREATE INDEX IF NOT EXISTS idx_normalized_documents_features ON normalized_documents USING GIN (text_features);
CREATE INDEX IF NOT EXISTS idx_normalized_documents_normalized_at ON normalized_documents (normalized_at);

CREATE INDEX IF NOT EXISTS idx_normalized_stories_storyteller ON normalized_stories (storyteller_id);
CREATE INDEX IF NOT EXISTS idx_normalized_stories_themes ON normalized_stories USING GIN (themes);
CREATE INDEX IF NOT EXISTS idx_normalized_stories_topics ON normalized_stories USING GIN (topics);
CREATE INDEX IF NOT EXISTS idx_normalized_stories_quality ON normalized_stories USING GIN (quality_metrics);

CREATE INDEX IF NOT EXISTS idx_normalized_storytellers_source ON normalized_storytellers (source_id);
CREATE INDEX IF NOT EXISTS idx_normalized_storytellers_expertise ON normalized_storytellers USING GIN (expertise_areas);
CREATE INDEX IF NOT EXISTS idx_normalized_storytellers_quality ON normalized_storytellers USING GIN (quality_metrics);

-- Row Level Security policies
ALTER TABLE normalized_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE normalized_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE normalized_storytellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_quality_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_transformation_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_lineage ENABLE ROW LEVEL SECURITY;
ALTER TABLE similarity_index ENABLE ROW LEVEL SECURITY;

-- Public read access to normalized data
CREATE POLICY "Public read access to normalized documents" ON normalized_documents
  FOR SELECT USING (true);

CREATE POLICY "Public read access to normalized stories" ON normalized_stories
  FOR SELECT USING (true);

CREATE POLICY "Public read access to normalized storytellers" ON normalized_storytellers
  FOR SELECT USING (true);

CREATE POLICY "Public read access to similarity index" ON similarity_index
  FOR SELECT USING (true);

-- Service role full access to all tables
CREATE POLICY "Service role full access to normalized documents" ON normalized_documents
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to normalized stories" ON normalized_stories
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to normalized storytellers" ON normalized_storytellers
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to quality audit" ON data_quality_audit
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to transformation log" ON data_transformation_log
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to data lineage" ON data_lineage
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to similarity index" ON similarity_index
  FOR ALL USING (auth.role() = 'service_role');

-- Useful views for data analysis
CREATE OR REPLACE VIEW data_quality_summary AS
SELECT 
  table_name,
  COUNT(*) as total_records,
  AVG((quality_dimensions->>'completeness')::numeric) as avg_completeness,
  AVG((quality_dimensions->>'accuracy')::numeric) as avg_accuracy,
  AVG((quality_dimensions->>'consistency')::numeric) as avg_consistency,
  AVG((quality_dimensions->>'validity')::numeric) as avg_validity,
  MIN(checked_at) as first_check,
  MAX(checked_at) as last_check
FROM data_quality_audit 
GROUP BY table_name;

CREATE OR REPLACE VIEW transformation_performance AS
SELECT 
  transformation_pipeline,
  source_type,
  target_type,
  COUNT(*) as total_transformations,
  COUNT(*) FILTER (WHERE success = true) as successful_transformations,
  AVG(processing_duration_ms) as avg_processing_time,
  AVG(quality_score_improvement) as avg_quality_improvement
FROM data_transformation_log
GROUP BY transformation_pipeline, source_type, target_type;

CREATE OR REPLACE VIEW data_freshness AS
SELECT 
  table_name,
  record_id,
  source_last_modified,
  derived_created,
  EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - source_last_modified))/3600 as hours_since_source_update,
  EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - derived_created))/3600 as hours_since_normalization
FROM data_lineage 
ORDER BY source_last_modified DESC;

-- Grant permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

COMMENT ON TABLE normalized_documents IS 'Normalized and validated document storage with quality metrics';
COMMENT ON TABLE normalized_stories IS 'Enhanced story data with comprehensive analysis and categorization';
COMMENT ON TABLE normalized_storytellers IS 'Enhanced storyteller profiles with quality assessment';
COMMENT ON TABLE data_quality_audit IS 'Audit trail for data quality checks and improvements';
COMMENT ON TABLE data_transformation_log IS 'Log of all data transformation operations';
COMMENT ON TABLE data_lineage IS 'Tracks data lineage and transformation chains';
COMMENT ON TABLE similarity_index IS 'Optimized index for vector similarity searches';