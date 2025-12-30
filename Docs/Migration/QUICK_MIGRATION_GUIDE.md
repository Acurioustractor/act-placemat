# Quick Migration Guide - Subscription Tracker

## TL;DR

```bash
# Get password from: https://supabase.com/dashboard/project/tednluwflfhxyucgwigh/settings/database
export SUPABASE_DB_PASSWORD='your_password_here'

# Run migration
./scripts/migration-helper.sh

# OR if you prefer non-interactive:
./scripts/apply-migration-psql.sh

# Verify
node scripts/verify-subscription-tables.mjs
```

---

## Problem

Cannot use `npx supabase db push --linked` because older migration has error:
```
ERROR: function uuid_generate_v4() does not exist
```

## Solution

Apply subscription tracker migration directly using psql or Node.js, bypassing problematic older migrations.

---

## What You Need

**Postgres Database Password** (not API keys)

Get it from: https://supabase.com/dashboard/project/tednluwflfhxyucgwigh/settings/database

Look for "Database password" under "Connection parameters"

---

## Methods

### 1. Interactive Helper (Easiest)
```bash
export SUPABASE_DB_PASSWORD='your_password'
./scripts/migration-helper.sh
```

### 2. psql Direct
```bash
export SUPABASE_DB_PASSWORD='your_password'
./scripts/apply-migration-psql.sh
```

### 3. Node.js
```bash
export SUPABASE_DB_PASSWORD='your_password'
node scripts/execute-migration-direct.mjs
```

### 4. Supabase Dashboard (No Password Needed)
1. Go to: https://supabase.com/dashboard/project/tednluwflfhxyucgwigh/sql/new
2. Copy SQL from: `apps/backend/subscription-tracker/migrations/20260101000000_subscription_tracker.sql`
3. Paste and run

---

## What Gets Created

- ✅ `discovered_subscriptions` table
- ✅ `subscription_receipts` table
- ✅ `rd_activity_log` table
- ✅ `subscription_analytics` table
- ✅ 15 indexes
- ✅ 10 RLS policies
- ✅ 3 views
- ✅ Triggers & functions

---

## Files Available

- **Full Guide**: `APPLY_MIGRATION.md`
- **Status Report**: `MIGRATION_STATUS.md`
- **Quick Reference**: `scripts/MIGRATION_INSTRUCTIONS.txt`

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "password authentication failed" | Get fresh password from dashboard |
| "connection refused" | Check internet/firewall |
| "uuid function doesn't exist" | Don't use `db push`, use direct methods |
| Takes long time | Wait 30-60 seconds, it's a large migration |

---

## Help

See detailed documentation:
- `APPLY_MIGRATION.md` - All methods explained
- `MIGRATION_STATUS.md` - Current status and details
- `scripts/MIGRATION_INSTRUCTIONS.txt` - Command reference

---

**Ready to go!** Just need the database password to execute.
