#!/usr/bin/env node

/**
 * Xero Token Refresh Script
 * Refreshes expired Xero OAuth tokens
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { XeroClient } from 'xero-node';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const TOKEN_PATH = path.join(__dirname, '../.xero_tokens.json');

async function refreshTokens() {
  console.log('🔧 Xero Token Refresh Utility\n');

  // Initialize Xero client
  const xeroClient = new XeroClient({
    clientId: process.env.XERO_CLIENT_ID,
    clientSecret: process.env.XERO_CLIENT_SECRET,
    redirectUris: [process.env.XERO_REDIRECT_URI],
    scopes: [
      'offline_access',
      'accounting.contacts.read',
      'accounting.transactions.read',
      'accounting.settings.read',
      'accounting.reports.read'
    ]
  });

  // Check if we have a refresh token
  if (process.env.XERO_REFRESH_TOKEN) {
    console.log('✅ Found existing refresh token, attempting to refresh...\n');

    try {
      // Set the token set with refresh token
      await xeroClient.setTokenSet({
        refresh_token: process.env.XERO_REFRESH_TOKEN
      });

      // Refresh the access token
      const newTokenSet = await xeroClient.refreshToken();

      console.log('✅ Tokens refreshed successfully!');
      console.log('\n📋 New Token Details:');
      console.log(`   Access Token: ${newTokenSet.access_token.substring(0, 50)}...`);
      console.log(`   Refresh Token: ${newTokenSet.refresh_token}`);
      console.log(`   Expires: ${new Date(Date.now() + (newTokenSet.expires_in * 1000)).toISOString()}`);

      // Save tokens to file
      fs.writeFileSync(TOKEN_PATH, JSON.stringify(newTokenSet, null, 2));
      console.log(`\n💾 Tokens saved to: ${TOKEN_PATH}`);

      // Update .env instructions
      console.log('\n📝 Update your .env file with these new values:');
      console.log(`XERO_ACCESS_TOKEN=${newTokenSet.access_token}`);
      console.log(`XERO_REFRESH_TOKEN=${newTokenSet.refresh_token}`);

      // Get tenant info
      const tokenSet = await xeroClient.readTokenSet();
      if (tokenSet.id_token) {
        const decodedIdToken = xeroClient.readIdTokenClaims(tokenSet.id_token);
        console.log(`\n👤 User: ${decodedIdToken.email}`);
      }

    } catch (error) {
      console.error('❌ Token refresh failed:', error.message);
      console.log('\n🔄 Refresh token may be expired. Need to re-authorize.\n');
      await reauthorize(xeroClient);
    }
  } else {
    console.log('⚠️  No refresh token found. Starting new authorization...\n');
    await reauthorize(xeroClient);
  }
}

async function reauthorize(xeroClient) {
  // Generate authorization URL
  const authUrl = await xeroClient.buildConsentUrl();

  console.log('🔗 Authorization URL:');
  console.log(authUrl);
  console.log('\n📋 Steps:');
  console.log('1. Open the URL above in your browser');
  console.log('2. Log in to Xero and authorize the app');
  console.log('3. Copy the authorization code from the redirect URL');
  console.log('4. Run this script again with the code:\n');
  console.log('   node refresh-xero-tokens.js <authorization_code>\n');
}

async function exchangeCode(code) {
  console.log('🔄 Exchanging authorization code for tokens...\n');

  const xeroClient = new XeroClient({
    clientId: process.env.XERO_CLIENT_ID,
    clientSecret: process.env.XERO_CLIENT_SECRET,
    redirectUris: [process.env.XERO_REDIRECT_URI],
    scopes: [
      'offline_access',
      'accounting.contacts.read',
      'accounting.transactions.read',
      'accounting.settings.read',
      'accounting.reports.read'
    ]
  });

  try {
    const tokenSet = await xeroClient.apiCallback(process.env.XERO_REDIRECT_URI + '?code=' + code);

    console.log('✅ Authorization successful!');
    console.log('\n📋 Token Details:');
    console.log(`   Access Token: ${tokenSet.access_token.substring(0, 50)}...`);
    console.log(`   Refresh Token: ${tokenSet.refresh_token}`);
    console.log(`   Expires: ${new Date(Date.now() + (tokenSet.expires_in * 1000)).toISOString()}`);

    // Get tenants
    await xeroClient.updateTenants();
    const tenants = xeroClient.tenants;

    console.log(`\n🏢 Available Organizations:`);
    tenants.forEach((tenant, i) => {
      console.log(`   ${i + 1}. ${tenant.tenantName} (${tenant.tenantId})`);
    });

    // Save tokens to file
    const tokenData = {
      ...tokenSet,
      tenants: tenants
    };

    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokenData, null, 2));
    console.log(`\n💾 Tokens saved to: ${TOKEN_PATH}`);

    // Update .env instructions
    console.log('\n📝 Update your .env file with these values:');
    console.log(`XERO_ACCESS_TOKEN=${tokenSet.access_token}`);
    console.log(`XERO_REFRESH_TOKEN=${tokenSet.refresh_token}`);
    if (tenants.length > 0) {
      console.log(`XERO_TENANT_ID=${tenants[0].tenantId}`);
    }

  } catch (error) {
    console.error('❌ Authorization failed:', error.message);
    process.exit(1);
  }
}

// Main execution
const authCode = process.argv[2];

if (authCode) {
  exchangeCode(authCode);
} else {
  refreshTokens();
}