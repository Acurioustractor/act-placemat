-- Enrichment Queue Table
-- Tracks contacts queued for Exa.ai enrichment

CREATE TABLE IF NOT EXISTS exa_enrichment_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  person_id UUID REFERENCES person_identity_map(person_id) UNIQUE,
  email TEXT,
  full_name TEXT,
  current_company TEXT,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- Index for processing queue in priority order
CREATE INDEX IF NOT EXISTS idx_enrichment_queue_status
ON exa_enrichment_queue(status, priority, created_at);

-- Index for finding completed/failed items
CREATE INDEX IF NOT EXISTS idx_enrichment_queue_processed
ON exa_enrichment_queue(processed_at)
WHERE status IN ('completed', 'failed');

COMMENT ON TABLE exa_enrichment_queue IS 'Queue for Exa.ai contact enrichment. Priority: high (score<30), medium (30-49), low (50-69)';
COMMENT ON COLUMN exa_enrichment_queue.priority IS 'high=very incomplete, medium=incomplete, low=could be better';
COMMENT ON COLUMN exa_enrichment_queue.status IS 'pending=queued, processing=in progress, completed=done, failed=error';
