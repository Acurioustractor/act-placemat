/**
 * Complete Domain-Wide Delegation Diagnostic
 *
 * Checks ALL requirements for domain-wide delegation
 */

import { google } from 'googleapis';
import { readFileSync } from 'fs';

const SERVICE_ACCOUNT_PATH = './subscription-tracker/config/service-account.json';
const TEST_EMAIL = 'nicholas@act.place';

console.log('\n🔍 COMPLETE DOMAIN-WIDE DELEGATION DIAGNOSTIC\n');
console.log('='.repeat(80));

async function checkAll() {
  const credentials = JSON.parse(readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'));

  console.log('\n📋 CHECKLIST:\n');

  // 1. Service account type
  console.log('1️⃣  Service Account Type');
  if (credentials.type === 'service_account') {
    console.log('   ✅ Valid service account');
  } else {
    console.log('   ❌ Invalid type:', credentials.type);
    return false;
  }

  // 2. Service account details
  console.log('\n2️⃣  Service Account Details');
  console.log('   Project:', credentials.project_id);
  console.log('   Client ID:', credentials.client_id);
  console.log('   Email:', credentials.client_email);

  // 3. Test OAuth token
  console.log('\n3️⃣  OAuth Token Generation');
  try {
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/gmail.readonly'],
      subject: TEST_EMAIL
    });
    const client = await auth.getClient();
    const token = await client.getAccessToken();

    if (token.token) {
      console.log('   ✅ Access token obtained');
      console.log('   Token preview:', token.token.substring(0, 20) + '...');
    }
  } catch (error) {
    console.log('   ❌ Failed to get token:', error.message);

    if (error.message.includes('unauthorized_client')) {
      console.log('\n   ⚠️  PROBLEM: Domain-wide delegation NOT configured');
      console.log('   FIX: Add delegation in admin.google.com');
    }
    return false;
  }

  // 4. Test Gmail API with JWT (required for Gmail API)
  console.log('\n4️⃣  Gmail API Access (using JWT auth)');
  try {
    const jwtClient = new google.auth.JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: ['https://www.googleapis.com/auth/gmail.readonly'],
      subject: TEST_EMAIL
    });
    await jwtClient.authorize();
    const gmail = google.gmail({ version: 'v1', auth: jwtClient });

    await gmail.users.messages.list({
      userId: 'me',
      maxResults: 1
    });

    console.log('   ✅ Gmail API working!');
    return true;

  } catch (error) {
    console.log('   ❌ Gmail API failed');
    console.log('   Error:', error.message);
    console.log('   Code:', error.code);

    if (error.code === 400 && error.message.includes('Precondition check failed')) {
      console.log('\n   ⚠️  PROBLEM: Gmail API call rejected');
      console.log('   This usually means ONE of these:');
      console.log('');
      console.log('   A) Gmail API not enabled in service account project');
      console.log('      Check: https://console.cloud.google.com/apis/library/gmail.googleapis.com?project=' + credentials.project_id);
      console.log('      Must show "API Enabled"');
      console.log('');
      console.log('   B) Domain-wide delegation still propagating');
      console.log('      Wait: 10-30 minutes after adding delegation');
      console.log('');
      console.log('   C) Delegation added to wrong Google Workspace');
      console.log('      Verify: admin.google.com shows act.place org in top-right');
      console.log('');
      console.log('   D) User does not exist or is suspended');
      console.log('      Check: admin.google.com → Directory → Users → ' + TEST_EMAIL);
    }

    return false;
  }
}

async function main() {
  const success = await checkAll();

  console.log('\n' + '='.repeat(80));

  if (success) {
    console.log('\n🎉 SUCCESS! Domain-wide delegation is working!\n');
    console.log('You can now use the email intelligence system.');
    console.log('Try: node test-multi-account-scan.js\n');
  } else {
    console.log('\n❌ FAILED - Follow the fix steps above\n');
    console.log('Most common issues:');
    console.log('1. Gmail API not enabled in Cloud Console project');
    console.log('2. Delegation still propagating (wait 15-30 min)');
    console.log('3. Wrong Google Workspace organization\n');
  }

  console.log('='.repeat(80));
  console.log();

  process.exit(success ? 0 : 1);
}

main();
