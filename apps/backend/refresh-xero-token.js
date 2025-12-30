/**
 * Refresh Xero OAuth Token
 * Uses the refresh token to get a new access token
 */

import { XeroClient } from 'xero-node';
import { loadEnv } from './core/src/utils/loadEnv.js';

loadEnv();

async function refreshXeroToken() {
  console.log('🔄 Refreshing Xero OAuth token...');

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

  try {
    // Set the current token set
    await xero.setTokenSet({
      access_token: process.env.XERO_ACCESS_TOKEN,
      refresh_token: process.env.XERO_REFRESH_TOKEN
    });

    // Refresh the token
    console.log('📝 Using refresh token to get new access token...');
    const newTokenSet = await xero.refreshToken();

    console.log('\n✅ Token refreshed successfully!');
    console.log('\n📋 Update your .env file with these values:\n');
    console.log(`XERO_ACCESS_TOKEN=${newTokenSet.access_token}`);
    console.log(`XERO_REFRESH_TOKEN=${newTokenSet.refresh_token}`);
    console.log(`\n⏰ Token expires at: ${new Date(newTokenSet.expires_at).toLocaleString()}`);

    return newTokenSet;
  } catch (error) {
    console.error('\n❌ Token refresh failed:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
    throw error;
  }
}

refreshXeroToken()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
