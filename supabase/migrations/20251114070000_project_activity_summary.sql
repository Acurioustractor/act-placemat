-- Project Activity Summary Table

CREATE TABLE IF NOT EXISTS project_activity_summary (
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  notion_edit_minutes NUMERIC DEFAULT 0,
  notion_edit_count INT DEFAULT 0,
  calendar_meeting_minutes NUMERIC DEFAULT 0,
  calendar_meeting_count INT DEFAULT 0,
  gmail_thread_count INT DEFAULT 0,
  gmail_recent_contacts JSONB DEFAULT '[]'::jsonb,
  last_notation_activity TIMESTAMPTZ,
  last_calendar_activity TIMESTAMPTZ,
  last_gmail_activity TIMESTAMPTZ,
  last_synced TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (project_id)
);

CREATE INDEX IF NOT EXISTS idx_project_activity_last_synced ON project_activity_summary(last_synced);

ALTER TABLE project_activity_summary ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage project activity" ON project_activity_summary;

CREATE POLICY "Service role can manage project activity"
  ON project_activity_summary
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
