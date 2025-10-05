import onFinished from 'on-finished';
import { createClient } from '@supabase/supabase-js';
import Redis from 'ioredis';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

async function getTenantId() {
  try { return (await redis.get('xero:tenantId')) || 'default'; } catch { return 'default'; }
}

export function privacyAuditLogger() {
  return (req, res, next) => {
    const startedAt = Date.now();
    onFinished(res, async () => {
      try {
        const tenantId = await getTenantId();
        const entry = {
          tenant_id: tenantId,
          occurred_at: new Date().toISOString(),
          actor: (req.user && (req.user.email || req.user.id)) || null,
          method: req.method,
          path: req.originalUrl || req.url,
          resource: req.params?.id || null,
          ip: req.ip,
          status: res.statusCode,
          query: req.query || null,
          body: req.body || null
        };
        // Avoid logging enormous bodies
        if (entry.body && JSON.stringify(entry.body).length > 5000) entry.body = { notice: 'omitted (too large)' };
        await supabase.from('privacy_audit_log').insert(entry);
      } catch (_) {}
    });
    next();
  };
}





