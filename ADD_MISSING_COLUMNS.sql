-- Add missing columns to Gmail tables
-- Run this in Supabase SQL Editor

-- Fix gmail_sync_status table
ALTER TABLE gmail_sync_status
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS error_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS error_message TEXT;

-- Fix gmail_messages table
ALTER TABLE gmail_messages
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS attachment_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS has_attachments BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS labels TEXT[];

-- Fix gmail_contacts table (if needed)
ALTER TABLE gmail_contacts
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Refresh Supabase schema cache
NOTIFY pgrst, 'reload schema';