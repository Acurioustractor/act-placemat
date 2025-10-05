-- Add missing synced_at column
ALTER TABLE gmail_messages ADD COLUMN IF NOT EXISTS synced_at TIMESTAMPTZ DEFAULT NOW();

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';