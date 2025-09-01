#!/usr/bin/env node

/**
 * DEEP OAUTH DEBUG
 * Find out exactly why Desktop OAuth is still blocked
 */

import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config({ path: '../../.env' });

console.log('🔥 DEEP OAUTH DEBUG');
console.log('==================');

async function deepDebug() {
  const clientId = process.env.GMAIL_CLIENT_ID;
  const newClientId = '1094162764958-35gf3dprh5imfc4121870ho0iv5glhmt.apps.googleusercontent.com';
  
  console.log('🔍 CLIENT ID ANALYSIS:');
  console.log('   Current .env ID:', clientId);
  console.log('   Expected new ID:', newClientId);
  console.log('   Match:', clientId === newClientId ? '✅' : '❌');
  console.log('');

  if (clientId !== newClientId) {
    console.log('❌ WRONG CLIENT ID IN .ENV FILE!');
    console.log('💡 The .env file still has the old Web app client ID');
    console.log('🔧 Update .env with new Desktop client ID');
    return;
  }

  console.log('🧪 TESTING OAUTH CONSENT SCREEN API:');
  
  // Try to probe the consent screen configuration
  const probeUrl = `https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=fake`;
  try {
    const response = await fetch(probeUrl);
    console.log('   OAuth API accessible:', response.status !== 404 ? '✅' : '❌');
  } catch (error) {
    console.log('   OAuth API accessible: ❌', error.message);
  }

  console.log('');
  console.log('🎯 POSSIBLE ISSUES:');
  console.log('');
  
  console.log('1️⃣ CACHE/PROPAGATION:');
  console.log('   ❌ Google Cloud changes can take 5-10 minutes to propagate');
  console.log('   ❌ Browser cache might be using old OAuth config');
  console.log('   💡 Solution: Wait 10 minutes, try incognito mode');
  console.log('');

  console.log('2️⃣ WRONG PROJECT:');
  console.log('   ❌ OAuth consent screen configured in different project');
  console.log('   ❌ Test user added to wrong project');
  console.log('   💡 Verify project 1094162764958 has test user');
  console.log('');

  console.log('3️⃣ OAUTH CONSENT SCREEN STATUS:');
  console.log('   ❌ Publishing status changed from Testing to Production');
  console.log('   ❌ User type changed from External to Internal');
  console.log('   💡 Check: https://console.cloud.google.com/apis/credentials/consent?project=1094162764958');
  console.log('');

  console.log('4️⃣ GOOGLE ACCOUNT ISSUE:');
  console.log('   ❌ Signed into wrong Google account');
  console.log('   ❌ Account doesn\'t match test user email');
  console.log('   💡 Ensure you\'re signed into benjamin@act.place');
  console.log('');

  console.log('🔧 IMMEDIATE ACTIONS:');
  console.log('');
  console.log('1. Wait 10 minutes for Google Cloud propagation');
  console.log('2. Try in incognito/private browser window');
  console.log('3. Verify you\'re signed into benjamin@act.place');
  console.log('4. Double-check OAuth consent screen has test user');
  console.log('');

  console.log('📊 CURRENT OAUTH URL:');
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?access_type=offline&scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fgmail.readonly%20https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fgmail.modify&prompt=consent&response_type=code&client_id=${clientId}&redirect_uri=urn%3Aietf%3Awg%3Aoauth%3A2.0%3Aoob`;
  console.log(authUrl);
  console.log('');
  console.log('💡 If still blocked after 10 minutes, the OAuth consent screen');
  console.log('   configuration is not saved properly in Google Cloud Console.');
}

deepDebug();