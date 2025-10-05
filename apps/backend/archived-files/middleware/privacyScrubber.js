// Simple PII scrubber middleware (MVP)
// Redacts emails, phone numbers, credit-card-like patterns

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE_RE = /\b(?:\+?\d{1,3}[\s-]?)?(?:\(?\d{2,4}\)?[\s-]?)?\d{3,4}[\s-]?\d{3,4}\b/g;
const CC_RE = /\b(?:\d[ -]*?){13,16}\b/g; // naive

function redact(value) {
  if (typeof value === 'string') {
    return value
      .replace(EMAIL_RE, '[redacted-email]')
      .replace(PHONE_RE, '[redacted-phone]')
      .replace(CC_RE, '[redacted-cc]');
  }
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = redact(v);
    return out;
  }
  return value;
}

export function privacyScrubber(options = {}) {
  const { enabled = true, allowlist = [] } = options;
  return (req, res, next) => {
    if (!enabled) return next();
    try {
      if (req.body) {
        const copied = JSON.parse(JSON.stringify(req.body));
        allowlist.forEach((key) => { if (copied && copied[key]) copied[key] = req.body[key]; });
        req.body = redact(copied);
      }
      if (req.query) req.query = redact(req.query);
    } catch {}
    next();
  };
}





