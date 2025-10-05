/**
 * Gmail Intelligence Sync Service
 * Syncs Gmail messages to Supabase with AI-powered intelligence
 * Integrates with the new gmail_* database tables
 */

import { google } from 'googleapis';
import { createSupabaseClient } from '../config/supabase.js';
import { createGmailOAuthClient, gmailConfig } from '../config/gmailConfig.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class GmailIntelligenceSync {
  constructor() {
    this.name = 'Gmail Intelligence Sync';
    this.supabase = null;
    this.gmail = null;
    this.oauth2Client = null;
    this.userEmail = null;
    this.isInitialized = false;
  }

  /**
   * Initialize Gmail API and Supabase connections
   */
  async initialize() {
    if (this.isInitialized) {
      return true;
    }

    try {
      // Initialize Supabase
      this.supabase = createSupabaseClient();
      console.log('✅ Supabase client initialized for Gmail sync');

      // Initialize Gmail OAuth
      this.oauth2Client = await createGmailOAuthClient();

      // Load tokens
      const tokensPath = path.join(process.cwd(), gmailConfig.tokens.file);

      if (!fs.existsSync(tokensPath)) {
        throw new Error('Gmail tokens not found. Please run authentication first.');
      }

      const tokens = JSON.parse(fs.readFileSync(tokensPath, 'utf8'));
      this.oauth2Client.setCredentials(tokens);

      // Initialize Gmail API
      this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });

      // Get user profile
      const profile = await this.gmail.users.getProfile({ userId: 'me' });
      this.userEmail = profile.data.emailAddress;

      console.log(`✅ Gmail API initialized for ${this.userEmail}`);

      this.isInitialized = true;
      return true;

    } catch (error) {
      console.error('❌ Failed to initialize Gmail Intelligence Sync:', error.message);
      throw error;
    }
  }

  /**
   * Update sync status in database
   */
  async updateSyncStatus(status, updates = {}) {
    const { data, error } = await this.supabase
      .from('gmail_sync_status')
      .upsert({
        user_email: this.userEmail,
        sync_status: status,
        ...updates,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_email'
      });

    if (error) {
      console.error('Error updating sync status:', error);
    }

    return !error;
  }

  /**
   * Perform full sync of Gmail messages
   */
  async performFullSync(maxMessages = 100) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    console.log(`\n🔄 Starting Gmail full sync (max ${maxMessages} messages)...`);
    const startTime = Date.now();

    try {
      // Update sync status to syncing
      await this.updateSyncStatus('syncing', {
        last_sync: new Date().toISOString()
      });

      // Fetch messages
      const messagesResponse = await this.gmail.users.messages.list({
        userId: 'me',
        maxResults: maxMessages,
        q: 'in:inbox OR in:sent' // Get both inbox and sent
      });

      const messages = messagesResponse.data.messages || [];
      console.log(`📧 Found ${messages.length} messages to sync`);

      let syncedCount = 0;
      let errorCount = 0;

      // Process messages in batches
      for (const message of messages) {
        try {
          await this.syncMessage(message.id);
          syncedCount++;

          if (syncedCount % 10 === 0) {
            console.log(`   Synced ${syncedCount}/${messages.length} messages...`);
          }
        } catch (error) {
          errorCount++;
          console.error(`   Error syncing message ${message.id}:`, error.message);
        }
      }

      // Update final sync status
      const duration = Date.now() - startTime;
      await this.updateSyncStatus('completed', {
        last_sync: new Date().toISOString(),
        total_messages: messages.length,
        synced_messages: syncedCount,
        error_count: errorCount,
        sync_duration_ms: duration,
        next_sync: new Date(Date.now() + 5 * 60 * 1000).toISOString() // Next sync in 5 min
      });

      console.log(`\n✅ Gmail sync completed:`);
      console.log(`   Total messages: ${messages.length}`);
      console.log(`   Synced: ${syncedCount}`);
      console.log(`   Errors: ${errorCount}`);
      console.log(`   Duration: ${(duration / 1000).toFixed(2)}s`);

      return {
        success: true,
        totalMessages: messages.length,
        syncedMessages: syncedCount,
        errors: errorCount,
        duration
      };

    } catch (error) {
      console.error('❌ Gmail sync failed:', error.message);

      await this.updateSyncStatus('error', {
        error_message: error.message,
        error_count: 1,
        last_error: new Date().toISOString()
      });

      throw error;
    }
  }

  /**
   * Sync a single message to database
   */
  async syncMessage(messageId) {
    // Fetch full message details
    const messageResponse = await this.gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full'
    });

    const message = messageResponse.data;

    // Extract headers
    const headers = {};
    message.payload.headers.forEach(header => {
      headers[header.name.toLowerCase()] = header.value;
    });

    // Extract body
    let bodyText = '';
    let bodyHtml = '';

    const extractBody = (parts) => {
      parts.forEach(part => {
        if (part.mimeType === 'text/plain' && part.body.data) {
          bodyText += Buffer.from(part.body.data, 'base64').toString('utf-8');
        } else if (part.mimeType === 'text/html' && part.body.data) {
          bodyHtml += Buffer.from(part.body.data, 'base64').toString('utf-8');
        } else if (part.parts) {
          extractBody(part.parts);
        }
      });
    };

    if (message.payload.parts) {
      extractBody(message.payload.parts);
    } else if (message.payload.body?.data) {
      bodyText = Buffer.from(message.payload.body.data, 'base64').toString('utf-8');
    }

    // Parse recipients
    const parseEmails = (emailString) => {
      if (!emailString) return [];
      return emailString.split(',').map(e => {
        const match = e.match(/<(.+?)>/);
        return match ? match[1] : e.trim();
      });
    };

    const toEmails = parseEmails(headers.to);
    const ccEmails = parseEmails(headers.cc);
    const bccEmails = parseEmails(headers.bcc);

    // Extract from email
    const fromMatch = (headers.from || '').match(/<(.+?)>/);
    const fromEmail = fromMatch ? fromMatch[1] : headers.from;
    const fromName = (headers.from || '').replace(/<.+?>/, '').trim();

    // Check for attachments
    let attachmentCount = 0;
    let attachmentNames = [];
    let attachmentTotalSize = 0;

    const checkAttachments = (parts) => {
      parts.forEach(part => {
        if (part.filename && part.filename.length > 0) {
          attachmentCount++;
          attachmentNames.push(part.filename);
          attachmentTotalSize += part.body.size || 0;
        }
        if (part.parts) {
          checkAttachments(part.parts);
        }
      });
    };

    if (message.payload.parts) {
      checkAttachments(message.payload.parts);
    }

    // Simple keyword extraction (first 10 most common words)
    const extractKeywords = (text) => {
      if (!text) return [];
      const words = text.toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(w => w.length > 4); // Words longer than 4 chars

      const freq = {};
      words.forEach(w => freq[w] = (freq[w] || 0) + 1);

      return Object.entries(freq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([word]) => word);
    };

    const keywords = extractKeywords(bodyText);

    // Determine importance based on labels
    let importance = 'medium';
    if (message.labelIds?.includes('IMPORTANT') || message.labelIds?.includes('STARRED')) {
      importance = 'high';
    }

    // Insert/update message in database
    const messageData = {
      gmail_id: message.id,
      thread_id: message.threadId,
      user_email: this.userEmail,
      subject: headers.subject || '(no subject)',
      snippet: message.snippet,
      from_email: fromEmail,
      from_name: fromName,
      to_emails: toEmails,
      cc_emails: ccEmails,
      bcc_emails: bccEmails,
      sent_date: new Date(parseInt(message.internalDate)).toISOString(),
      received_date: new Date(parseInt(message.internalDate)).toISOString(),
      body_text: bodyText.substring(0, 50000), // Limit to 50k chars
      body_html: bodyHtml.substring(0, 50000),
      labels: message.labelIds || [],
      importance,
      has_attachments: attachmentCount > 0,
      attachment_count: attachmentCount,
      attachment_names: attachmentNames,
      attachment_total_size: attachmentTotalSize,
      keywords,
      is_read: !message.labelIds?.includes('UNREAD'),
      is_starred: message.labelIds?.includes('STARRED'),
      is_archived: !message.labelIds?.includes('INBOX') && !message.labelIds?.includes('SENT'),
      is_trashed: message.labelIds?.includes('TRASH'),
      is_spam: message.labelIds?.includes('SPAM'),
      synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { error } = await this.supabase
      .from('gmail_messages')
      .upsert(messageData, {
        onConflict: 'gmail_id'
      });

    if (error) {
      throw new Error(`Failed to save message: ${error.message}`);
    }

    // Also sync contact discovery
    await this.syncContactFromMessage(fromEmail, fromName, new Date(parseInt(message.internalDate)));

    return true;
  }

  /**
   * Sync contact from Gmail message
   */
  async syncContactFromMessage(email, name, interactionDate) {
    if (!email || email.includes('noreply') || email.includes('no-reply')) {
      return; // Skip system emails
    }

    const domain = email.split('@')[1];

    const { error } = await this.supabase
      .from('gmail_contacts')
      .upsert({
        email,
        name: name || email,
        domain,
        last_interaction: interactionDate.toISOString(),
        discovered_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'email',
        ignoreDuplicates: false
      });

    if (error && !error.message.includes('duplicate')) {
      console.error(`Error syncing contact ${email}:`, error.message);
    }
  }

  /**
   * Get sync statistics
   */
  async getStats() {
    const { data: syncStatus } = await this.supabase
      .from('gmail_sync_status')
      .select('*')
      .eq('user_email', this.userEmail)
      .single();

    const { count: messageCount } = await this.supabase
      .from('gmail_messages')
      .select('*', { count: 'exact', head: true })
      .eq('user_email', this.userEmail);

    const { count: contactCount } = await this.supabase
      .from('gmail_contacts')
      .select('*', { count: 'exact', head: true });

    const { count: unreadCount } = await this.supabase
      .from('gmail_messages')
      .select('*', { count: 'exact', head: true })
      .eq('user_email', this.userEmail)
      .eq('is_read', false);

    return {
      syncStatus: syncStatus?.sync_status || 'unknown',
      lastSync: syncStatus?.last_sync,
      nextSync: syncStatus?.next_sync,
      totalMessages: messageCount || 0,
      totalContacts: contactCount || 0,
      unreadMessages: unreadCount || 0,
      syncDuration: syncStatus?.sync_duration_ms
    };
  }

  /**
   * Get sync status
   */
  async getSyncStatus() {
    const { data } = await this.supabase
      .from('gmail_sync_status')
      .select('*')
      .eq('user_email', this.userEmail)
      .single();

    return data || {
      sync_status: 'unknown',
      user_email: this.userEmail
    };
  }
}

export default GmailIntelligenceSync;