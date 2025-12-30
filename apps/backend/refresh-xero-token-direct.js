/**
 * Refresh Xero OAuth Token (Direct API)
 * Uses the Xero OAuth2 token endpoint directly
 */

import { loadEnv } from './core/src/utils/loadEnv.js';

loadEnv();

async function refreshXeroToken() {
  console.log('🔄 Refreshing Xero OAuth token via direct API...');

  const clientId = process.env.XERO_CLIENT_ID;
  const clientSecret = process.env.XERO_CLIENT_SECRET;
  const refreshToken = process.env.XERO_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Missing Xero credentials in environment');
  }

  const tokenUrl = 'https://identity.xero.com/connect/token';

  // Create basic auth header
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken
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
      throw new Error(`Token refresh failed: ${response.status} - ${errorText}`);
    }

    const tokenData = await response.json();

    console.log('\n✅ Token refreshed successfully!');
    console.log('\n📋 Update your .env file with these values:\n');
    console.log(`XERO_ACCESS_TOKEN=${tokenData.access_token}`);
    console.log(`XERO_REFRESH_TOKEN=${tokenData.refresh_token}`);
    console.log(`\n⏰ Token expires in: ${tokenData.expires_in} seconds (${Math.floor(tokenData.expires_in / 60)} minutes)`);

    return tokenData;
  } catch (error) {
    console.error('\n❌ Token refresh failed:', error.message);
    throw error;
  }
}

refreshXeroToken()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
