import express from 'express';
import multer from 'multer';
import Redis from 'ioredis';
import { createClient } from '@supabase/supabase-js';
import { XeroClient } from 'xero-node';
import {
  getActiveCategorisationRules,
  suggestCategoryForTransaction
} from '../services/financialCategorizer.js';

const router = express.Router();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function refreshXeroTokenIfNeeded(xero, tokenSet, force = false) {
  const maxRetries = 3;
  let attempt = 0;
  
  while (attempt < maxRetries) {
    try {
      const nowSec = Math.floor(Date.now() / 1000);
      // If not forcing refresh and token appears valid, skip network call
      if (!force && (!tokenSet?.expires_at || tokenSet.expires_at - 60 > nowSec)) {
        return tokenSet;
      }
      
      if (!tokenSet?.refresh_token) {
        throw new Error('No refresh token available');
      }
      
      const form = new URLSearchParams();
      form.set('grant_type', 'refresh_token');
      form.set('refresh_token', tokenSet.refresh_token);
      
      const basic = Buffer.from(
        `${process.env.XERO_CLIENT_ID || ''}:${process.env.XERO_CLIENT_SECRET || ''}`
      ).toString('base64');
      
      // Add timeout and retry logic
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
      
      const resp = await fetch('https://identity.xero.com/connect/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${basic}`,
        },
        body: form.toString(),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!resp.ok) {
        const errorText = await resp.text();
        let errorMessage;
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || errorJson.error_description || 'xero_refresh_failed';
        } catch {
          errorMessage = `HTTP ${resp.status}: ${errorText}`;
        }
        throw new Error(errorMessage);
      }
      
      const json = await resp.json();
      
      // Validate response structure
      if (!json.access_token) {
        throw new Error('Invalid token response: missing access_token');
      }
      
      const refreshed = {
        ...tokenSet,
        access_token: json.access_token,
        expires_in: json.expires_in || 1800,
        scope: json.scope,
        token_type: json.token_type || 'Bearer',
        refresh_token: json.refresh_token || tokenSet.refresh_token,
        expires_at: Math.floor(Date.now() / 1000) + (json.expires_in || 1800),
      };
      
      await xero.setTokenSet(refreshed);
      await redis.set('xero:tokenSet', JSON.stringify(refreshed), 'EX', refreshed.expires_in - 60);
      
      console.log('✅ Xero token refreshed successfully');
      return refreshed;
      
    } catch (e) {
      attempt++;
      const isLastAttempt = attempt >= maxRetries;
      
      if (e.name === 'AbortError') {
        console.error(`Xero token refresh timeout (attempt ${attempt}/${maxRetries})`);
      } else {
        console.error(`Xero token refresh failed (attempt ${attempt}/${maxRetries}):`, e?.message || e);
      }
      
      if (isLastAttempt) {
        // Store failed refresh attempt info
        await redis.set('xero:refresh_failed_at', new Date().toISOString(), 'EX', 300);
        return tokenSet; // Return original token set on final failure
      }
      
      // Exponential backoff: 1s, 2s, 4s
      const delay = Math.pow(2, attempt - 1) * 1000;
      await sleep(delay);
    }
  }
  
  return tokenSet;
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
  return { xero, tenantId, tokenSet: updated || tokenSet };
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
    const { xero, tenantId, tokenSet } = session;

    // Force refresh token before starting sync to avoid 401 TokenExpired
    try {
      const refreshed = await refreshXeroTokenIfNeeded(xero, tokenSet, true);
      if (refreshed !== tokenSet) {
        await xero.setTokenSet(refreshed);
      }
    } catch (e) {
      console.warn('Proceeding with existing Xero token after refresh attempt:', e?.message || e);
    }

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

    const categorisationRules = await getActiveCategorisationRules();

    // Page through results; respect basic rate-limiting
    let page = 1;
    const maxPages = Math.min(Number(process.env.XERO_SYNC_MAX_PAGES || 200), 500);
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
          const suggestion = await suggestCategoryForTransaction(
            {
              description: desc,
              contact: t?.contact?.name,
              amount: t?.total,
              type: t?.type,
              bankAccount: t?.bankAccount?.name
            },
            { rules: categorisationRules }
          );
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
            category: suggestion?.category || null,
            category_confidence: suggestion?.confidence || 0,
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
        // Use v1 financial summary endpoint (existing) instead of legacy /api/finance/summary
        fetch(`${base}/api/v1/financial/reports/summary`).catch(()=>({ ok:false, json: async()=>({}) })),
        // Aging endpoint not implemented yet; return empty structure gracefully
        Promise.resolve({ ok: true, json: async()=>({ success:false, ar: [], ap: [] }) }),
      ]);

    const [summaryJ, trendJ, vendorsJ, finSummaryJ, agingJ] = await Promise.all([
      summaryResp.json().catch(() => ({ summary: [] })),
      trendResp.json().catch(() => ({ points: [] })),
      vendorsResp.json().catch(() => ({ vendors: [] })),
      finSummaryResp.json().catch(() => ({ summary: {}, metrics: {}, alerts: [], suggestions: [] })),
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
      metrics: finSummaryJ.metrics || finSummaryJ.summary || {},
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

// ------------------------------
// Project Costings (links + rollups)
// ------------------------------

async function getTenantId() {
  return (await redis.get('xero:tenantId')) || 'default';
}

// List links (by projectId or transactionId)
router.get('/projects/links', async (req, res) => {
  try {
    const tenantId = await getTenantId();
    let q = supabase
      .from('bookkeeping_project_links')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });
    if (req.query.projectId) q = q.eq('project_id', String(req.query.projectId));
    if (req.query.transactionId) q = q.eq('transaction_id', Number(req.query.transactionId));
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    res.json({ ok: true, links: data || [] });
  } catch (e) {
    res.status(500).json({ error: 'links_failed', message: e.message });
  }
});

