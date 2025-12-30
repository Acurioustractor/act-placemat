-- Add metadata column to discovered_subscriptions table
-- This stores transaction dates, amounts, reconciliation status, etc.

ALTER TABLE discovered_subscriptions
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Add index for querying metadata
CREATE INDEX IF NOT EXISTS idx_subscriptions_metadata
  ON discovered_subscriptions USING GIN (metadata);

-- Add comments for documentation
COMMENT ON COLUMN discovered_subscriptions.metadata IS 'Transaction metadata from Xero: transactionDates, transactionAmounts, firstSeen, lastSeen, latestStatus, isReconciled, occurrences';
