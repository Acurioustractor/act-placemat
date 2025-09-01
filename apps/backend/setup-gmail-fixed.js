#!/usr/bin/env node

/**
 * FIXED GMAIL SETUP SCRIPT
 * Handles Google OAuth properly with correct redirect URIs
 */

import { google } from 'googleapis';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import readline from 'readline';

// Load environment variables from project root
dotenv.config({ path: '../../.env' });

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify'
];

const TOKEN_FILE = '.gmail_tokens.json';

console.log('🚀 FIXED GMAIL AUTHENTICATION SETUP');
console.log('===================================');

async function setupGmailAuth() {
  try {
    // Check environment variables
    if (!process.env.GMAIL_CLIENT_ID || !process.env.GMAIL_CLIENT_SECRET) {
      console.error('❌ Missing GMAIL_CLIENT_ID or GMAIL_CLIENT_SECRET in .env file');
      process.exit(1);
    }

    console.log('✅ Gmail credentials found in environment');

    // Check if tokens already exist
    try {
      const existingTokens = await fs.readFile(TOKEN_FILE, 'utf8');
      const tokens = JSON.parse(existingTokens);
      if (tokens.access_token || tokens.refresh_token) {
        console.log('✅ Gmail tokens already exist!');
        console.log('🎯 Gmail authentication is already set up.');
        return;
      }
    } catch (error) {
      // No existing tokens, continue with setup
    }

    console.log('🔧 Setting up Gmail OAuth client...');
    
    const oauth2Client = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      'urn:ietf:wg:oauth:2.0:oob' // Use OOB flow for desktop apps
    );

    // Generate auth URL
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'consent'
    });

    console.log('');
    console.log('📋 INSTRUCTIONS:');
    console.log('1. Copy the URL below and paste it into your browser');
    console.log('2. Sign in to your Gmail account');  
    console.log('3. Grant permissions');
    console.log('4. Copy the authorization code from the page');
    console.log('5. Paste it below when prompted');
    console.log('');
    console.log('🔗 AUTH URL:');
    console.log(authUrl);
    console.log('');

    // Get authorization code from user
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const code = await new Promise((resolve) => {
      rl.question('📝 Enter the authorization code: ', (answer) => {
        rl.close();
        resolve(answer.trim());
      });
    });

    if (!code) {
      console.error('❌ No authorization code provided');
      process.exit(1);
    }

    console.log('🔄 Exchanging code for tokens...');
    
    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    
    // Save tokens
    await fs.writeFile(TOKEN_FILE, JSON.stringify(tokens, null, 2));
    
    console.log('✅ Gmail authentication successful!');
    console.log('🎯 Tokens saved to:', TOKEN_FILE);
    console.log('');
    console.log('🚀 Your Gmail integration is now ready!');
    console.log('🔧 You can now run your backend server normally.');
    
  } catch (error) {
    console.error('❌ Gmail setup failed:', error.message);
    console.log('');
    console.log('💡 Troubleshooting:');
    console.log('   1. Make sure Gmail API is enabled in Google Cloud Console');
    console.log('   2. Verify your OAuth consent screen is configured');
    console.log('   3. Add your email as a test user');
    console.log('   4. Check that your credentials are correct in .env');
  }
}

setupGmailAuth();