// Create or update link
router.post('/projects/link', async (req, res) => {
  try {
    const tenantId = await getTenantId();
    const { transactionId, projectId, allocation = 1.0, note } = req.body || {};
    if (!transactionId || !projectId)
      return res.status(400).json({ error: 'transactionId and projectId required' });
    const { data, error } = await supabase
      .from('bookkeeping_project_links')
      .upsert(
        [{ tenant_id: tenantId, transaction_id: Number(transactionId), project_id: String(projectId), allocation: Number(allocation) || 1.0, note: note || null }],
        { onConflict: 'tenant_id,transaction_id,project_id' }
      )
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    res.json({ ok: true, link: data });
  } catch (e) {
    res.status(500).json({ error: 'link_failed', message: e.message });
  }
});

// Remove link
router.post('/projects/unlink', async (req, res) => {
  try {
    const tenantId = await getTenantId();
    const { transactionId, projectId } = req.body || {};
    if (!transactionId || !projectId)
      return res.status(400).json({ error: 'transactionId and projectId required' });
    const { error } = await supabase
      .from('bookkeeping_project_links')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('transaction_id', Number(transactionId))
      .eq('project_id', String(projectId));
    if (error) throw new Error(error.message);
    res.json({ ok: true, unlinked: { transactionId, projectId } });
  } catch (e) {
    res.status(500).json({ error: 'unlink_failed', message: e.message });
  }
});

// Project rollup summary
router.get('/projects/summary', async (req, res) => {
  try {
    const tenantId = await getTenantId();
    const from = req.query.from ? String(req.query.from) : null;
    const to = req.query.to ? String(req.query.to) : null;
    const dateFilter = [from ? `t.txn_date >= '${from}'` : null, to ? `t.txn_date <= '${to}'` : null]
      .filter(Boolean)
      .join(' and ');
    const whereDate = dateFilter ? `and ${dateFilter}` : '';
    const sql = `select l.project_id,
      count(*) as count,
      sum(case when t.direction='spent' then t.amount * l.allocation else 0 end) as spent,
      sum(case when t.direction='received' then t.amount * l.allocation else 0 end) as received
      from public.bookkeeping_project_links l
      join public.bookkeeping_transactions t on t.id = l.transaction_id
      where l.tenant_id='${tenantId}' and t.tenant_id='${tenantId}' ${whereDate}
      group by 1
      order by 3 desc`;
    const { data, error } = await supabase.rpc('exec_sql', { query: sql });
    if (error) throw new Error(error.message);
    res.json({ ok: true, summary: data || [] });
  } catch (e) {
    res.status(500).json({ error: 'project_summary_failed', message: e.message });
  }
});

