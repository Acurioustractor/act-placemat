/**
 * Diagnose Domain-Wide Delegation Setup
 *
 * Checks if delegation is properly configured and provides troubleshooting info
 */

import { google } from 'googleapis';
import { readFileSync } from 'fs';

const SERVICE_ACCOUNT_PATH = './subscription-tracker/config/service-account.json';
const TEST_EMAIL = 'nicholas@act.place';

console.log('\n🔍 DOMAIN-WIDE DELEGATION DIAGNOSTIC\n');
console.log('='.repeat(80));

async function diagnose() {
  try {
    // 1. Load service account
    console.log('\n1️⃣  Loading service account credentials...\n');
    const credentials = JSON.parse(readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'));

    console.log('   ✅ Service account loaded');
    console.log(`   Project: ${credentials.project_id}`);
    console.log(`   Client ID: ${credentials.client_id}`);
    console.log(`   Client Email: ${credentials.client_email}`);
    console.log(`   Domain: ${TEST_EMAIL.split('@')[1]}\n`);

    // 2. Create auth client
    console.log('2️⃣  Creating authentication client...\n');

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/gmail.readonly'],
      subject: TEST_EMAIL  // Try to impersonate
    });

    console.log('   ✅ Auth client created');
    console.log(`   Scopes: https://www.googleapis.com/auth/gmail.readonly`);
    console.log(`   Impersonating: ${TEST_EMAIL}\n`);

    // 3. Get access token
    console.log('3️⃣  Attempting to get access token...\n');

    try {
      const authClient = await auth.getClient();
      const tokenResponse = await authClient.getAccessToken();

      if (tokenResponse.token) {
        console.log('   ✅ Access token obtained successfully!');
        console.log(`   Token (first 20 chars): ${tokenResponse.token.substring(0, 20)}...\n`);
      }
    } catch (tokenError) {
      console.log('   ❌ Failed to get access token');
      console.log(`   Error: ${tokenError.message}\n`);

      if (tokenError.message.includes('unauthorized_client')) {
        console.log('   ⚠️  DIAGNOSIS: Domain-wide delegation NOT configured\n');
        console.log('   SOLUTION: In Google Workspace Admin Console:\n');
        console.log('   1. Go to https://admin.google.com');
        console.log('   2. Navigate to: Security → API Controls → Domain-wide Delegation');
        console.log('   3. Click "Manage Domain-wide Delegation"');
        console.log('   4. Look for Client ID: 106740829315613258776\n');
        console.log('   If NOT found:');
        console.log('   - Click "Add new"');
        console.log('   - Client ID: 106740829315613258776');
        console.log('   - OAuth Scopes: https://www.googleapis.com/auth/gmail.readonly');
        console.log('   - Click "Authorize"\n');
        console.log('   If found:');
        console.log('   - Check the scope is EXACTLY: https://www.googleapis.com/auth/gmail.readonly');
        console.log('   - Wait 10-15 minutes after adding/modifying\n');
        throw tokenError;
      }

      throw tokenError;
    }

    // 4. Try Gmail API call
    console.log('4️⃣  Testing Gmail API access...\n');

    const gmail = google.gmail({
      version: 'v1',
      auth: await auth.getClient()
    });

    try {
      const response = await gmail.users.messages.list({
        userId: 'me',
        maxResults: 1,
        q: 'newer_than:1d'
      });

      console.log('   ✅ Gmail API call successful!');
      console.log(`   Messages found: ${response.data.messages?.length || 0}\n`);

      console.log('='.repeat(80));
      console.log('\n🎉 SUCCESS! Domain-wide delegation is working correctly.\n');
      console.log('You can now use the email intelligence system!\n');

      return true;

    } catch (apiError) {
      console.log('   ❌ Gmail API call failed');
      console.log(`   Error: ${apiError.message}\n`);

      if (apiError.message.includes('Precondition check failed')) {
        console.log('   ⚠️  DIAGNOSIS: Token obtained but API call rejected\n');
        console.log('   This usually means:');
        console.log('   - Delegation was JUST added and needs time to propagate (wait 15 min)');
        console.log('   - Wrong domain (make sure you\'re using act.place Google Workspace)');
        console.log('   - User account doesn\'t exist in this Workspace\n');
      }

      throw apiError;
    }

  } catch (error) {
    console.log('='.repeat(80));
    console.log('\n❌ DIAGNOSTIC FAILED\n');
    console.log(`Error: ${error.message}\n`);

    console.log('📋 CHECKLIST:\n');
    console.log('□ Google Workspace Admin access to act.place domain');
    console.log('□ Domain-wide delegation added with correct Client ID');
    console.log('□ OAuth scope is exactly: https://www.googleapis.com/auth/gmail.readonly');
    console.log('□ Waited 10-15 minutes after adding delegation');
    console.log(`□ User ${TEST_EMAIL} exists in Google Workspace\n`);

    process.exit(1);
  }
}

diagnose()
  .then(() => {
    console.log('Diagnostic complete - system ready!');
    process.exit(0);
  })
  .catch(() => {
    console.log('Diagnostic failed - see errors above');
    process.exit(1);
  });
