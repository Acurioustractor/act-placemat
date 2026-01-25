/**
 * Workspace Gmail Service - Multi-Account Email Intelligence
 *
 * Accesses multiple Gmail accounts across ACT workspace:
 * - nicholas@act.place
 * - hi@act.place
 * - accounts@act.place
 * - benjamin@act.place
 *
 * Two authentication methods:
 * 1. Service Account with Domain-Wide Delegation (preferred - no token expiry)
 * 2. OAuth per-account tokens (fallback)
 */

import { google } from 'googleapis';
import { logger } from '../utils/logger.js';
import fs from 'fs';
import path from 'path';

class WorkspaceGmailService {
  constructor() {
    this.accounts = [];
    this.gmailClients = new Map(); // email -> gmail client
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Initialize all workspace accounts
   */
  async initialize() {
    // Get workspace accounts from env
    const accountsEnv = process.env.GOOGLE_WORKSPACE_ACCOUNTS || '';
    this.accounts = accountsEnv.split(',').map(a => a.trim()).filter(Boolean);

    if (this.accounts.length === 0) {
      logger.warn('No workspace accounts configured. Set GOOGLE_WORKSPACE_ACCOUNTS in .env');
      return { success: false, accounts: [] };
    }

    logger.info(`Initializing ${this.accounts.length} workspace Gmail accounts...`);

    const results = [];

    // Try service account first (best for multi-account)
    let serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

    // Also check for file-based service account
    if (!serviceAccountKey) {
      try {
        const keyPath = path.join(process.cwd(), 'apps/backend/subscription-tracker/config/service-account.json');
        if (fs.existsSync(keyPath)) {
          serviceAccountKey = fs.readFileSync(keyPath, 'utf8');
          logger.info('Loaded service account from file:', keyPath);
        }
      } catch (err) {
        logger.error('Failed to load service account file:', err.message);
      }
    }

    if (serviceAccountKey) {
      // Service account with domain-wide delegation
      for (const email of this.accounts) {
        try {
          const client = await this.createServiceAccountClient(email, serviceAccountKey);
          this.gmailClients.set(email, client);
          results.push({ email, status: 'connected', method: 'service_account' });
          logger.info(`Connected to ${email} via service account`);
        } catch (error) {
          results.push({ email, status: 'failed', error: error.message });
          logger.error(`Failed to connect ${email}: ${error.message}`);
        }
      }
    } else {
      // Fall back to OAuth - use shared tokens
      const accessToken = process.env.GOOGLE_ACCESS_TOKEN;
      const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

      if (accessToken && refreshToken) {
        // OAuth only works for the account that authorized it
        // We'll use the primary account (benjamin@act.place)
        const primaryEmail = this.accounts.find(a => a.includes('benjamin')) || this.accounts[0];

        try {
          const client = await this.createOAuthClient(primaryEmail, accessToken, refreshToken);
          this.gmailClients.set(primaryEmail, client);
          results.push({ email: primaryEmail, status: 'connected', method: 'oauth' });
          logger.info(`Connected to ${primaryEmail} via OAuth`);

          // Mark others as requiring auth
          for (const email of this.accounts) {
            if (email !== primaryEmail) {
              results.push({ email, status: 'requires_auth', method: 'oauth_needed' });
            }
          }
        } catch (error) {
          results.push({ email: 'primary', status: 'failed', error: error.message });
        }
      } else {
        logger.warn('No authentication configured for Gmail');
        for (const email of this.accounts) {
          results.push({ email, status: 'not_configured' });
        }
      }
    }

    return {
      success: results.some(r => r.status === 'connected'),
      accounts: results
    };
  }

  /**
   * Create Gmail client using service account with impersonation
   */
  async createServiceAccountClient(userEmail, keyJson) {
    const credentials = typeof keyJson === 'string' ? JSON.parse(keyJson) : keyJson;

    const auth = new google.auth.JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: [
        'https://www.googleapis.com/auth/gmail.readonly',
      ],
      subject: userEmail, // Impersonate this user
    });

