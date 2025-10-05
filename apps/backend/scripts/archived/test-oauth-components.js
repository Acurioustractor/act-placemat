#!/usr/bin/env node

/**
 * COMPREHENSIVE OAUTH TEST
 * Tests each component to see what's working and what's not
 */

import dotenv from 'dotenv';
import { google } from 'googleapis';
import fetch from 'node-fetch';

dotenv.config({ path: '../../.env' });

console.log('🧪 COMPREHENSIVE OAUTH COMPONENT TEST');
console.log('====================================');

async function testOAuthComponents() {
  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  const projectId = clientId ? clientId.split('-')[0] : 'unknown';

  console.log('1️⃣ ENVIRONMENT VARIABLES TEST');
  console.log('   GMAIL_CLIENT_ID:', clientId ? '✅ Present' : '❌ Missing');
  console.log('   GMAIL_CLIENT_SECRET:', clientSecret ? '✅ Present' : '❌ Missing');
  console.log('   Project ID:', projectId);
  console.log('');

  if (!clientId || !clientSecret) {
    console.log('❌ Missing credentials - can\'t continue');
    return;
  }

  console.log('2️⃣ GMAIL API AVAILABILITY TEST');
  try {
    const apiUrl = `https://gmail.googleapis.com/$discovery/rest?version=v1`;
    const response = await fetch(apiUrl);
    const data = await response.json();
    console.log('   Gmail API Discovery:', response.ok ? '✅ Available' : '❌ Not accessible');
    console.log('   API Version:', data.version || 'unknown');
  } catch (error) {
    console.log('   Gmail API Discovery: ❌ Failed -', error.message);
  }
  console.log('');

  console.log('3️⃣ OAUTH CLIENT VALIDITY TEST');
  try {
    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, 'urn:ietf:wg:oauth:2.0:oob');
    console.log('   OAuth Client Creation: ✅ Success');
    
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/gmail.readonly'],
      prompt: 'consent'
    });
    console.log('   Auth URL Generation: ✅ Success');
    console.log('   Auth URL Length:', authUrl.length, 'chars');
  } catch (error) {
    console.log('   OAuth Client Creation: ❌ Failed -', error.message);
  }
  console.log('');

  console.log('4️⃣ GOOGLE OAUTH ENDPOINT TEST');
  try {
    const testUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&response_type=code&scope=openid&redirect_uri=urn:ietf:wg:oauth:2.0:oob`;
    const response = await fetch(testUrl, { method: 'HEAD' });
    console.log('   OAuth Endpoint Accessibility:', response.ok ? '✅ Accessible' : `❌ Status ${response.status}`);
  } catch (error) {
    console.log('   OAuth Endpoint Accessibility: ❌ Failed -', error.message);
  }
  console.log('');

  console.log('5️⃣ PROJECT-SPECIFIC API TEST');
  const googleCloudUrls = {
    'APIs Library': `https://console.cloud.google.com/apis/library?project=${projectId}`,
    'Gmail API': `https://console.cloud.google.com/apis/api/gmail.googleapis.com?project=${projectId}`,
    'OAuth Consent': `https://console.cloud.google.com/apis/credentials/consent?project=${projectId}`,
    'Credentials': `https://console.cloud.google.com/apis/credentials?project=${projectId}`
  };

  console.log('   🔗 Direct Links for Project', projectId + ':');
  for (const [name, url] of Object.entries(googleCloudUrls)) {
    console.log(`   ${name}: ${url}`);
  }
  console.log('');

  console.log('6️⃣ OAUTH FLOW SIMULATION');
  try {
    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, 'urn:ietf:wg:oauth:2.0:oob');
    
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.modify'
      ],
      prompt: 'consent'
    });

    console.log('   Generated Auth URL: ✅ Success');
    console.log('');
    console.log('   🎯 TEST THIS URL:');
    console.log('   ' + authUrl);
    console.log('');
    console.log('   Expected outcomes:');
    console.log('   ✅ Should show "Empathy Ledger" consent screen');
    console.log('   ✅ Should allow you to grant permissions');
    console.log('   ✅ Should show authorization code');
    console.log('   ❌ If "Access blocked" → OAuth consent screen issue');
    console.log('   ❌ If "redirect_uri_mismatch" → Redirect URI issue');
    console.log('   ❌ If "invalid_client" → Client ID/Secret issue');
    
  } catch (error) {
    console.log('   OAuth Flow Simulation: ❌ Failed -', error.message);
  }
  console.log('');

  console.log('7️⃣ DIAGNOSTIC RECOMMENDATIONS');
  console.log('');
  console.log('   If you get "Access blocked":');
  console.log('   1. Go to OAuth Consent Screen (link above)');
  console.log('   2. Verify "benjamin@act.place" is in Test Users');
  console.log('   3. Verify Publishing Status is "Testing"');
  console.log('   4. Verify User Type is "External"');
  console.log('');
  console.log('   If you get "invalid_client":');
  console.log('   1. Go to Credentials (link above)');
  console.log('   2. Verify Client ID matches:', clientId);
  console.log('   3. Verify Application Type is "Desktop application"');
  console.log('');
  console.log('   If Gmail API errors:');
  console.log('   1. Go to Gmail API (link above)');
  console.log('   2. Click "ENABLE" if not already enabled');
  console.log('   3. Wait 1-2 minutes for propagation');
}

testOAuthComponents();