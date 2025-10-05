-- Automation Log Table
-- Tracks all automated actions executed by the system

CREATE TABLE IF NOT EXISTS automation_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action_type TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  status TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast queries by date
CREATE INDEX IF NOT EXISTS idx_automation_log_created
  ON automation_log(created_at DESC);

-- Index for filtering by action type
CREATE INDEX IF NOT EXISTS idx_automation_log_action_type
  ON automation_log(action_type);

-- Disable RLS for backend service access
ALTER TABLE automation_log DISABLE ROW LEVEL SECURITY;

-- Sample query to view recent automations:
-- SELECT * FROM automation_log ORDER BY created_at DESC LIMIT 10;