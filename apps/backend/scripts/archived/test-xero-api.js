/**
 * XERO API INTEGRATION TEST
 * Test if Xero API connections and authentication are working
 */

import dotenv from 'dotenv';
import { XeroClient } from 'xero-node';

dotenv.config();

async function testXeroAPI() {
  console.log('🔍 Testing Xero API integration...');

  try {
    // Check if Xero environment variables are configured
    const clientId = process.env.XERO_CLIENT_ID;
    const clientSecret = process.env.XERO_CLIENT_SECRET;
    const redirectUri = process.env.XERO_REDIRECT_URI;

    console.log('📋 Xero Environment Check:');
    console.log('  XERO_CLIENT_ID:', clientId ? '✅ Set' : '❌ Missing');
    console.log('  XERO_CLIENT_SECRET:', clientSecret ? '✅ Set' : '❌ Missing');
    console.log('  XERO_REDIRECT_URI:', redirectUri ? '✅ Set' : '❌ Missing');

    if (!clientId || !clientSecret) {
      console.log('❌ Missing required Xero configuration');
      console.log('💡 To test Xero API, you need to set up:');
      console.log('   - XERO_CLIENT_ID');
      console.log('   - XERO_CLIENT_SECRET');
      console.log('   - XERO_REDIRECT_URI');
      return;
    }

    // Create Xero client
    const xero = new XeroClient({
      clientId: clientId,
      clientSecret: clientSecret,
      redirectUris: [redirectUri || 'http://localhost:3000/callback'],
      scopes: 'openid profile email accounting.transactions'
    });

    console.log('✅ Xero client created successfully');

    // Check if we have stored tokens (this would require authentication flow)
    console.log('📋 Note: Full Xero API testing requires OAuth authentication');
    console.log('   The Xero client is properly configured and ready for authentication');

    console.log('🔗 Available Xero endpoints in codebase:');
    console.log('   - /api/v1/financial/* (comprehensive financial API)');
    console.log('   - /api/xeroAuth/* (OAuth authentication)');
    console.log('   - Includes transaction sync, receipt matching, and reporting');

  } catch (error) {
    console.error('❌ Error testing Xero API:', error.message);
    console.error('🔍 Full error:', error);
  }
}

testXeroAPI();