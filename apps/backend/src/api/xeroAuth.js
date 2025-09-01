import express from 'express';
import { XeroClient } from 'xero-node';
import dotenv from 'dotenv';
import path from 'path';
import Redis from 'ioredis';
import XeroKafkaConnector from '../services/xeroKafkaConnector.js';
import crypto from 'crypto';

// Ensure env is loaded before constructing Xero client
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

const router = express.Router();

// Init Redis and Connector (singleton per process)
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const connector = new XeroKafkaConnector();

// Initialize Xero client with env vars
const xero = new XeroClient({
  clientId: process.env.XERO_CLIENT_ID,
  clientSecret: process.env.XERO_CLIENT_SECRET,
  redirectUris: [process.env.XERO_REDIRECT_URI || 'http://localhost:4000/api/xero/callback'],
  scopes: [
    'offline_access',
    'accounting.transactions.read',
    'accounting.reports.read',
    'accounting.contacts.read',
    'accounting.settings.read',
    'accounting.budgets.read'
  ]
});

// Attempt to auto-restore Xero session from Redis on server start
(async () => {
  try {
    const [tokenSetJson, tenantId] = await Promise.all([
      redis.get('xero:tokenSet'),
      redis.get('xero:tenantId')
    ]);
    if (tokenSetJson && tenantId) {
      const tokenSet = JSON.parse(tokenSetJson);
      await xero.setTokenSet(tokenSet);
      // Start connector in background; ignore Kafka unavailability
      setImmediate(async () => {
        try {
          await connector.connect(tokenSet.access_token, tenantId);
        } catch (e) {
          console.error('Xero connector auto-resume failed (non-fatal):', e?.message || e);
        }
      });
    }
  } catch (e) {
    console.error('Xero auto-restore error:', e?.message || e);
  }
})();

