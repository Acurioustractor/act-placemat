#!/bin/bash

# Exa Enrichment Migration Helper
# Copies SQL to clipboard and opens Supabase SQL Editor

MIGRATION_FILE="../../supabase/migrations/20251224_exa_enrichment_system.sql"
PROJECT_ID="tednluwflfhxyucgwigh"

echo "📦 Exa Enrichment Migration Helper"
echo ""
echo "📄 Copying migration SQL to clipboard..."

cat "$MIGRATION_FILE" | pbcopy

echo "✅ SQL copied to clipboard ($(wc -c < "$MIGRATION_FILE" | xargs) bytes)"
echo ""
echo "🌐 Opening Supabase SQL Editor..."

open "https://supabase.com/dashboard/project/${PROJECT_ID}/sql/new"

echo ""
echo "📋 Next steps:"
echo "1. Paste the SQL (Cmd+V) into the editor that just opened"
echo "2. Click 'Run' or press Cmd+Enter"
echo "3. Wait for confirmation"
echo "4. Run: node check-tables.js to verify"
echo ""
