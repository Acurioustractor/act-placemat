import { createClient } from '@supabase/supabase-js';
import Redis from 'ioredis';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

async function getTenantId() {
  try { return (await redis.get('xero:tenantId')) || 'default'; } catch { return 'default'; }
}

async function fetchConsent() {
  const tenantId = await getTenantId();
  const { data } = await supabase.from('privacy_settings').select('*').eq('tenant_id', tenantId).maybeSingle();
  const defaults = { analytics_consent: true, email_processing_consent: true, data_sharing_consent: false, retention_days: 365, consent_version: 1 };
  return { tenant_id: tenantId, ...(data || defaults) };
}

function isExpired(expiresAt) {
  if (!expiresAt) return false;
  try { return new Date(expiresAt).getTime() < Date.now(); } catch { return false; }
}

function transformPayloadByConsent(payload, consent) {
  if (payload == null) return payload;
  const expired = isExpired(consent.consent_expires_at);

  const mask = (v) => {
    if (v == null) return v;
    if (typeof v === 'string') return expired ? '[consent-expired]' : '[not-permitted]';
    if (typeof v === 'number') return null;
    if (typeof v === 'boolean') return false;
    if (Array.isArray(v)) return v.map(mask);
    if (typeof v === 'object') {
      const o = { ...v };
      // Remove/share-limited fields based on flags
      if (!consent.email_processing_consent) {
        delete o.email;
        delete o.emails;
        delete o.recipients;
      }
      if (!consent.analytics_consent) {
        delete o.analytics;
        delete o.insights;
      }
      if (!consent.data_sharing_consent) {
        delete o.shared_with;
        delete o.integrations;
      }
      // If expired, coarsen temporal resolution
      if (expired) {
        if (o.created_at) o.created_at = o.created_at.slice(0, 10);
        if (o.updated_at) o.updated_at = o.updated_at.slice(0, 10);
      }
      return o;
    }
    return v;
  };

  return mask(payload);
}

export function consentEnforcer(options = {}) {
  const { enforce = true } = options;
  return async (req, res, next) => {
    if (!enforce) return next();

    const consent = await fetchConsent();
    res.locals.effectiveConsent = consent;

    const originalJson = res.json.bind(res);
    res.json = (body) => {
      try {
        const transformed = transformPayloadByConsent(body, consent);
        return originalJson(transformed);
      } catch (_) {
        return originalJson(body);
      }
    };
    next();
  };
}

export async function getEffectiveConsent() {
  return fetchConsent();
}




