#!/usr/bin/env node

/**
 * GMAIL SETUP USING EXISTING BACKEND SERVER
 * Works with your running backend on port 4000
 */

import { google } from 'googleapis';
import dotenv from 'dotenv';
import fs from 'fs/promises';

// Load environment variables from root directory
dotenv.config({ path: '../../.env' });

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify'
];

const TOKEN_FILE = '.gmail_tokens.json';

console.log('🚀 GMAIL SETUP USING EXISTING BACKEND');
console.log('====================================');

async function setupGmailAuth() {
  try {
    // Check environment variables
    console.log('🔧 Checking environment variables...');
    console.log(`   GMAIL_CLIENT_ID: ${process.env.GMAIL_CLIENT_ID ? 'Set' : 'NOT SET'}`);
    console.log(`   GMAIL_CLIENT_SECRET: ${process.env.GMAIL_CLIENT_SECRET ? 'Set' : 'NOT SET'}`);
    console.log(`   GMAIL_REDIRECT_URI: ${process.env.GMAIL_REDIRECT_URI}`);

    if (!process.env.GMAIL_CLIENT_ID || !process.env.GMAIL_CLIENT_SECRET || !process.env.GMAIL_REDIRECT_URI) {
      console.log('❌ Missing Gmail OAuth credentials in .env file');
      process.exit(1);
    }

    // Check if tokens already exist
    try {
      const existingTokens = await fs.readFile(TOKEN_FILE, 'utf8');
      const tokens = JSON.parse(existingTokens);
      if (tokens.access_token || tokens.refresh_token) {
        console.log('✅ Gmail tokens already exist!');
        
        // Test the existing tokens
        const oauth2Client = new google.auth.OAuth2(
          process.env.GMAIL_CLIENT_ID,
          process.env.GMAIL_CLIENT_SECRET,
          process.env.GMAIL_REDIRECT_URI
        );
        
        oauth2Client.setCredentials(tokens);
        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
        
        try {
          const profile = await gmail.users.getProfile({ userId: 'me' });
          console.log(`🎯 Currently connected to: ${profile.data.emailAddress}`);
          console.log('🚀 Gmail is ready for use!');
          return;
        } catch (error) {
          console.log('⚠️ Existing tokens are expired, setting up fresh authentication...');
        }
      }
    } catch (error) {
      // No existing tokens, continue with setup
    }

    console.log('🔧 Setting up Gmail OAuth client...');
    
    const oauth2Client = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      process.env.GMAIL_REDIRECT_URI
    );

    // Generate auth URL
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES.join(' '),
      response_type: 'code',
      prompt: 'consent',
      include_granted_scopes: true
    });

    console.log('');
    console.log('📋 AUTHENTICATION INSTRUCTIONS:');
    console.log('==============================');
    console.log('1. Your backend server is running on port 4000 ✅');
    console.log('2. Copy the URL below and paste it into your browser');
    console.log('3. Sign in with benjamin@act.place');
    console.log('4. Grant Gmail permissions');
    console.log('5. The callback will be handled by your running backend');
    console.log('6. Check your backend logs for success confirmation');
    console.log('');
    console.log('🔗 AUTHENTICATION URL:');
    console.log('==========================================');
    console.log(authUrl);
    console.log('==========================================');
    console.log('');
    console.log('💡 After authentication, run this script again to verify tokens were saved.');
    console.log('💡 Or check your backend logs and refresh the frontend dashboard.');

  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  }
}

setupGmailAuth();