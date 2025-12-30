# Exa.ai Enrichment Setup Guide

**Purpose**: Automated people intelligence for Goods on Country & JusticeHub campaigns
**Free tier**: 1,000 requests/month
**Manual sync**: Triggered via API or dashboard

---

## Quick Start (5 Minutes)

### 1. Sign Up for Exa.ai

1. Go to https://exa.ai
2. Click "Sign Up" (free tier: 1,000 requests/month)
3. Get API key from dashboard

### 2. Add Environment Variable

```bash
# In /Users/benknight/Code/ACT Placemat/apps/backend/.env
EXA_API_KEY=your-exa-api-key-here
```

### 3. Run Supabase Migration

```bash
# Copy migration file to Supabase SQL Editor
cat /Users/benknight/Code/ACT Placemat/supabase/migrations/20251224_exa_enrichment_system.sql

# Paste into Supabase SQL Editor → Run
```

### 4. Install Exa.ai SDK

```bash
cd /Users/benknight/Code/ACT Placemat/apps/backend
npm install exa-js
```

### 5. Test Enrichment

```sql
-- Queue top 10 Goods on Country contacts
SELECT * FROM vw_goods_enrichment_candidates LIMIT 10;

-- Manually queue them
SELECT queue_for_exa_enrichment(person_id, 'goods-on-country', 100)
FROM vw_goods_enrichment_candidates
LIMIT 10;

-- Check queue
SELECT * FROM get_next_exa_batch(10, 'goods-on-country');
```

---

## What Gets Enriched

### For Each Person:

**1. LinkedIn Profile** (1 Exa request)
- Headline, summary, location
- Work experience history
- Education history
- Skills
- Actual LinkedIn URL (even if you didn't have it)

**2. Company Intelligence** (1 Exa request)
- Industry, size, location
- Leadership team
- Recent news & funding
- Company website & social

**3. Media Mentions** (1 Exa request)
- Recent articles/interviews (last 12 months)
- Publication dates
- Sentiment & relevance
- Topics mentioned

**Total per person**: ~3 Exa requests

---

## Campaign-Specific Enrichment

### Goods on Country Campaign

**Auto-queue criteria** (see `vw_goods_enrichment_candidates`):
- Has tag: `goods-on-country`, `circular-economy`, `indigenous-business`, `sustainable-products`
- Sector: `retail`, `manufacturing`
- Engagement priority: `critical`, `high`

**SQL to queue**:
```sql
SELECT queue_campaign_for_enrichment(
  (SELECT id FROM contact_campaigns WHERE campaign_type = 'goods-on-country' LIMIT 1),
  'goods-on-country',
  100  -- Top 100 contacts
);
```

### JusticeHub Campaign

**Auto-queue criteria** (see `vw_justice_enrichment_candidates`):
- Youth justice relevance score > 50
- Has tag: `youth-justice`, `juvenile-justice`, `restorative-justice`, `indigenous-youth`
- Engagement priority: `critical`, `high`

**SQL to queue**:
```sql
SELECT queue_campaign_for_enrichment(
  (SELECT id FROM contact_campaigns WHERE campaign_type = 'justice-hub' LIMIT 1),
  'justice-hub',
  100  -- Top 100 contacts
);
```

---

## API Integration (Express)

### Add to Express routes:

```typescript
// /Users/benknight/Code/ACT Placemat/apps/backend/src/routes/exa.routes.ts

import express from 'express';
import { ExaEnrichmentService } from '../services/exa/exa-enrichment.service';

const router = express.Router();

const exaService = new ExaEnrichmentService(
  process.env.EXA_API_KEY!,
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/exa/enrich
 * Manually enrich a single person
 */
router.post('/enrich', async (req, res) => {
  try {
    const { person_id, campaign_type } = req.body;

    // Get person data
    const { data: person } = await supabase
      .from('person_identity_map')
      .select('*')
      .eq('person_id', person_id)
      .single();

    if (!person) {
      return res.status(404).json({ error: 'Person not found' });
    }

    // Enrich
    const result = await exaService.enrichPerson({
      person_id: person.person_id,
      full_name: person.full_name,
      email: person.email,
      linkedin_url: person.linkedin_contact_id,
      current_company: person.current_company,
      current_position: person.current_position,
      campaign_type,
    });

    res.json({
      success: true,
      person_id,
      confidence: result.overall_confidence,
      requests_used: result.exa_requests_used,
      linkedin_found: !!result.linkedin_profile,
      company_found: !!result.company_intel,
      media_mentions: result.media_mentions.length,
    });
  } catch (error) {
    console.error('Enrichment failed:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/exa/batch
 * Process next batch from queue
 */
router.post('/batch', async (req, res) => {
  try {
    const { batch_size = 10, campaign_type } = req.body;

    // Get batch
    const { data: batch } = await supabase.rpc('get_next_exa_batch', {
      p_batch_size: batch_size,
      p_campaign_type: campaign_type,
    });

    if (!batch || batch.length === 0) {
      return res.json({ message: 'Queue is empty', processed: 0 });
    }

    const results = [];

    for (const item of batch) {
      try {
        // Mark as processing
        await supabase
          .from('exa_enrichment_queue')
          .update({ status: 'processing', started_at: new Date().toISOString() })
          .eq('id', item.queue_id);

        // Enrich
        const result = await exaService.enrichPerson({
          person_id: item.person_id,
          full_name: item.person_name,
          email: item.person_email,
          current_company: item.current_company,
          campaign_type: item.campaign_type,
        });

        results.push({
          person_id: item.person_id,
          name: item.person_name,
          success: true,
          confidence: result.overall_confidence,
        });

        // Mark as completed
        await supabase
          .from('exa_enrichment_queue')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            exa_requests_used: result.exa_requests_used,
          })
          .eq('id', item.queue_id);
      } catch (error) {
        console.error(`Failed to enrich ${item.person_name}:`, error);

        // Mark as failed
        await supabase
          .from('exa_enrichment_queue')
          .update({
            status: 'failed',
            error_message: error.message,
            retry_count: supabase.rpc('increment', { row_id: item.queue_id }),
          })
          .eq('id', item.queue_id);

        results.push({
          person_id: item.person_id,
          name: item.person_name,
          success: false,
          error: error.message,
        });
      }
    }

    res.json({
      processed: results.length,
      successful: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
    });
  } catch (error) {
    console.error('Batch processing failed:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/exa/usage
 * Get current month's usage stats
 */
router.get('/usage', async (req, res) => {
  try {
    const stats = await exaService.getUsageStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/exa/queue
 * View queue status
 */
router.get('/queue', async (req, res) => {
  try {
    const { data } = await supabase.from('vw_exa_queue_summary').select('*');
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/exa/queue/campaign
 * Queue entire campaign for enrichment
 */
router.post('/queue/campaign', async (req, res) => {
  try {
    const { campaign_id, campaign_type, limit = 100 } = req.body;

    const { data: count } = await supabase.rpc('queue_campaign_for_enrichment', {
      p_campaign_id: campaign_id,
      p_campaign_type: campaign_type,
      p_limit: limit,
    });

    res.json({
      success: true,
      queued_count: count,
      campaign_type,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

### Register routes in main app:

```typescript
// /Users/benknight/Code/ACT Placemat/apps/backend/src/app.ts

import exaRoutes from './routes/exa.routes';

app.use('/api/exa', exaRoutes);
```

---

## Usage Examples

### 1. Queue Top 100 Goods Contacts

```bash
curl -X POST http://localhost:4000/api/exa/queue/campaign \
  -H "Content-Type: application/json" \
  -d '{
    "campaign_id": "YOUR_CAMPAIGN_ID",
    "campaign_type": "goods-on-country",
    "limit": 100
  }'