// Transactions linked to a project
router.get('/projects/:projectId/transactions', async (req, res) => {
  try {
    const tenantId = await getTenantId();
    const pid = String(req.params.projectId);
    const { data, error } = await supabase
      .from('bookkeeping_project_links')
      .select('id, allocation, note, transaction:bookkeeping_transactions(*)')
      .eq('tenant_id', tenantId)
      .eq('project_id', pid)
      .order('id', { ascending: false });
    if (error) throw new Error(error.message);
    res.json({ ok: true, links: data || [] });
  } catch (e) {
    res.status(500).json({ error: 'project_transactions_failed', message: e.message });
  }
});

// ------------------------------
// Receipts: Dext integration stubs
// ------------------------------

router.get('/dext/receipts', async (req, res) => {
  try {
    const tenantId = await getTenantId();
    const { data, error } = await supabase
      .from('bookkeeping_receipts')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('receipt_date', { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    res.json({ ok: true, receipts: data || [] });
  } catch (e) {
    res.status(500).json({ error: 'list_receipts_failed', message: e.message });
  }
});

router.post('/dext/sync', async (req, res) => {
  // Placeholder: in real integration, fetch receipts from Dext API and upsert
  res.json({ ok: true, synced: 0, note: 'Dext sync not configured; stubbed' });
});

router.post('/receipts/upload-to-dext', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'file_required' });
    const tenantId = await getTenantId();
    // Placeholder: would call Dext API. For now, record stub row.
    const { data, error } = await supabase
      .from('bookkeeping_receipts')
      .insert([
        {
          tenant_id: tenantId,
          receipt_id: `upl_${Date.now()}`,
          vendor: req.body?.vendor || 'Unknown Vendor',
          amount: req.body?.amount ? Number(req.body.amount) : null,
          currency: req.body?.currency || 'AUD',
          receipt_date: req.body?.date || new Date().toISOString().slice(0,10),
          status: 'uploaded',
          url: null,
          raw: { filename: req.file.originalname, size: req.file.size, mimetype: req.file.mimetype },
        },
      ])
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    res.json({ ok: true, receipt: data });
  } catch (e) {
    res.status(500).json({ error: 'upload_failed', message: e.message });
  }
});