function base64Url(inputBuffer) {
  return inputBuffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function generateState() {
  return base64Url(crypto.randomBytes(24));
}

function generateCodeVerifier() {
  // 43-128 chars recommended
  return base64Url(crypto.randomBytes(64));
}

function codeChallengeFromVerifier(verifier) {
  const hash = crypto.createHash('sha256').update(verifier).digest();
  return base64Url(hash);
}

router.get('/connect', async (req, res) => {
  try {
    // Manual PKCE to avoid in-memory verifier loss
    const state = generateState();
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = codeChallengeFromVerifier(codeVerifier);

    // Persist verifier for 10 minutes
    await redis.setex(`xero:pkce:${state}`, 600, JSON.stringify({ code_verifier: codeVerifier }));

    const authorizeUrl = new URL('https://login.xero.com/identity/connect/authorize');
    authorizeUrl.searchParams.set('client_id', process.env.XERO_CLIENT_ID || '');
    authorizeUrl.searchParams.set('response_type', 'code');
    authorizeUrl.searchParams.set('redirect_uri', process.env.XERO_REDIRECT_URI || 'http://localhost:4000/api/xero/callback');
    authorizeUrl.searchParams.set('scope', [
      'offline_access',
      'accounting.transactions.read',
      'accounting.reports.read',
      'accounting.contacts.read',
      'accounting.settings.read',
      'accounting.budgets.read'
    ].join(' '));
    authorizeUrl.searchParams.set('state', state);
    authorizeUrl.searchParams.set('code_challenge', codeChallenge);
    authorizeUrl.searchParams.set('code_challenge_method', 'S256');

    return res.redirect(authorizeUrl.toString());
  } catch (error) {
    console.error('Xero connect error:', error);
    return res.status(500).json({ error: 'Failed to build Xero consent URL' });
  }
});

// Fallback: Authorization Code (no PKCE) for confidential clients
router.get('/connect-simple', async (req, res) => {
  try {
    const authorizeUrl = new URL('https://login.xero.com/identity/connect/authorize');
    authorizeUrl.searchParams.set('client_id', process.env.XERO_CLIENT_ID || '');
    authorizeUrl.searchParams.set('response_type', 'code');
    authorizeUrl.searchParams.set('redirect_uri', process.env.XERO_REDIRECT_URI || 'http://localhost:4000/api/xero/callback');
    authorizeUrl.searchParams.set('scope', [
      'offline_access',
      'accounting.transactions.read',
      'accounting.reports.read',
      'accounting.contacts.read',
      'accounting.settings.read',
      'accounting.budgets.read'
    ].join(' '));
    return res.redirect(authorizeUrl.toString());
  } catch (error) {
    console.error('Xero connect-simple error:', error);
    return res.status(500).json({ error: 'Failed to build Xero consent URL (simple)' });
  }
});

// Lightweight debug: checks env presence (no secrets returned)
router.get('/debug', (req, res) => {
  res.json({
    has_client_id: Boolean(process.env.XERO_CLIENT_ID),
    has_client_secret: Boolean(process.env.XERO_CLIENT_SECRET),
    redirect_uri: process.env.XERO_REDIRECT_URI || 'http://localhost:4000/api/xero/callback'
  });
});

router.get('/debug/build', async (req, res) => {
  try {
    const url = await xero.buildConsentUrl();
    return res.json({ ok: true, url });
  } catch (err) {
    console.error('Xero buildConsentUrl error:', err);
    return res.status(500).json({ ok: false, message: err?.message || String(err) });
  }
});

router.get('/callback', async (req, res) => {
  try {
    // Exchange auth code for token set
    const state = req.query?.state;
    const code = req.query?.code;
    if (!code) {
      return res.status(400).json({ error: 'Missing code', query: req.query });
    }

    // Retrieve PKCE verifier
    const cached = state ? await redis.get(`xero:pkce:${state}`) : null;
    const form = new URLSearchParams();
    form.set('grant_type', 'authorization_code');
    form.set('code', code);
    form.set('redirect_uri', process.env.XERO_REDIRECT_URI || 'http://localhost:4000/api/xero/callback');
    // Include code_verifier only if present (PKCE path). If missing, confidential client flow (Basic auth)
    const codeVerifier = cached ? JSON.parse(cached).code_verifier : null;
    if (codeVerifier) {
      form.set('code_verifier', codeVerifier);
      form.set('client_id', process.env.XERO_CLIENT_ID || '');
    }

    const basic = Buffer.from(`${process.env.XERO_CLIENT_ID || ''}:${process.env.XERO_CLIENT_SECRET || ''}`).toString('base64');
    const resp = await fetch('https://identity.xero.com/connect/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        // Use Basic auth for confidential client; ok even when PKCE present
        Authorization: `Basic ${basic}`
      },
      body: form
    });

    const tokenBody = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      return res.status(500).json({ error: 'Xero authorization failed', message: tokenBody.error || 'token exchange failed', details: tokenBody });
    }

    const nowSec = Math.floor(Date.now() / 1000);
    const tokenSet = {
      access_token: tokenBody.access_token,
      refresh_token: tokenBody.refresh_token,
      id_token: tokenBody.id_token,
      token_type: tokenBody.token_type || 'Bearer',
      scope: tokenBody.scope,
      expires_at: nowSec + (tokenBody.expires_in || 0)
    };

    // Load tenants using xero-node with the new token
    await xero.setTokenSet(tokenSet);
    await xero.updateTenants();

    const tenant = xero.tenants?.[0];
    if (!tenant) {
      return res.status(400).json({ error: 'No Xero tenant available in this org' });
    }

    const tenantId = tenant.tenantId;

    // Persist token set and tenant in Redis
    await redis.set('xero:tokenSet', JSON.stringify(tokenSet));
    await redis.set('xero:tenantId', tenantId);

    // Kick off connector in background (do not block OAuth response)
    setImmediate(async () => {
      try {
        await connector.connect(tokenSet.access_token, tenantId);
      } catch (e) {
        console.error('Xero connector start failed (non-fatal):', e?.message || e);
      }
    });

    return res.send('\u2705 Xero authorized. You may close this window. Check /api/xero/status for sync state.');
  } catch (error) {
    const message = error?.message || String(error);
    const details = error?.response?.body || error?.body || null;

    // Avoid triggering a second token exchange which can produce misleading invalid_grant
    console.error('Xero callback error:', message, details);
    return res.status(500).json({ error: 'Xero authorization failed', message, details });
  }
});

router.get('/status', async (req, res) => {
  try {
    const status = await connector.healthCheck();
    const [tenantId, tokenSetJson] = await Promise.all([
      redis.get('xero:tenantId'),
      redis.get('xero:tokenSet')
    ]);
    return res.json({
      connected: status.connected,
      tenantId: tenantId ? 'configured' : 'missing',
      last_sync_timestamps: status.last_sync_timestamps,
      api_token_valid: status.api_token_valid || Boolean(tokenSetJson)
    });
  } catch (error) {
    console.error('Xero status error:', error);
    return res.status(500).json({ error: 'Failed to get Xero status' });
  }
});

export default router;