    await auth.authorize();
    const gmail = google.gmail({ version: 'v1', auth });

    // Test connection
    const profile = await gmail.users.getProfile({ userId: 'me' });
    if (profile.data.emailAddress !== userEmail) {
      throw new Error(`Impersonation mismatch: expected ${userEmail}, got ${profile.data.emailAddress}`);
    }

    return gmail;
  }

  /**
   * Create Gmail client using OAuth tokens
   */
  async createOAuthClient(userEmail, accessToken, refreshToken) {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CALENDAR_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_CALENDAR_CLIENT_SECRET
    );

    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken
    });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Test connection
    const profile = await gmail.users.getProfile({ userId: 'me' });
    logger.info(`OAuth connected to: ${profile.data.emailAddress}`);

    return gmail;
  }

  /**
   * Get Gmail client for specific account
   */
  getClient(email) {
    if (!email) {
      // Return first available client
      const [firstClient] = this.gmailClients.values();
      return firstClient;
    }
    return this.gmailClients.get(email);
  }

  /**
   * Get all connected accounts
   */
  getConnectedAccounts() {
    return Array.from(this.gmailClients.keys());
  }

  /**
   * Search emails across all connected accounts
   */
  async searchAllAccounts(query, options = {}) {
    const { maxResults = 20, timeframe = '30d' } = options;
    const allResults = [];

    for (const [email, gmail] of this.gmailClients) {
      try {
        const fullQuery = `${query} newer_than:${timeframe}`;

        const response = await gmail.users.messages.list({
          userId: 'me',
          q: fullQuery,
          maxResults
        });

        const messages = response.data.messages || [];

        // Get details for each message
        const details = await Promise.all(
          messages.slice(0, Math.min(10, maxResults)).map(async (msg) => {
            const detail = await gmail.users.messages.get({
              userId: 'me',
              id: msg.id,
              format: 'metadata',
              metadataHeaders: ['From', 'To', 'Subject', 'Date']
            });

            const headers = detail.data.payload.headers;
            return {
              id: msg.id,
              account: email,
              from: this.getHeader(headers, 'From'),
              to: this.getHeader(headers, 'To'),
              subject: this.getHeader(headers, 'Subject'),
              date: new Date(parseInt(detail.data.internalDate)),
              snippet: detail.data.snippet
            };
          })
        );

        allResults.push(...details);
      } catch (error) {
        logger.error(`Error searching ${email}: ${error.message}`);
      }
    }

    // Sort by date, newest first
    return allResults.sort((a, b) => b.date - a.date);
  }

  /**
   * Get email statistics across all accounts
   */
  async getOrganizationStats(timeframeDays = 7) {
    const stats = {
      accounts: [],
      totals: {
        received: 0,
        sent: 0,
        unread: 0,
        threads: 0
      },
      topSenders: new Map(),
      topRecipients: new Map(),
      dailyVolume: {}
    };

    for (const [email, gmail] of this.gmailClients) {
      try {
        // Get inbox stats
        const inboxResponse = await gmail.users.messages.list({
          userId: 'me',
          q: `newer_than:${timeframeDays}d in:inbox`,
          maxResults: 100
        });

        // Get sent stats
        const sentResponse = await gmail.users.messages.list({
          userId: 'me',
          q: `newer_than:${timeframeDays}d in:sent`,
          maxResults: 100
        });

        // Get unread count
        const unreadResponse = await gmail.users.messages.list({
          userId: 'me',
          q: `newer_than:${timeframeDays}d is:unread in:inbox`,
          maxResults: 100
        });

        const accountStats = {
          email,
          received: inboxResponse.data.resultSizeEstimate || 0,
          sent: sentResponse.data.resultSizeEstimate || 0,
          unread: unreadResponse.data.resultSizeEstimate || 0
        };

        stats.accounts.push(accountStats);
        stats.totals.received += accountStats.received;
        stats.totals.sent += accountStats.sent;
        stats.totals.unread += accountStats.unread;

      } catch (error) {
        logger.error(`Error getting stats for ${email}: ${error.message}`);
        stats.accounts.push({
          email,
          error: error.message
        });
      }
    }

    return stats;
  }

  /**
   * Get recent emails for morning brief
   */
  async getMorningBriefEmails(options = {}) {
    const { hours = 24, maxPerAccount = 10 } = options;
    const emails = [];

    for (const [email, gmail] of this.gmailClients) {
      try {
        const response = await gmail.users.messages.list({
          userId: 'me',
          q: `newer_than:1d -category:promotions -category:social`,
          maxResults: maxPerAccount
        });

        const messages = response.data.messages || [];

        for (const msg of messages.slice(0, maxPerAccount)) {
          const detail = await gmail.users.messages.get({
            userId: 'me',
            id: msg.id,
            format: 'metadata',
            metadataHeaders: ['From', 'To', 'Subject', 'Date']
          });

          const headers = detail.data.payload.headers;
          const from = this.getHeader(headers, 'From');

          // Skip newsletters and automated emails
          if (this.isAutomatedEmail(from)) continue;

          emails.push({
            id: msg.id,
            account: email,
            from,
            to: this.getHeader(headers, 'To'),
            subject: this.getHeader(headers, 'Subject'),
            date: new Date(parseInt(detail.data.internalDate)),
            snippet: detail.data.snippet,
            labels: detail.data.labelIds || [],
            isUnread: detail.data.labelIds?.includes('UNREAD')
          });
        }
      } catch (error) {
        logger.error(`Error getting brief emails for ${email}: ${error.message}`);
      }
    }

    // Sort by date and return
    return emails
      .sort((a, b) => b.date - a.date)
      .slice(0, 25); // Top 25 most recent
  }

  /**
   * Find emails related to a contact
   */
  async getContactEmails(contactEmail, options = {}) {
    const { maxResults = 20, timeframeDays = 90 } = options;
    const emails = [];

    for (const [account, gmail] of this.gmailClients) {
      try {
        const response = await gmail.users.messages.list({
          userId: 'me',
          q: `from:${contactEmail} OR to:${contactEmail} newer_than:${timeframeDays}d`,
          maxResults
        });

        const messages = response.data.messages || [];

        for (const msg of messages) {
          const detail = await gmail.users.messages.get({
            userId: 'me',
            id: msg.id,
            format: 'metadata',
            metadataHeaders: ['From', 'To', 'Subject', 'Date']
          });

          const headers = detail.data.payload.headers;
          emails.push({
            id: msg.id,
            account,
            from: this.getHeader(headers, 'From'),
            to: this.getHeader(headers, 'To'),
            subject: this.getHeader(headers, 'Subject'),
            date: new Date(parseInt(detail.data.internalDate)),
            snippet: detail.data.snippet,
            threadId: detail.data.threadId
          });
        }
      } catch (error) {
        logger.error(`Error searching contact emails in ${account}: ${error.message}`);
      }
    }

    return emails.sort((a, b) => b.date - a.date);
  }

  /**
   * Helper: Get header value
   */
  getHeader(headers, name) {
    const header = headers?.find(h => h.name.toLowerCase() === name.toLowerCase());
    return header?.value || null;
  }

  /**
   * Helper: Check if email is automated/newsletter
   */
  isAutomatedEmail(from) {
    if (!from) return true;
    const automated = [
      'noreply', 'no-reply', 'donotreply', 'notification', 'newsletter',
      'updates@', 'marketing@', 'info@', 'support@', 'hello@'
    ];
    const lowerFrom = from.toLowerCase();
    return automated.some(pattern => lowerFrom.includes(pattern));
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      configured: this.accounts.length > 0,
      accounts: this.accounts,
      connected: this.getConnectedAccounts(),
      connectionCount: this.gmailClients.size
    };
  }
}

// Singleton instance
const workspaceGmailService = new WorkspaceGmailService();
export default workspaceGmailService;