// Suggest matches between uploaded/processed receipts and unmatched transactions
router.get('/receipts/suggestions', async (req, res) => {
  try {
    const tenantId = await getTenantId();
    const sinceDays = Math.min(Math.max(Number(req.query.sinceDays || 90), 1), 365);
    const tolPct = Math.min(Math.max(Number(req.query.tolPct ?? 0.03), 0), 0.2); // default ±3%
    const tolAbs = Math.min(Math.max(Number(req.query.tolAbs ?? 1.0), 0), 50);   // default ±$1
    const maxDays = Math.min(Math.max(Number(req.query.maxDays ?? 14), 1), 60); // default 14 days
    const vendorFilter = String(req.query.vendor || '').trim().toLowerCase();
    const fromDate = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    // Load unmatched transactions (spent only) in window
    let txs = null;
    {
      let qb = supabase
        .from('bookkeeping_transactions')
        .select('id, txn_date, amount, currency, direction, description, contact_name, receipt_id')
        .eq('tenant_id', tenantId)
        .eq('direction', 'spent')
        .is('receipt_id', null)
        .gte('txn_date', fromDate)
        .order('txn_date', { ascending: false })
        .limit(200);
      if (vendorFilter) {
        // Case-insensitive contains on description/contact
        qb = qb.or(
          `description.ilike.%${vendorFilter}%,contact_name.ilike.%${vendorFilter}%`
        );
      }
      const q = await qb;
      if (q.error && /receipt_id/.test(q.error.message || '')) {
        // Fallback for older schema without receipt_id column
        let qb2 = supabase
          .from('bookkeeping_transactions')
          .select('id, txn_date, amount, currency, direction, description, contact_name')
          .eq('tenant_id', tenantId)
          .eq('direction', 'spent')
          .gte('txn_date', fromDate)
          .order('txn_date', { ascending: false })
          .limit(200);
        if (vendorFilter) {
          qb2 = qb2.or(
            `description.ilike.%${vendorFilter}%,contact_name.ilike.%${vendorFilter}%`
          );
        }
        const q2 = await qb2;
        if (q2.error) throw new Error(q2.error.message);
        txs = q2.data || [];
      } else if (q.error) {
        throw new Error(q.error.message);
      } else {
        txs = q.data || [];
      }
    }

    // Load recent receipts (uploaded/processed)
    const { data: receipts, error: recErr } = await supabase
      .from('bookkeeping_receipts')
      .select('id, receipt_id, vendor, amount, currency, receipt_date, status')
      .eq('tenant_id', tenantId)
      .gte('receipt_date', fromDate)
      .order('receipt_date', { ascending: false })
      .limit(500);
    if (recErr) throw new Error(recErr.message);

    let recs = Array.isArray(receipts) ? receipts : [];
    if (vendorFilter) {
      const f = vendorFilter;
      recs = recs.filter(r => String(r.vendor || '').toLowerCase().includes(f));
    }
    const suggestions = [];

    function norm(s) {
      return (s || '').toString().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    }
    function vendorScore(a, b) {
      const na = norm(a);
      const nb = norm(b);
      if (!na || !nb) return 0.0;
      if (na === nb) return 1.0;
      if (na.includes(nb) || nb.includes(na)) return 0.8;
      // simple token overlap
      const setA = new Set(na.split(' '));
      const setB = new Set(nb.split(' '));
      let overlap = 0;
      for (const t of setA) if (setB.has(t)) overlap++;
      return Math.min(0.7, overlap / Math.max(1, Math.min(setA.size, setB.size)));
    }

    for (const t of txs || []) {
      const tAmt = Math.abs(Number(t.amount || 0));
      const tDate = new Date(t.txn_date);
      const candidates = recs
        .map(r => {
          const rAmt = Math.abs(Number(r.amount || 0));
          const amountDelta = Math.abs(rAmt - tAmt);
          const amountOk = amountDelta <= tolAbs || (tAmt > 0 && amountDelta / tAmt <= tolPct);
          const rDate = r.receipt_date ? new Date(r.receipt_date) : null;
          const daysApart = rDate ? Math.abs((+rDate - +tDate) / (1000 * 60 * 60 * 24)) : null;
          const dateOk = daysApart == null ? 0.4 : daysApart <= 7 ? 1.0 : daysApart <= maxDays ? 0.6 : 0.2;
          const vScore = vendorScore(t.contact_name || t.description, r.vendor);
          const score = (amountOk ? 1.0 : 0.0) * 0.6 + dateOk * 0.25 + vScore * 0.15;
          return { r, score, daysApart: daysApart ?? 999, amountDelta };
        })
        .filter(x => x.score >= 0.5)
        .sort((a, b) => b.score - a.score || a.daysApart - b.daysApart || a.amountDelta - b.amountDelta)
        .slice(0, 3);

      suggestions.push({
        transaction: t,
        possibleMatches: candidates.map(c => ({
          receipt_id: c.r.receipt_id || String(c.r.id),
          vendor: c.r.vendor,
          amount: c.r.amount,
          currency: c.r.currency,
          receipt_date: c.r.receipt_date,
          status: c.r.status,
          score: Number(c.score.toFixed(3))
        })),
        confidence: Number((candidates[0]?.score || 0).toFixed(3))
      });
    }

    // Legacy compatibility: also return a flattened list for frontend
    const unmatchedTransactions = (txs || []).map(t => ({
      id: t.id,
      description: t.description,
      contact_name: t.contact_name,
      amount: Math.abs(Number(t.amount || 0)),
      txn_date: t.txn_date
    }));

    res.json({ ok: true, count: suggestions.length, suggestions, unmatchedTransactions });
  } catch (e) {
    res.status(500).json({ error: 'suggestions_failed', message: e?.message || String(e) });
  }
});

