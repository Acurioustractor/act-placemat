/**
 * Xero OAuth Flow - Standalone Script
 * No Redis required - saves tokens directly to .env
 */

import { XeroClient } from 'xero-node';
import { loadEnv } from './core/src/utils/loadEnv.js';
import express from 'express';
import fs from 'fs';
import path from 'path';

loadEnv();

const app = express();
const PORT = 4001; // Use different port to avoid conflicts

let tokenSet = null;
let tenantId = null;

const xero = new XeroClient({
  clientId: process.env.XERO_CLIENT_ID,
  clientSecret: process.env.XERO_CLIENT_SECRET,
  redirectUris: ['http://localhost:4000/api/xero/callback'],
  scopes: [
    'offline_access',
    'accounting.transactions.read',
    'accounting.reports.read',
    'accounting.contacts.read',
    'accounting.settings.read',
    'accounting.budgets.read'
  ]
});

// Step 1: Initiate OAuth flow
app.get('/connect', async (req, res) => {
  try {
    const consentUrl = await xero.buildConsentUrl();
    console.log('🔗 Redirecting to Xero authorization...');
    res.redirect(consentUrl);
  } catch (error) {
    console.error('❌ Error building consent URL:', error);
    res.status(500).send('Failed to initiate OAuth flow: ' + error.message);
  }
});

// Step 2: Handle OAuth callback
app.get('/callback', async (req, res) => {
  try {
    const { code } = req.query;

    if (!code) {
      throw new Error('No authorization code received');
    }

    console.log('✅ Received authorization code, exchanging for tokens...');

    // Exchange code for tokens
    tokenSet = await xero.apiCallback(req.url);

    // Get tenant connections
    const tokenSetForTenants = await xero.readTokenSet();
    const tenants = tokenSetForTenants.tenants;

    if (!tenants || tenants.length === 0) {
      throw new Error('No Xero organizations found');
    }

    tenantId = tenants[0].tenantId;

    console.log('\n✅ OAuth flow completed successfully!');
    console.log('\n📋 New Xero credentials:\n');
    console.log(`XERO_TENANT_ID=${tenantId}`);
    console.log(`XERO_ACCESS_TOKEN=${tokenSet.access_token}`);
    console.log(`XERO_REFRESH_TOKEN=${tokenSet.refresh_token}`);
    console.log(`\n⏰ Token expires in: ${tokenSet.expires_in} seconds (${Math.floor(tokenSet.expires_in / 60)} minutes)`);

    // Update .env file
    updateEnvFile({
      XERO_TENANT_ID: tenantId,
      XERO_ACCESS_TOKEN: tokenSet.access_token,
      XERO_REFRESH_TOKEN: tokenSet.refresh_token
    });

    res.send(`
      <html>
        <head>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
              max-width: 800px;
              margin: 50px auto;
              padding: 20px;
              background: #f5f5f5;
            }
            .success {
              background: white;
              border-radius: 8px;
              padding: 30px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            h1 { color: #13b5ea; margin-top: 0; }
            pre {
              background: #f8f8f8;
              padding: 15px;
              border-radius: 4px;
              overflow-x: auto;
            }
            .check { color: #00c853; font-size: 48px; }
          </style>
        </head>
        <body>
          <div class="success">
            <div class="check">✅</div>
            <h1>Xero Connected Successfully!</h1>
            <p>Your .env file has been updated with fresh tokens.</p>
            <p><strong>Next steps:</strong></p>
            <ol>
              <li>Close this window</li>
              <li>Restart your backend server to load the new tokens</li>
              <li>Trigger a Xero sync to get bank transactions</li>
            </ol>
            <p>The OAuth server will shut down in 5 seconds...</p>
          </div>
          <script>
            setTimeout(() => {
              fetch('/shutdown', { method: 'POST' });
            }, 5000);
          </script>
        </body>
      </html>
    `);

    // Auto-shutdown after 5 seconds
    setTimeout(() => {
      console.log('\n🛑 Shutting down OAuth server...');
      process.exit(0);
    }, 5500);

  } catch (error) {
    console.error('❌ OAuth callback error:', error);
    res.status(500).send('OAuth failed: ' + error.message);
  }
});

// Shutdown endpoint
app.post('/shutdown', (req, res) => {
  res.send('OK');
  setTimeout(() => process.exit(0), 100);
});

function updateEnvFile(newVars) {
  const envPath = path.join(process.cwd(), '.env');
  let envContent = fs.readFileSync(envPath, 'utf8');

  for (const [key, value] of Object.entries(newVars)) {
    const regex = new RegExp(`^${key}=.*$`, 'm');
    if (regex.test(envContent)) {
      envContent = envContent.replace(regex, `${key}=${value}`);
    } else {
      // Add if doesn't exist
      envContent += `\n${key}=${value}`;
    }
  }

  fs.writeFileSync(envPath, envContent, 'utf8');
  console.log('\n✅ .env file updated successfully!');
}

// Start server
app.listen(PORT, () => {
  console.log('\n🚀 Xero OAuth Server Started');
  console.log(`\n📍 Open this URL in your browser to connect to Xero:\n`);
  console.log(`   http://localhost:${PORT}/connect\n`);
  console.log('⏳ Waiting for authorization...\n');
});
