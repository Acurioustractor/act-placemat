#!/usr/bin/env node

/**
 * ONE-TIME GMAIL SETUP SCRIPT
 * Run this once to authenticate Gmail, then never deal with auth again
 */

import { google } from 'googleapis';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { createServer } from 'http';
import { parse } from 'url';

// Load environment variables
dotenv.config({ path: '.env' });

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events'
];

const TOKEN_FILE = '.gmail_tokens.json';
const PORT = 3333;

console.log('🚀 ONE-TIME GMAIL AUTHENTICATION SETUP');
console.log('=====================================');

async function setupGmailAuth() {
  try {
    // Check if tokens already exist
    try {
      const existingTokens = await fs.readFile(TOKEN_FILE, 'utf8');
      const tokens = JSON.parse(existingTokens);
      if (tokens.access_token || tokens.refresh_token) {
        console.log('✅ Gmail tokens already exist!');
        console.log('🎯 Gmail authentication is already set up.');
        console.log('🚀 Your backend can now access Gmail automatically.');
        return;
      }
    } catch (error) {
      // No existing tokens, continue with setup
    }

    console.log('🔧 Setting up Gmail OAuth client...');
    
    const oauth2Client = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      `http://localhost:${PORT}/callback`
    );

    // Generate auth URL
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'consent'
    });

    // Create temporary server to handle callback
    const server = createServer(async (req, res) => {
      const { pathname, query } = parse(req.url, true);
      
      if (pathname === '/callback') {
        try {
          const { code } = query;
          
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
            <p>You can now close this window and return to your terminal.</p>
            <script>
              setTimeout(() => {
                window.close();
              }, 3000);
            </script>
          `);
          
          // Close server after successful auth
          setTimeout(() => {
            server.close();
            console.log('🚀 Setup complete! Gmail intelligence is now available.');
            process.exit(0);
          }, 1000);
          
        } catch (error) {
          console.error('❌ Token exchange failed:', error);
          res.writeHead(500, { 'Content-Type': 'text/html' });
          res.end('<h1>❌ Authentication failed</h1><p>' + error.message + '</p>');
        }
      } else {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('<h1>404 Not Found</h1>');
      }
    });

    server.listen(PORT, () => {
      console.log(`🌐 Temporary auth server running on http://localhost:${PORT}`);
      console.log('');
      console.log('📋 INSTRUCTIONS:');
      console.log('1. Copy the URL below and paste it into your browser');
      console.log('2. Sign in to your Gmail account');
      console.log('3. Grant permissions');
      console.log('4. The window will close automatically');
      console.log('');
      console.log('🔗 AUTH URL:');
      console.log(authUrl);
      console.log('');
      console.log('⏳ Waiting for authentication...');
    });

  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  }
}

setupGmailAuth();