```

### 2. Process Next 10 from Queue

```bash
curl -X POST http://localhost:4000/api/exa/batch \
  -H "Content-Type: application/json" \
  -d '{
    "batch_size": 10,
    "campaign_type": "goods-on-country"
  }'
```

### 3. Check Usage Stats

```bash
curl http://localhost:4000/api/exa/usage
```

### 4. View Queue Status

```bash
curl http://localhost:4000/api/exa/queue
```

---

## Manual Enrichment (Direct SQL)

### Queue specific people:

```sql
-- Queue a single person
SELECT queue_for_exa_enrichment(
  'person-uuid-here'::uuid,
  'goods-on-country',
  100  -- High priority
);

-- Queue people with specific tags
INSERT INTO exa_enrichment_queue (person_id, campaign_type, priority)
SELECT person_id, 'goods-on-country', 90
FROM person_identity_map
WHERE 'circular-economy' = ANY(tags)
  AND exa_enriched = FALSE
LIMIT 50;
```

### Check enrichment results:

```sql
-- People with LinkedIn profiles found
SELECT p.full_name, elp.headline, elp.linkedin_url, elp.confidence_score
FROM person_identity_map p
JOIN exa_linkedin_profiles elp ON p.person_id = elp.person_id
ORDER BY elp.confidence_score DESC
LIMIT 20;

-- People with media mentions
SELECT p.full_name, COUNT(emm.*) as mention_count
FROM person_identity_map p
JOIN exa_media_mentions emm ON p.person_id = emm.person_id
GROUP BY p.person_id, p.full_name
ORDER BY mention_count DESC;

