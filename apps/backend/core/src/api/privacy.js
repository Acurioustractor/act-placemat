import express from 'express';
import Redis from 'ioredis';
import { createClient } from '@supabase/supabase-js';
import { getEffectiveConsent } from '../middleware/consentEnforcer.js';

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

async function getTenantId() {
  return (await redis.get('xero:tenantId')) || 'default';
}

// Get settings
router.get('/settings', async (req, res) => {
  const tenantId = await getTenantId();
  const { data, error } = await supabase.from('privacy_settings').select('*').eq('tenant_id', tenantId).maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  const defaults = { analytics_consent: true, email_processing_consent: true, data_sharing_consent: false, retention_days: 365 };
  res.json({ tenant_id: tenantId, ...(data || defaults) });
});

// Update settings
router.post('/settings', async (req, res) => {
  try {
    const tenantId = await getTenantId();
    const { analytics_consent, email_processing_consent, data_sharing_consent, retention_days, consent_version, consent_expires_at, policy_ref } = req.body || {};
    const payload = {
      tenant_id: tenantId,
      analytics_consent: typeof analytics_consent === 'boolean' ? analytics_consent : undefined,
      email_processing_consent: typeof email_processing_consent === 'boolean' ? email_processing_consent : undefined,
      data_sharing_consent: typeof data_sharing_consent === 'boolean' ? data_sharing_consent : undefined,
      retention_days: Number.isFinite(retention_days) ? retention_days : undefined,
      consent_version: Number.isFinite(consent_version) ? consent_version : undefined,
      consent_expires_at: consent_expires_at || undefined,
      policy_ref: policy_ref || undefined,
      updated_at: new Date().toISOString()
    };
    // remove undefined
    Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);
    const { error } = await supabase.from('privacy_settings').upsert(payload);
    if (error) throw new Error(error.message);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'update_failed', message: e.message });
  }
});

// Effective consent summary
router.get('/effective', async (req, res) => {
  try {
    const effective = await getEffectiveConsent();
    const expired = effective?.consent_expires_at ? new Date(effective.consent_expires_at).getTime() < Date.now() : false;
    res.json({ ok: true, consent: effective, expired });
  } catch (e) {
    res.status(500).json({ error: 'effective_failed', message: e.message });
  }
});

// Consent withdraw (sets consents to false and expires now)
router.post('/consent/withdraw', async (req, res) => {
  try {
    const tenantId = await getTenantId();
    const nowIso = new Date().toISOString();
    const payload = {
      tenant_id: tenantId,
      analytics_consent: false,
      email_processing_consent: false,
      data_sharing_consent: false,
      consent_expires_at: nowIso,
      updated_at: nowIso
    };
    const { error } = await supabase.from('privacy_settings').upsert(payload);
    if (error) throw new Error(error.message);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'withdraw_failed', message: e.message });
  }
});

// Log access (internal use)
router.post('/audit', async (req, res) => {
  try {
    const tenantId = await getTenantId();
    const { actor, method, path, resource, ip, status, query, body } = req.body || {};
    const { error } = await supabase.from('privacy_audit_log').insert({ tenant_id: tenantId, actor, method, path, resource, ip, status, query, body });
    if (error) throw new Error(error.message);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'audit_failed', message: e.message });
  }
});

// List recent audit entries
router.get('/audit', async (req, res) => {
  try {
    const tenantId = await getTenantId();
    const limit = Math.min(Number(req.query?.limit || 200), 1000);
    const { data, error } = await supabase
      .from('privacy_audit_log')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('occurred_at', { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    res.json({ ok: true, entries: data || [] });
  } catch (e) {
    res.status(500).json({ error: 'audit_list_failed', message: e.message });
  }
});

// Export audit log as CSV (recent)
router.get('/audit/export', async (req, res) => {
  try {
    const tenantId = await getTenantId();
    const limit = Math.min(Number(req.query?.limit || 1000), 5000);
    const { data, error } = await supabase
      .from('privacy_audit_log')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('occurred_at', { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    const cols = ['occurred_at','actor','method','path','resource','ip','status'];
    const header = cols.join(',');
    const rows = (data || []).map(r => cols.map(c => JSON.stringify(r[c] ?? '')).join(','));
    const csv = [header, ...rows].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="privacy_audit.csv"');
    res.send(csv);
  } catch (e) {
    res.status(500).json({ error: 'audit_export_failed', message: e.message });
  }
});

// Export subject data (stub)
router.post('/dsr/export', async (req, res) => {
  try {
    const tenantId = await getTenantId();
    const { subject } = req.body || {};
    if (!subject) return res.status(400).json({ error: 'subject_required' });
    const { data, error } = await supabase.from('privacy_dsr_requests').insert({ tenant_id: tenantId, subject_identifier: subject, type: 'export' }).select('*').single();
    if (error) throw new Error(error.message);
    res.json({ ok: true, request: data, note: 'Stub: export will be prepared asynchronously' });
  } catch (e) {
    res.status(500).json({ error: 'dsr_export_failed', message: e.message });
  }
});

// Delete subject data (stub)
router.post('/dsr/delete', async (req, res) => {
  try {
    const tenantId = await getTenantId();
    const { subject } = req.body || {};
    if (!subject) return res.status(400).json({ error: 'subject_required' });
    const { data, error } = await supabase.from('privacy_dsr_requests').insert({ tenant_id: tenantId, subject_identifier: subject, type: 'delete' }).select('*').single();
    if (error) throw new Error(error.message);
    res.json({ ok: true, request: data, note: 'Stub: delete will be processed with manual review' });
  } catch (e) {
    res.status(500).json({ error: 'dsr_delete_failed', message: e.message });
  }
});

export default router;


