/**
 * Automated Email Service
 *
 * R&D Component: Gmail API Email Automation with Rate Limiting
 * Hypothesis: Automated vendor contact via Gmail API reduces manual work by 80%
 *             (4 hours → 48 minutes for 50 vendors)
 * Methodology: Template rendering, rate limiting (100/day), retry logic (max 3 attempts),
 *              queue overflow management
 * Success Metric: ≥95% delivery success rate, <5% bounce rate, zero duplicate sends
 */

import { google } from 'googleapis';
import { loadEnv } from '../../../core/src/utils/loadEnv.js';

loadEnv();

export class AutomatedEmailService {
  constructor(supabase) {
    this.supabase = supabase;
    this.gmail = null;
    this.tenantId = null;

    // Rate limiting config
    this.dailyLimit = parseInt(process.env.MIGRATION_EMAIL_RATE_LIMIT || '100');
    this.retryDelayHours = parseInt(process.env.MIGRATION_RETRY_DELAY_HOURS || '48');
    this.maxRetries = parseInt(process.env.MIGRATION_MAX_RETRIES || '3');

    // Cooldown to prevent duplicate sends (7 days)
    this.cooldownDays = 7;
  }

  /**
   * Initialize Gmail API client
   */
  async initializeGmail(accessToken) {
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });

    this.gmail = google.gmail({ version: 'v1', auth: oauth2Client });
  }

  /**
   * Send migration email to vendor
   */
  async sendMigrationEmail(subscription, template, options = {}) {
    const { dryRun = false } = options;

    console.log(`[AutomatedEmail] Sending to ${subscription.vendor}...`);

    // Validate vendor email
    if (!subscription.vendor_contact_email) {
      throw new Error('No vendor contact email');
    }

    // Check rate limit
    const rateLimitOk = await this.checkRateLimit();
    if (!rateLimitOk) {
      console.log(`  ⚠️ Rate limit hit, queueing for tomorrow`);
      await this.queueEmail(subscription.id);
      return { status: 'queued', reason: 'rate_limit' };
    }

    // Check cooldown (prevent duplicate sends)
    const cooldownOk = await this.checkCooldown(subscription.id);
    if (!cooldownOk) {
      console.log(`  ⚠️ Email sent recently, skipping`);
      return { status: 'skipped', reason: 'cooldown' };
    }

    // Render email from template
    const emailContent = this.renderTemplate(template, {
      vendor: subscription.vendor,
      oldEmail: subscription.account_email || 'nicholas@act.place',
      newEmail: 'accounts@act.place',
      amount: subscription.amount ? `$${subscription.amount}` : 'your',
      frequency: subscription.frequency || 'subscription'
    });

    // Dry run mode - don't actually send
    if (dryRun) {
      console.log(`  🧪 DRY RUN - would send:`);
      console.log(`     To: ${subscription.vendor_contact_email}`);
      console.log(`     Subject: ${emailContent.subject}`);
      return {
        status: 'dry_run',
        email: emailContent,
        to: subscription.vendor_contact_email
      };
    }

    // Send via Gmail API
    try {
      const result = await this.sendEmail(
        'accounts@act.place',
        subscription.vendor_contact_email,
        emailContent.subject,
        emailContent.body
      );

      // Log successful send
      await this.logEmailSent(subscription.id, {
        vendorEmail: subscription.vendor_contact_email,
        subject: emailContent.subject,
        body: emailContent.body,
        gmailMessageId: result.id,
        gmailThreadId: result.threadId,
        status: 'sent'
      });

      // Increment rate limit counter
      await this.incrementRateLimit();

      console.log(`  ✅ Sent successfully (ID: ${result.id})`);
      return {
        status: 'sent',
        messageId: result.id,
        threadId: result.threadId
      };

    } catch (error) {
      console.error(`  ❌ Send failed: ${error.message}`);

      // Log failure
      await this.logEmailSent(subscription.id, {
        vendorEmail: subscription.vendor_contact_email,
        subject: emailContent.subject,
        body: emailContent.body,
        status: 'failed',
        errorMessage: error.message
      });

      throw error;
    }
  }

  /**
   * Send batch emails with rate limiting
   */
  async sendBatchEmails(subscriptions, template, options = {}) {
    const { dryRun = false } = options;

    console.log(`\n[AutomatedEmail] Batch sending to ${subscriptions.length} vendors...`);

    const results = {
      sent: [],
      queued: [],
      failed: [],
      skipped: []
    };

    for (const subscription of subscriptions) {
      try {
        const result = await this.sendMigrationEmail(subscription, template, { dryRun });

        if (result.status === 'sent' || result.status === 'dry_run') {
          results.sent.push({ id: subscription.id, vendor: subscription.vendor });
        } else if (result.status === 'queued') {
          results.queued.push({ id: subscription.id, vendor: subscription.vendor });
        } else if (result.status === 'skipped') {
          results.skipped.push({ id: subscription.id, vendor: subscription.vendor, reason: result.reason });
        }

        // Small delay between sends (avoid spam filters)
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        console.error(`  ❌ Failed for ${subscription.vendor}: ${error.message}`);
        results.failed.push({
          id: subscription.id,
          vendor: subscription.vendor,
          error: error.message
        });
      }
    }

    // Summary
    console.log(`\n📊 Batch Send Summary:`);
    console.log(`   Sent: ${results.sent.length}`);
    console.log(`   Queued: ${results.queued.length}`);
    console.log(`   Failed: ${results.failed.length}`);
    console.log(`   Skipped: ${results.skipped.length}`);

    return results;
  }

  /**
   * Render email template with variable substitution
   */
  renderTemplate(template, variables) {
    let subject = template.subject_template || template.subject;
    let body = template.body_template || template.body;

    // Replace {{variable}} placeholders
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      subject = subject.replace(regex, value);
      body = body.replace(regex, value);
    }

    return { subject, body };
  }

  /**
   * Send email via Gmail API
   */
  async sendEmail(from, to, subject, body) {
    if (!this.gmail) {
      throw new Error('Gmail API not initialized');
    }

    // Create email in RFC 2822 format
    const email = [
      `From: ${from}`,
      `To: ${to}`,
      `Subject: ${subject}`,
      `Content-Type: text/plain; charset=utf-8`,
      '',
      body
    ].join('\n');

    // Encode as base64url
    const encodedEmail = Buffer.from(email)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // Send via Gmail API
    const response = await this.gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedEmail
      }
    });

    return response.data;
  }

  /**
   * Check if rate limit allows sending
   */
  async checkRateLimit() {
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await this.supabase
      .from('migration_rate_limits')
      .select('emails_sent, daily_limit')
      .eq('tenant_id', this.tenantId || 'act-main')
      .eq('date', today)
      .single();

    if (error && error.code !== 'PGRST116') { // Not found is OK
      throw new Error(`Rate limit check failed: ${error.message}`);
    }

    // No record yet - OK to send
    if (!data) {
      return true;
    }

    // Check if under limit
    return data.emails_sent < (data.daily_limit || this.dailyLimit);
  }

  /**
   * Increment rate limit counter for today
   */
  async incrementRateLimit() {
    const today = new Date().toISOString().split('T')[0];

    const { error } = await this.supabase
      .from('migration_rate_limits')
      .upsert({
        tenant_id: this.tenantId || 'act-main',
        date: today,
        emails_sent: 1,
        daily_limit: this.dailyLimit
      }, {
        onConflict: 'tenant_id,date',
        ignoreDuplicates: false
      });

    if (error) {
      // Try increment if upsert fails
      await this.supabase.rpc('increment_rate_limit', {
        p_tenant_id: this.tenantId || 'act-main',
        p_date: today
      });
    }
  }

  /**
   * Check if email was sent recently (cooldown period)
   */
  async checkCooldown(subscriptionId) {
    const cooldownDate = new Date();
    cooldownDate.setDate(cooldownDate.getDate() - this.cooldownDays);

    const { data, error } = await this.supabase
      .from('vendor_contact_log')
      .select('id')
      .eq('subscription_id', subscriptionId)
      .gte('sent_at', cooldownDate.toISOString())
      .limit(1);

    if (error) {
      console.warn(`Cooldown check failed: ${error.message}`);
      return true; // Fail open
    }

    // If records found, still in cooldown
    return !data || data.length === 0;
  }

  /**
   * Queue email for later (when rate limited)
   */
  async queueEmail(subscriptionId) {
    const { error } = await this.supabase
      .from('vendor_contact_log')
      .insert({
        subscription_id: subscriptionId,
        vendor_email: null, // Will be filled when processed
        status: 'queued',
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error(`Queue failed: ${error.message}`);
    }
  }

  /**
   * Log email send attempt to database
   */
  async logEmailSent(subscriptionId, emailData) {
    const { error } = await this.supabase
      .from('vendor_contact_log')
      .insert({
        subscription_id: subscriptionId,
        vendor_email: emailData.vendorEmail,
        email_subject: emailData.subject,
        email_body: emailData.body,
        sent_at: emailData.status === 'sent' ? new Date().toISOString() : null,
        status: emailData.status,
        gmail_message_id: emailData.gmailMessageId || null,
        gmail_thread_id: emailData.gmailThreadId || null,
        error_message: emailData.errorMessage || null,
        retry_count: 0
      });

    if (error) {
      console.error(`Log failed: ${error.message}`);
    }
  }

  /**
   * Retry failed emails (called via cron/scheduled job)
   */
  async retryFailedEmails() {
    console.log('[AutomatedEmail] Checking for failed emails to retry...');

    const retryThreshold = new Date();
    retryThreshold.setHours(retryThreshold.getHours() - this.retryDelayHours);

    // Get failed emails eligible for retry
    const { data: failedLogs, error } = await this.supabase
      .from('vendor_contact_log')
      .select('id, subscription_id, vendor_email, retry_count')
      .eq('status', 'failed')
      .lt('retry_count', this.maxRetries)
      .or(`last_retry_at.is.null,last_retry_at.lt.${retryThreshold.toISOString()}`);

    if (error) {
      console.error(`Retry query failed: ${error.message}`);
      return;
    }

    if (!failedLogs || failedLogs.length === 0) {
      console.log('  No failed emails to retry');
      return;
    }

    console.log(`  Found ${failedLogs.length} emails to retry`);

    // TODO: Implement retry logic
    // For each failed log, fetch subscription and re-send
  }

  /**
   * Get default email template
   */
  async getDefaultTemplate() {
    const { data, error } = await this.supabase
      .from('migration_email_templates')
      .select('*')
      .eq('tenant_id', this.tenantId || 'act-main')
      .eq('is_default', true)
      .single();

    if (error) {
      // Return hardcoded default if DB fetch fails
      return {
        subject_template: 'Update Billing Email for {{vendor}} - A Curious Tractor',
        body_template: `Hi {{vendor}} Team,

I'm writing to update our billing email address for our subscription.

Current Email: {{oldEmail}}
New Email: accounts@act.place

Could you please update your records to send all invoices and billing notifications to the new email address?

Thank you!

Best regards,
Nicholas Morgan
A Curious Tractor
accounts@act.place`
      };
    }

    return data;
  }
}

/**
 * R&D Documentation Export
 */
export const RD_METADATA = {
  component: 'Automated Email Service',
  hypothesis: 'Gmail API automation reduces manual vendor contact work by 80% (4hrs → 48min for 50 vendors)',
  methodology: 'Template rendering with variable substitution, Gmail API sending, rate limiting (100/day), retry logic (max 3 attempts, 48h delay), 7-day cooldown duplicate prevention',
  successMetric: 'Delivery success ≥95%, bounce rate <5%, zero duplicate sends, processing time <1hr for 50 vendors',
  findings: 'TBD after production testing',
  category: 'Automation',
  technicalUncertainty: 'Optimal rate limiting strategy and retry timing for maximizing delivery while avoiding spam filters',
  estimatedHours: 5.0
};

export default AutomatedEmailService;
