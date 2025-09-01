import express from 'express';
import Redis from 'ioredis';
import { createClient } from '@supabase/supabase-js';
import { XeroClient } from 'xero-node';

const router = express.Router();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function refreshXeroTokenIfNeeded(xero, tokenSet) {
  try {
    const nowSec = Math.floor(Date.now() / 1000);
    if (!tokenSet?.expires_at || tokenSet.expires_at - 60 > nowSec) {
      return tokenSet;
    }
    const form = new URLSearchParams();
    form.set('grant_type', 'refresh_token');
    form.set('refresh_token', tokenSet.refresh_token);
    const basic = Buffer.from(
      `${process.env.XERO_CLIENT_ID || ''}:${process.env.XERO_CLIENT_SECRET || ''}`
    ).toString('base64');
    const resp = await fetch('https://identity.xero.com/connect/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${basic}`,
      },
      body: form.toString(),
    });
    const json = await resp.json();
    if (!resp.ok) throw new Error(json.error || 'xero_refresh_failed');
    const refreshed = {
      ...tokenSet,
      access_token: json.access_token,
      expires_in: json.expires_in,
      scope: json.scope,
      token_type: json.token_type,
      refresh_token: json.refresh_token || tokenSet.refresh_token,
      expires_at: Math.floor(Date.now() / 1000) + (json.expires_in || 1800),
    };
    await xero.setTokenSet(refreshed);
    await redis.set('xero:tokenSet', JSON.stringify(refreshed));
    return refreshed;
  } catch (e) {
    console.error('Xero token refresh failed:', e?.message || e);
    return tokenSet;
  }
}

async function getXeroSession() {
  const [tokenSetJson, tenantId] = await Promise.all([
    redis.get('xero:tokenSet'),
    redis.get('xero:tenantId'),
  ]);
  if (!tokenSetJson || !tenantId) return null;
  const tokenSet = JSON.parse(tokenSetJson);
  const xero = new XeroClient({
    clientId: process.env.XERO_CLIENT_ID,
    clientSecret: process.env.XERO_CLIENT_SECRET,
    redirectUris: [
      process.env.XERO_REDIRECT_URI || 'http://localhost:4000/api/xero/callback',
    ],
  });
  await xero.setTokenSet(tokenSet);
  // ensure fresh token
  const updated = await refreshXeroTokenIfNeeded(xero, tokenSet);
  if (updated !== tokenSet) {
    await xero.setTokenSet(updated);
  }
  try {
    await xero.updateTenants();
  } catch {}
  return { xero, tenantId };
}

function applyRules(description, contact) {
  const text = `${description || ''} ${contact || ''}`.toLowerCase();
  // simple in-memory examples; can be extended to DB rules later
  const rules = [
    { pattern: 'google', category: 'Software' },
    { pattern: 'aws', category: 'Cloud' },
    { pattern: 'xero', category: 'Software' },
    { pattern: 'uber', category: 'Travel' },
    { pattern: 'coffee', category: 'Meals & Entertainment' },
  ];
  for (const r of rules) {
    if (text.includes(r.pattern)) return { category: r.category, confidence: 0.8 };
  }
  return { category: null, confidence: 0.0 };
}

function toDateString(value) {
  try {
    if (!value) return null;
    const d = typeof value === 'string' ? new Date(value) : new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 10);
  } catch {
    return null;
  }
}

