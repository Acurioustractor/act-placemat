/**
 * Simple Xero OAuth Flow - No Dependencies
 * Minimal implementation that doesn't require Redis or xero-node
 */

import { loadEnv } from './core/src/utils/loadEnv.js';
import express from 'express';
import fs from 'fs';
import path from 'path';

loadEnv();

const app = express();
const PORT = 4000; // MUST match redirect URI port

const clientId = process.env.XERO_CLIENT_ID;
const clientSecret = process.env.XERO_CLIENT_SECRET;
const redirectUri = process.env.XERO_REDIRECT_URI || 'http://localhost:4000/api/xero/callback';

if (!clientId || !clientSecret) {
  console.error('❌ Missing XERO_CLIENT_ID or XERO_CLIENT_SECRET in .env');
  process.exit(1);
}

// Step 1: Redirect to Xero authorization
app.get('/connect', (req, res) => {
  const scopes = [
    'offline_access',
    'accounting.transactions.read',
    'accounting.reports.read',
    'accounting.contacts.read',
    'accounting.settings.read',
    'accounting.budgets.read'
  ];

  const authUrl = new URL('https://login.xero.com/identity/connect/authorize');
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('scope', scopes.join(' '));
  authUrl.searchParams.set('state', 'simple_flow_' + Date.now());

  console.log('🔗 Redirecting to Xero authorization...');
  console.log(`   Client ID: ${clientId.substring(0, 20)}...`);
  console.log(`   Redirect URI: ${redirectUri}`);
  console.log(`   Scopes: ${scopes.join(', ')}`);

  res.redirect(authUrl.toString());
});

