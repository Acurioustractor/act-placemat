#!/bin/bash

# Apply Subscription Tracker Migration via psql
# This script attempts to connect to Supabase using psql

set -e

MIGRATION_FILE="/Users/benknight/Code/ACT Placemat/apps/backend/subscription-tracker/migrations/20260101000000_subscription_tracker.sql"

echo "========================================================================================================" echo "Applying Subscription Tracker Migration"
echo "========================================"

# Check if migration file exists
if [ ! -f "$MIGRATION_FILE" ]; then
  echo "❌ Migration file not found: $MIGRATION_FILE"
  exit 1
fi

echo "✅ Found migration file"
echo ""

# Load environment variables
if [ -f "/Users/benknight/Code/ACT Placemat/.env" ]; then
  export $(cat "/Users/benknight/Code/ACT Placemat/.env" | grep -v '^#' | grep -v '^$' | xargs)
fi

# Database connection details
DB_HOST="aws-0-ap-southeast-2.pooler.supabase.com"
DB_PORT="5432"
DB_NAME="postgres"
DB_USER="postgres.tednluwflfhxyucgwigh"

echo "Connection details:"
echo "  Host: $DB_HOST"
echo "  Port: $DB_PORT"
echo "  Database: $DB_NAME"
echo "  User: $DB_USER"
echo ""

# Check if password is set in environment
if [ -z "$SUPABASE_DB_PASSWORD" ] && [ -z "$DB_PASSWORD" ]; then
  echo "❌ Database password not set"
  echo ""
  echo "Please set the SUPABASE_DB_PASSWORD environment variable:"
  echo "  export SUPABASE_DB_PASSWORD='your_password_here'"
  echo ""
  echo "Or run this script with:"
  echo "  SUPABASE_DB_PASSWORD='your_password' ./scripts/apply-migration-psql.sh"
  echo ""
  echo "Get your database password from:"
  echo "  https://supabase.com/dashboard/project/tednluwflfhxyucgwigh/settings/database"
  echo "  (Connection parameters > Database password)"
  exit 1
fi

PASSWORD="${SUPABASE_DB_PASSWORD:-$DB_PASSWORD}"

echo "Connecting to database..."
echo ""

# Execute migration
PGPASSWORD="$PASSWORD" psql \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  -f "$MIGRATION_FILE"

if [ $? -eq 0 ]; then
  echo ""
  echo "========================================"
  echo "✅ Migration applied successfully!"
  echo "========================================"
  echo ""

  # Verify tables
  echo "Verifying tables..."
  PGPASSWORD="$PASSWORD" psql \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('discovered_subscriptions', 'subscription_receipts', 'rd_activity_log', 'subscription_analytics') ORDER BY table_name;"

else
  echo ""
  echo "❌ Migration failed"
  exit 1
fi
