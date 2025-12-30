# Subscription Tracker Migration Status

## Summary

The subscription tracker database migration is **ready to be applied** but requires the Supabase database password to execute.

---

## What Has Been Prepared

### ✅ Migration File Ready
- **Location**: `/Users/benknight/Code/ACT Placemat/apps/backend/subscription-tracker/migrations/20260101000000_subscription_tracker.sql`
- **Size**: 13.1 KB
- **Contents**: 404 lines of SQL

### ✅ Migration Copied to Supabase Folder
- **Location**: `/Users/benknight/Code/ACT Placemat/supabase/migrations/20260101000000_subscription_tracker.sql`
- **Status**: Ready for `supabase db push`

### ✅ Helper Scripts Created

| Script | Purpose | Command |
|--------|---------|---------|
| `migration-helper.sh` | Interactive wizard | `./scripts/migration-helper.sh` |
| `apply-migration-psql.sh` | psql direct connection | `./scripts/apply-migration-psql.sh` |
| `execute-migration-direct.mjs` | Node.js pg client | `node scripts/execute-migration-direct.mjs` |
| `verify-subscription-tables.mjs` | Verify migration success | `node scripts/verify-subscription-tables.mjs` |

### ✅ Documentation Created

| File | Description |
|------|-------------|
| `APPLY_MIGRATION.md` | Comprehensive guide with all methods |
| `MIGRATION_STATUS.md` | This file - current status |
| `scripts/MIGRATION_INSTRUCTIONS.txt` | Quick reference instructions |

---

## What the Migration Creates

### Tables (4)

1. **discovered_subscriptions** - Core subscription tracking with multi-signal confidence scores
2. **subscription_receipts** - OCR-processed receipt attachments with NER extraction
3. **rd_activity_log** - AusIndustry R&D tax claim compliance tracking
4. **subscription_analytics** - AI-powered value analysis for recommendations (future phase)

### Indexes (15)

- Performance indexes on tenant_id, status, confidence, vendor
- GIN indexes for JSONB signal data
- Date-based indexes for temporal queries

### RLS Policies (10)

- Multi-tenant data isolation
- Separate policies for SELECT, INSERT, UPDATE, DELETE
- Cascading policies for related tables
- Public read access for R&D transparency

### Views (3)

- `subscription_summary` - Aggregate stats by tenant
- `rd_summary` - R&D activity by developer
- `cancellation_candidates` - High-value cancellation opportunities

### Triggers & Functions (3)

- `update_updated_at()` - Auto-update timestamps
- `auto_complete_rd_activity()` - Auto-complete R&D tasks
- UUID generation setup

---

## Why Simple `db push` Doesn't Work

When running `npx supabase db push --linked`, the CLI attempts to apply ALL migrations in chronological order:

```
• 20240101000000_all_in_one_contacts.sql        ← FAILS HERE
• 20240101000001_manual_fix_rls.sql
• ... 35 more migrations ...
• 20260101000000_subscription_tracker.sql       ← Never reaches this
```

**Error**: An older migration (`20240101000000_all_in_one_contacts.sql`) has an issue:
```
ERROR: function uuid_generate_v4() does not exist (SQLSTATE 42883)
```

This blocks all subsequent migrations from being applied.

**Solution**: Apply the subscription tracker migration directly, bypassing the problematic older migrations.

---

## How to Apply the Migration

### Prerequisites

You need ONE of the following:

1. **Option A**: Supabase Dashboard access
   - Can apply via SQL Editor
   - No password needed

2. **Option B**: Database password
   - Required for psql or Node.js methods
   - Get from Dashboard > Project Settings > Database
   - Different from API keys (SUPABASE_ANON_KEY, etc.)

### Method 1: Interactive Helper (Recommended)

```bash
# Set password first
export SUPABASE_DB_PASSWORD='your_password_here'

# Run interactive helper
cd "/Users/benknight/Code/ACT Placemat"
./scripts/migration-helper.sh
```

The helper will guide you through:
1. Checking if password is set
2. Choosing psql or Node.js method
3. Applying the migration
4. Verifying tables were created

### Method 2: Direct psql

```bash
export SUPABASE_DB_PASSWORD='your_password_here'
cd "/Users/benknight/Code/ACT Placemat"
./scripts/apply-migration-psql.sh
```

### Method 3: Node.js Script

```bash
export SUPABASE_DB_PASSWORD='your_password_here'
cd "/Users/benknight/Code/ACT Placemat"
node scripts/execute-migration-direct.mjs
```

### Method 4: Supabase Dashboard (If Accessible)

1. Go to: https://supabase.com/dashboard/project/tednluwflfhxyucgwigh/sql/new
2. Copy contents of `apps/backend/subscription-tracker/migrations/20260101000000_subscription_tracker.sql`
3. Paste in SQL Editor
4. Click "Run"

---

## How to Get the Database Password

The database password is **NOT** the same as:
- ❌ SUPABASE_ANON_KEY
- ❌ SUPABASE_SERVICE_ROLE_KEY
- ❌ API keys

It's the **Postgres database password** used for direct database connections.

### Steps to Get Password

1. Someone with dashboard access needs to visit:
   ```
   https://supabase.com/dashboard/project/tednluwflfhxyucgwigh/settings/database
   ```

2. Scroll to "Connection parameters" section

3. Look for "Database password" field
   - It might be hidden (click "Show" or "Reveal")
   - Or click "Reset Database Password" to generate a new one

