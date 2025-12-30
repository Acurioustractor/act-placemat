/**
 * Gmail OAuth Token Manager
 * Manages multiple OAuth 2.0 tokens for scanning multiple Google Workspace accounts
 *
 * Instead of using service account keys (blocked by org policy), we use
 * individual OAuth tokens for each email account that needs scanning.
 *
 * Token Storage Structure:
 * .gmail_tokens/
 *   ├── ben.knight.au@gmail.com.json
 *   ├── nicholas@act.place.json
 *   ├── hi@act.place.json
 *   └── accounts@act.place.json
 */

import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class GmailTokenManager {
  constructor() {
    // OAuth2 credentials from environment or default paths
    this.credentialsPath = process.env.GMAIL_CREDENTIALS_PATH ||
      path.join(__dirname, '../../.gmail_credentials.json');

    // Token storage directory
    this.tokenDir = process.env.GMAIL_TOKEN_DIR ||
      path.join(__dirname, '../../.gmail_tokens');

    // Ensure token directory exists
    this.ensureTokenDirectory();

    // OAuth2 client cache
    this.oauth2Clients = new Map();
  }

  /**
   * Ensure the token directory exists
   */
  ensureTokenDirectory() {
    if (!fs.existsSync(this.tokenDir)) {
      fs.mkdirSync(this.tokenDir, { recursive: true });
      console.log(`[Token Manager] Created token directory: ${this.tokenDir}`);
    }
  }

  /**
   * Get OAuth2 credentials from file
   */
  getCredentials() {
    if (!fs.existsSync(this.credentialsPath)) {
      throw new Error(
        `Gmail credentials file not found at ${this.credentialsPath}. ` +
        `Please download OAuth 2.0 credentials from Google Cloud Console.`
      );
    }

    const credentials = JSON.parse(fs.readFileSync(this.credentialsPath, 'utf-8'));

    // Handle both "installed" and "web" application types
    const creds = credentials.installed || credentials.web;

    if (!creds) {
      throw new Error(
        'Invalid credentials file format. Expected "installed" or "web" application credentials.'
      );
    }

    return creds;
  }

  /**
   * Create OAuth2 client for a specific account
   */
  createOAuth2Client(accountEmail = null) {
    const credentials = this.getCredentials();

    const oauth2Client = new google.auth.OAuth2(
      credentials.client_id,
      credentials.client_secret,
      credentials.redirect_uris[0]
    );

    // If account email provided, try to load existing token
    if (accountEmail) {
      const token = this.getToken(accountEmail);
      if (token) {
        oauth2Client.setCredentials(token);

        // Set up automatic token refresh
        oauth2Client.on('tokens', (tokens) => {
          this.saveToken(accountEmail, tokens);
          console.log(`[Token Manager] Refreshed token for ${accountEmail}`);
        });
      }
    }

    return oauth2Client;
  }

  /**
   * Get token file path for an account
   */
  getTokenPath(accountEmail) {
    // Sanitize email for filesystem (replace @ with _at_, remove special chars)
    const sanitized = accountEmail.replace('@', '_at_').replace(/[^a-zA-Z0-9._-]/g, '_');
    return path.join(this.tokenDir, `${sanitized}.json`);
  }

  /**
   * Check if token exists for an account
   */
  hasToken(accountEmail) {
    const tokenPath = this.getTokenPath(accountEmail);
    return fs.existsSync(tokenPath);
  }

  /**
   * Get token for an account
   */
  getToken(accountEmail) {
    const tokenPath = this.getTokenPath(accountEmail);

    if (!fs.existsSync(tokenPath)) {
      return null;
    }

    try {
      const token = JSON.parse(fs.readFileSync(tokenPath, 'utf-8'));
      return token;
    } catch (error) {
      console.error(`[Token Manager] Error reading token for ${accountEmail}:`, error.message);
      return null;
    }
  }

  /**
   * Save token for an account
   */
  saveToken(accountEmail, token) {
    const tokenPath = this.getTokenPath(accountEmail);

    // If token is partial (refresh response), merge with existing token
    const existingToken = this.getToken(accountEmail);
    const fullToken = existingToken ? { ...existingToken, ...token } : token;

    fs.writeFileSync(tokenPath, JSON.stringify(fullToken, null, 2));

    // Set secure permissions (owner read/write only)
    fs.chmodSync(tokenPath, 0o600);

    console.log(`[Token Manager] Saved token for ${accountEmail}`);
  }

  /**
   * Delete token for an account
   */
  deleteToken(accountEmail) {
    const tokenPath = this.getTokenPath(accountEmail);

    if (fs.existsSync(tokenPath)) {
      fs.unlinkSync(tokenPath);
      console.log(`[Token Manager] Deleted token for ${accountEmail}`);
      return true;
    }

    return false;
  }

  /**
   * List all accounts with saved tokens
   */
  listAccounts() {
    if (!fs.existsSync(this.tokenDir)) {
      return [];
    }

    const files = fs.readdirSync(this.tokenDir);

    return files
      .filter(f => f.endsWith('.json'))
      .map(f => {
        // Reverse sanitization (convert _at_ back to @)
        const email = f
          .replace('.json', '')
          .replace('_at_', '@');

        return {
          email,
          tokenPath: path.join(this.tokenDir, f),
          hasToken: true
        };
      });
  }

  /**
   * Get authenticated Gmail client for an account
   */
  async getGmailClient(accountEmail) {
    // Check cache first
    if (this.oauth2Clients.has(accountEmail)) {
      return this.oauth2Clients.get(accountEmail);
    }

    // Create new OAuth2 client with token
    const oauth2Client = this.createOAuth2Client(accountEmail);

    if (!oauth2Client.credentials || !oauth2Client.credentials.access_token) {
      throw new Error(
        `No token found for ${accountEmail}. ` +
        `Run: node authorize-account.js ${accountEmail}`
      );
    }

    // Create Gmail client
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Cache the client
    this.oauth2Clients.set(accountEmail, gmail);

    return gmail;
  }

  /**
   * Validate all tokens (check if they're still valid)
   */
  async validateAllTokens() {
    const accounts = this.listAccounts();
    const results = [];

    for (const account of accounts) {
      try {
        const gmail = await this.getGmailClient(account.email);

        // Try a simple API call to verify token works
        await gmail.users.getProfile({ userId: 'me' });

        results.push({
          email: account.email,
          valid: true,
          error: null
        });

        console.log(`[Token Manager] ✓ Token valid for ${account.email}`);
      } catch (error) {
        results.push({
          email: account.email,
          valid: false,
          error: error.message
        });

        console.error(`[Token Manager] ✗ Token invalid for ${account.email}:`, error.message);
      }
    }

    return results;
  }

  /**
   * Generate authorization URL for an account
   */
  generateAuthUrl(accountEmail, scopes = ['https://www.googleapis.com/auth/gmail.readonly']) {
    const oauth2Client = this.createOAuth2Client();

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent', // Force consent screen to ensure we get refresh token
      login_hint: accountEmail // Pre-fill the email in Google's login screen
    });

    return authUrl;
  }

  /**
   * Exchange authorization code for tokens
   */
  async getTokenFromCode(accountEmail, code) {
    const oauth2Client = this.createOAuth2Client();

    try {
      const { tokens } = await oauth2Client.getToken(code);
      this.saveToken(accountEmail, tokens);

      return tokens;
    } catch (error) {
      throw new Error(`Failed to exchange code for token: ${error.message}`);
    }
  }

  /**
   * Migrate from old single-token format to multi-token directory
   * (Handles transition from .gmail_tokens.json to .gmail_tokens/)
   */
  migrateOldTokenFormat() {
    const oldTokenPath = path.join(__dirname, '../../.gmail_tokens.json');

    if (!fs.existsSync(oldTokenPath)) {
      return { migrated: false, reason: 'No old token file found' };
    }

    try {
      const oldToken = JSON.parse(fs.readFileSync(oldTokenPath, 'utf-8'));

      // Assume old token was for ben.knight.au@gmail.com
      const defaultEmail = process.env.GMAIL_USER_EMAIL || 'ben.knight.au@gmail.com';

      this.saveToken(defaultEmail, oldToken);

      // Rename old file (don't delete, for safety)
      fs.renameSync(oldTokenPath, `${oldTokenPath}.backup`);

      console.log(`[Token Manager] Migrated old token to ${defaultEmail}`);

      return {
        migrated: true,
        email: defaultEmail,
        backupPath: `${oldTokenPath}.backup`
      };
    } catch (error) {
      console.error('[Token Manager] Migration failed:', error.message);
      return { migrated: false, reason: error.message };
    }
  }
}

/**
 * R&D Tax Metadata
 */
export const RD_METADATA = {
  component: 'Gmail OAuth Token Manager',
  hypothesis: 'Multi-token OAuth 2.0 approach can achieve same multi-account scanning capability as service account with better security compliance',
  methodology: 'Token storage isolation, automatic refresh handling, graceful fallback mechanisms',
  technicalUncertainty: 'Token refresh reliability across multiple concurrent Gmail API clients, race conditions in token updates',
  successMetric: '100% token refresh success rate over 30-day period, zero manual re-authorization required',
  estimatedHours: 3,
  findings: 'To be updated after production testing'
};

export default GmailTokenManager;
