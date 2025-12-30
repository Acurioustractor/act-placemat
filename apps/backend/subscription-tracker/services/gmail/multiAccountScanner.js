/**
 * Multi-Account Gmail Scanner (Service Account Edition)
 *
 * R&D Component: Google Workspace Domain-Wide Delegation for Multi-Account Scanning
 * Hypothesis: Service account impersonation achieves <30% overhead vs single-account scanning
 *             while enabling parallel scanning of multiple @act.place email accounts
 * Methodology: Use Google Workspace service account with domain-wide delegation to
 *              impersonate users (nicholas@, hi@, accounts@), scan in parallel,
 *              deduplicate messages, track source account
 * Success Metric: Scan time <= 45s for 3 accounts, deduplication rate >= 95%
 * Findings: TBD after testing
 */

import { google } from 'googleapis';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import config from '../../config/settings.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class MultiAccountScanner {
  constructor() {
    this.serviceAccountPath = join(
      __dirname,
      '../../',
      config.gmail.multiAccount.serviceAccountPath
    );
    this.accounts = config.gmail.multiAccount.accounts;
    this.domain = config.gmail.multiAccount.domain;
    this.scopes = ['https://www.googleapis.com/auth/gmail.readonly'];

    console.log('[Multi-Account] Initialized with accounts:', this.accounts);
  }

  /**
   * R&D Method: Parallel multi-account Gmail scanning
   * Hypothesis: Parallel scanning reduces total time vs sequential
   * Target: Process 3 accounts in <= 45s (vs ~60s sequential)
   */
  async scanAllAccounts(options = {}) {
    const { maxResults = 100, timeframe = '1y' } = options;
    const startTime = Date.now();

    console.log('[Multi-Account] Starting parallel scan of', this.accounts.length, 'accounts');

    // Check if service account file exists
    if (!existsSync(this.serviceAccountPath)) {
      console.warn('[Multi-Account] Service account file not found at:', this.serviceAccountPath);
      console.warn('[Multi-Account] Multi-account scanning disabled. Use single-account fallback.');
      return null; // Signal to fall back to single-account
    }

    try {
      // Scan each account in parallel
      const scanPromises = this.accounts.map(async (email) => {
        try {
          const gmail = await this.getGmailClient(email);
          const messages = await this.scanAccount(gmail, email, { maxResults, timeframe });
          return messages.map(msg => ({ ...msg, accountEmail: email }));
        } catch (error) {
          console.error(`[Multi-Account] Error scanning ${email}:`, error.message);

          // Check if it's a domain-wide delegation error
          if (error.message.includes('Not Authorized') ||
              error.message.includes('unauthorized_client') ||
              error.message.includes('domain-wide delegation')) {
            console.error('[Multi-Account] Domain-wide delegation not configured!');
            console.error('[Multi-Account] Please configure in Google Workspace Admin Console:');
            console.error('[Multi-Account]   1. Go to admin.google.com');
            console.error('[Multi-Account]   2. Security → API Controls → Domain-wide Delegation');
            console.error('[Multi-Account]   3. Add Client ID with scope: https://www.googleapis.com/auth/gmail.readonly');
          }

          return [];
        }
      });

      const results = await Promise.all(scanPromises);
      const allMessages = results.flat();

      // Deduplicate by message ID (cross-account)
      const uniqueMessages = [...new Map(
        allMessages.map(m => [m.id, m])
      ).values()];

      const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(1);
      const deduplicationRate = allMessages.length > 0
        ? ((1 - (uniqueMessages.length / allMessages.length)) * 100).toFixed(1)
        : 0;

      console.log(`[Multi-Account] Scan complete in ${elapsedTime}s`);
      console.log(`[Multi-Account] Total messages: ${allMessages.length}, Unique: ${uniqueMessages.length}`);
      console.log(`[Multi-Account] Deduplication rate: ${deduplicationRate}%`);

      // R&D Metrics
      console.log('[R&D] Multi-Account Scan Metrics:', {
        accounts: this.accounts.length,
        totalMessages: allMessages.length,
        uniqueMessages: uniqueMessages.length,
        deduplicationRate: `${deduplicationRate}%`,
        scanTime: `${elapsedTime}s`,
        meetsTarget: parseFloat(elapsedTime) <= 45
      });

      return uniqueMessages;
    } catch (error) {
      console.error('[Multi-Account] Fatal error during scan:', error);
      return null; // Signal to fall back to single-account
    }
  }

  /**
   * Create authenticated Gmail client for specific user via impersonation
   * Uses service account with domain-wide delegation
   */
  async getGmailClient(userEmail) {
    try {
      const credentials = JSON.parse(readFileSync(this.serviceAccountPath, 'utf8'));

      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: this.scopes,
        subject: userEmail  // Impersonate this user
      });

      const authClient = await auth.getClient();
      return google.gmail({ version: 'v1', auth: authClient });
    } catch (error) {
      console.error(`[Multi-Account] Failed to authenticate as ${userEmail}:`, error.message);
      throw error;
    }
  }

  /**
   * Scan a single Gmail account for subscription receipts
   */
  async scanAccount(gmail, email, options) {
    const { maxResults, timeframe } = options;

    const queries = [
      `(subscription OR recurring) AND (receipt OR invoice)`,
      `"auto-renew" OR "renewal notice"`,
      `subject:billing after:${this.getDateString(timeframe)}`
    ];

    const messages = [];

    for (const query of queries) {
      try {
        const response = await gmail.users.messages.list({
          userId: 'me',
          q: query,
          maxResults
        });

        if (response.data.messages && response.data.messages.length > 0) {
          // Fetch full message details in batches to avoid rate limits
          const batchSize = 10;
          for (let i = 0; i < response.data.messages.length; i += batchSize) {
            const batch = response.data.messages.slice(i, i + batchSize);

            const fullMessages = await Promise.all(
              batch.map(async (msg) => {
                try {
                  const details = await gmail.users.messages.get({
                    userId: 'me',
                    id: msg.id,
                    format: 'metadata',
                    metadataHeaders: ['From', 'Subject', 'Date']
                  });
                  return details.data;
                } catch (error) {
                  console.error(`[Multi-Account] Error fetching message ${msg.id}:`, error.message);
                  return null;
                }
              })
            );

            messages.push(...fullMessages.filter(m => m !== null));
          }
        }
      } catch (error) {
        console.error(`[Multi-Account] Error with query "${query}" for ${email}:`, error.message);
      }
    }

    // Deduplicate within account
    const unique = [...new Map(messages.map(m => [m.id, m])).values()];

    console.log(`[Multi-Account] Found ${unique.length} unique messages in ${email}`);
    return unique;
  }

  /**
   * Convert timeframe string to Gmail date format
   */
  getDateString(timeframe) {
    const match = timeframe.match(/(\d+)([mdy])/);
    if (!match) return new Date().toISOString().split('T')[0];

    const [, num, unit] = match;
    const date = new Date();

    if (unit === 'm') date.setMonth(date.getMonth() - parseInt(num));
    if (unit === 'd') date.setDate(date.getDate() - parseInt(num));
    if (unit === 'y') date.setFullYear(date.getFullYear() - parseInt(num));

    return date.toISOString().split('T')[0];
  }
}

/**
 * R&D Documentation Export
 * For AusIndustry R&D tax claim compliance
 */
export const RD_METADATA = {
  component: 'Multi-Account Gmail Scanner',
  hypothesis: 'Service account with domain-wide delegation scans 3+ accounts with <30% overhead vs single account',
  methodology: 'Parallel scanning with impersonation, measure total scan time and message deduplication rate',
  successMetric: 'Scan time <= 45s for 3 accounts, deduplication rate >= 95%',
  findings: 'TBD after testing',
  category: 'Software Development',
  technicalUncertainty: 'Optimal parallelization strategy and rate limit handling for multi-account Gmail API access',
  estimatedHours: 6.0
};

export default MultiAccountScanner;
