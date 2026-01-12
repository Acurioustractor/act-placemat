-- Add category and tags columns to email_financial_documents table
-- For subscription management and organization

-- Add category column with enum constraint
ALTER TABLE email_financial_documents
ADD COLUMN IF NOT EXISTS category TEXT CHECK (category IN (
  'saas',
  'infrastructure',
  'design',
  'marketing',
  'communication',
  'productivity',
  'development',
  'business',
  'entertainment',
  'other'
));

-- Add tags column as JSON array
ALTER TABLE email_financial_documents
ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb;

-- Add index for category filtering
CREATE INDEX IF NOT EXISTS idx_efd_category ON email_financial_documents(category);

-- Add index for tag queries (GIN index for JSONB)
CREATE INDEX IF NOT EXISTS idx_efd_tags ON email_financial_documents USING GIN (tags);

-- Add comment explaining the columns
COMMENT ON COLUMN email_financial_documents.category IS 'Subscription category for organization (saas, infrastructure, design, etc.)';
COMMENT ON COLUMN email_financial_documents.tags IS 'User-defined tags for flexible organization (Essential, Team, Personal, etc.)';