// Attach receipt to bookkeeping transaction
router.post('/receipts/attach', async (req, res) => {
  try {
    const { transactionId, receiptId, receiptUrl } = req.body || {};
    if (!transactionId || (!receiptId && !receiptUrl)) {
      return res.status(400).json({ error: 'transactionId and receiptId/receiptUrl required' });
    }
    const { error } = await supabase
      .from('bookkeeping_transactions')
      .update({
        receipt_id: receiptId || null,
        receipt_url: receiptUrl || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', Number(transactionId));
    if (error) throw new Error(error.message);
    res.json({ ok: true, transactionId, receiptId: receiptId || null, receiptUrl: receiptUrl || null });
  } catch (e) {
    res.status(500).json({ error: 'attach_failed', message: e.message });
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
/**
 * Coverage & Attachments helpers (Xero-centric, read-only)
 */

async function fetchXeroJson(pathname, accessToken, tenantId) {
  const url = `https://api.xero.com${pathname}`;
  const resp = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Xero-tenant-id': tenantId,
      Accept: 'application/json',
    },
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Xero GET ${pathname} failed: ${resp.status} ${text}`);
  }
  return resp.json();
}

function ymdDateNDaysAgo(days) {
  const d = new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  return { y, m, day, iso: d.toISOString().slice(0, 10) };
}

function normalizeVendor(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function scoreCandidate(tx, inv) {
  // Basic explainable score: amount, date proximity, vendor similarity
  const amountTx = Math.abs(Number(tx?.total || tx?.amount || 0));
  const amountInv = Math.abs(Number(inv?.total || 0));
  const amountDiff = Math.abs(amountTx - amountInv);
  const amountTol = Math.max(0.5, amountTx * 0.01); // $0.50 or 1%
  let score = 0;
  const reasons = [];
  if (amountDiff <= amountTol) {
    score += 0.6;
    reasons.push('amount within tolerance');
  }
  const txDate = new Date(tx?.date || tx?.updatedDateUTC || tx?.createdDateUTC);
  const invDate = new Date(inv?.date || inv?.updatedDateUTC || inv?.createdDateUTC);
  const days = Math.abs(Math.round((txDate - invDate) / (1000 * 60 * 60 * 24)));
  if (Number.isFinite(days)) {
    const dScore = Math.max(0, 0.3 - Math.min(days, 7) * 0.04); // up to 0.3 if close
    if (dScore > 0) {
      score += dScore;
      reasons.push(`date proximity ${days}d`);
    }
  }
  const v1 = normalizeVendor(tx?.contact?.name || tx?.bankAccount?.name || tx?.reference || '');
  const v2 = normalizeVendor(inv?.contact?.name || inv?.reference || '');
  if (v1 && v2) {
    const overlap = v1 && v2 ? v1.split(' ').filter(w => v2.includes(w)).length : 0;
    if (overlap > 0) {
      score += 0.1;
      reasons.push('vendor token overlap');
    }
  }
  return { score: Number(score.toFixed(3)), reason: reasons.join(', ') };
}

// List attachments for bank transactions or invoices in a recent window
router.get('/xero/attachments', async (req, res) => {
  try {
    const type = String(req.query?.type || 'bank'); // 'bank' | 'invoice'
    const days = Number(req.query?.days || 30);
    const session = await getXeroSession();
    if (!session) return res.status(400).json({ error: 'Xero not connected' });
    const { xero, tenantId, tokenSet } = session;
    const refreshed = await refreshXeroTokenIfNeeded(xero, tokenSet, true);
    const accessToken = (refreshed || tokenSet).access_token;

    const { y, m, day } = ymdDateNDaysAgo(days);
    const where = `Date>=DateTime(${y}, ${m}, ${day})`;

    const items = [];
    let page = 1;
    const maxPages = 20;
    if (type === 'invoice') {
      while (page <= maxPages) {
        const { body } = await xero.accountingApi.getInvoices(
          tenantId,
          undefined,
          where,
          undefined,
          page,
          false
        );
        const list = body?.invoices || [];
        if (!list.length) break;
        items.push(
          ...list.map(i => ({ id: i?.invoiceID, date: i?.date, total: i?.total, contact: i?.contact?.name }))
        );
        if (list.length < 100) break;
        page += 1;
      }
    } else {
      while (page <= maxPages) {
        const { body } = await xero.accountingApi.getBankTransactions(
          tenantId,
          undefined,
          where,
          undefined,
          page
        );
        const list = body?.bankTransactions || [];
        if (!list.length) break;
        items.push(
          ...list.map(t => ({ id: t?.bankTransactionID, date: t?.date, total: t?.total, contact: t?.contact?.name }))
        );
        if (list.length < 100) break;
        page += 1;
      }
    }

    // Fetch attachments for each id
    const results = [];
    for (const it of items) {
      const path = type === 'invoice'
        ? `/api.xro/2.0/Invoices/${it.id}/Attachments`
        : `/api.xro/2.0/BankTransactions/${it.id}/Attachments`;
      try {
        const data = await fetchXeroJson(path, accessToken, tenantId);
        const atts = data?.Attachments || data?.attachments || [];
        results.push({ ...it, attachments: Array.isArray(atts) ? atts.length : 0 });
      } catch (e) {
        results.push({ ...it, attachments: 0, error: 'fetch_failed' });
      }
      await sleep(120);
    }

    res.json({ ok: true, type, days, count: results.length, items: results });
  } catch (e) {
    res.status(500).json({ error: 'attachments_failed', message: e?.message || String(e) });
  }
});

// Compute receipt coverage of recent bank transactions using Xero attachments and related bills
router.get('/coverage', async (req, res) => {
  try {
    const days = Number(req.query?.days || 30);
    const session = await getXeroSession();
    if (!session) return res.status(400).json({ error: 'Xero not connected' });
    const { xero, tenantId, tokenSet } = session;
    const refreshed = await refreshXeroTokenIfNeeded(xero, tokenSet, true);
    const accessToken = (refreshed || tokenSet).access_token;

    const { y, m, day } = ymdDateNDaysAgo(days);
    const where = `Date>=DateTime(${y}, ${m}, ${day})`;

    // Pull recent bank transactions (both directions)
    const txs = [];
    let page = 1;
    const maxPages = 20;
    while (page <= maxPages) {
      const { body } = await xero.accountingApi.getBankTransactions(
        tenantId,
        undefined,
        where,
        undefined,
        page
      );
      const list = body?.bankTransactions || [];
      if (!list.length) break;
      txs.push(...list);
      if (list.length < 100) break;
      page += 1;
    }

    // Attachments directly on bank transactions
    const bankWithAtt = new Map();
    for (const t of txs) {
      const id = t?.bankTransactionID;
      try {
        const data = await fetchXeroJson(`/api.xro/2.0/BankTransactions/${id}/Attachments`, accessToken, tenantId);
        const count = Array.isArray(data?.Attachments) ? data.Attachments.length : 0;
        bankWithAtt.set(id, count);
      } catch {
        bankWithAtt.set(id, 0);
      }
      await sleep(100);
    }

    // Pull recent invoices/bills once; pre-compute attachments and index
    const invoices = [];
    page = 1;
    while (page <= maxPages) {
      const { body } = await xero.accountingApi.getInvoices(
        tenantId,
        undefined,
        where,
        undefined,
        page,
        false
      );
      const list = body?.invoices || [];
      if (!list.length) break;
      invoices.push(...list);
      if (list.length < 100) break;
      page += 1;
    }
    const invAtt = new Map();
    for (const inv of invoices) {
      const id = inv?.invoiceID;
      try {
        const data = await fetchXeroJson(`/api.xro/2.0/Invoices/${id}/Attachments`, accessToken, tenantId);
        const count = Array.isArray(data?.Attachments) ? data.Attachments.length : 0;
        invAtt.set(id, count);
      } catch {
        invAtt.set(id, 0);
      }
      await sleep(100);
    }

    // Build candidate lookup by amount bucket for quick matching
    const byAmount = new Map();
    for (const inv of invoices) {
      const amt = Math.abs(Number(inv?.total || 0));
      const bucket = Math.round(amt * 100); // cents
      const arr = byAmount.get(bucket) || [];
      arr.push(inv);
      byAmount.set(bucket, arr);
    }

    const uncovered = [];
    let covered = 0;
    for (const t of txs) {
      const id = t?.bankTransactionID;
      const attCount = bankWithAtt.get(id) || 0;
      if (attCount > 0) {
        covered += 1;
        continue;
      }
      // find candidate bill with attachments and similar amount
      const amt = Math.abs(Number(t?.total || 0));
      const base = Math.round(amt * 100);
      const candidates = [];
      for (const delta of [0, 1, -1, 2, -2]) {
        const list = byAmount.get(base + delta) || [];
        for (const inv of list) {
          const { score, reason } = scoreCandidate(t, inv);
          const hasAtt = (invAtt.get(inv?.invoiceID) || 0) > 0;
          candidates.push({ invoiceId: inv?.invoiceID, date: inv?.date, total: inv?.total, contact: inv?.contact?.name, score, reason, hasAttachment: hasAtt });
        }
      }
      candidates.sort((a, b) => b.score - a.score);
      const top = candidates[0];
      if (top?.hasAttachment && top.score >= 0.65) {
        covered += 1; // treated as covered via linked bill with attachment
      } else {
        uncovered.push({
          id,
          date: t?.date,
          amount: t?.total,
          contact: t?.contact?.name || null,
          candidate: top || null,
        });
      }
    }

    const total = txs.length;
    const coveragePercent = total ? Number(((covered / total) * 100).toFixed(1)) : 0;
    res.json({ ok: true, days, totals: { transactions: total, covered, uncovered: total - covered, coveragePercent }, uncovered });
  } catch (e) {
    res.status(500).json({ error: 'coverage_failed', message: e?.message || String(e) });
  }
});

// Find a specific bill/invoice in Xero by vendor + amount + date (best-effort)
router.get('/xero/find-invoice', async (req, res) => {
  try {
    const vendorQ = String(req.query.vendor || '').trim();
    const amountQ = Number(req.query.amount || 0);
    const dateQ = req.query.date ? new Date(String(req.query.date)) : null;
    const days = Math.min(Math.max(Number(req.query.days || 60), 1), 365);
    const tolPct = Math.min(Math.max(Number(req.query.tolPct ?? 0.03), 0), 0.2);
    const tolAbs = Math.min(Math.max(Number(req.query.tolAbs ?? 1.0), 0), 50);
    const maxDays = Math.min(Math.max(Number(req.query.maxDays ?? 14), 1), 60);

    const session = await getXeroSession();
    if (!session) return res.status(400).json({ error: 'Xero not connected' });
    const { xero, tenantId, tokenSet } = session;
    const refreshed = await refreshXeroTokenIfNeeded(xero, tokenSet, true);
    await xero.setTokenSet(refreshed || tokenSet);

    const { y, m, day } = ymdDateNDaysAgo(days);
    const where = `Date>=DateTime(${y}, ${m}, ${day})`;

    let page = 1;
    const maxPages = 20;
    const matches = [];
    const norm = s => String(s || '').toLowerCase();
    const vQ = norm(vendorQ);
    while (page <= maxPages) {
      const { body } = await xero.accountingApi.getInvoices(
        tenantId,
        undefined,
        where,
        undefined,
        page,
        false
      );
      const list = body?.invoices || [];
      if (!list.length) break;
      for (const inv of list) {
        const contact = inv?.contact?.name || '';
        const total = Number(inv?.total || 0);
        const amountDelta = Math.abs(total - amountQ);
        const amountOk = amountQ > 0 ? (amountDelta <= tolAbs || amountDelta / amountQ <= tolPct) : true;
        const dt = inv?.date ? new Date(inv.date) : inv?.updatedDateUTC ? new Date(inv.updatedDateUTC) : null;
        const daysApart = (dateQ && dt) ? Math.abs((+dt - +dateQ) / (1000*60*60*24)) : null;
        const dateOk = daysApart == null || daysApart <= maxDays;
        const vendorOk = !vQ || norm(contact).includes(vQ);
        if (amountOk && dateOk && vendorOk) {
          matches.push({
            invoiceId: inv?.invoiceID,
            number: inv?.invoiceNumber,
            date: inv?.date,
            total: inv?.total,
            contact,
            status: inv?.status,
          });
        }
      }
      if (list.length < 100) break;
      page += 1;
      await sleep(80);
    }

    // Enrich with attachment count (best effort for first 10)
    const session2 = await getXeroSession();
    const token = (session2?.tokenSet || tokenSet).access_token;
    for (let i = 0; i < Math.min(10, matches.length); i++) {
      try {
        const data = await fetchXeroJson(`/api.xro/2.0/Invoices/${matches[i].invoiceId}/Attachments`, token, tenantId);
        matches[i].attachments = Array.isArray(data?.Attachments) ? data.Attachments.length : 0;
      } catch {}
      await sleep(60);
    }

    res.json({ ok: true, count: matches.length, matches });
  } catch (e) {
    res.status(500).json({ error: 'find_invoice_failed', message: e?.message || String(e) });
  }
});

// Import recent Xero invoices as receipt candidates for matching (Dext-first compatibility)
// This allows the frontend Receipts UI to work even when receipts originate in Dext but flow into Xero as bills
router.post('/receipts/ingest-from-xero', async (req, res) => {
  try {
    const days = Math.min(Math.max(Number(req.body?.days || req.query?.days || 90), 1), 365);
    const session = await getXeroSession();
    if (!session) return res.status(400).json({ error: 'Xero not connected' });
    const { xero, tenantId, tokenSet } = session;
    const refreshed = await refreshXeroTokenIfNeeded(xero, tokenSet, true);
    await xero.setTokenSet(refreshed || tokenSet);

    const { y, m, day } = ymdDateNDaysAgo(days);
    const where = `Date>=DateTime(${y}, ${m}, ${day})`;

    let page = 1;
    const maxPages = 20;
    const rows = [];
    while (page <= maxPages) {
      const { body } = await xero.accountingApi.getInvoices(
        tenantId,
        undefined,
        where,
        undefined,
        page,
        false
      );
      const invoices = body?.invoices || [];
      if (!invoices.length) break;
      for (const inv of invoices) {
        rows.push({
          tenant_id: tenantId,
          receipt_id: inv?.invoiceID,
          vendor: inv?.contact?.name || null,
          amount: inv?.total || 0,
          currency: inv?.currencyCode || 'AUD',
          receipt_date: inv?.date || inv?.updatedDateUTC || inv?.createdDateUTC || new Date().toISOString(),
          status: 'xero_invoice',
        });
      }
      if (invoices.length < 100) break;
      page += 1;
      await sleep(120);
    }

    let upserted = 0;
    if (rows.length) {
      const { data, error } = await supabase
        .from('bookkeeping_receipts')
        .upsert(rows, { onConflict: 'receipt_id' })
        .select('receipt_id');
      if (error) throw new Error(error.message);
      upserted = Array.isArray(data) ? data.length : rows.length;
    }

    res.json({ ok: true, upserted, windowDays: days });
  } catch (e) {
    res.status(500).json({ error: 'ingest_failed', message: e?.message || String(e) });
  }
});
