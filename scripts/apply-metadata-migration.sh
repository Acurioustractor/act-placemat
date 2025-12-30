#!/bin/bash

# Apply metadata column migration via Supabase SQL API

echo "📦 Applying metadata column migration..."
echo ""

# Read environment variables
source /Users/benknight/Code/ACT\ Placemat/.env

# SQL to execute
SQL="ALTER TABLE discovered_subscriptions ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;"

echo "SQL: $SQL"
echo ""

# Execute via Supabase API
curl -X POST \
  "${SUPABASE_URL}/rest/v1/rpc/exec_sql" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"sql\": \"${SQL}\"}"

echo ""
echo "✅ Migration complete!"