/**
 * @openapi
 * /api/bookkeeping/status:
 *   get:
 *     summary: Get bookkeeping sync status
 *     description: Returns the current sync state for bookkeeping operations including last sync timestamp
 *     tags: [Bookkeeping]
 *     security:
 *       - apiKeyAuth: []
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sync status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *                 state:
 *                   type: object
 *                   nullable: true
 *                   properties:
 *                     tenant_id:
 *                       type: string
 *                     last_synced_at:
 *                       type: string
 *                       format: date-time
 *                     last_page:
 *                       type: integer
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/status', async (req, res) => {
  const state = await supabase.from('bookkeeping_sync_state').select('*').single();
  res.json({ ok: true, state: state.data || null });
});

/**
 * @openapi
 * /api/bookkeeping/apply-schema:
 *   post:
 *     summary: Apply bookkeeping database schema
 *     description: Applies the bookkeeping database schema via Supabase RPC exec_sql function
 *     tags: [Bookkeeping]
 *     security:
 *       - apiKeyAuth: []
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Schema applied successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *                 applied:
 *                   type: boolean
 *                   example: true
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/apply-schema', async (req, res) => {
  try {
    const fs = await import('fs');
    const path = await import('path');
    // Resolve from repo root if running under backend or pm2
    const repoRoot = process.cwd().includes('/apps/backend')
      ? process.cwd().replace(/\/apps\/backend$/, '')
      : process.cwd();
    const sqlPath = path.join(
      repoRoot,
      'apps',
      'backend',
      'database',
      'bookkeeping-schema.sql'
    );
    const sql = fs.readFileSync(sqlPath, 'utf8');
    // Split into individual statements to avoid BEGIN/COMMIT limitations
    const statements = sql
      .split(/;\s*\n/)
      .map(s => s.trim())
      .filter(
        s => s.length > 0 && !/^--/.test(s) && !/^BEGIN/i.test(s) && !/^COMMIT/i.test(s)
      );
    for (const stmt of statements) {
      const { error } = await supabase.rpc('exec_sql', { query: stmt + ';' });
      if (error) throw new Error(error.message || 'exec_sql failed');
    }
    res.json({ ok: true, applied: true });
  } catch (e) {
    res.status(500).json({ error: 'apply_failed', message: e.message });
  }
});

/**
 * @openapi
 * /api/bookkeeping/sync:
 *   post:
 *     summary: Sync transactions from Xero
 *     description: Synchronizes bank transactions from Xero accounting system with optional full sync and lookback period
 *     tags: [Bookkeeping]
 *     security:
 *       - apiKeyAuth: []
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               full:
 *                 type: boolean
 *                 description: Whether to perform full sync (ignores last sync timestamp)
 *                 default: false
 *               days:
 *                 type: integer
 *                 description: Number of days to look back for transactions
 *                 default: 90
 *                 minimum: 1
 *                 maximum: 365
 *     responses:
 *       200:
 *         description: Sync completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *                 upserted:
 *                   type: integer
 *                   description: Number of transactions synchronized
 *                 since:
 *                   type: string
 *                   format: date-time
 *                   nullable: true
 *                 pages:
 *                   type: integer
 *                   description: Number of pages processed
 *                 full:
 *                   type: boolean
 *                 lookbackDays:
 *                   type: integer
 *       400:
 *         description: Xero not connected
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Xero not connected"
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/sync', async (req, res) => {
  try {
    const session = await getXeroSession();
    if (!session) return res.status(400).json({ error: 'Xero not connected' });
    const { xero, tenantId } = session;

    const full = !!req.body?.full;
    const lookbackDays = Number(req.body?.days || 90);
    // Determine incremental window from sync state (unless full import requested)
    const { data: syncState } = await supabase
      .from('bookkeeping_sync_state')
      .select('*')
      .eq('tenant_id', tenantId)
      .single();
    const sinceIso =
      syncState?.last_synced_at ||
      new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000).toISOString();
    const ifModifiedSince = full ? undefined : new Date(sinceIso);

    // Xero where filter for full sync by transaction Date field
    let whereFilter;
    if (full) {
      const sinceDate = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);
      const y = sinceDate.getUTCFullYear();
      const m = sinceDate.getUTCMonth() + 1;
      const d = sinceDate.getUTCDate();
      whereFilter = `Date>=DateTime(${y}, ${m}, ${d})`;
    }

    // Page through results; respect basic rate-limiting
    let page = 1;
    const maxPages = 50;
    const accumulated = [];
    while (page <= maxPages) {
      try {
        const { body } = await xero.accountingApi.getBankTransactions(
          tenantId,
          ifModifiedSince,
          whereFilter,
          undefined,
          page
        );
        const items = body?.bankTransactions || [];
        if (!items.length) break;
        for (const t of items) {
          const direction = t?.type === 'SPEND' ? 'spent' : 'received';
          const desc =
            t?.reference ||
            t?.bankAccount?.name ||
            t?.contact?.name ||
            t?.lineItems?.[0]?.description ||
            '';
          const dateStr =
            toDateString(t?.date) ||
            toDateString(t?.updatedDateUTC) ||
            toDateString(t?.createdDateUTC) ||
            toDateString(new Date());
          const rule = applyRules(desc, t?.contact?.name);
          accumulated.push({
            tenant_id: tenantId,
            xero_id: t?.bankTransactionID,
            txn_date: dateStr,
            amount: t?.total || 0,
            currency: t?.currencyCode || 'AUD',
            direction,
            description: desc,
            contact_name: t?.contact?.name || null,
            account_code: t?.bankAccount?.code || null,
            account_name: t?.bankAccount?.name || null,
            category: rule.category,
            category_confidence: rule.confidence,
            raw: t,
          });
        }
        if (items.length < 100) {
          // Xero usually returns up to 100 per page; fewer means last page
          break;
        }
        page += 1;
        await sleep(300); // gentle pacing
      } catch (err) {
        // Basic backoff for rate limits
        if (err?.response?.statusCode === 429) {
          await sleep(1500);
          continue;
        }
        throw err;
      }
    }

    if (accumulated.length > 0) {
      const { error } = await supabase
        .from('bookkeeping_transactions')
        .upsert(accumulated, { onConflict: 'xero_id' });
      if (error) throw error;
    }
    await supabase.from('bookkeeping_sync_state').upsert({
      tenant_id: tenantId,
      last_synced_at: new Date().toISOString(),
      last_page: page,
    });

    res.json({
      ok: true,
      upserted: accumulated.length,
      since: ifModifiedSince ? ifModifiedSince.toISOString() : null,
      pages: page,
      full,
      lookbackDays,
    });
  } catch (e) {
    const details = e?.response?.body
      ? typeof e.response.body === 'string'
        ? e.response.body
        : JSON.stringify(e.response.body)
      : undefined;
    console.error('Bookkeeping sync error:', e?.message || e, details || '');
    res
      .status(500)
      .json({ error: 'sync_failed', message: e?.message || String(e), details });
  }
});

/**
 * @openapi
 * /api/bookkeeping/transactions:
 *   get:
 *     summary: Get filtered transactions
 *     description: Retrieve bookkeeping transactions with advanced filtering and search capabilities
 *     tags: [Bookkeeping]
 *     security:
 *       - apiKeyAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - name: category
 *         in: query
 *         description: Filter by transaction category
 *         schema:
 *           type: string
 *       - name: limit
 *         in: query
 *         description: Maximum number of transactions to return
 *         schema:
 *           type: integer
 *           default: 100
 *           minimum: 1
 *           maximum: 1000
 *       - name: uncategorized
 *         in: query
 *         description: Filter for uncategorized transactions only
 *         schema:
 *           type: string
 *           enum: ["true"]
 *       - name: sinceDays
 *         in: query
 *         description: Number of days to look back
 *         schema:
 *           type: integer
 *           minimum: 1
 *       - name: from
 *         in: query
 *         description: Start date filter (YYYY-MM-DD)
 *         schema:
 *           type: string
 *           format: date
 *       - name: to
 *         in: query
 *         description: End date filter (YYYY-MM-DD)
 *         schema:
 *           type: string
 *           format: date
 *       - name: q
 *         in: query
 *         description: Search text in description or contact name
 *         schema:
 *           type: string
 *       - name: direction
 *         in: query
 *         description: Transaction direction filter
 *         schema:
 *           type: string
 *           enum: [spent, received]
 *     responses:
 *       200:
 *         description: Transactions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total:
 *                   type: integer
 *                   description: Number of transactions returned
 *                 transactions:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/BookkeepingTransaction'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/transactions', async (req, res) => {
  const {
    category,
    limit = 100,
    uncategorized,
    sinceDays,
    from,
    to,
    q,
    direction,
  } = req.query;
  const maxLimit = Math.min(Number(limit) || 100, 1000);
  let query = supabase
    .from('bookkeeping_transactions')
    .select('*')
    .order('txn_date', { ascending: false })
    .limit(maxLimit);
  if (category) query = query.eq('category', category);
  if (uncategorized === 'true') query = query.is('category', null);
  if (direction && (direction === 'spent' || direction === 'received'))
    query = query.eq('direction', direction);
  if (sinceDays) {
    const since = new Date(Date.now() - Number(sinceDays) * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    query = query.gte('txn_date', since);
  }
  if (from) query = query.gte('txn_date', String(from));
  if (to) query = query.lte('txn_date', String(to));
  // Basic search across description/contact_name
  if (q) {
    const text = String(q);
    query = query.or(`description.ilike.%${text}%,contact_name.ilike.%${text}%`);
  }
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json({ total: data?.length || 0, transactions: data || [] });
});

// Export transactions CSV (filtered)
router.get('/transactions/export', async (req, res) => {
  try {
    const {
      category,
      uncategorized,
      sinceDays,
      from,
      to,
      q,
      direction,
      limit = 2000,
    } = req.query;
    const params = new URLSearchParams();
    if (category) params.set('category', String(category));
    if (uncategorized) params.set('uncategorized', String(uncategorized));
    if (sinceDays) params.set('sinceDays', String(sinceDays));
    if (from) params.set('from', String(from));
    if (to) params.set('to', String(to));
    if (q) params.set('q', String(q));
    if (direction) params.set('direction', String(direction));
    params.set('limit', String(Math.min(Number(limit) || 2000, 5000)));
    // Reuse the existing endpoint
    const base = `http://localhost:${process.env.PORT || 4000}`;
    const resp = await fetch(
      `${base}/api/bookkeeping/transactions?${params.toString()}`
    );
    const j = await resp.json();
    const rows = Array.isArray(j.transactions) ? j.transactions : [];
    const cols = [
      'txn_date',
      'direction',
      'amount',
      'currency',
      'description',
      'contact_name',
      'category',
    ];
    const header = cols.join(',');
    const body = rows
      .map(r => cols.map(c => JSON.stringify(r[c] ?? '')).join(','))
      .join('\n');
    const csv = `${header}\n${body}`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="transactions.csv"');
    res.send(csv);
  } catch (e) {
    res.status(500).json({ error: 'export_failed', message: e?.message || String(e) });
  }
});

// Update category for a single transaction (inline edit)
router.post('/transactions/:id/category', async (req, res) => {
  try {
    const { id } = req.params;
    const { category } = req.body || {};
    const { error } = await supabase
      .from('bookkeeping_transactions')
      .update({
        category: category || null,
        category_confidence: category ? 1.0 : 0.0,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);
    if (error) throw new Error(error.message);
    res.json({ ok: true, id: Number(id), category: category || null });
  } catch (e) {
    res.status(500).json({ error: 'update_category_failed', message: e.message });
  }
});

// Bulk update category for selected transactions
router.post('/transactions/bulk-category', async (req, res) => {
  try {
    const { ids, category } = req.body || {};
    if (!Array.isArray(ids) || ids.length === 0)
      return res.status(400).json({ error: 'ids_required' });
    const { error } = await supabase
      .from('bookkeeping_transactions')
      .update({
        category: category || null,
        category_confidence: category ? 1.0 : 0.0,
        updated_at: new Date().toISOString(),
      })
      .in('id', ids);
    if (error) throw new Error(error.message);
    res.json({ ok: true, updated: ids.length, category: category || null });
  } catch (e) {
    res.status(500).json({ error: 'bulk_update_category_failed', message: e.message });
  }
});

// Bulk update vendor/contact name for selected transactions
router.post('/transactions/bulk-vendor', async (req, res) => {
  try {
    const { ids, vendorName } = req.body || {};
    if (!Array.isArray(ids) || ids.length === 0)
      return res.status(400).json({ error: 'ids_required' });
    const { error } = await supabase
      .from('bookkeeping_transactions')
      .update({
        contact_name: vendorName || null,
        updated_at: new Date().toISOString(),
      })
      .in('id', ids);
    if (error) throw new Error(error.message);
    res.json({ ok: true, updated: ids.length, vendorName: vendorName || null });
  } catch (e) {
    res.status(500).json({ error: 'bulk_update_vendor_failed', message: e.message });
  }
});

// Rules: list
router.get('/rules', async (req, res) => {
  const tenantId = await redis.get('xero:tenantId');
  const { data, error } = await supabase
    .from('bookkeeping_rules')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('priority', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ rules: data || [] });
});

// Rules: add
router.post('/rules', async (req, res) => {
  const tenantId = await redis.get('xero:tenantId');
  const { pattern, category, account_code, priority = 100 } = req.body || {};
  if (!pattern || !category)
    return res.status(400).json({ error: 'pattern and category required' });
  const { data, error } = await supabase
    .from('bookkeeping_rules')
    .insert([
      {
        tenant_id: tenantId,
        pattern,
        category,
        account_code: account_code || null,
        priority,
      },
    ])
    .select('*')
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true, rule: data });
});

// Rules: delete
router.delete('/rules/:id', async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from('bookkeeping_rules').delete().eq('id', id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true, deleted: id });
});

// Apply rules to categorize existing transactions
router.post('/apply-rules', async (req, res) => {
  const batchSize = Number(req.body?.batchSize || 500);
  const softLimit = Number(req.body?.maxBatches || 100);
  let lockAcquired = false;
  let lockKey;
  try {
    const tenantId = await redis.get('xero:tenantId');
    if (!tenantId)
      return res
        .status(400)
        .json({ error: 'no_tenant', message: 'Xero tenant not configured' });

    // Simple per-tenant lock to avoid concurrent apply-rules causing deadlocks
    lockKey = `bookkeeping:apply_rules:lock:${tenantId}`;
    lockAcquired = await redis.set(lockKey, '1', 'NX', 'EX', 120);
    if (!lockAcquired) {
      return res
        .status(409)
        .json({ error: 'locked', message: 'Rule application already in progress' });
    }

    const { data: rules, error: rulesErr } = await supabase
      .from('bookkeeping_rules')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('priority', { ascending: true });
    if (rulesErr) throw new Error(rulesErr.message);

    let totalUpdatedRows = 0;
    const perRuleStats = [];

    for (const r of rules || []) {
      const safePattern = (r.pattern || '').toLowerCase().replace(/'/g, "''");
      const safeCategory = (r.category || '').replace(/'/g, "''");

      let batches = 0;
      let updatedInRule = 0;
      // Batch updates using SKIP LOCKED to minimize contention
      while (batches < softLimit) {
        const sql = `with cte as (
            select id from public.bookkeeping_transactions
            where tenant_id='${tenantId}'
              and (lower(coalesce(description,'')) like '%${safePattern}%' or lower(coalesce(contact_name,'')) like '%${safePattern}%')
              and (category is distinct from '${safeCategory}' or category is null)
            for update skip locked
            limit ${batchSize}
          )
          update public.bookkeeping_transactions t
          set category='${safeCategory}', category_confidence=0.9
          from cte
          where t.id = cte.id
          returning t.id;`;
        const { data, error } = await supabase.rpc('exec_sql', { query: sql });
        if (error) throw new Error(error.message);
        const changed = Array.isArray(data) ? data.length : 0;
        if (changed === 0) break;
        updatedInRule += changed;
        totalUpdatedRows += changed;
        batches++;
      }
      perRuleStats.push({
        ruleId: r.id,
        pattern: r.pattern,
        category: r.category,
        updated: updatedInRule,
        batches,
      });
    }

    res.json({ ok: true, totalUpdatedRows, perRuleStats });
  } catch (e) {
    res.status(500).json({ error: 'apply_rules_failed', message: e.message });
  } finally {
    if (lockAcquired && lockKey) {
      try {
        await redis.del(lockKey);
      } catch {}
    }
  }
});

// Seed a set of default categorization rules
router.post('/rules/seed-defaults', async (req, res) => {
  try {
    const tenantId = await redis.get('xero:tenantId');
    const defaults = [
      { pattern: 'google', category: 'Software', priority: 10 },
      { pattern: 'aws', category: 'Cloud', priority: 10 },
      { pattern: 'xero', category: 'Software', priority: 20 },
      { pattern: 'uber', category: 'Travel', priority: 20 },
      { pattern: 'canva', category: 'Design', priority: 20 },
      { pattern: 'stripe', category: 'Payments Fees', priority: 15 },
      { pattern: 'github', category: 'Software', priority: 20 },
      { pattern: 'notion', category: 'Software', priority: 20 },
      { pattern: 'slack', category: 'Communications', priority: 20 },
      { pattern: 'zoom', category: 'Communications', priority: 20 },
      { pattern: 'atlassian', category: 'Software', priority: 20 },
      { pattern: 'openai', category: 'AI Services', priority: 20 },
      { pattern: 'anthropic', category: 'AI Services', priority: 20 },
      { pattern: 'vercel', category: 'Cloud', priority: 20 },
      { pattern: 'netlify', category: 'Cloud', priority: 20 },
      { pattern: 'cloudflare', category: 'Cloud', priority: 20 },
      { pattern: 'twilio', category: 'Communications', priority: 20 },
      { pattern: 'sendgrid', category: 'Email', priority: 20 },
      { pattern: 'figma', category: 'Design', priority: 20 },
      { pattern: 'adobe', category: 'Design', priority: 20 },
    ];
    const rows = defaults.map(r => ({ tenant_id: tenantId, ...r }));
    const { error } = await supabase.from('bookkeeping_rules').insert(rows);
    if (error) throw new Error(error.message);
    res.json({ ok: true, inserted: rows.length });
  } catch (e) {
    res.status(500).json({ error: 'seed_failed', message: e.message });
  }
});

// Summary by category and direction
router.get('/summary', async (req, res) => {
  try {
    const tenantId = await redis.get('xero:tenantId');
    const { from, to } = req.query;
    const conditions = [`tenant_id = '${tenantId}'`];
    if (from) conditions.push(`txn_date >= '${from}'`);
    if (to) conditions.push(`txn_date <= '${to}'`);
    const where = conditions.length ? `where ${conditions.join(' and ')}` : '';
    const sql = `select coalesce(category,'Uncategorized') as category,
      sum(case when direction = 'spent' then amount else 0 end) as spent,
      sum(case when direction = 'received' then amount else 0 end) as received,
      count(*) as count
      from public.bookkeeping_transactions ${where}
      group by 1
      order by 2 desc`;
    let { data, error } = await supabase.rpc('exec_sql', { query: sql });
    if (error) throw new Error(error.message);
    if (!Array.isArray(data)) {
      // Fallback: compute in app if exec_sql returns null
      const q = supabase
        .from('bookkeeping_transactions')
        .select('category, direction, amount')
        .eq('tenant_id', tenantId)
        .limit(2000);
      const { data: tx, error: txErr } = await q;
      if (txErr) throw new Error(txErr.message);
      const map = new Map();
      for (const t of tx || []) {
        const key = t.category || 'Uncategorized';
        const curr = map.get(key) || { category: key, spent: 0, received: 0, count: 0 };
        if (t.direction === 'spent') curr.spent += Number(t.amount || 0);
        else curr.received += Number(t.amount || 0);
        curr.count += 1;
        map.set(key, curr);
      }
      data = Array.from(map.values()).sort(
        (a, b) => Math.abs(b.spent) - Math.abs(a.spent)
      );
    }
    res.json({ ok: true, summary: data || [] });
  } catch (e) {
    res.status(500).json({ error: 'summary_failed', message: e.message });
  }
});

// 30-day cashflow derived from transactions
router.get('/trend/cashflow', async (req, res) => {
  try {
    const tenantId = await redis.get('xero:tenantId');
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const sql = `select txn_date, 
      sum(case when direction='received' then amount else -amount end) as net
      from public.bookkeeping_transactions
      where tenant_id='${tenantId}' and txn_date >= '${since}'
      group by 1 order by 1`;
    const { data, error } = await supabase.rpc('exec_sql', { query: sql });
    if (error) throw new Error(error.message);
    res.json({ ok: true, points: data || [] });
  } catch (e) {
    res.status(500).json({ error: 'trend_failed', message: e.message });
  }
});

// Top vendors by spend (last 30 days)
router.get('/top-vendors', async (req, res) => {
  try {
    const tenantId = await redis.get('xero:tenantId');
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const sql = `select coalesce(contact_name, description) as vendor, sum(amount) as spent
      from public.bookkeeping_transactions
      where tenant_id='${tenantId}' and txn_date >= '${since}' and direction='spent'
      group by 1 order by 2 desc limit 10`;
    const { data, error } = await supabase.rpc('exec_sql', { query: sql });
    if (error) throw new Error(error.message);
    res.json({ ok: true, vendors: data || [] });
  } catch (e) {
    res.status(500).json({ error: 'vendors_failed', message: e.message });
  }
});

// Finance digest (summary for weekly email/logging)
router.get('/digest', async (req, res) => {
  try {
    const base = `http://localhost:${process.env.PORT || 4000}`;
    const tenantId = await redis.get('xero:tenantId');
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    const [summaryResp, trendResp, vendorsResp, finSummaryResp, agingResp] =
      await Promise.all([
        fetch(`${base}/api/bookkeeping/summary?from=${since}`),
        fetch(`${base}/api/bookkeeping/trend/cashflow`),
        fetch(`${base}/api/bookkeeping/top-vendors`),
        fetch(`${base}/api/finance/summary`),
        fetch(`${base}/api/finance/aging`),
      ]);

    const [summaryJ, trendJ, vendorsJ, finSummaryJ, agingJ] = await Promise.all([
      summaryResp.json().catch(() => ({ summary: [] })),
      trendResp.json().catch(() => ({ points: [] })),
      vendorsResp.json().catch(() => ({ vendors: [] })),
      finSummaryResp.json().catch(() => ({ metrics: {}, alerts: [], suggestions: [] })),
      agingResp.json().catch(() => ({ ar: [], ap: [] })),
    ]);

    const categories = Array.isArray(summaryJ.summary) ? summaryJ.summary : [];
    const uncategorized = categories.find(
      c => (c.category ?? 'Uncategorized') === 'Uncategorized'
    );

    return res.json({
      ok: true,
      generated_at: new Date().toISOString(),
      tenantId,
      metrics: finSummaryJ.metrics || {},
      alerts: finSummaryJ.alerts || [],
      suggestions: finSummaryJ.suggestions || [],
      categories,
      uncategorizedCount: Number(uncategorized?.count || 0),
      cashflow: trendJ.points || [],
      topVendors: vendorsJ.vendors || [],
      aging: agingJ,
    });
  } catch (e) {
    res.status(500).json({ error: 'digest_failed', message: e?.message || String(e) });
  }
});

// Alias: POST /digest returns the same digest JSON for convenience (no email send)
router.post('/digest', async (req, res) => {
  try {
    const base = `http://localhost:${process.env.PORT || 4000}`;
    const digestResp = await fetch(`${base}/api/bookkeeping/digest`);
    const digest = await digestResp.json();
    if (!digestResp.ok) throw new Error(digest?.message || 'Failed to build digest');
    res.json(digest);
  } catch (e) {
    res.status(500).json({ error: 'digest_failed', message: e?.message || String(e) });
  }
});

// Send digest via SendGrid if configured
router.post('/digest/send', async (req, res) => {
  try {
    const { to, subject } = req.body || {};
    const base = `http://localhost:${process.env.PORT || 4000}`;
    const digestResp = await fetch(`${base}/api/bookkeeping/digest`);
    const digest = await digestResp.json();
    if (!digestResp.ok) throw new Error(digest?.message || 'Failed to build digest');

    // Build simple HTML
    const html = `
      <div style="font-family: Inter, Arial, sans-serif; line-height: 1.5; color: #111">
        <h2>Weekly Finance Digest</h2>
        <p><strong>Generated:</strong> ${new Date(digest.generated_at).toLocaleString()}</p>
        <h3>Metrics</h3>
        <ul>
          <li>Cash balance: $${Number(digest.metrics?.cash_balance || 0).toLocaleString()}</li>
          <li>Receivables due: $${Number(digest.metrics?.receivables_due || 0).toLocaleString()}</li>
          <li>Payables due: $${Number(digest.metrics?.payables_due || 0).toLocaleString()}</li>
          <li>Runway days: ${digest.metrics?.runway_days ?? '—'}</li>
        </ul>
        <h3>Alerts</h3>
        <ul>${(digest.alerts || []).map(a => `<li>[${a.severity}] ${a.message}</li>`).join('')}</ul>
        <h3>Top Categories</h3>
        <table cellpadding="6" cellspacing="0" style="border-collapse: collapse; border: 1px solid #eee">
          <thead><tr><th align="left">Category</th><th align="right">Spent</th><th align="right">Received</th><th align="right">Count</th></tr></thead>
          <tbody>
            ${(digest.categories || [])
              .slice(0, 8)
              .map(
                c => `<tr>
              <td>${c.category ?? 'Uncategorized'}</td>
              <td align="right">$${Number(Math.abs(c.spent || 0)).toLocaleString()}</td>
              <td align="right">$${Number(c.received || 0).toLocaleString()}</td>
              <td align="right">${c.count || 0}</td>
            </tr>`
              )
              .join('')}
          </tbody>
        </table>
        <p>Uncategorized transactions: <strong>${digest.uncategorizedCount || 0}</strong></p>
      </div>`;

    const apiKey = process.env.SENDGRID_API_KEY;
    const toList = (to || process.env.FINANCE_DIGEST_TO || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    if (!apiKey || toList.length === 0) {
      return res.json({
        ok: false,
        sent: false,
        reason: 'missing_api_key_or_recipients',
        html,
      });
    }

    const payload = {
      personalizations: [{ to: toList.map(email => ({ email })) }],
      from: {
        email: process.env.FINANCE_DIGEST_FROM || 'no-reply@act.place',
        name: 'ACT Finance',
      },
      subject: subject || 'Weekly Finance Digest',
      content: [{ type: 'text/html', value: html }],
    };

    const resp = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });
    if (!resp.ok) {
      const text = await resp.text();
      return res.status(500).json({
        ok: false,
        sent: false,
        reason: 'sendgrid_error',
        details: text,
        html,
      });
    }
    res.json({
      ok: true,
      sent: true,
      recipients: toList,
      preview: html.slice(0, 200) + '...',
    });
  } catch (e) {
    res.status(500).json({ ok: false, sent: false, error: e?.message || String(e) });
  }
});

// One-shot test runner to validate end-to-end flow quickly
router.post('/test-run', async (req, res) => {
  try {
    const base = process.env.NIGHTLY_BASE_URL || 'http://localhost:4000';
    const tenantId = await redis.get('xero:tenantId');
    if (!tenantId)
      return res.status(400).json({
        error: 'xero_not_connected',
        message: 'Connect Xero first at /api/xero/connect-simple',
      });

    // Seed default rules if none exist
    const { count } = await supabase
      .from('bookkeeping_rules')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);
    if (!count || count === 0) {
      try {
        await fetch(`${base}/api/bookkeeping/rules/seed-defaults`, { method: 'POST' });
      } catch {}
    }

    // Sync latest transactions
    const syncResp = await fetch(`${base}/api/bookkeeping/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ full: true, days: 180 }),
    });
    const syncJson = await syncResp.json().catch(() => ({}));

    // Apply categorization rules in batches
    const applyResp = await fetch(`${base}/api/bookkeeping/apply-rules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ batchSize: 200, maxBatches: 50 }),
    });
    const applyJson = await applyResp.json().catch(() => ({}));

    // Pull summary, cashflow trend, and vendors for quick manual validation
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const summarySql = `select coalesce(category,'Uncategorized') as category,
      sum(case when direction = 'spent' then amount else 0 end) as spent,
      sum(case when direction = 'received' then amount else 0 end) as received,
      count(*) as count
      from public.bookkeeping_transactions where tenant_id='${tenantId}' group by 1 order by 2 desc`;
    const trendSql = `select txn_date, sum(case when direction='received' then amount else -amount end) as net from public.bookkeeping_transactions where tenant_id='${tenantId}' and txn_date >= '${since}' group by 1 order by 1`;
    const vendorsSql = `select coalesce(contact_name, description) as vendor, sum(amount) as spent from public.bookkeeping_transactions where tenant_id='${tenantId}' and txn_date >= '${since}' and direction='spent' group by 1 order by 2 desc limit 10`;

    const [
      { data: summary, error: summaryErr },
      { data: trend, error: trendErr },
      { data: vendors, error: vendorsErr },
    ] = await Promise.all([
      supabase.rpc('exec_sql', { query: summarySql }),
      supabase.rpc('exec_sql', { query: trendSql }),
      supabase.rpc('exec_sql', { query: vendorsSql }),
    ]);
    if (summaryErr) throw new Error(summaryErr.message);
    if (trendErr) throw new Error(trendErr.message);
    if (vendorsErr) throw new Error(vendorsErr.message);

    res.json({
      ok: true,
      sync: syncJson,
      apply: applyJson,
      summary: summary || [],
      cashflow: trend || [],
      vendors: vendors || [],
    });
  } catch (e) {
    res.status(500).json({ error: 'test_run_failed', message: e.message });
  }
});

export default router;
