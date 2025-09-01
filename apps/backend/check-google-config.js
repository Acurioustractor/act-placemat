#!/usr/bin/env node

/**
 * CHECK GOOGLE CLOUD CONFIGURATION
 * Verify exact settings that are causing OAuth to fail
 */

import dotenv from 'dotenv';

dotenv.config({ path: '../../.env' });

console.log('🔍 GOOGLE CLOUD CONFIGURATION CHECKER');
console.log('====================================');
console.log('');

const projectId = '1094162764958';
const clientId = process.env.GMAIL_CLIENT_ID;

console.log('❌ You\'re getting "Access blocked" error');
console.log('✅ This means OAuth consent screen is NOT properly configured');
console.log('');

console.log('🎯 EXACT STEPS TO FIX:');
console.log('');

console.log('1️⃣ GO TO OAUTH CONSENT SCREEN:');
console.log(`   https://console.cloud.google.com/apis/credentials/consent?project=${projectId}`);
console.log('');

console.log('2️⃣ VERIFY THESE EXACT SETTINGS:');
console.log('');
console.log('   📋 App Information:');
console.log('   • App name: "Empathy Ledger" (or any name)');
console.log('   • User support email: benjamin@act.place');
console.log('   • Developer contact: benjamin@act.place');
console.log('');

console.log('   📋 Scopes (CRITICAL - must have both):');
console.log('   • https://www.googleapis.com/auth/gmail.readonly');
console.log('   • https://www.googleapis.com/auth/gmail.modify');
console.log('');

console.log('   📋 Test Users (MOST CRITICAL):');
console.log('   • benjamin@act.place MUST be listed');
console.log('   • If this is empty, you\'ll get "Access blocked"');
console.log('');

console.log('   📋 Publishing Status:');
console.log('   • Must be "Testing" (not "In production")');
console.log('   • User type: "External"');
console.log('');

console.log('3️⃣ ENABLE GMAIL API:');
console.log(`   https://console.cloud.google.com/apis/api/gmail.googleapis.com?project=${projectId}`);
console.log('   • Must show "API enabled"');
console.log('');

console.log('4️⃣ CHECK CREDENTIALS:');
console.log(`   https://console.cloud.google.com/apis/credentials?project=${projectId}`);
console.log('   • Application type: "Desktop application"');
console.log(`   • Client ID: ${clientId}`);
console.log('');

console.log('🚨 COMMON MISTAKES THAT CAUSE "Access blocked":');
console.log('');
console.log('   ❌ Test users section is EMPTY');
console.log('   ❌ Wrong email in test users');
console.log('   ❌ Publishing status is "In production" instead of "Testing"');
console.log('   ❌ Missing required scopes');
console.log('   ❌ Gmail API not enabled');
console.log('   ❌ Configuring the wrong Google Cloud project');
console.log('');

console.log('💡 DEBUGGING TIP:');
console.log('   The error says "Empathy Ledger" - this confirms you\'re');
console.log('   hitting the right OAuth consent screen, but it\'s not');
console.log('   configured to allow benjamin@act.place as a test user.');
console.log('');

console.log('🎯 IMMEDIATE ACTION:');
console.log('   1. Open the OAuth consent screen link above');
console.log('   2. Scroll to "Test users" section');
console.log('   3. Add benjamin@act.place if missing');
console.log('   4. Save changes');
console.log('   5. Try OAuth again immediately');
console.log('');

console.log('⏰ After making changes, OAuth should work within 30 seconds.');