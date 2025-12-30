/**
 * Diagnose Xero OAuth Configuration
 * Checks token validity and configuration
 */

import { loadEnv } from './core/src/utils/loadEnv.js';

loadEnv();

console.log('🔍 Xero OAuth Configuration Diagnostics\n');

// Check environment variables
const clientId = process.env.XERO_CLIENT_ID;
const clientSecret = process.env.XERO_CLIENT_SECRET;
const redirectUri = process.env.XERO_REDIRECT_URI;
const refreshToken = process.env.XERO_REFRESH_TOKEN;
const accessToken = process.env.XERO_ACCESS_TOKEN;

console.log('📋 Configuration Status:');
console.log(`✓ Client ID: ${clientId ? clientId.substring(0, 20) + '...' : '❌ MISSING'}`);
console.log(`✓ Client Secret: ${clientSecret ? clientSecret.substring(0, 20) + '...' : '❌ MISSING'}`);
console.log(`✓ Redirect URI: ${redirectUri || '❌ MISSING'}`);
console.log(`✓ Refresh Token: ${refreshToken ? refreshToken.substring(0, 20) + '...' : '❌ MISSING'}`);
console.log(`✓ Access Token: ${accessToken ? 'Present' : '❌ MISSING'}`);

if (accessToken) {
  try {
    // Decode JWT to check expiry
    const payload = JSON.parse(Buffer.from(accessToken.split('.')[1], 'base64').toString());
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = payload.exp;
    const isExpired = now > expiresAt;

    console.log(`\n⏰ Access Token Status:`);
    console.log(`   Issued at: ${new Date(payload.nbf * 1000).toLocaleString()}`);
    console.log(`   Expires at: ${new Date(expiresAt * 1000).toLocaleString()}`);
    console.log(`   Current time: ${new Date(now * 1000).toLocaleString()}`);
    console.log(`   Status: ${isExpired ? '❌ EXPIRED' : '✅ VALID'}`);

    if (!isExpired) {
      const remainingMinutes = Math.floor((expiresAt - now) / 60);
      console.log(`   Time remaining: ${remainingMinutes} minutes`);
    }
  } catch (err) {
    console.log(`\n❌ Could not decode access token: ${err.message}`);
  }
}

console.log('\n🔧 Recommended Actions:');

if (!clientId || !clientSecret) {
  console.log('❌ Missing client credentials - check Xero developer portal');
}

if (!refreshToken) {
  console.log('❌ No refresh token - need to complete OAuth flow');
} else {
  console.log('✓ Refresh token present - attempting refresh...\n');

  // Try to refresh the token
  const tokenUrl = 'https://identity.xero.com/connect/token';
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken
  });

  try {
    console.log('📝 Calling Xero token refresh endpoint...');

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
      console.error(`\n❌ Token refresh failed: ${response.status}`);
      console.error(`Error response: ${responseText}`);

      if (response.status === 400) {
        const errorData = JSON.parse(responseText);
        if (errorData.error === 'invalid_grant') {
          console.log('\n⚠️  INVALID_GRANT ERROR DIAGNOSIS:');
          console.log('   This error typically means:');
          console.log('   1. The refresh token has been revoked or expired');
          console.log('   2. The client secret was regenerated AFTER this refresh token was issued');
          console.log('   3. The client ID/secret combination is incorrect');
          console.log('\n   SOLUTION: Complete a fresh OAuth flow to get new tokens');
          console.log('   Run: node apps/backend/xero-oauth-flow.js');
          console.log('   Then visit: http://localhost:4001/connect');
        } else if (errorData.error === 'invalid_client') {
          console.log('\n⚠️  INVALID_CLIENT ERROR DIAGNOSIS:');
          console.log('   This error means the client credentials are wrong');
          console.log('   1. Verify XERO_CLIENT_ID in Xero developer portal');
          console.log('   2. Verify XERO_CLIENT_SECRET matches the latest regenerated secret');
          console.log('   3. Check if the app is still active in Xero');
        }
      }
    } else {
      const tokenData = JSON.parse(responseText);
      console.log('\n✅ Token refresh SUCCESSFUL!');
      console.log('\n📋 New credentials (add to .env):');
      console.log(`XERO_ACCESS_TOKEN=${tokenData.access_token}`);
      console.log(`XERO_REFRESH_TOKEN=${tokenData.refresh_token}`);
      console.log(`\n⏰ Token expires in: ${tokenData.expires_in} seconds (${Math.floor(tokenData.expires_in / 60)} minutes)`);
    }
  } catch (error) {
    console.error('\n❌ Network error during token refresh:', error.message);
  }
}

console.log('\n');
