-- Calendar Integration Tables
-- Provides meeting intelligence and scheduling insights
-- Created: 2025-09-29

-- Prerequisites
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- Calendar Sync Status Table
-- Tracks sync state and health for Calendar integration
-- ============================================================================
CREATE TABLE IF NOT EXISTS calendar_sync_status (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_email TEXT NOT NULL,
  calendar_id TEXT NOT NULL, -- Google Calendar ID
  calendar_name TEXT,
  last_sync TIMESTAMPTZ,
  next_sync TIMESTAMPTZ,
  sync_status TEXT CHECK (sync_status IN ('idle', 'syncing', 'error', 'completed')),
  sync_token TEXT, -- For incremental sync
  total_events INT DEFAULT 0,
  synced_events INT DEFAULT 0,
  error_message TEXT,
  error_count INT DEFAULT 0,
  last_error TIMESTAMPTZ,
  consecutive_errors INT DEFAULT 0,
  sync_duration_ms INT,
  api_calls_used INT DEFAULT 0,
  api_calls_remaining INT,
  api_quota_reset TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_email, calendar_id)
);

CREATE INDEX IF NOT EXISTS idx_calendar_sync_status_email ON calendar_sync_status(user_email);
CREATE INDEX IF NOT EXISTS idx_calendar_sync_status_last_sync ON calendar_sync_status(last_sync DESC);
CREATE INDEX IF NOT EXISTS idx_calendar_sync_status_sync_status ON calendar_sync_status(sync_status);

