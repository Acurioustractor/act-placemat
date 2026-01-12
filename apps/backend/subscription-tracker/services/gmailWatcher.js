/**
 * Gmail Watch API - Real-time Subscription Detection
 *
 * Uses Gmail push notifications via Google Cloud Pub/Sub to detect
 * new subscription-related emails immediately (< 5 second latency).
 *
 * Replaces periodic polling with event-driven architecture for:
 * - Immediate detection of new subscriptions
 * - Reduced API quota usage
 * - Automatic enrichment pipeline triggering
 *
 * Setup:
 * 1. Create Pub/Sub topic: gmail-subscription-notifications
 * 2. Grant Gmail permission to publish
 * 3. Enable watch for all ACT email accounts
 * 4. Deploy webhook handler (Cloud Function or Express endpoint)
 */

import { google } from 'googleapis';
import { GmailClient } from '../../../../mcp-servers/gmail-workspace/services/gmailClient.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SERVICE_ACCOUNT_PATH = path.join(__dirname, '../config/service-account.json');

export class GmailWatcher {
  constructor() {
    this.gmailClient = new GmailClient(SERVICE_ACCOUNT_PATH);
    this.projectId = 'act-subscription-tracker'; // Your Google Cloud project ID
    this.topicName = 'gmail-subscription-notifications';
  }

  /**
   * Enable Gmail watch for all ACT email accounts
   *
   * @returns {Promise<Object[]>} Array of watch responses for each account
   */
  async enableWatchForAllAccounts() {
    const accounts = [
      'nicholas@act.place',
      'hi@act.place',
      'benjamin@act.place',
      'accounts@act.place',
    ];

    const results = [];

    for (const email of accounts) {
      try {
        const result = await this.enableWatch(email);
        results.push({ email, success: true, ...result });
        console.log(`✅ Watch enabled for ${email}`);
      } catch (error) {
        console.error(`❌ Failed to enable watch for ${email}:`, error.message);
        results.push({ email, success: false, error: error.message });
      }
    }

    return results;
  }

  /**
   * Enable Gmail watch for a specific email account
   *
   * @param {string} userEmail - Email address to watch
   * @returns {Promise<Object>} Watch response with historyId and expiration
   */
  async enableWatch(userEmail) {
    const gmail = await this.gmailClient.getGmailClient(userEmail);

    const request = {
      userId: 'me',
      requestBody: {
        labelIds: ['INBOX'], // Watch only inbox
        topicName: `projects/${this.projectId}/topics/${this.topicName}`,
        labelFilterAction: 'include',
      },
    };

    const response = await gmail.users.watch(request);

    return {
      historyId: response.data.historyId,
      expiration: response.data.expiration,
      expirationDate: new Date(parseInt(response.data.expiration)).toISOString(),
    };
  }

  /**
   * Stop watching Gmail for a specific account
   *
   * @param {string} userEmail - Email address to stop watching
   */
  async stopWatch(userEmail) {
    const gmail = await this.gmailClient.getGmailClient(userEmail);

    await gmail.users.stop({ userId: 'me' });
    console.log(`🛑 Watch stopped for ${userEmail}`);
  }

  /**
   * Handle incoming Gmail push notification
   *
   * Called by webhook when new email arrives
   *
   * @param {Object} pubsubMessage - Pub/Sub message from Gmail
   * @returns {Promise<Object[]>} Detected subscriptions
   */
  async handleNotification(pubsubMessage) {
    // Decode Pub/Sub message
    const data = JSON.parse(Buffer.from(pubsubMessage.data, 'base64').toString());
    const { emailAddress, historyId } = data;

    console.log(`📧 Notification received for ${emailAddress}, historyId: ${historyId}`);

    // Fetch history changes since last known historyId
    const changes = await this.fetchHistoryChanges(emailAddress, historyId);

    if (!changes || !changes.messagesAdded || changes.messagesAdded.length === 0) {
      console.log('   No new messages in history');
      return [];
    }

    const detectedSubscriptions = [];

    // Check each new message for subscription indicators
    for (const messageAdded of changes.messagesAdded) {
      const message = messageAdded.message;

      const isSubscription = await this.detectSubscription(emailAddress, message.id);

      if (isSubscription) {
        console.log(`   🔔 Subscription detected: ${message.id}`);
        detectedSubscriptions.push({
          messageId: message.id,
          emailAddress,
          detectedAt: new Date().toISOString(),
        });

        // Trigger enrichment pipeline
        await this.triggerEnrichment(emailAddress, message.id);
      }
    }

    return detectedSubscriptions;
  }

