/**
 * Vendor Email Discovery Service
 *
 * R&D Component: Multi-Source Vendor Email Extraction
 * Hypothesis: Gmail From header (90% confidence) + Xero contact (85%) achieves
 *             85%+ vendor email discovery rate vs 40% from manual lookup alone
 * Methodology: Priority-based fallback chain with email validation and source tracking
 * Success Metric: ≥85% discovery rate on 50+ vendor sample
 */

import xeroTokenManager from '../../../core/src/services/xeroTokenManager.js';
import { loadEnv } from '../../../core/src/utils/loadEnv.js';

loadEnv();

export class VendorEmailDiscovery {
  constructor(gmailService, supabase) {
    this.gmailService = gmailService;
    this.supabase = supabase;

    // Email validation regex (RFC 5322 simplified)
    this.emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    // Patterns to reject (noreply, no-reply, etc.)
    this.rejectPatterns = [
      /noreply/i,
      /no-reply/i,
      /donotreply/i,
      /notifications?@/i,
      /bounce/i,
      /mailer-daemon/i
    ];
  }

  /**
   * Discover vendor email with fallback strategy
   * Priority: Gmail From → Xero Contact → Manual
   */
  async discoverVendorEmail(subscription) {
    console.log(`[VendorEmailDiscovery] Discovering email for: ${subscription.vendor}`);

    // Strategy 1: Gmail From header (confidence: 0.9)
    if (subscription.gmail_message_id) {
      try {
        const email = await this.extractFromGmail(subscription.gmail_message_id);
        if (this.validateEmail(email)) {
          console.log(`  ✅ Found via Gmail: ${email}`);
          return {
            email,
            source: 'gmail_from',
            confidence: 0.9
          };
        }
      } catch (error) {
        console.log(`  ⚠️ Gmail extraction failed: ${error.message}`);
      }
    }

    // Strategy 2: Xero contact (confidence: 0.85)
    if (subscription.xero_contact_id) {
      try {
        const email = await this.extractFromXero(subscription.xero_contact_id);
        if (this.validateEmail(email)) {
          console.log(`  ✅ Found via Xero: ${email}`);
          return {
            email,
            source: 'xero_contact',
            confidence: 0.85
          };
        }
      } catch (error) {
        console.log(`  ⚠️ Xero extraction failed: ${error.message}`);
      }
    }

    // Strategy 3: Check metadata for stored emails
    if (subscription.metadata?.gmail_emails?.length > 0) {
      const fromEmail = this.extractEmailFromGmailMetadata(subscription.metadata.gmail_emails);
      if (this.validateEmail(fromEmail)) {
        console.log(`  ✅ Found in metadata: ${fromEmail}`);
        return {
          email: fromEmail,
          source: 'gmail_from',
          confidence: 0.85
        };
      }
    }

    // No email found - manual entry required
    console.log(`  ❌ No email found for ${subscription.vendor}`);
    return {
      email: null,
      source: 'manual',
      confidence: 0
    };
  }

  /**
   * Extract email from Gmail message From header
   */
  async extractFromGmail(messageId) {
    if (!this.gmailService) {
      throw new Error('Gmail service not initialized');
    }

    // Get message details
    const message = await this.gmailService.getMessage(messageId);

    if (!message || !message.payload || !message.payload.headers) {
      throw new Error('Invalid message structure');
    }

    // Find From header
    const fromHeader = message.payload.headers.find(h =>
      h.name.toLowerCase() === 'from'
    );

    if (!fromHeader) {
      throw new Error('No From header found');
    }

    // Parse email from "Name <email@domain.com>" format
    const email = this.parseEmailAddress(fromHeader.value);
    return email;
  }

  /**
   * Extract email from Xero contact
   */
  async extractFromXero(contactId) {
    try {
      const client = await xeroTokenManager.getAuthenticatedClient();
      const tenantId = process.env.XERO_TENANT_ID;

      // Get contact from Xero
      const response = await client.accountingApi.getContact(tenantId, contactId);
      const contact = response.body.contacts?.[0];

      if (!contact) {
        throw new Error('Contact not found in Xero');
      }

      // Try email field
      if (contact.emailAddress) {
        return contact.emailAddress;
      }

      // Try contact persons
      if (contact.contactPersons?.length > 0) {
        const person = contact.contactPersons.find(p => p.emailAddress);
        if (person?.emailAddress) {
          return person.emailAddress;
        }
      }

      throw new Error('No email found in Xero contact');

    } catch (error) {
      throw new Error(`Xero API error: ${error.message}`);
    }
  }

  /**
   * Extract email from Gmail metadata in subscription
   */
  extractEmailFromGmailMetadata(gmailEmails) {
    if (!Array.isArray(gmailEmails) || gmailEmails.length === 0) {
      return null;
    }

    // Get most recent email
    const sortedEmails = [...gmailEmails].sort((a, b) =>
      new Date(b.date) - new Date(a.date)
    );

    for (const emailData of sortedEmails) {
      if (emailData.sender) {
        const email = this.parseEmailAddress(emailData.sender);
        if (email) return email;
      }
    }

    return null;
  }