4. Copy the password and send it to you securely

5. Set it in your environment:
   ```bash
   export SUPABASE_DB_PASSWORD='the_password_from_dashboard'
   ```

---

## Verification

After applying the migration, verify it worked:

```bash
cd "/Users/benknight/Code/ACT Placemat"
node scripts/verify-subscription-tables.mjs
```

Expected output:
```
✅ discovered_subscriptions      - EXISTS (1 row)
✅ subscription_receipts         - EXISTS (0 rows)
✅ rd_activity_log              - EXISTS (1 row)
✅ subscription_analytics        - EXISTS (0 rows)
```

Note: The migration automatically inserts 1 row into `rd_activity_log` to document the migration itself (R&D compliance requirement).

---

## Connection Details

| Parameter | Value |
|-----------|-------|
| Project Ref | `tednluwflfhxyucgwigh` |
| Host | `aws-0-ap-southeast-2.pooler.supabase.com` |
| Port | `5432` |
| Database | `postgres` |
| User | `postgres.tednluwflfhxyucgwigh` |
| Password | *Required from dashboard* |
| Region | ap-southeast-2 (Sydney) |
| Connection Type | Pooler (recommended) |

---

## Troubleshooting

### "password authentication failed"
- ❌ Wrong password provided
- ✅ Get fresh password from dashboard
- ✅ Ensure no extra spaces in password

### "connection refused" or "timeout"
- ❌ Firewall blocking port 5432
- ❌ No internet connection
- ✅ Check network connectivity
- ✅ Try from different network

### "function uuid_generate_v4() does not exist"
- ❌ You're using `supabase db push` which includes old migrations
- ✅ Use direct psql or Node.js method instead

### "permission denied"
- ❌ Using ANON_KEY instead of database password
- ✅ Use actual Postgres password from dashboard

### Migration appears to hang
- ⏳ Large migration (13KB) takes 30-60 seconds
- ✅ Wait patiently
- ✅ Check Supabase dashboard for active queries

---

## Next Steps After Migration

1. ✅ **Verify tables exist** (run verification script)

2. **Start the subscription tracker service**
   ```bash
   cd apps/backend/subscription-tracker
   npm start
   ```

3. **Run Gmail discovery**
   - Scans inbox for subscription receipts
   - Extracts vendor, amount, frequency
   - Stores with confidence scores

4. **Configure Xero integration**
   - Pulls financial transaction data
   - Cross-references with Gmail findings
   - Boosts confidence for matched subscriptions

5. **Access subscription dashboard**
   - View all discovered subscriptions
   - See confidence scores from multiple signals
   - Manage subscription lifecycle

6. **Review R&D activity logs**
   - Track development activities
   - Document technical uncertainties
   - Support AusIndustry tax claims

---

## Files Summary

All files are in: `/Users/benknight/Code/ACT Placemat/`

```
Migration File:
  apps/backend/subscription-tracker/migrations/20260101000000_subscription_tracker.sql
  supabase/migrations/20260101000000_subscription_tracker.sql  (copy)

Executable Scripts:
  scripts/migration-helper.sh                    # Interactive wizard
  scripts/apply-migration-psql.sh                # psql method
  scripts/execute-migration-direct.mjs           # Node.js method
  scripts/verify-subscription-tables.mjs         # Verification

Documentation:
  APPLY_MIGRATION.md                             # Comprehensive guide
  MIGRATION_STATUS.md                            # This file
  scripts/MIGRATION_INSTRUCTIONS.txt             # Quick reference

Additional Scripts (alternatives):
  scripts/apply-subscription-migration.js
  scripts/apply-sql-via-api.mjs
  scripts/exec-subscription-migration.mjs
```

---

## Important Notes

- ⚠️ **Database password is sensitive** - Don't commit to git, don't share publicly
- ⚠️ **Migration is idempotent** - Uses `CREATE TABLE IF NOT EXISTS` so safe to re-run
- ⚠️ **RLS is enabled** - All tables have Row Level Security for multi-tenant isolation
- ⚠️ **Service role bypasses RLS** - Backend services need SUPABASE_SERVICE_ROLE_KEY
- ⚠️ **R&D compliance built-in** - Activity logging required for tax claims

---

## Contact & Support

- **Supabase Dashboard**: https://supabase.com/dashboard/project/tednluwflfhxyucgwigh
- **SQL Editor**: https://supabase.com/dashboard/project/tednluwflfhxyucgwigh/sql/new
- **Database Settings**: https://supabase.com/dashboard/project/tednluwflfhxyucgwigh/settings/database

---

## Quick Command Reference

```bash
# Set password
export SUPABASE_DB_PASSWORD='your_password_here'

# Apply migration (choose one)
./scripts/migration-helper.sh                    # Interactive
./scripts/apply-migration-psql.sh                # psql
node scripts/execute-migration-direct.mjs         # Node.js

# Verify
node scripts/verify-subscription-tables.mjs

# Check specific table
node scripts/supabase-exec.js --check discovered_subscriptions

# List all tables
PGPASSWORD="$SUPABASE_DB_PASSWORD" psql \
  -h aws-0-ap-southeast-2.pooler.supabase.com \
  -p 5432 \
  -U postgres.tednluwflfhxyucgwigh \
  -d postgres \
  -c "\dt"
```

---

**Status**: ⏳ Waiting for database password to apply migration

**Last Updated**: 2025-12-27