// Step 2: Handle OAuth callback - MUST match XERO_REDIRECT_URI path
app.get('/api/xero/callback', async (req, res) => {
  const { code, error, error_description } = req.query;

  if (error) {
    console.error(`\n❌ OAuth error: ${error}`);
    console.error(`   Description: ${error_description}`);
    return res.status(400).send(`OAuth failed: ${error} - ${error_description}`);
  }

  if (!code) {
    console.error('\n❌ No authorization code received');
    return res.status(400).send('No authorization code received');
  }

  console.log(`\n✅ Received authorization code: ${code.substring(0, 20)}...`);
  console.log('📝 Exchanging code for tokens...');

  try {
    // Exchange code for tokens
    const tokenUrl = 'https://identity.xero.com/connect/token';
    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: redirectUri
    });

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: body.toString()
    });

    const responseText = await response.text();

    if (!response.ok) {
      console.error(`\n❌ Token exchange failed: ${response.status}`);
      console.error(`   Response: ${responseText}`);
      return res.status(500).send(`Token exchange failed: ${responseText}`);
    }

    const tokenData = JSON.parse(responseText);

    console.log('\n✅ Token exchange SUCCESSFUL!');

    // Get tenant connections
    console.log('📝 Fetching tenant connections...');

    const connectionsResponse = await fetch('https://api.xero.com/connections', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!connectionsResponse.ok) {
      console.error(`\n⚠️  Could not fetch connections: ${connectionsResponse.status}`);
    } else {
      const connections = await connectionsResponse.json();
      if (connections && connections.length > 0) {
        const tenantId = connections[0].tenantId;
        console.log(`\n✅ Connected to tenant: ${connections[0].tenantName}`);
        console.log(`   Tenant ID: ${tenantId}`);

        // Update .env with tenant ID too
        updateEnvFile({
          XERO_TENANT_ID: tenantId,
          XERO_ACCESS_TOKEN: tokenData.access_token,
          XERO_REFRESH_TOKEN: tokenData.refresh_token
        });
      }
    }

    // Update .env file
    if (!process.env.XERO_TENANT_ID || !connections) {
      updateEnvFile({
        XERO_ACCESS_TOKEN: tokenData.access_token,
        XERO_REFRESH_TOKEN: tokenData.refresh_token
      });
    }

    console.log('\n📋 New Xero credentials:');
    console.log(`   Access token: ${tokenData.access_token.substring(0, 50)}...`);
    console.log(`   Refresh token: ${tokenData.refresh_token}`);
    console.log(`   Expires in: ${tokenData.expires_in} seconds (${Math.floor(tokenData.expires_in / 60)} minutes)`);

    res.send(`
      <html>
        <head>
          <title>Xero Connected!</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
              max-width: 700px;
              margin: 50px auto;
              padding: 30px;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              min-height: 100vh;
            }
            .card {
              background: white;
              border-radius: 16px;
              padding: 40px;
              box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            }
            .success-icon {
              font-size: 64px;
              text-align: center;
              margin-bottom: 20px;
            }
            h1 {
              color: #13b5ea;
              margin: 0 0 10px 0;
              text-align: center;
            }
            .subtitle {
              color: #666;
              text-align: center;
              margin-bottom: 30px;
            }
            .info {
              background: #f8f9fa;
              border-left: 4px solid #13b5ea;
              padding: 15px 20px;
              margin: 20px 0;
              border-radius: 4px;
            }
            .info strong {
              color: #13b5ea;
            }
            ol {
              line-height: 1.8;
              color: #444;
            }
            li {
              margin: 10px 0;
            }
            .code {
              background: #f8f9fa;
              padding: 12px 16px;
              border-radius: 6px;
              font-family: 'Monaco', 'Courier New', monospace;
              font-size: 13px;
              margin: 10px 0;
              border: 1px solid #e1e4e8;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              color: #999;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="success-icon">✅</div>
            <h1>Xero Connected Successfully!</h1>
            <p class="subtitle">Your OAuth tokens have been saved to .env</p>

            <div class="info">
              <strong>✓</strong> Access token obtained (expires in ${Math.floor(tokenData.expires_in / 60)} minutes)<br>
              <strong>✓</strong> Refresh token saved (use to get new access tokens)<br>
              <strong>✓</strong> .env file updated automatically
            </div>

            <h3>Next Steps:</h3>
            <ol>
              <li>Restart your backend server to load the new tokens</li>
              <li>Test the Xero connection:
                <div class="code">curl http://localhost:4000/api/v2/xero/sync/start -X POST</div>
              </li>
              <li>Check subscription amounts in the dashboard</li>
            </ol>

            <div class="footer">
              This window will close automatically in 10 seconds
            </div>
          </div>

          <script>
            setTimeout(() => {
              window.close();
            }, 10000);
          </script>
        </body>
      </html>
    `);

    // Auto-shutdown
    setTimeout(() => {
      console.log('\n✅ OAuth flow complete! Shutting down...');
      process.exit(0);
    }, 11000);

  } catch (error) {
    console.error(`\n❌ OAuth flow error:`, error);
    res.status(500).send(`Error: ${error.message}`);
  }
});

function updateEnvFile(newVars) {
  const envPath = path.join(process.cwd(), '.env');
  let envContent = fs.readFileSync(envPath, 'utf8');

  for (const [key, value] of Object.entries(newVars)) {
    const regex = new RegExp(`^${key}=.*$`, 'm');
    if (regex.test(envContent)) {
      envContent = envContent.replace(regex, `${key}=${value}`);
      console.log(`   ✓ Updated ${key}`);
    } else {
      envContent += `\n${key}=${value}`;
      console.log(`   ✓ Added ${key}`);
    }
  }

  fs.writeFileSync(envPath, envContent, 'utf8');
  console.log('\n✅ .env file updated successfully!');
}

// Start server
app.listen(PORT, () => {
  console.log('\n🚀 Xero OAuth Server Started');
  console.log(`\n📍 IMPORTANT: Open this URL in your browser to connect:\n`);
  console.log(`   ✨ http://localhost:${PORT}/connect\n`);
  console.log('⏳ Waiting for authorization...');
  console.log(`\n💡 Redirect URI: ${redirectUri}`);
  console.log('   This MUST match exactly what is configured in your Xero app\n');
});
