-- Migration: Add privacy_level column to stories table
-- Critical for ACT's Indigenous data sovereignty and consent management system
-- Date: 2025-09-01
-- Fixes: "column stories.privacy_level does not exist" errors

-- =============================================
-- ADD PRIVACY LEVEL COLUMN TO STORIES TABLE
-- =============================================

-- Add privacy_level column with proper constraints
ALTER TABLE stories 
ADD COLUMN IF NOT EXISTS privacy_level TEXT DEFAULT 'community';

-- Add check constraint for valid privacy levels
-- Supports ACT's Indigenous data sovereignty requirements
ALTER TABLE stories 
ADD CONSTRAINT IF NOT EXISTS privacy_level_check 
CHECK (privacy_level IN ('private', 'community', 'public', 'cultural_protocol'));

-- Create index for performance on privacy level queries
CREATE INDEX IF NOT EXISTS idx_stories_privacy_level ON stories(privacy_level);

-- Update any existing NULL values to default 'community' level
UPDATE stories SET privacy_level = 'community' WHERE privacy_level IS NULL;

-- Add comment explaining the privacy levels
COMMENT ON COLUMN stories.privacy_level IS 
'Privacy level for story access: private (author only), community (ACT members), public (everyone), cultural_protocol (Indigenous protocols apply)';

-- =============================================
-- VERIFY THE CHANGE
-- =============================================

-- This can be run to verify the column was added correctly:
-- SELECT column_name, data_type, column_default, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'stories' AND column_name = 'privacy_level';