-- ============================================================================
-- Calendar Events Table
-- Stores calendar events for scheduling intelligence
-- ============================================================================
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  google_event_id TEXT UNIQUE NOT NULL,
  calendar_id TEXT NOT NULL,
  user_email TEXT NOT NULL,

  -- Event details
  title TEXT,
  description TEXT,
  location TEXT,
  meeting_link TEXT, -- Google Meet, Zoom, etc.

  -- Timing
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  timezone TEXT,
  duration_minutes INT, -- Calculated duration
  is_all_day BOOLEAN DEFAULT false,

  -- Recurrence
  is_recurring BOOLEAN DEFAULT false,
  recurrence_rule TEXT, -- RRULE format
  recurring_event_id TEXT, -- For recurring event instances

  -- Participants
  organizer_email TEXT,
  organizer_name TEXT,
  attendees JSONB DEFAULT '[]'::jsonb, -- Array of {email, name, status, response}
  attendee_count INT DEFAULT 0,
  person_ids UUID[], -- References person_identity_map

  -- Status
  status TEXT CHECK (status IN ('confirmed', 'tentative', 'cancelled')),
  visibility TEXT CHECK (visibility IN ('public', 'private', 'confidential')),
  transparency TEXT CHECK (transparency IN ('opaque', 'transparent')), -- Shows as busy/available

  -- Classification
  event_type TEXT CHECK (event_type IN ('meeting', 'call', 'workshop', 'conference', 'deadline', 'reminder', 'other')),
  is_internal BOOLEAN, -- All attendees from same org
  is_external BOOLEAN, -- Has external attendees
  meeting_category TEXT, -- e.g., "client", "team", "1-on-1", "all-hands"

  -- Intelligence
  keywords TEXT[],
  mentioned_projects UUID[], -- Project IDs mentioned
  ai_summary TEXT,
  preparation_notes TEXT,
  follow_up_required BOOLEAN DEFAULT false,
  importance TEXT CHECK (importance IN ('high', 'medium', 'low')),

  -- Response tracking
  response_status TEXT CHECK (response_status IN ('accepted', 'tentative', 'declined', 'needsAction')),
  response_time TIMESTAMPTZ,

  -- Sync metadata
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  last_modified TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_calendar_events_google_id ON calendar_events(google_event_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_calendar_id ON calendar_events(calendar_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_email ON calendar_events(user_email);
CREATE INDEX IF NOT EXISTS idx_calendar_events_start_time ON calendar_events(start_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_end_time ON calendar_events(end_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_organizer ON calendar_events(organizer_email);
CREATE INDEX IF NOT EXISTS idx_calendar_events_status ON calendar_events(status);
CREATE INDEX IF NOT EXISTS idx_calendar_events_is_recurring ON calendar_events(is_recurring);
CREATE INDEX IF NOT EXISTS idx_calendar_events_response ON calendar_events(response_status);
CREATE INDEX IF NOT EXISTS idx_calendar_events_person_ids ON calendar_events USING GIN(person_ids);

-- Index for finding upcoming events
CREATE INDEX IF NOT EXISTS idx_calendar_events_upcoming ON calendar_events(start_time)
  WHERE status != 'cancelled' AND start_time > NOW();

-- ============================================================================
-- Calendar Participants Table
-- Tracks meeting participation patterns for relationship intelligence
-- ============================================================================
CREATE TABLE IF NOT EXISTS calendar_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_email TEXT NOT NULL,
  participant_email TEXT NOT NULL,
  person_id UUID REFERENCES person_identity_map(person_id),

  -- Participation stats
  total_meetings INT DEFAULT 0,
  meetings_organized INT DEFAULT 0, -- Where participant was organizer
  meetings_attended INT DEFAULT 0,
  meetings_declined INT DEFAULT 0,
  no_shows INT DEFAULT 0,

  -- Timing patterns
  first_meeting TIMESTAMPTZ,
  last_meeting TIMESTAMPTZ,
  next_scheduled_meeting TIMESTAMPTZ,

  -- Relationship metrics
  meeting_frequency TEXT CHECK (meeting_frequency IN ('daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'occasional')),
  relationship_strength TEXT CHECK (relationship_strength IN ('strong', 'moderate', 'weak')),
  average_meeting_duration_minutes INT,
  preferred_meeting_time TEXT, -- e.g., "morning", "afternoon"
  preferred_meeting_day TEXT, -- e.g., "Monday", "Friday"

  -- Classification
  participant_type TEXT CHECK (participant_type IN ('colleague', 'client', 'vendor', 'personal', 'unknown')),
  is_frequent_collaborator BOOLEAN DEFAULT false,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_email, participant_email)
);

CREATE INDEX IF NOT EXISTS idx_calendar_participants_user ON calendar_participants(user_email);
CREATE INDEX IF NOT EXISTS idx_calendar_participants_email ON calendar_participants(participant_email);
CREATE INDEX IF NOT EXISTS idx_calendar_participants_person_id ON calendar_participants(person_id);
CREATE INDEX IF NOT EXISTS idx_calendar_participants_last_meeting ON calendar_participants(last_meeting DESC);
CREATE INDEX IF NOT EXISTS idx_calendar_participants_frequent ON calendar_participants(is_frequent_collaborator) WHERE is_frequent_collaborator = true;

-- ============================================================================
-- Calendar Intelligence Insights Table
-- AI-generated insights from calendar analysis
-- ============================================================================
CREATE TABLE IF NOT EXISTS calendar_intelligence_insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_email TEXT NOT NULL,

  -- Insight details
  insight_type TEXT CHECK (insight_type IN (
    'meeting_overload',
    'underutilized_time',
    'schedule_conflict',
    'meeting_preparation_needed',
    'follow_up_suggested',
    'relationship_gap',
    'availability_pattern',
    'meeting_effectiveness'
  )),
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT CHECK (priority IN ('high', 'medium', 'low')),
  confidence NUMERIC CHECK (confidence >= 0 AND confidence <= 1),

  -- Related entities
  related_event_ids UUID[], -- References calendar_events
  related_participant_emails TEXT[],
  related_project_ids UUID[],

  -- Time context
  insight_date DATE,
  time_range TSTZRANGE, -- Specific time period this insight applies to

  -- Actions
  suggested_actions JSONB, -- Array of action objects
  is_actioned BOOLEAN DEFAULT false,
  actioned_at TIMESTAMPTZ,

  -- Metadata
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_calendar_insights_user_email ON calendar_intelligence_insights(user_email);
CREATE INDEX IF NOT EXISTS idx_calendar_insights_type ON calendar_intelligence_insights(insight_type);
CREATE INDEX IF NOT EXISTS idx_calendar_insights_priority ON calendar_intelligence_insights(priority);
CREATE INDEX IF NOT EXISTS idx_calendar_insights_is_actioned ON calendar_intelligence_insights(is_actioned) WHERE is_actioned = false;
CREATE INDEX IF NOT EXISTS idx_calendar_insights_generated ON calendar_intelligence_insights(generated_at DESC);

-- ============================================================================
-- Calendar Availability Slots Table
-- Tracks availability patterns for smart scheduling
-- ============================================================================
CREATE TABLE IF NOT EXISTS calendar_availability_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_email TEXT NOT NULL,

  -- Time slot
  slot_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  duration_minutes INT,

  -- Availability
  is_available BOOLEAN DEFAULT true,
  slot_type TEXT CHECK (slot_type IN ('free', 'tentative', 'busy', 'out_of_office')),

  -- Context
  timezone TEXT,
  reason TEXT, -- Why this slot is busy (if applicable)
  blocking_event_id UUID REFERENCES calendar_events(id),

  -- Metadata
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_email, slot_date, start_time)
);

CREATE INDEX IF NOT EXISTS idx_calendar_availability_user ON calendar_availability_slots(user_email);
CREATE INDEX IF NOT EXISTS idx_calendar_availability_date ON calendar_availability_slots(slot_date);
CREATE INDEX IF NOT EXISTS idx_calendar_availability_is_available ON calendar_availability_slots(is_available) WHERE is_available = true;
CREATE INDEX IF NOT EXISTS idx_calendar_availability_type ON calendar_availability_slots(slot_type);

-- ============================================================================
-- Triggers for updated_at timestamps
-- ============================================================================
DO $$ BEGIN
  CREATE TRIGGER update_calendar_sync_status_updated_at
    BEFORE UPDATE ON calendar_sync_status
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER update_calendar_events_updated_at
    BEFORE UPDATE ON calendar_events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER update_calendar_participants_updated_at
    BEFORE UPDATE ON calendar_participants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER update_calendar_insights_updated_at
    BEFORE UPDATE ON calendar_intelligence_insights
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================
ALTER TABLE calendar_sync_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_intelligence_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_availability_slots ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own calendar sync status"
  ON calendar_sync_status FOR SELECT
  USING (user_email = current_setting('request.jwt.claims', true)::json->>'email');

CREATE POLICY "Users can view their own calendar events"
  ON calendar_events FOR SELECT
  USING (user_email = current_setting('request.jwt.claims', true)::json->>'email');

CREATE POLICY "Users can view their own calendar participants"
  ON calendar_participants FOR SELECT
  USING (user_email = current_setting('request.jwt.claims', true)::json->>'email');

CREATE POLICY "Users can view their own calendar insights"
  ON calendar_intelligence_insights FOR SELECT
  USING (user_email = current_setting('request.jwt.claims', true)::json->>'email');

CREATE POLICY "Users can view their own availability slots"
  ON calendar_availability_slots FOR SELECT
  USING (user_email = current_setting('request.jwt.claims', true)::json->>'email');

-- ============================================================================
-- Comments
-- ============================================================================
COMMENT ON TABLE calendar_sync_status IS 'Tracks Google Calendar API sync status and health metrics';
COMMENT ON TABLE calendar_events IS 'Stores calendar events with meeting intelligence';
COMMENT ON TABLE calendar_participants IS 'Tracks meeting participation patterns for relationship intelligence';
COMMENT ON TABLE calendar_intelligence_insights IS 'AI-generated insights from calendar analysis';
COMMENT ON TABLE calendar_availability_slots IS 'Tracks availability patterns for smart scheduling';