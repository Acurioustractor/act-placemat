#!/usr/bin/env node

/**
 * FINAL OAUTH TEST
 * Last attempt to verify and fix OAuth
 */

import dotenv from 'dotenv';
import { google } from 'googleapis';
import readline from 'readline';

dotenv.config({ path: '../../.env' });

console.log('🔥 FINAL OAUTH TEST');
console.log('==================');

async function finalTest() {
  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  
  console.log('✅ Credentials loaded');
  console.log('✅ Project: 1094162764958');
  console.log('');
  
  console.log('🎯 CRITICAL CHECK:');
  console.log('Did you add benjamin@act.place to test users?');
  console.log('Link: https://console.cloud.google.com/apis/credentials/consent?project=1094162764958');
  console.log('');
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const confirmed = await new Promise((resolve) => {
    rl.question('Have you added benjamin@act.place as a test user? (y/n): ', (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y');
    });
  });

  if (!confirmed) {
    console.log('❌ Add yourself as test user first!');
    console.log('1. Go to: https://console.cloud.google.com/apis/credentials/consent?project=1094162764958');
    console.log('2. Scroll to "Test users"');
    console.log('3. Click "ADD USERS"');
    console.log('4. Add: benjamin@act.place');
    console.log('5. Save and try again');
    return;
  }

  console.log('');
  console.log('🚀 Generating OAuth URL...');
  
  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    'urn:ietf:wg:oauth:2.0:oob'
  );

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.modify'
    ],
    prompt: 'consent'
  });

  console.log('');
  console.log('🔗 TRY THIS URL NOW:');
  console.log(authUrl);
  console.log('');
  console.log('Expected result:');
  console.log('✅ Should show "Empathy Ledger wants to access your Google Account"');
  console.log('✅ Should let you click "Allow"');
  console.log('✅ Should show authorization code');
  console.log('');
  console.log('If still "Access blocked":');
  console.log('❌ Test user not properly saved');
  console.log('❌ Wrong Google account (must be benjamin@act.place)');
  console.log('❌ Cache issue (try incognito mode)');
}

finalTest();