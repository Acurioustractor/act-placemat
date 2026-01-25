-- LinkedIn Archive Tables Migration
-- Archives messages and invitations from linkedin_imports before cleanup

-- Messages archive table
CREATE TABLE IF NOT EXISTS linkedin_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_id UUID,
  owner TEXT,
  conversation_id TEXT,
  conversation_title TEXT,
  sender_profile_url TEXT,
  recipient_profile_urls TEXT,
  subject TEXT,
  content TEXT,
  folder TEXT,
  sent_at TIMESTAMPTZ,
  is_draft BOOLEAN DEFAULT false,
  attachments TEXT,
  payload JSONB,
  archived_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_linkedin_messages_owner ON linkedin_messages(owner);
CREATE INDEX IF NOT EXISTS idx_linkedin_messages_conversation ON linkedin_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_linkedin_messages_sent_at ON linkedin_messages(sent_at);

COMMENT ON TABLE linkedin_messages IS 'Archived LinkedIn messages from linkedin_imports cleanup (2026-01-18)';

-- Invitations archive table
CREATE TABLE IF NOT EXISTS linkedin_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_id UUID,
  owner TEXT,
  direction TEXT,
  inviter_profile_url TEXT,
  invitee_profile_url TEXT,
  message TEXT,
  sent_at TIMESTAMPTZ,
  payload JSONB,
  archived_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_linkedin_invitations_owner ON linkedin_invitations(owner);
CREATE INDEX IF NOT EXISTS idx_linkedin_invitations_sent_at ON linkedin_invitations(sent_at);

COMMENT ON TABLE linkedin_invitations IS 'Archived LinkedIn invitations from linkedin_imports cleanup (2026-01-18)';
