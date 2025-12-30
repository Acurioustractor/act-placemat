# How to Apply Database Migrations

## Option 1: Supabase Dashboard (Easiest)

1. Open your Supabase Dashboard:
   - URL: https://supabase.com/dashboard/project/tednluwflfhxyucgwigh
   - (Your project: tednluwflfhxyucgwigh)

2. Navigate to: **SQL Editor** (left sidebar)

3. Click: **New Query**

4. Copy the migration file content:
   ```bash
   cat supabase/migrations/20251104000000_fix_projects_and_storytellers.sql
   ```

5. Paste into SQL Editor

6. Click: **Run** (or press Cmd/Ctrl + Enter)

7. Check for success messages in the output panel

---

## Option 2: Using psql (Command Line)

```bash
# Get your database password from Supabase Dashboard:
# Settings → Database → Connection string → Password

# Run migration
psql "postgresql://postgres.tednluwflfhxyucgwigh:[YOUR-PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres" \
  -f supabase/migrations/20251104000000_fix_projects_and_storytellers.sql
```

**Note:** You'll need your database password from Supabase Dashboard → Settings → Database

---

## Option 3: Supabase CLI (If Installed)

```bash
# Install Supabase CLI if not already installed
brew install supabase/tap/supabase

# Link to your project
supabase link --project-ref tednluwflfhxyucgwigh

# Push migrations
supabase db push
```

---

## What This Migration Does

This migration fixes the schema issues preventing your server from running properly:

### 1. Creates `projects` table with:
- `id` (UUID primary key)
- `notion_id` (link to Notion)
- `name` (project name)
- **`summary`** ← This is the missing column causing the error!
- `description`, `status`, etc.

### 2. Creates `storytellers` table with:
- `id` (UUID primary key)
- `project_id` (links to projects)
- `full_name`, `bio`, `expertise_areas`
- **`consent_given`** (GDPR/consent tracking)
- `profile_image_url`, `media_type`

### 3. Sets up:
- Indexes for performance
- Row-Level Security (RLS) policies
- Auto-update triggers for `updated_at`
- Syncs existing data from `notion_projects` if available

---

## After Applying Migration

Once applied, restart your backend server to clear the errors:

```bash
# Stop current server (Ctrl+C in the terminal where it's running)
# Or kill it:
pkill -f "node server.js"

# Restart
cd "/Users/benknight/Code/ACT Placemat/apps/backend"
node server.js
```

**Expected output:**
```
✅ Primary Supabase projects fetch: Success
✅ Storyteller Supabase fetch: Success (0 records initially)
```

(No more warnings about missing columns!)

---

## Verification

Test that the migration worked:

```bash
# Check tables exist
curl -s http://localhost:4000/api/health | python3 -m json.tool

# Should show:
# {
#   "status": "healthy",
#   "supabase": true,
#   "projectCacheSize": 66
# }

# Test projects API (should work without errors)
curl -s http://localhost:4000/api/real/projects | head -20
```

---

## Quick Start (Copy-Paste Ready)

```bash
# 1. Get migration SQL
cat supabase/migrations/20251104000000_fix_projects_and_storytellers.sql

# 2. Copy output → Paste into Supabase SQL Editor → Run

# 3. Restart server
pkill -f "node server.js"
cd "/Users/benknight/Code/ACT Placemat/apps/backend" && node server.js

# 4. Verify
curl http://localhost:4000/api/health
```

Done! ✅
