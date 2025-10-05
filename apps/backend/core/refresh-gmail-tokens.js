#!/usr/bin/env node

/**
 * Refresh Gmail OAuth Tokens
 * Simple script to refresh expired Gmail tokens
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables first
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import { google } from 'googleapis';
import fs from 'fs';
import readline from 'readline';

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events'
];

const TOKEN_PATH = '.gmail_tokens.json';

console.log('\n🔄 Gmail OAuth Token Refresh');
console.log('==============================\n');

async function refreshTokens() {
  try {
    // Check credentials
    if (!process.env.GMAIL_CLIENT_ID || !process.env.GMAIL_CLIENT_SECRET) {
      console.log('❌ Missing Gmail OAuth credentials');
      console.log('   GMAIL_CLIENT_ID:', process.env.GMAIL_CLIENT_ID ? 'SET' : 'NOT SET');
      console.log('   GMAIL_CLIENT_SECRET:', process.env.GMAIL_CLIENT_SECRET ? 'SET' : 'NOT SET');
      process.exit(1);
    }

    console.log('✅ Gmail credentials loaded');
    console.log(`   Client ID: ${process.env.GMAIL_CLIENT_ID.substring(0, 20)}...`);

    // Create OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      'urn:ietf:wg:oauth:2.0:oob' // Desktop client
    );

    // Try to load existing tokens
    let needsAuth = true;
    if (fs.existsSync(TOKEN_PATH)) {
      console.log('\n📄 Found existing tokens file');
      const tokens = JSON.parse(fs.readFileSync(TOKEN_PATH));

      if (tokens.refresh_token) {
        console.log('🔄 Attempting to refresh tokens...');

        try {
          oauth2Client.setCredentials(tokens);
          const { credentials } = await oauth2Client.refreshAccessToken();

          // Save new tokens
          fs.writeFileSync(TOKEN_PATH, JSON.stringify(credentials, null, 2));
          console.log('✅ Tokens refreshed successfully!');
          console.log(`   Access token: ${credentials.access_token.substring(0, 20)}...`);
          console.log(`   Expires: ${new Date(credentials.expiry_date).toLocaleString()}`);

          needsAuth = false;
        } catch (refreshError) {
          console.log('⚠️  Token refresh failed:', refreshError.message);
          console.log('   Will need to re-authenticate');
        }
      }
    }

    if (needsAuth) {
      console.log('\n🔐 New authentication required');
      console.log('   Generating authorization URL...\n');

      const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
        prompt: 'consent' // Force to get refresh token
      });

      console.log('📋 STEP 1: Open this URL in your browser:\n');
      console.log(authUrl);
      console.log('\n📋 STEP 2: Authorize the application');
      console.log('📋 STEP 3: Copy the authorization code\n');

      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      rl.question('Enter the code from that page here: ', async (code) => {
        rl.close();

        try {
          console.log('\n🔄 Exchanging code for tokens...');
          const { tokens } = await oauth2Client.getToken(code);

          // Save tokens
          fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));

          console.log('✅ Authentication successful!');
          console.log(`   Access token: ${tokens.access_token.substring(0, 20)}...`);
          console.log(`   Refresh token: ${tokens.refresh_token ? 'Yes' : 'No'}`);
          console.log(`   Expires: ${new Date(tokens.expiry_date).toLocaleString()}`);
          console.log(`\n💾 Tokens saved to ${TOKEN_PATH}`);

          // Test the connection
          console.log('\n🧪 Testing Gmail connection...');
          oauth2Client.setCredentials(tokens);
          const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
          const profile = await gmail.users.getProfile({ userId: 'me' });

          console.log('✅ Gmail connection successful!');
          console.log(`   Email: ${profile.data.emailAddress}`);
          console.log(`   Messages: ${profile.data.messagesTotal}`);
          console.log(`   Threads: ${profile.data.threadsTotal}`);

          console.log('\n🎉 Setup complete! You can now use the Gmail sync service.');

        } catch (error) {
          console.error('❌ Authentication error:', error.message);
          process.exit(1);
        }
      });
    } else {
      // Test the refreshed connection
      console.log('\n🧪 Testing Gmail connection...');
      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
      const profile = await gmail.users.getProfile({ userId: 'me' });

      console.log('✅ Gmail connection successful!');
      console.log(`   Email: ${profile.data.emailAddress}`);
      console.log(`   Messages: ${profile.data.messagesTotal}`);
      console.log(`   Threads: ${profile.data.threadsTotal}`);

      console.log('\n🎉 Tokens refreshed! Gmail sync service is ready.');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

refreshTokens();