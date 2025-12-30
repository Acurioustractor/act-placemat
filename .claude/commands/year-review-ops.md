# Year in Review Operations

Quick reference for Year in Review deployment and data management.

## Quick Commands

### Deploy to Production
```bash
./scripts/deploy-year-review.sh
```

### Deploy with Data Sync
```bash
./scripts/deploy-year-review.sh --sync
```

### Supabase Operations
```bash
# List all tables
node scripts/supabase-exec.js --list-tables

# Check table status
node scripts/supabase-exec.js --check review_curated_entries

# Query table data
node scripts/supabase-exec.js --query review_curated_entries 5

# Sync curated.json to Supabase
node scripts/supabase-exec.js --sync-curated
```

## Architecture

### Data Flow (3-tier fallback)
1. **Supabase** (preferred) - Direct query from frontend
2. **Railway API** - Backend fallback
3. **Static JSON** - Bundled data for offline/emergency

### Environment Variables (Vercel)
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Public anon key for read access
- `NEXT_PUBLIC_API_URL` - Railway backend URL (fallback)

### URLs
- **Production**: https://webflow-portfolio-one.vercel.app/2025-review
- **Admin**: https://webflow-portfolio-one.vercel.app/2025-review/admin

## Troubleshooting

### Vercel build fails
Use prebuilt deployment:
```bash
cd apps/webflow-portfolio
vercel build --prod
vercel deploy --prebuilt --prod
```

### Data not showing
1. Check Supabase tables: `node scripts/supabase-exec.js --check review_curated_entries`
2. If 0 rows, sync data: `node scripts/supabase-exec.js --sync-curated`
3. Verify Vercel env vars: `cd apps/webflow-portfolio && vercel env ls`

### Need to update curated data
1. Edit `apps/data/year-in-review/2025/curated.json`
2. Run `node scripts/supabase-exec.js --sync-curated`
