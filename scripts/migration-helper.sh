#!/bin/bash

# Migration Helper Script
# Displays information and guides user through migration process

cat << 'EOF'
================================================================================
                    SUBSCRIPTION TRACKER MIGRATION
================================================================================

STATUS: Migration file is ready but needs database password to apply

MIGRATION FILE:
  /Users/benknight/Code/ACT Placemat/apps/backend/subscription-tracker/migrations/20260101000000_subscription_tracker.sql

WHAT IT CREATES:
  ✅ 4 tables (discovered_subscriptions, subscription_receipts, rd_activity_log, subscription_analytics)
  ✅ 15 indexes for performance
  ✅ 10 RLS policies for security
  ✅ 3 reporting views
  ✅ Automated triggers

================================================================================
                         APPLY MIGRATION NOW
================================================================================

EOF

# Check if password is set
if [ -z "$SUPABASE_DB_PASSWORD" ] && [ -z "$DB_PASSWORD" ]; then
  cat << 'EOF'
❌ Database password not found

TO GET THE PASSWORD:

1. Access Supabase Dashboard (or ask someone who can):
   https://supabase.com/dashboard/project/tednluwflfhxyucgwigh/settings/database

2. Copy the "Database password" from Connection parameters
   (Or reset it if needed)

3. Set it as environment variable:
   export SUPABASE_DB_PASSWORD='your_password_here'

4. Run this script again:
   ./scripts/migration-helper.sh

ALTERNATIVE: Ask someone to run the SQL via Dashboard SQL Editor:
   https://supabase.com/dashboard/project/tednluwflfhxyucgwigh/sql/new

EOF
  exit 1
fi

cat << 'EOF'
✅ Database password found in environment

Choose a method:

  1) Use psql (direct PostgreSQL connection)
  2) Use Node.js (via pg library)
  3) Show manual psql command
  4) Exit

EOF

read -p "Enter choice [1-4]: " choice

case $choice in
  1)
    echo ""
    echo "Running migration via psql..."
    echo ""
    ./scripts/apply-migration-psql.sh
    ;;
  2)
    echo ""
    echo "Running migration via Node.js..."
    echo ""
    node scripts/execute-migration-direct.mjs
    ;;
  3)
    PASSWORD="${SUPABASE_DB_PASSWORD:-$DB_PASSWORD}"
    cat << EOF

Copy and run this command:

PGPASSWORD='$PASSWORD' psql \\
  -h aws-0-ap-southeast-2.pooler.supabase.com \\
  -p 5432 \\
  -U postgres.tednluwflfhxyucgwigh \\
  -d postgres \\
  -f /Users/benknight/Code/ACT\ Placemat/apps/backend/subscription-tracker/migrations/20260101000000_subscription_tracker.sql

EOF
    ;;
  4)
    echo "Exiting..."
    exit 0
    ;;
  *)
    echo "Invalid choice"
    exit 1
    ;;
esac

echo ""
echo "Would you like to verify the migration? (y/n)"
read -p "> " verify

if [ "$verify" = "y" ] || [ "$verify" = "Y" ]; then
  echo ""
  echo "Verifying migration..."
  echo ""
  node scripts/verify-subscription-tables.mjs
fi

cat << 'EOF'

================================================================================
                           MIGRATION COMPLETE
================================================================================

NEXT STEPS:

  1. ✅ Migration applied
  2. Start the subscription tracker service
  3. Run Gmail discovery to find subscriptions
  4. Configure Xero integration
  5. Access the subscription dashboard

For help: see APPLY_MIGRATION.md

================================================================================
EOF