  /**
   * Parse email address from various formats
   * Handles: "Name <email@domain.com>", "email@domain.com", etc.
   */
  parseEmailAddress(rawEmail) {
    if (!rawEmail) return null;

    // Extract email from angle brackets if present
    const match = rawEmail.match(/<([^>]+)>/);
    if (match) {
      return match[1].trim().toLowerCase();
    }

    // Return as-is if it looks like an email
    const trimmed = rawEmail.trim().toLowerCase();
    if (this.emailRegex.test(trimmed)) {
      return trimmed;
    }

    return null;
  }

  /**
   * Validate email format and reject noreply addresses
   */
  validateEmail(email) {
    if (!email || typeof email !== 'string') {
      return false;
    }

    // Check format
    if (!this.emailRegex.test(email)) {
      return false;
    }

    // Reject noreply and system addresses
    for (const pattern of this.rejectPatterns) {
      if (pattern.test(email)) {
        console.log(`  ⚠️ Rejected noreply address: ${email}`);
        return false;
      }
    }

    return true;
  }

  /**
   * Batch discover emails for multiple subscriptions
   * Returns map of subscription ID to email discovery result
   */
  async batchDiscover(subscriptions, options = {}) {
    const { concurrency = 5 } = options;
    const results = new Map();

    console.log(`\n[VendorEmailDiscovery] Batch discovering ${subscriptions.length} vendor emails...`);

    // Process in batches to avoid overwhelming APIs
    for (let i = 0; i < subscriptions.length; i += concurrency) {
      const batch = subscriptions.slice(i, i + concurrency);

      const batchResults = await Promise.all(
        batch.map(async (sub) => {
          try {
            const result = await this.discoverVendorEmail(sub);
            return { id: sub.id, ...result };
          } catch (error) {
            console.error(`  ❌ Error for ${sub.vendor}: ${error.message}`);
            return {
              id: sub.id,
              email: null,
              source: 'manual',
              confidence: 0,
              error: error.message
            };
          }
        })
      );

      // Store results
      for (const result of batchResults) {
        results.set(result.id, result);
      }

      // Small delay between batches
      if (i + concurrency < subscriptions.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // Summary stats
    const discovered = Array.from(results.values()).filter(r => r.email !== null);
    const discoveryRate = (discovered.length / subscriptions.length * 100).toFixed(1);

    console.log(`\n📊 Batch Discovery Summary:`);
    console.log(`   Total: ${subscriptions.length}`);
    console.log(`   Discovered: ${discovered.length} (${discoveryRate}%)`);
    console.log(`   Manual needed: ${subscriptions.length - discovered.length}`);

    // Source breakdown
    const bySource = discovered.reduce((acc, r) => {
      acc[r.source] = (acc[r.source] || 0) + 1;
      return acc;
    }, {});
    console.log(`   By source:`, bySource);

    return results;
  }

  /**
   * Update subscription with discovered email
   */
  async updateSubscriptionEmail(subscriptionId, emailResult) {
    if (!this.supabase) {
      throw new Error('Supabase client not initialized');
    }

    const { error } = await this.supabase
      .from('discovered_subscriptions')
      .update({
        vendor_contact_email: emailResult.email,
        vendor_contact_source: emailResult.source,
        updated_at: new Date().toISOString()
      })
      .eq('id', subscriptionId);

    if (error) {
      throw new Error(`Failed to update subscription: ${error.message}`);
    }
  }

  /**
   * Batch update subscriptions with discovered emails
   */
  async batchUpdateEmails(discoveryResults) {
    console.log(`\n[VendorEmailDiscovery] Updating ${discoveryResults.size} subscriptions...`);

    let updated = 0;
    let failed = 0;

    for (const [subscriptionId, result] of discoveryResults.entries()) {
      if (result.email) {
        try {
          await this.updateSubscriptionEmail(subscriptionId, result);
          updated++;
        } catch (error) {
          console.error(`  ❌ Failed to update ${subscriptionId}: ${error.message}`);
          failed++;
        }
      }
    }

    console.log(`   Updated: ${updated}`);
    console.log(`   Failed: ${failed}`);
    console.log(`   Skipped: ${discoveryResults.size - updated - failed} (no email)`);

    return { updated, failed };
  }
}

/**
 * R&D Documentation Export
 */
export const RD_METADATA = {
  component: 'Vendor Email Discovery Service',
  hypothesis: 'Multi-source email extraction (Gmail From 90% + Xero 85%) achieves 85%+ discovery rate vs 40% manual lookup',
  methodology: 'Priority-based fallback chain: Gmail From header → Xero contact → metadata cache. Email validation with noreply filtering.',
  successMetric: 'Discovery rate ≥85% on 50+ vendor sample, source confidence scoring accuracy ≥90%',
  findings: 'TBD after production testing',
  category: 'Data Extraction',
  technicalUncertainty: 'Optimal fallback strategy and noreply pattern coverage for maximizing valid email discovery',
  estimatedHours: 4.0
};

export default VendorEmailDiscovery;
