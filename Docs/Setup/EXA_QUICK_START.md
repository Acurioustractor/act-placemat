# Exa Enrichment Quick Start Guide

## Overview

The Exa enrichment system automatically enriches your ACT Placemat contacts with:
- **LinkedIn profiles**: Work history, skills, education
- **Company intelligence**: Industry, size, sustainability focus, indigenous-led status
- **Media mentions**: News articles, interviews, public appearances

**Free tier**: 1,000 API requests/month (each contact uses ~3 requests)

---

## Setup Complete ✅

The system is already configured:
- ✅ Exa API key configured in `.env`
- ✅ `exa-js` package installed
- ✅ API connection tested successfully
- ✅ Database schema created (5 tables, 4 views, 4 functions)
- ✅ 17 contacts tagged and queued for Goods on Country campaign
- ✅ Processing script ready (`process-batch.js`)

---

## Step 1: Tag More Contacts (Optional)

The auto-tagging already ran on 1,000 contacts and found 17 Goods on Country candidates. To tag more:

```bash
cd /Users/benknight/Code/ACT\ Placemat/apps/backend

# Keyword matching (fast, free) - tag next 4,000 contacts
node auto-tag-contacts.js --limit=5000

# AI analysis (smarter, costs ~$0.01 per 100 contacts)
node auto-tag-contacts.js --ai --limit=500
```

**Available tags**:
- `goods-on-country` - Indigenous businesses, circular economy, sustainable products
- `justice-hub` - Youth justice, restorative justice, family support
- `circular-economy` - Sustainability initiatives
- `indigenous-business` - Indigenous-owned or focused businesses
- `sustainable-products` - Eco-friendly product companies

---

## Step 2: Verify and Queue Candidates

Check how many contacts are ready for enrichment:

```bash
node verify-exa.js
```

**Current status**:
```
✅ vw_goods_enrichment_candidates - 17 candidates
✅ vw_justice_enrichment_candidates - 0 candidates

👥 Sample Goods on Country candidates:
1. Guido Verbist (Revolve ReCYCLING) - Priority: 25
2. Elly Liu (Hunan Star of Ocean Shell Decoration Material Co., Ltd) - Priority: 25
3. Will Tommy Jones (Will Tommy Jones | Alternative Country) - Priority: 25
```

Queue candidates for enrichment:

```bash
# Queue all 17 Goods on Country candidates
node queue-candidates.js --campaign=goods --limit=20

# Queue JusticeHub candidates (when available)
node queue-candidates.js --campaign=justice --limit=20

# Queue from both campaigns
node queue-candidates.js --limit=100
```

---

## Step 3: Run Enrichment

### Dry Run First (Test Without Using API Credits)

```bash
node process-batch.js --dry-run --limit=5
```

This will show what would happen without actually calling the Exa API.

### Process Real Batch

```bash
# Process 5 contacts (uses ~15 API requests)
node process-batch.js --limit=5

# Process all 17 Goods on Country candidates
node process-batch.js --campaign=goods --limit=20

# Process specific campaign
node process-batch.js --campaign=justice --limit=10
```

**Processing time**: ~5-10 seconds per contact (includes 1-second rate limiting)

**API usage**: Each contact uses 3 requests:
1. LinkedIn profile search
2. Company intelligence search
3. Media mentions search

**Example output**:
```
📋 Fetching up to 5 contacts from queue...

Found 5 contacts to enrich

============================================================

[1/5]
📊 Enriching: Guido Verbist (guido@example.com)
   Company: Revolve ReCYCLING
   Campaign: goods-on-country
   Priority: 25
   🔍 Searching LinkedIn...
   ✅ LinkedIn profile saved (0.85 confidence)
   🏢 Searching company data...
   ✅ Company data saved (Indigenous-led!)
   📰 Searching media mentions...
   ✅ Saved 3 media mentions
   ⏱️  Completed in 8.2s (3 API calls)

[2/5]
...

============================================================
✅ BATCH PROCESSING COMPLETE
============================================================
Processed: 5
Successful: 5
Failed: 0
Total API calls: 15
Estimated cost: $0.015
Total time: 42.3s
Avg time per contact: 8.5s

Free tier remaining: 985/1000 requests
```

---

## Step 4: Review Results

After enrichment, check the data in Supabase:

**Supabase Dashboard**: [https://supabase.com/dashboard/project/tednluwflfhxyucgwigh/editor](https://supabase.com/dashboard/project/tednluwflfhxyucgwigh/editor)

### Check enriched LinkedIn profiles:

```sql
SELECT
  p.full_name,
  p.current_company,
  elp.headline,
  elp.linkedin_url,
  elp.confidence_score,
  array_length(elp.skills, 1) as skill_count,
  jsonb_array_length(elp.experience) as jobs_count
FROM person_identity_map p
JOIN exa_linkedin_profiles elp ON p.person_id = elp.person_id
ORDER BY elp.confidence_score DESC
LIMIT 20;
```

### Check company intelligence:

```sql
SELECT
  p.full_name,
  eci.company_name,
  eci.industry,
  eci.size_estimate,
  eci.sustainability_focus,
  eci.indigenous_led,
  eci.confidence_score
FROM person_identity_map p
JOIN exa_company_intelligence eci ON p.person_id = eci.person_id
ORDER BY eci.confidence_score DESC
LIMIT 20;
```

### Check media mentions:

```sql
SELECT
  p.full_name,
  emm.source_title,
  emm.source_url,
  emm.published_date,
  emm.relevance_score
FROM person_identity_map p
JOIN exa_media_mentions emm ON p.person_id = emm.person_id
ORDER BY emm.relevance_score DESC
LIMIT 30;
```

### Check API usage:

```sql
-- Summary view
SELECT * FROM vw_exa_usage_summary;

-- Recent requests
SELECT
  created_at,
  endpoint,
  request_count,
  cost_estimate,
  campaign_type,
  duration_ms
FROM exa_api_usage
ORDER BY created_at DESC
LIMIT 20;
```

---

## Command Reference

### Auto-Tagging Commands

```bash
# Keyword matching (fast, free)
node auto-tag-contacts.js --limit=1000

# AI analysis (smarter, costs ~$0.01/100 contacts)
node auto-tag-contacts.js --ai --limit=500

# Dry run (test without making changes)
node auto-tag-contacts.js --dry-run --limit=100
```

### Verification Commands

```bash
# Check system status and candidate counts
node verify-exa.js

# Check tables exist
node check-tables.js
```

### Queuing Commands

```bash
# Queue Goods on Country candidates
node queue-candidates.js --campaign=goods --limit=20

# Queue JusticeHub candidates
node queue-candidates.js --campaign=justice --limit=20

# Queue from both campaigns
node queue-candidates.js --limit=100
```

### Enrichment Processing Commands

```bash
# Dry run (no API calls, no credits used)
node process-batch.js --dry-run --limit=5

# Process 10 contacts
node process-batch.js --limit=10

# Process Goods on Country campaign only
node process-batch.js --campaign=goods --limit=20

# Process JusticeHub campaign only
node process-batch.js --campaign=justice --limit=20
```

---

## Troubleshooting

### No candidates found after tagging

Check if contacts have the necessary data:

```sql
SELECT
  COUNT(*) FILTER (WHERE email IS NOT NULL) as has_email,
  COUNT(*) FILTER (WHERE tags IS NOT NULL) as has_tags,
  COUNT(*) FILTER (WHERE current_company IS NOT NULL) as has_company
FROM person_identity_map;
```

If tags are missing, run auto-tagging first.

### API rate limits

The script includes 1-second delays between contacts. If you hit rate limits:
- Reduce batch size: `--limit=5`
- Wait 1 minute between batches
- Check usage: `node verify-exa.js`

### Failed enrichments

Check queue status:

```sql
SELECT status, COUNT(*), string_agg(error_message, '; ') as errors
FROM exa_enrichment_queue
GROUP BY status;
```

Re-queue failed contacts:

```sql
UPDATE exa_enrichment_queue
SET status = 'pending', processed_at = NULL, error_message = NULL
WHERE status = 'failed';
```

---

## Monitoring Free Tier Usage

**Free tier limit**: 1,000 requests/month

**Check remaining quota**:
```bash
node verify-exa.js
```

Or query directly:
```sql
SELECT
  SUM(request_count) as total_requests_used,
  1000 - SUM(request_count) as remaining
FROM exa_api_usage
WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE);
```

**Budget strategy**:
- Each contact = ~3 API requests
- 1,000 requests = ~333 contacts enriched per month
- Process high-priority contacts first
- Leave 100-request buffer for emergencies

---

## Next Steps

1. **Test with dry run**: `node process-batch.js --dry-run --limit=5`
2. **Process first 5 contacts**: `node process-batch.js --limit=5`
3. **Review data quality** in Supabase
4. **Tag more contacts** if needed: `node auto-tag-contacts.js --limit=5000`
5. **Scale up processing**: `node process-batch.js --campaign=goods --limit=20`

---

## Success Metrics (Target After 100 Enrichments)

**Data Quality**:
- LinkedIn found: > 70%
- Company intel: > 80%
- Media mentions: > 30%
- Avg confidence score: > 0.7

**Time Saved**:
- 100 contacts × 15 min manual research = 1,500 minutes (25 hours)
- @ $50/hour = **$1,250 value**
- Cost: **$0** (free tier)
- **ROI: Infinite** ✨
