/**
 * Gmail Client Service
 *
 * Handles Gmail API authentication using service account
 * with domain-wide delegation for multi-account access
 */

import { google } from 'googleapis';
import { readFileSync } from 'fs';

export class GmailClient {
  constructor(serviceAccountPath) {
    this.serviceAccountPath = serviceAccountPath;
    this.scopes = [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/admin.directory.user.readonly'
    ];
    this.clients = new Map(); // Cache clients per user
  }

  /**
   * Get authenticated Gmail client for a specific user
   * Uses service account with domain-wide delegation to impersonate user
   */
  async getGmailClient(userEmail) {
    // Return cached client if exists
    if (this.clients.has(userEmail)) {
      return this.clients.get(userEmail);
    }

    try {
      // Load service account credentials
      const credentials = JSON.parse(readFileSync(this.serviceAccountPath, 'utf8'));

      // Create JWT auth with impersonation
      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: this.scopes,
        subject: userEmail  // Impersonate this user via domain-wide delegation
      });

      const authClient = await auth.getClient();

      // Create Gmail API client
      const gmail = google.gmail({
        version: 'v1',
        auth: authClient
      });

      // Cache for future use
      this.clients.set(userEmail, gmail);

      return gmail;

    } catch (error) {
      throw new Error(`Failed to create Gmail client for ${userEmail}: ${error.message}`);
    }
  }

  /**
   * Search Gmail messages with query
   */
  async searchMessages(userEmail, query, maxResults = 100) {
    const gmail = await this.getGmailClient(userEmail);

    try {
      const response = await gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults
      });

      return response.data.messages || [];
    } catch (error) {
      throw new Error(`Gmail search failed for ${userEmail}: ${error.message}`);
    }
  }

  /**
   * Get full message details
   */
  async getMessage(userEmail, messageId, includeAttachments = false) {
    const gmail = await this.getGmailClient(userEmail);

    try {
      const response = await gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: includeAttachments ? 'full' : 'metadata',
        metadataHeaders: ['From', 'To', 'Subject', 'Date']
      });

      return this.formatMessage(response.data);
    } catch (error) {
      throw new Error(`Failed to get message ${messageId} for ${userEmail}: ${error.message}`);
    }
  }

  /**
   * Format Gmail message into clean structure
   */
  formatMessage(message) {
    const headers = message.payload?.headers || [];

    const getHeader = (name) => {
      const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
      return header?.value || null;
    };

    // Extract body
    let body = '';
    if (message.payload?.body?.data) {
      body = Buffer.from(message.payload.body.data, 'base64').toString('utf-8');
    } else if (message.payload?.parts) {
      // Multi-part message, get text/plain or text/html
      const textPart = message.payload.parts.find(p =>
        p.mimeType === 'text/plain' || p.mimeType === 'text/html'
      );
      if (textPart?.body?.data) {
        body = Buffer.from(textPart.body.data, 'base64').toString('utf-8');
      }
    }

    return {
      id: message.id,
      threadId: message.threadId,
      labelIds: message.labelIds || [],
      snippet: message.snippet,
      internalDate: message.internalDate,
      headers: {
        from: getHeader('From'),
        to: getHeader('To'),
        subject: getHeader('Subject'),
        date: getHeader('Date')
      },
      body: body.substring(0, 50000), // Limit body size
      sizeEstimate: message.sizeEstimate
    };
  }

  /**
   * Batch get messages with rate limiting
   */
  async batchGetMessages(userEmail, messageIds, batchSize = 25, delayMs = 2000) {
    const results = [];

    for (let i = 0; i < messageIds.length; i += batchSize) {
      const batch = messageIds.slice(i, i + batchSize);

      const batchResults = await Promise.all(
        batch.map(id => this.getMessage(userEmail, id))
      );

      results.push(...batchResults);

      // Delay between batches to avoid rate limits
      if (i + batchSize < messageIds.length) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    return results;
  }
}
