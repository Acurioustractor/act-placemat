import express from 'express';
import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables from root directory first (for Gmail OAuth)
dotenv.config({ path: path.join(process.cwd(), '.env') });
// Then load backend specific overrides
dotenv.config({ path: path.join(process.cwd(), 'apps/backend/.env') });

const router = express.Router();

// Initialize Gmail OAuth client using backend env vars
const oauth2Client = new google.auth.OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
  'http://localhost:4000/api/gmail/callback'
);

// Store tokens in both .env files (root and backend)
function updateEnvFile(key, value) {
  // Update root .env file  
  const rootEnvPath = path.join(process.cwd(), '.env');
  try {
    let rootEnvContent = fs.readFileSync(rootEnvPath, 'utf8');
    const regex = new RegExp(`^${key}=.*$`, 'm');
    if (regex.test(rootEnvContent)) {
      rootEnvContent = rootEnvContent.replace(regex, `${key}=${value}`);
    } else {
      rootEnvContent += `\n${key}=${value}`;
    }
    fs.writeFileSync(rootEnvPath, rootEnvContent);
  } catch (error) {
    console.warn(`Failed to update root .env: ${error.message}`);
  }
  
  // Update backend .env file
  const backendEnvPath = path.join(process.cwd(), 'apps/backend/.env');
  try {
    let backendEnvContent = fs.readFileSync(backendEnvPath, 'utf8');
    const regex = new RegExp(`^${key}=.*$`, 'm');
    if (regex.test(backendEnvContent)) {
      backendEnvContent = backendEnvContent.replace(regex, `${key}=${value}`);
    } else {
      backendEnvContent += `\n${key}=${value}`;
    }
    fs.writeFileSync(backendEnvPath, backendEnvContent);
  } catch (error) {
    console.warn(`Failed to update backend .env: ${error.message}`);
  }
  
  // Update current process environment
  process.env[key] = value;
}

// Start OAuth flow
router.get('/connect', async (req, res) => {
  try {
    const scopes = [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.metadata'
    ];
    
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent' // Force consent to get refresh token
    });
    
    console.log('🔗 Gmail OAuth URL generated');
    res.json({ 
      url: authUrl,
      message: 'Visit this URL to authorize Gmail access',
      instructions: 'After authorization, you will be redirected back automatically'
    });
  } catch (error) {
    console.error('❌ Gmail OAuth URL generation failed:', error);
    res.status(500).json({ error: 'Failed to generate Gmail authorization URL' });
  }
});

// Handle OAuth callback
router.get('/callback', async (req, res) => {
  try {
    const { code } = req.query;
    
    if (!code) {
      throw new Error('No authorization code received');
    }
    
    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    
    if (!tokens.refresh_token) {
      throw new Error('No refresh token received. Try revoking app access in Google Account settings and re-authorizing.');
    }
    
    // Store tokens in environment
    updateEnvFile('GMAIL_REFRESH_TOKEN', tokens.refresh_token);
    updateEnvFile('GMAIL_ACCESS_TOKEN', tokens.access_token);
    updateEnvFile('GMAIL_DEMO_MODE', 'false');
    
    console.log('✅ Gmail tokens saved successfully');
    
    // Test the connection
    oauth2Client.setCredentials(tokens);
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    const profile = await gmail.users.getProfile({ userId: 'me' });
    
    res.send(`
      <html>
        <body style="font-family: Arial, sans-serif; padding: 40px; text-align: center;">
          <h1 style="color: #28a745;">✅ Gmail Connected Successfully!</h1>
          <p><strong>Email:</strong> ${profile.data.emailAddress}</p>
          <p><strong>Messages:</strong> ${profile.data.messagesTotal?.toLocaleString() || 'N/A'}</p>
          <p>You can now close this window. Gmail intelligence is now available.</p>
          <script>
            setTimeout(() => window.close(), 3000);
          </script>
        </body>
      </html>
    `);
    
  } catch (error) {
    console.error('❌ Gmail OAuth callback failed:', error);
    res.status(500).send(`
      <html>
        <body style="font-family: Arial, sans-serif; padding: 40px; text-align: center;">
          <h1 style="color: #dc3545;">❌ Gmail Connection Failed</h1>
          <p><strong>Error:</strong> ${error.message}</p>
          <p>Please try the authorization process again.</p>
          <a href="/api/gmail/connect" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Retry Authorization</a>
        </body>
      </html>
    `);
  }
});

// Test connection
router.get('/test', async (req, res) => {
  try {
    if (!process.env.GMAIL_REFRESH_TOKEN) {
      return res.status(401).json({ 
        error: 'No Gmail tokens found',
        action: 'Visit /api/gmail/connect to authorize'
      });
    }
    
    // Set up OAuth client with refresh token
    oauth2Client.setCredentials({
      refresh_token: process.env.GMAIL_REFRESH_TOKEN
    });
    
    // Test API call
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    const profile = await gmail.users.getProfile({ userId: 'me' });
    
    // Test a simple search
    const messages = await gmail.users.messages.list({
      userId: 'me',
      maxResults: 5,
      q: 'is:unread'
    });
    
    res.json({
      status: 'connected',
      email: profile.data.emailAddress,
      totalMessages: profile.data.messagesTotal,
      unreadMessages: messages.data.messages?.length || 0,
      message: 'Gmail connection test successful'
    });
    
  } catch (error) {
    console.error('❌ Gmail test failed:', error);
    res.status(500).json({ 
      error: 'Gmail connection test failed',
      details: error.message,
      action: 'Visit /api/gmail/connect to re-authorize'
    });
  }
});

// Get connection status
router.get('/status', async (req, res) => {
  try {
    const hasTokens = !!process.env.GMAIL_REFRESH_TOKEN;
    const demoMode = process.env.GMAIL_DEMO_MODE === 'true';
    
    if (demoMode) {
      return res.json({
        status: 'demo',
        message: 'Gmail is in demo mode',
        action: 'Visit /api/gmail/connect to connect to real Gmail data'
      });
    }
    
    if (!hasTokens) {
      return res.json({
        status: 'disconnected',
        message: 'Gmail not connected',
        action: 'Visit /api/gmail/connect to authorize'
      });
    }
    
    // Try to use refresh token to verify it's valid
    try {
      oauth2Client.setCredentials({
        refresh_token: process.env.GMAIL_REFRESH_TOKEN
      });
      
      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
      const profile = await gmail.users.getProfile({ userId: 'me' });
      
      res.json({
        status: 'connected',
        email: profile.data.emailAddress,
        message: 'Gmail connected and tokens valid'
      });
      
    } catch (tokenError) {
      res.json({
        status: 'token_expired',
        message: 'Gmail tokens have expired',
        action: 'Visit /api/gmail/connect to re-authorize'
      });
    }
    
  } catch (error) {
    res.status(500).json({ 
      status: 'error',
      error: error.message 
    });
  }
});

export default router;