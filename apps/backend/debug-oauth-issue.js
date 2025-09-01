#!/usr/bin/env node

/**
 * DEBUG OAUTH ISSUE
 * Figure out exactly what's wrong with the OAuth setup
 */

import dotenv from 'dotenv';
import { google } from 'googleapis';

dotenv.config({ path: '../../.env' });

console.log('🔍 DEBUGGING OAUTH ISSUE');
console.log('========================');

async function debugOAuth() {
  console.log('📋 Environment Check:');
  console.log('   GMAIL_CLIENT_ID:', process.env.GMAIL_CLIENT_ID ? '✅ Set' : '❌ Missing');
  console.log('   GMAIL_CLIENT_SECRET:', process.env.GMAIL_CLIENT_SECRET ? '✅ Set' : '❌ Missing');
  console.log('   GMAIL_REDIRECT_URI:', process.env.GMAIL_REDIRECT_URI || '❌ Not set');
  console.log('');

  if (!process.env.GMAIL_CLIENT_ID) {
    console.log('❌ Missing GMAIL_CLIENT_ID');
    return;
  }

  const clientId = process.env.GMAIL_CLIENT_ID;
  console.log('🔧 OAuth Client Analysis:');
  console.log('   Client ID:', clientId);
  console.log('   Project ID:', clientId.split('-')[0]);
  console.log('');

  // Test different redirect URIs
  const redirectURIs = [
    'urn:ietf:wg:oauth:2.0:oob',
    'http://localhost:3333/callback',
    process.env.GMAIL_REDIRECT_URI
  ].filter(Boolean);

  for (const redirectURI of redirectURIs) {
    console.log(`🧪 Testing redirect URI: ${redirectURI}`);
    
    try {
      const oauth2Client = new google.auth.OAuth2(
        process.env.GMAIL_CLIENT_ID,
        process.env.GMAIL_CLIENT_SECRET,
        redirectURI
      );

      const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: [
          'https://www.googleapis.com/auth/gmail.readonly',
          'https://www.googleapis.com/auth/gmail.modify'
        ],
        prompt: 'consent'
      });

      console.log(`   ✅ Auth URL generated successfully`);
      
      // If it's the OOB flow, test it
      if (redirectURI === 'urn:ietf:wg:oauth:2.0:oob') {
        console.log('');
        console.log('🎯 RECOMMENDED: Try this OOB URL:');
        console.log(authUrl);
        console.log('');
        console.log('💡 If this still fails, the issue is:');
        console.log('   1. OAuth consent screen not properly configured');
        console.log('   2. Your email not added as test user');
        console.log('   3. Gmail API not enabled');
        console.log('   4. Wrong project selected in Google Cloud Console');
      }
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }

  console.log('');
  console.log('🔧 TROUBLESHOOTING STEPS:');
  console.log('');
  console.log('1. Verify you\'re in the RIGHT Google Cloud project:');
  console.log('   https://console.cloud.google.com/');
  console.log('   Project should match:', clientId.split('-')[0]);
  console.log('');
  console.log('2. Check OAuth Consent Screen:');
  console.log('   https://console.cloud.google.com/apis/credentials/consent');
  console.log('   - User type: External');
  console.log('   - Publishing status: Testing');
  console.log('   - Test users: benjamin@act.place must be added');
  console.log('');
  console.log('3. Check Gmail API is enabled:');
  console.log('   https://console.cloud.google.com/apis/api/gmail.googleapis.com');
  console.log('');
  console.log('4. Check OAuth Client credentials:');
  console.log('   https://console.cloud.google.com/apis/credentials');
  console.log('   - Application type: Desktop application');
  console.log('   - No redirect URIs needed for desktop app');
}

debugOAuth();