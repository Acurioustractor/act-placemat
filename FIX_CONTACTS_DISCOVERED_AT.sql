-- Add missing discovered_at column to gmail_contacts
ALTER TABLE gmail_contacts ADD COLUMN IF NOT EXISTS discovered_at TIMESTAMPTZ DEFAULT NOW();

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';