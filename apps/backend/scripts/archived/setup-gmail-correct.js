#!/usr/bin/env node

/**
 * CORRECTED GMAIL SETUP SCRIPT
 * Uses the actual redirect URI from your .env configuration
 */

import { google } from 'googleapis';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import { createServer } from 'http';
import { parse } from 'url';

// Load environment variables from root directory
dotenv.config({ path: '../../.env' });

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events'
];

const TOKEN_FILE = '.gmail_tokens.json';
const PORT = 4000;

console.log('🚀 CORRECTED GMAIL AUTHENTICATION SETUP');
console.log('=====================================');

async function setupGmailAuth() {
  try {
    // Check environment variables
    console.log('🔧 Checking environment variables...');
    console.log(`   GMAIL_CLIENT_ID: ${process.env.GMAIL_CLIENT_ID ? 'Set' : 'NOT SET'}`);
    console.log(`   GMAIL_CLIENT_SECRET: ${process.env.GMAIL_CLIENT_SECRET ? 'Set' : 'NOT SET'}`);
    console.log(`   GMAIL_REDIRECT_URI: ${process.env.GMAIL_REDIRECT_URI}`);

    if (!process.env.GMAIL_CLIENT_ID || !process.env.GMAIL_CLIENT_SECRET || !process.env.GMAIL_REDIRECT_URI) {
      console.log('❌ Missing Gmail OAuth credentials in .env file');
      console.log('💡 Make sure GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, and GMAIL_REDIRECT_URI are set');
      process.exit(1);
    }

    // Check if tokens already exist
    try {
      const existingTokens = await fs.readFile(TOKEN_FILE, 'utf8');
      const tokens = JSON.parse(existingTokens);
      if (tokens.access_token || tokens.refresh_token) {
        console.log('✅ Gmail tokens already exist!');
        console.log('🎯 Gmail authentication is already set up.');
        
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
    
    // Use the redirect URI from environment variables
    const redirectUri = process.env.GMAIL_REDIRECT_URI;
    console.log(`🔗 Using redirect URI: ${redirectUri}`);
    
    const oauth2Client = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      redirectUri
    );

    // Generate auth URL with explicit parameters
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES.join(' '),
      response_type: 'code',
      prompt: 'consent',
      include_granted_scopes: true
    });

    console.log('🌐 Starting backend server for OAuth callback...');

    // Create temporary server to handle callback at the correct path
    const server = createServer(async (req, res) => {
      const { pathname, query } = parse(req.url, true);
      
      if (pathname === '/api/real-intelligence/auth/callback') {
        try {
          const { code, error } = query;
          
          if (error) {
            console.error('❌ OAuth error:', error);
            res.writeHead(400, { 'Content-Type': 'text/html' });
            res.end(`<h1>❌ Authentication Error</h1><p>${error}</p>`);
            return;
          }
          
          if (!code) {
            res.writeHead(400, { 'Content-Type': 'text/html' });
            res.end('<h1>❌ Error: No authorization code received</h1>');
            return;
          }

          console.log('🔐 Exchanging authorization code for tokens...');
          
          // Exchange code for tokens
          const { tokens } = await oauth2Client.getToken(code);
          
          // Save tokens to file
          await fs.writeFile(TOKEN_FILE, JSON.stringify(tokens, null, 2));
          
          console.log('✅ Gmail tokens saved successfully!');
          
          // Test the tokens
          oauth2Client.setCredentials(tokens);
          const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
          const profile = await gmail.users.getProfile({ userId: 'me' });
          
          console.log(`🎯 Gmail authentication successful for: ${profile.data.emailAddress}`);
          
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`
            <h1>✅ Gmail Authentication Successful!</h1>
            <p><strong>Email:</strong> ${profile.data.emailAddress}</p>
            <p><strong>Status:</strong> Ready for intelligence gathering</p>
            <p><strong>Redirect URI:</strong> ${redirectUri}</p>
            <p>You can now close this window and return to your terminal.</p>
            <script>
              setTimeout(() => {
                window.close();
              }, 5000);
            </script>
          `);
          
          // Close server after successful auth
          setTimeout(() => {
            server.close();
            console.log('🚀 Setup complete! Gmail intelligence is now available.');
            process.exit(0);
          }, 2000);
          
        } catch (error) {
          console.error('❌ Token exchange failed:', error);
          res.writeHead(500, { 'Content-Type': 'text/html' });
          res.end('<h1>❌ Authentication failed</h1><p>' + error.message + '</p>');
        }
      } else {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('<h1>404 Not Found</h1><p>Expected path: /api/real-intelligence/auth/callback</p>');
      }
    });

    server.listen(PORT, () => {
      console.log(`✅ OAuth callback server running on http://localhost:${PORT}`);
      console.log('');
      console.log('📋 NEXT STEPS:');
      console.log('1. Copy the URL below');
      console.log('2. Paste it into your browser');
      console.log('3. Sign in with benjamin@act.place');
      console.log('4. Grant Gmail permissions');
      console.log('5. Wait for automatic completion');
      console.log('');
      console.log('🔗 AUTHENTICATION URL:');
      console.log('==========================================');
      console.log(authUrl);
      console.log('==========================================');
      console.log('');
      console.log('⏳ Waiting for authentication...');
    });

    // Handle process termination
    process.on('SIGINT', () => {
      console.log('\n🛑 Setup cancelled by user');
      server.close();
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  }
}

setupGmailAuth();