-- Company intel gathered
SELECT company_name, industry, company_size, COUNT(recent_news) as news_count
FROM exa_company_intelligence,
     jsonb_array_elements(recent_news) as recent_news
GROUP BY company_name, industry, company_size
ORDER BY news_count DESC;
```

---

## Free Tier Management

### Monitor Usage:

```sql
SELECT * FROM vw_exa_usage_summary
WHERE period_month = DATE_TRUNC('month', CURRENT_DATE);
```

**Output**:
- `total_requests`: How many Exa requests used this month
- `free_tier_remaining`: How many left (resets monthly)
- `usage_percentage`: % of free tier used
- `linkedin_requests`, `company_requests`, `media_requests`: Breakdown by type

### Strategy for 1,000/month limit:

**Conservative approach** (stay within free tier):
- ~3 requests per person = **330 people/month**
- Focus on critical + high priority contacts
- Queue by campaign in batches of 10-20

**Recommended schedule**:
- Week 1: Top 50 Goods on Country contacts (150 requests)
- Week 2: Top 50 JusticeHub contacts (150 requests)
- Week 3: Top 50 from both campaigns (150 requests)
- Week 4: Refresh media mentions for high-value contacts (50 requests)
- **Total/month**: ~500 requests (50% of free tier)

---

## Automation (Optional)

### Cron job to process queue daily:

```typescript
// /Users/benknight/Code/ACT Placemat/apps/backend/src/cron/exa-daily-batch.ts

import cron from 'node-cron';
import { ExaEnrichmentService } from '../services/exa/exa-enrichment.service';

// Run every day at 2am
cron.schedule('0 2 * * *', async () => {
  console.log('[Exa Cron] Starting daily batch enrichment');

  const exaService = new ExaEnrichmentService(
    process.env.EXA_API_KEY!,
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Check usage first
  const usage = await exaService.getUsageStats();
  if (usage && usage.free_tier_remaining < 50) {
    console.log('[Exa Cron] Low on free tier requests, skipping');
    return;
  }

  // Process 15 contacts (45 requests, ~5% of monthly limit)
  const batch = await supabase.rpc('get_next_exa_batch', {
    p_batch_size: 15,
  });

  for (const item of batch.data || []) {
    try {
      await exaService.enrichPerson({
        person_id: item.person_id,
        full_name: item.person_name,
        email: item.person_email,
        current_company: item.current_company,
        campaign_type: item.campaign_type,
      });

      await supabase
        .from('exa_enrichment_queue')
        .update({ status: 'completed' })
        .eq('id', item.queue_id);

      console.log(`[Exa Cron] Enriched: ${item.person_name}`);
    } catch (error) {
      console.error(`[Exa Cron] Failed: ${item.person_name}`, error);
    }
  }

  console.log('[Exa Cron] Daily batch complete');
});
```

---

## Troubleshooting

### Issue: "Free tier limit reached"

**Fix**: Check usage:
```sql
SELECT * FROM exa_api_usage WHERE period_month = DATE_TRUNC('month', CURRENT_DATE);
```

If `free_tier_exceeded = true`, wait until next month or upgrade to paid plan.

### Issue: "No results found"

**Possible causes**:
- Person has uncommon name
- LinkedIn profile is private/restricted
- Company is very small/new

**Fix**: Manually add LinkedIn URL to `person_identity_map.linkedin_contact_id` before enrichment.

### Issue: Low confidence scores

**Cause**: Exa couldn't find reliable data

**Fix**:
- Add more context (company, position) to person record
- Manually verify/update enriched data
- Re-run enrichment after adding context

---

## Next Steps

1. ☐ Sign up for Exa.ai (free tier)
2. ☐ Add `EXA_API_KEY` to `.env`
3. ☐ Run Supabase migration
4. ☐ Install `exa-js` package
5. ☐ Queue top 100 Goods on Country contacts
6. ☐ Process first batch (10 contacts)
7. ☐ Review results in Supabase
8. ☐ Queue top 100 JusticeHub contacts
9. ☐ Set up cron job (optional)

---

## Cost Projection

### Free Tier (1,000 requests/month)
- ~330 people/month @ 3 requests each
- **Cost**: $0/month
- **Sufficient for**: Testing + high-priority contacts

### Paid Tier ($50/month for 10k requests)
- ~3,300 people/month
- Could enrich all 15,000 contacts in 5 months
- **Cost**: $250 total (one-time bulk enrichment)

### Recommendation
**Start with free tier**, focus on:
- Top 50 Goods on Country contacts
- Top 50 JusticeHub contacts
- Evaluate quality after 100 enrichments
- Upgrade only if results justify it

**ROI**: Even 100 enriched high-quality contacts saves ~33 hours of manual research @ $50/hr = **$1,650 value** for free!
