/**
 * Exchange Xero authorization code for tokens
 * Usage: node exchange-xero-code.js <authorization_code>
 */

import { loadEnv } from './core/src/utils/loadEnv.js';
import fs from 'fs';

loadEnv();

const authCode = process.argv[2];

if (!authCode) {
  console.error('❌ Please provide the authorization code as an argument');
  console.error('Usage: node exchange-xero-code.js <code>');
  console.error('\nYou can find the code in the callback URL after authorization:');
  console.error('http://localhost:4000/api/xero/callback?code=XXXXX&scope=...');
  process.exit(1);
}

async function exchangeCodeForTokens() {
  console.log('🔄 Exchanging authorization code for tokens...');

  const clientId = process.env.XERO_CLIENT_ID;
  const clientSecret = process.env.XERO_CLIENT_SECRET;
  const redirectUri = process.env.XERO_REDIRECT_URI || 'http://localhost:4000/api/xero/callback';

  if (!clientId || !clientSecret) {
    throw new Error('Missing XERO_CLIENT_ID or XERO_CLIENT_SECRET in .env');
  }

  const tokenUrl = 'https://identity.xero.com/connect/token';
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: authCode,
    redirect_uri: redirectUri
  });

  try {
    console.log('📝 Calling Xero token endpoint...');

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: body.toString()
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Token exchange failed: ${response.status} - ${errorText}`);
    }

    const tokenData = await response.json();

    console.log('\n✅ Tokens received successfully!');
    console.log('\n📋 Update your .env file with these values:\n');
    console.log(`XERO_ACCESS_TOKEN=${tokenData.access_token}`);
    console.log(`XERO_REFRESH_TOKEN=${tokenData.refresh_token}`);
    console.log(`\n⏰ Token expires in: ${tokenData.expires_in} seconds (${Math.floor(tokenData.expires_in / 60)} minutes)`);

    // Auto-update .env file
    const envPath = '.env';
    let envContent = fs.readFileSync(envPath, 'utf8');

    envContent = envContent.replace(/^XERO_ACCESS_TOKEN=.*$/m, `XERO_ACCESS_TOKEN=${tokenData.access_token}`);
    envContent = envContent.replace(/^XERO_REFRESH_TOKEN=.*$/m, `XERO_REFRESH_TOKEN=${tokenData.refresh_token}`);

    fs.writeFileSync(envPath, envContent, 'utf8');
    console.log('\n✅ .env file updated automatically!');
    console.log('\nNext steps:');
    console.log('1. Restart your backend server');
    console.log('2. Trigger Xero sync: curl -X POST http://localhost:4000/api/v2/xero/sync/start');

    return tokenData;
  } catch (error) {
    console.error('\n❌ Token exchange failed:', error.message);
    throw error;
  }
}

exchangeCodeForTokens()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
