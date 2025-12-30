# Apply Subscription Tracker Database Migration

This guide provides multiple methods to apply the subscription tracker migration to your Supabase database.

## Migration File Location

```
/Users/benknight/Code/ACT Placemat/apps/backend/subscription-tracker/migrations/20260101000000_subscription_tracker.sql
```

## Migration Contents

The migration creates:
- ✅ 4 tables: `discovered_subscriptions`, `subscription_receipts`, `rd_activity_log`, `subscription_analytics`
- ✅ 15 indexes for query performance
- ✅ 10 RLS policies for multi-tenant security
- ✅ 3 views for reporting
- ✅ Triggers and functions for automation

---

## Method 1: Direct psql Connection (Recommended)

**Prerequisites**: PostgreSQL client (`psql`) installed

### Step 1: Get Database Password

1. Go to Supabase Dashboard (if accessible): https://supabase.com/dashboard/project/tednluwflfhxyucgwigh/settings/database
2. Under "Connection parameters", copy the "Database password"
3. OR use the password reset option if needed

### Step 2: Set Environment Variable

```bash
export SUPABASE_DB_PASSWORD='your_password_here'
```

### Step 3: Run the Migration Script

```bash
cd "/Users/benknight/Code/ACT Placemat"
./scripts/apply-migration-psql.sh
```

OR manually with psql:

```bash
PGPASSWORD='your_password' psql \
  -h aws-0-ap-southeast-2.pooler.supabase.com \
  -p 5432 \
  -U postgres.tednluwflfhxyucgwigh \
  -d postgres \
  -f apps/backend/subscription-tracker/migrations/20260101000000_subscription_tracker.sql
```

---

## Method 2: Using Node.js Direct Connection

**Prerequisites**: Node.js with `pg` package (already installed)

### Step 1: Set Database Password

```bash
export SUPABASE_DB_PASSWORD='your_password_here'
```

### Step 2: Run the Migration Script

```bash
cd "/Users/benknight/Code/ACT Placemat"
node scripts/execute-migration-direct.mjs
```

---

## Method 3: Supabase Dashboard SQL Editor (If Accessible)

1. Go to: https://supabase.com/dashboard/project/tednluwflfhxyucgwigh/sql/new

2. Copy the entire contents of:
   ```
   apps/backend/subscription-tracker/migrations/20260101000000_subscription_tracker.sql
   ```

3. Paste into the SQL Editor

4. Click "Run" to execute

---

## Method 4: Supabase CLI (Issues with Other Migrations)

**Note**: This method tries to apply ALL migrations, which may cause issues with older migrations.

```bash
cd "/Users/benknight/Code/ACT Placemat"

# Copy migration to supabase/migrations (already done)
cp apps/backend/subscription-tracker/migrations/20260101000000_subscription_tracker.sql supabase/migrations/

# Push all migrations
echo "Y" | npx supabase db push --linked
```

**Known Issue**: Older migrations may have errors that block the process.

---

## Verify Migration Success

After applying the migration, verify the tables exist:

### Using Node.js Verification Script

```bash
cd "/Users/benknight/Code/ACT Placemat"
node scripts/verify-subscription-tables.mjs
```

### Using psql

```bash
PGPASSWORD='your_password' psql \
  -h aws-0-ap-southeast-2.pooler.supabase.com \
  -p 5432 \
  -U postgres.tednluwflfhxyucgwigh \
  -d postgres \
  -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('discovered_subscriptions', 'subscription_receipts', 'rd_activity_log', 'subscription_analytics') ORDER BY table_name;"
```

Expected output:
```
          table_name
------------------------------
 discovered_subscriptions
 rd_activity_log
 subscription_analytics
 subscription_receipts
```

### Using Supabase JS Client

```bash
cd "/Users/benknight/Code/ACT Placemat"
node scripts/supabase-exec.js --check discovered_subscriptions
node scripts/supabase-exec.js --check subscription_receipts
node scripts/supabase-exec.js --check rd_activity_log
node scripts/supabase-exec.js --check subscription_analytics
```

---

## Troubleshooting

### Error: "function uuid_generate_v4() does not exist"

This error appears when using `db push` due to issues with older migrations. Use Method 1 (psql) or Method 2 (Node.js) instead.

### Error: "password authentication failed"

1. Verify you're using the correct database password
2. Reset password in Supabase Dashboard if needed
3. Ensure the password is properly set in the environment variable

### Error: "connection refused" or "timeout"

1. Check your internet connection
2. Verify the database host is correct: `aws-0-ap-southeast-2.pooler.supabase.com`
3. Ensure port 5432 is not blocked by firewall

### Migration appears to hang

1. The migration file is large (13KB)
2. Some statements may take time to execute
3. Wait at least 30-60 seconds before interrupting
4. Check Supabase Dashboard for active queries if accessible

---

## Getting Help

If you encounter issues not covered here:

1. Check the Supabase logs in the dashboard (if accessible)
2. Run with debug mode: `npx supabase db push --linked --debug`
3. Contact Supabase support via their dashboard
4. Check the error messages carefully - they usually indicate the exact issue

---

## Next Steps After Migration

Once the migration is successfully applied:

1. ✅ Start the subscription tracker service
2. ✅ Run the Gmail discovery service to find subscriptions
3. ✅ Configure the Xero integration for financial data
4. ✅ Access the subscription dashboard
5. ✅ Review R&D activity logs for compliance

---

## Database Connection Information

- **Project Ref**: `tednluwflfhxyucgwigh`
- **Host**: `aws-0-ap-southeast-2.pooler.supabase.com`
- **Port**: `5432`
- **Database**: `postgres`
- **User**: `postgres.tednluwflfhxyucgwigh`
- **Password**: Available in Supabase Dashboard > Project Settings > Database
- **Region**: ap-southeast-2 (Sydney, Australia)
- **Connection pooler**: Enabled (using pooler URL)

---

## Quick Reference Commands

```bash
# Set password (replace with your actual password)
export SUPABASE_DB_PASSWORD='your_password_here'

# Apply migration (choose one method)
./scripts/apply-migration-psql.sh                    # Method 1
node scripts/execute-migration-direct.mjs             # Method 2

# Verify migration
node scripts/verify-subscription-tables.mjs

# List all tables
PGPASSWORD="$SUPABASE_DB_PASSWORD" psql \
  -h aws-0-ap-southeast-2.pooler.supabase.com \
  -p 5432 \
  -U postgres.tednluwflfhxyucgwigh \
  -d postgres \
  -c "\dt"
```

---

## Important Notes

- ⚠️ This migration enables RLS (Row Level Security) on all tables
- ⚠️ Multi-tenant isolation is enforced via RLS policies
- ⚠️ The migration inserts an initial R&D activity log entry
- ⚠️ All tables use UUID primary keys with `uuid_generate_v4()`
- ⚠️ JSONB columns are used for flexible signal storage
- ⚠️ GIN indexes are created for JSONB query performance

---

## Files Created by This Guide

```
/Users/benknight/Code/ACT Placemat/scripts/
  ├── apply-migration-psql.sh           # Shell script for psql method
  ├── execute-migration-direct.mjs      # Node.js script for direct connection
  ├── verify-subscription-tables.mjs    # Verification script
  ├── apply-subscription-migration.js   # Alternative approach
  ├── apply-sql-via-api.mjs            # API-based approach (limited)
  └── exec-subscription-migration.mjs   # CLI wrapper script
```

All scripts are ready to use and located in the `scripts/` directory.
