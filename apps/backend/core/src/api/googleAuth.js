/**
 * Google OAuth2 Authentication
 * Handles Gmail and Google Calendar OAuth flow
 */

import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Store tokens in a file (in production, use a database)
const TOKEN_PATH = path.join(__dirname, '../../../google-tokens.json');

export default function googleAuthRoutes(app) {

  /**
   * GET /api/google/auth
   * Start the OAuth flow - generates the authorization URL
   */
  app.get('/api/google/auth', (req, res) => {
    try {
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CALENDAR_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_CALENDAR_CLIENT_SECRET,
        process.env.GOOGLE_CALENDAR_REDIRECT_URI || 'http://localhost:4000/api/google/callback'
      );

      const SCOPES = [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/calendar.readonly',
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email'
      ];

      const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
        prompt: 'consent' // Force to get refresh token
      });

      console.log('📧 Google OAuth: Generated auth URL');

      // Return JSON with the auth URL
      res.json({
        success: true,
        authUrl,
        message: 'Visit this URL to authorize access to Gmail and Calendar'
      });

    } catch (error) {
      console.error('❌ Google OAuth error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate auth URL',
        message: error.message
      });
    }
  });

  /**
   * GET /api/google/callback
   * OAuth callback - exchanges code for tokens
   */
  app.get('/api/google/callback', async (req, res) => {
    try {
      const { code } = req.query;

      if (!code) {
        return res.status(400).json({
          success: false,
          error: 'No authorization code provided'
        });
      }

      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CALENDAR_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_CALENDAR_CLIENT_SECRET,
        process.env.GOOGLE_CALENDAR_REDIRECT_URI || 'http://localhost:4000/api/google/callback'
      );

      // Exchange code for tokens
      const { tokens } = await oauth2Client.getToken(code);

      console.log('✅ Google OAuth: Received tokens');
      console.log('   Access Token:', tokens.access_token?.substring(0, 20) + '...');
      console.log('   Refresh Token:', tokens.refresh_token ? 'Yes' : 'No');
      console.log('   Expiry:', new Date(tokens.expiry_date).toISOString());

      // Save tokens to file
      const tokenData = {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expiry_date: tokens.expiry_date,
        token_type: tokens.token_type,
        scope: tokens.scope,
        updated_at: new Date().toISOString()
      };

      fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokenData, null, 2));
      console.log('💾 Tokens saved to:', TOKEN_PATH);

      // Get user info
      oauth2Client.setCredentials(tokens);
      const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
      const userInfo = await oauth2.userinfo.get();

      // Return success page with instructions
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Google OAuth Success</title>
          <style>
            body {
              font-family: system-ui, -apple-system, sans-serif;
              max-width: 600px;
              margin: 50px auto;
              padding: 20px;
              background: #f5f5f5;
            }
            .card {
              background: white;
              padding: 30px;
              border-radius: 12px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .success {
              color: #22c55e;
              font-size: 48px;
              text-align: center;
            }
            h1 {
              color: #1f2937;
              margin-top: 20px;
            }
            code {
              background: #f3f4f6;
              padding: 2px 6px;
              border-radius: 4px;
              font-size: 14px;
            }
            .token-box {
              background: #f9fafb;
              border: 1px solid #e5e7eb;
              padding: 15px;
              border-radius: 8px;
              margin: 20px 0;
              font-size: 12px;
              word-break: break-all;
            }
            .user-info {
              background: #eff6ff;
              border-left: 4px solid #3b82f6;
              padding: 15px;
              margin: 20px 0;
              border-radius: 4px;
            }
            .instructions {
              background: #fef3c7;
              border-left: 4px solid #f59e0b;
              padding: 15px;
              margin: 20px 0;
              border-radius: 4px;
            }
            button {
              background: #3b82f6;
              color: white;
              border: none;
              padding: 12px 24px;
              border-radius: 6px;
              cursor: pointer;
              font-size: 16px;
              margin-top: 20px;
            }
            button:hover {
              background: #2563eb;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="success">✅</div>
            <h1>Authentication Successful!</h1>

            <div class="user-info">
              <strong>Authenticated as:</strong><br>
              ${userInfo.data.name} (${userInfo.data.email})
            </div>

            <div class="instructions">
              <strong>⚠️ Important:</strong> Add these to your <code>.env</code> file:
            </div>

            <div class="token-box">
              <strong>Access Token:</strong><br>
              <code>GOOGLE_ACCESS_TOKEN=${tokens.access_token}</code><br><br>

              ${tokens.refresh_token ? `<strong>Refresh Token:</strong><br>
              <code>GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}</code><br><br>` : ''}

              <strong>Expiry Date:</strong><br>
              ${new Date(tokens.expiry_date).toLocaleString()}
            </div>

            <p>
              <strong>Tokens have been saved to:</strong><br>
              <code>${TOKEN_PATH}</code>
            </p>

            <p>
              Your application can now access:
            </p>
            <ul>
              <li>📧 Gmail (read-only)</li>
              <li>📅 Google Calendar (read-only)</li>
            </ul>

            <button onclick="window.location.href='http://localhost:5176/?tab=projects'">
              Go to Projects Dashboard
            </button>
          </div>
        </body>
        </html>
      `);

    } catch (error) {
      console.error('❌ Google OAuth callback error:', error);
      res.status(500).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>OAuth Error</title>
          <style>
            body {
              font-family: system-ui, -apple-system, sans-serif;
              max-width: 600px;
              margin: 50px auto;
              padding: 20px;
              background: #f5f5f5;
            }
            .card {
              background: white;
              padding: 30px;
              border-radius: 12px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .error {
              color: #ef4444;
              font-size: 48px;
              text-align: center;
            }
            h1 {
              color: #1f2937;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="error">❌</div>
            <h1>Authentication Failed</h1>
            <p><strong>Error:</strong> ${error.message}</p>
            <p>Please try again or check your Google OAuth credentials.</p>
            <a href="/api/google/auth">← Try Again</a>
          </div>
        </body>
        </html>
      `);
    }
  });

  /**
   * GET /api/google/status
   * Check authentication status
   */
  app.get('/api/google/status', (req, res) => {
    try {
      let tokens = null;
      let fileExists = false;

      // Check if token file exists
      if (fs.existsSync(TOKEN_PATH)) {
        fileExists = true;
        tokens = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
      }

      // Check env variables
      const hasEnvTokens = !!(process.env.GOOGLE_ACCESS_TOKEN || process.env.GOOGLE_REFRESH_TOKEN);

      const isExpired = tokens?.expiry_date ? new Date(tokens.expiry_date) < new Date() : true;

      res.json({
        authenticated: fileExists || hasEnvTokens,
        tokenFile: {
          exists: fileExists,
          path: TOKEN_PATH,
          expired: isExpired,
          expiresAt: tokens?.expiry_date ? new Date(tokens.expiry_date).toISOString() : null
        },
        envVars: {
          hasAccessToken: !!process.env.GOOGLE_ACCESS_TOKEN,
          hasRefreshToken: !!process.env.GOOGLE_REFRESH_TOKEN,
          hasClientId: !!process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CALENDAR_CLIENT_ID,
          hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_CALENDAR_CLIENT_SECRET
        },
        scopes: tokens?.scope ? tokens.scope.split(' ') : []
      });

    } catch (error) {
      res.status(500).json({
        authenticated: false,
        error: error.message
      });
    }
  });

  /**
   * POST /api/google/refresh
   * Manually refresh the access token
   */
  app.post('/api/google/refresh', async (req, res) => {
    try {
      if (!fs.existsSync(TOKEN_PATH)) {
        return res.status(404).json({
          success: false,
          error: 'No tokens found. Please authenticate first.'
        });
      }

      const tokens = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));

      if (!tokens.refresh_token) {
        return res.status(400).json({
          success: false,
          error: 'No refresh token available. Please re-authenticate with prompt=consent.'
        });
      }

      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CALENDAR_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_CALENDAR_CLIENT_SECRET,
        process.env.GOOGLE_CALENDAR_REDIRECT_URI || 'http://localhost:4000/api/google/callback'
      );

      oauth2Client.setCredentials({
        refresh_token: tokens.refresh_token
      });

      // Refresh the token
      const { credentials } = await oauth2Client.refreshAccessToken();

      // Update and save tokens
      const newTokens = {
        ...tokens,
        access_token: credentials.access_token,
        expiry_date: credentials.expiry_date,
        updated_at: new Date().toISOString()
      };

      fs.writeFileSync(TOKEN_PATH, JSON.stringify(newTokens, null, 2));

      console.log('✅ Google OAuth: Token refreshed successfully');

      res.json({
        success: true,
        message: 'Token refreshed successfully',
        expiresAt: new Date(credentials.expiry_date).toISOString()
      });

    } catch (error) {
      console.error('❌ Token refresh error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to refresh token',
        message: error.message
      });
    }
  });
}