  /**
   * Fetch history changes since last historyId
   *
   * @param {string} userEmail - Email address
   * @param {string} startHistoryId - Starting history ID
   * @returns {Promise<Object>} History changes
   */
  async fetchHistoryChanges(userEmail, startHistoryId) {
    const gmail = await this.gmailClient.getGmailClient(userEmail);

    try {
      const response = await gmail.users.history.list({
        userId: 'me',
        startHistoryId,
        historyTypes: ['messageAdded'],
      });

      return {
        messagesAdded: response.data.history?.flatMap(h => h.messagesAdded || []) || [],
        nextHistoryId: response.data.historyId,
      };
    } catch (error) {
      if (error.code === 404) {
        // History ID too old, need to re-sync
        console.log('   ⚠️  History ID expired, need full sync');
        return null;
      }
      throw error;
    }
  }

  /**
   * Detect if email is subscription-related
   *
   * Checks subject and sender for subscription keywords
   *
   * @param {string} userEmail - Email address
   * @param {string} messageId - Gmail message ID
   * @returns {Promise<boolean>} True if subscription detected
   */
  async detectSubscription(userEmail, messageId) {
    const gmail = await this.gmailClient.getGmailClient(userEmail);

    const message = await gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'metadata',
      metadataHeaders: ['Subject', 'From'],
    });

    const headers = message.data.payload.headers;
    const subject = headers.find(h => h.name === 'Subject')?.value || '';
    const from = headers.find(h => h.name === 'From')?.value || '';

    // Subscription keywords
    const keywords = [
      'receipt', 'invoice', 'payment', 'subscription',
      'renewal', 'billing', 'charged', 'statement',
      'paid', 'transaction', 'your order', 'purchase',
    ];

    // Check if subject or from contains subscription keywords
    const lowerSubject = subject.toLowerCase();
    const lowerFrom = from.toLowerCase();

    const hasKeyword = keywords.some(kw =>
      lowerSubject.includes(kw) || lowerFrom.includes(kw)
    );

    // Additional filters to reduce false positives
    const isPromotion = lowerSubject.includes('newsletter') ||
                       lowerSubject.includes('marketing') ||
                       lowerSubject.includes('unsubscribe');

    return hasKeyword && !isPromotion;
  }

  /**
   * Trigger enrichment pipeline for detected subscription
   *
   * In production, this would publish to a Pub/Sub topic or queue
   * For now, we'll just log it
   *
   * @param {string} emailAddress - Email address
   * @param {string} messageId - Gmail message ID
   */
  async triggerEnrichment(emailAddress, messageId) {
    // TODO: In production, publish to enrichment queue
    // Example with Pub/Sub:
    // await pubsub.topic('subscription-enrichment-queue').publish(
    //   Buffer.from(JSON.stringify({ emailAddress, messageId }))
    // );

    console.log(`   🚀 Enrichment triggered for ${emailAddress}/${messageId}`);

    // For now, we could directly call the PDF extraction script
    // Or add to a database queue for batch processing
  }

  /**
   * Get watch status for all accounts
   *
   * @returns {Promise<Object[]>} Watch status for each account
   */
  async getWatchStatus() {
    const accounts = [
      'nicholas@act.place',
      'hi@act.place',
      'benjamin@act.place',
      'accounts@act.place',
    ];

    const statuses = [];

    for (const email of accounts) {
      try {
        const gmail = await this.gmailClient.getGmailClient(email);

        // Try to get profile (watch status is implicit)
        const profile = await gmail.users.getProfile({ userId: 'me' });

        statuses.push({
          email,
          active: true,
          messagesTotal: profile.data.messagesTotal,
          threadsTotal: profile.data.threadsTotal,
        });
      } catch (error) {
        statuses.push({
          email,
          active: false,
          error: error.message,
        });
      }
    }

    return statuses;
  }

  /**
   * Renew watch for all accounts (watch expires after 7 days)
   *
   * Should be run as a cron job every 6 days
   */
  async renewAllWatches() {
    console.log('🔄 Renewing watches for all accounts...');
    const results = await this.enableWatchForAllAccounts();

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log(`✅ Renewed ${successful} watches`);
    if (failed > 0) {
      console.log(`❌ Failed to renew ${failed} watches`);
    }

    return results;
  }
}

// Export for use in other modules
export default GmailWatcher;
