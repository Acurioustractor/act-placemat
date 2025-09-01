#!/usr/bin/env node

/**
 * GMAIL SERVICE ACCOUNT SETUP
 * Uses service account instead of OAuth for easier setup
 */

import dotenv from 'dotenv';

// Load environment variables from project root
dotenv.config({ path: '../../.env' });

console.log('🚀 GMAIL SERVICE ACCOUNT SETUP GUIDE');
console.log('====================================');
console.log('');
console.log('❌ OAuth setup failed because Google requires app verification.');
console.log('✅ Here are 3 solutions:');
console.log('');

console.log('🔧 SOLUTION 1: Fix OAuth Consent Screen (Recommended)');
console.log('1. Go to: https://console.cloud.google.com/');
console.log('2. Select your project or create new one');
console.log('3. Enable Gmail API: APIs & Services > Library > Gmail API > Enable');
console.log('4. Go to: APIs & Services > OAuth consent screen');
console.log('5. Choose "External" user type');
console.log('6. Fill in required fields:');
console.log('   - App name: "ACT Placemat Gmail"');
console.log('   - User support email: benjamin@act.place');
console.log('   - Developer contact: benjamin@act.place');
console.log('7. In "Test users" section, add: benjamin@act.place');
console.log('8. Save and continue');
console.log('9. Then run: node setup-gmail-fixed.js');
console.log('');

console.log('🔧 SOLUTION 2: Use App Passwords (Quick Fix)');
console.log('1. Go to: https://myaccount.google.com/apppasswords');
console.log('2. Generate app password for "Mail"');
console.log('3. Use IMAP/SMTP instead of Gmail API');
console.log('4. Add to .env:');
console.log('   GMAIL_USER=benjamin@act.place');
console.log('   GMAIL_APP_PASSWORD=generated_password');
console.log('');

console.log('🔧 SOLUTION 3: Domain-wide Delegation (Advanced)');
console.log('1. Create service account in Google Cloud Console');
console.log('2. Enable domain-wide delegation');
console.log('3. Add service account to Google Workspace admin');
console.log('4. Download service account key');
console.log('');

console.log('💡 RECOMMENDED: Try Solution 1 first (OAuth fix)');
console.log('   It will give you the most functionality and security.');

if (process.env.GMAIL_CLIENT_ID) {
  console.log('');
  console.log('🔍 Current OAuth Setup:');
  console.log('   Client ID:', process.env.GMAIL_CLIENT_ID);
  console.log('   Redirect URI should be: http://localhost:3333/callback');
  console.log('   OR for OOB: urn:ietf:wg:oauth:2.0:oob');
}

console.log('');
console.log('🎯 Once you fix the OAuth consent screen, your original setup will work!');