/**
 * ACT WhatsApp Brief Service
 *
 * Sends morning actionable briefs via WhatsApp using Twilio.
 *
 * Setup:
 * 1. Create Twilio account: https://www.twilio.com
 * 2. Enable WhatsApp sandbox: https://www.twilio.com/console/sms/whatsapp/sandbox
 * 3. Set environment variables:
 *    - TWILIO_ACCOUNT_SID
 *    - TWILIO_AUTH_TOKEN
 *    - TWILIO_WHATSAPP_FROM (e.g., whatsapp:+14155238886)
 *    - WHATSAPP_TO (e.g., whatsapp:+61412345678)
 *
 * Migrated from: act-personal-ai/services/whatsapp-brief.mjs
 */

import { ActionableAction } from './types.js';

/**
 * Configuration options for WhatsAppBriefService
 */
export interface WhatsAppBriefConfig {
  twilioAccountSid?: string;
  twilioAuthToken?: string;
  whatsappFrom?: string;
  whatsappTo?: string;
}

/**
 * Result from sending a WhatsApp message
 */
export interface WhatsAppSendResult {
  success: boolean;
  sid?: string;
  error?: string;
}

/**
 * Preview result for WhatsApp message
 */
export interface WhatsAppPreviewResult {
  message: string;
  from: string;
  to: string;
  length: number;
}

const MAX_WHATSAPP_LENGTH = 1600;

/**
 * WhatsApp Brief Service for sending actionable briefs via Twilio WhatsApp
 */
export class WhatsAppBriefService {
  private twilioAccountSid: string;
  private twilioAuthToken: string;
  private whatsappFrom: string;
  private whatsappTo: string;

  constructor(config: WhatsAppBriefConfig = {}) {
    this.twilioAccountSid =
      config.twilioAccountSid || process.env.TWILIO_ACCOUNT_SID || '';
    this.twilioAuthToken =
      config.twilioAuthToken || process.env.TWILIO_AUTH_TOKEN || '';
    this.whatsappFrom =
      config.whatsappFrom ||
      process.env.TWILIO_WHATSAPP_FROM ||
      'whatsapp:+14155238886';
    this.whatsappTo =
      config.whatsappTo ||
      process.env.WHATSAPP_TO ||
      'whatsapp:+61400000000';
  }

  /**
   * Check if Twilio is configured
   */
  isConfigured(): boolean {
    return !!(this.twilioAccountSid && this.twilioAuthToken);
  }

  /**
   * Format brief for WhatsApp (max 1600 chars)
   *
   * @param actions - Array of actionable items to include in the message
   * @returns Formatted WhatsApp message string
   */
  async formatMessage(actions: ActionableAction[]): Promise<string> {
    const high = actions.filter((a) => a.priority === 'high');
    const emailCount = actions.filter((a) => a.type === 'email').length;
    const totalValue = actions.reduce((sum, a) => sum + (a.value || 0), 0);

    const now = new Date();
    const dateStr = now.toLocaleDateString('en-AU', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });

    let msg = `*ACT Brief - ${dateStr}*\n\n`;

    // Summary
    msg += `*${high.length}* high priority\n`;
    msg += `*${emailCount}* people to contact\n`;
    msg += `*$${(totalValue / 1000).toFixed(0)}k* in pipeline\n\n`;

    // Top actions (limit to fit WhatsApp)
    if (high.length > 0) {
      msg += `*Today's Focus:*\n`;
      for (const action of high.slice(0, 4)) {
        const name = action.context?.contact || action.title;
        const stage = action.context?.stage ? ` (${action.context.stage})` : '';
        msg += `\n${action.type === 'email' ? '[Email]' : '[Task]'} *${name}*${stage}\n`;

        // Truncate description to fit
        const maxDescLen = 80;
        const desc = action.description || '';
        msg += `${desc.slice(0, maxDescLen)}${desc.length > maxDescLen ? '...' : ''}\n`;
      }
    }

    // Footer with link
    msg += `\n---\n`;
    msg += `Open full brief: http://localhost:3456\n`;

    // Ensure we don't exceed WhatsApp limit
    if (msg.length > MAX_WHATSAPP_LENGTH) {
      msg = msg.slice(0, MAX_WHATSAPP_LENGTH - 3) + '...';
    }

    return msg;
  }

  /**
   * Send WhatsApp message via Twilio
   *
   * @param message - Message to send (or actions to format and send)
   * @param to - Optional recipient override
   * @returns Result of the send operation
   */
  async send(
    message: string | ActionableAction[],
    to: string = this.whatsappTo
  ): Promise<WhatsAppSendResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'Twilio credentials not configured. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN',
      };
    }

    // Format message if actions provided
    const messageBody =
      typeof message === 'string'
        ? message
        : await this.formatMessage(message);

    // Twilio API call
    const auth = Buffer.from(
      `${this.twilioAccountSid}:${this.twilioAuthToken}`
    ).toString('base64');

    try {
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${this.twilioAccountSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            From: this.whatsappFrom,
            To: to,
            Body: messageBody,
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        console.log('WhatsApp message sent!');
        console.log(`  SID: ${data.sid}`);
        console.log(`  To: ${to}`);
        return { success: true, sid: data.sid };
      } else {
        console.error('Twilio error:', data.message);
        return { success: false, error: data.message };
      }
    } catch (err) {
      const error = (err as Error).message;
      console.error('Send error:', error);
      return { success: false, error };
    }
  }

  /**
   * Preview message without sending
   *
   * @param actions - Actions to preview
   * @returns Preview result with formatted message
   */
  async preview(actions: ActionableAction[]): Promise<WhatsAppPreviewResult> {
    const message = await this.formatMessage(actions);

    return {
      message,
      from: this.whatsappFrom,
      to: this.whatsappTo,
      length: message.length,
    };
  }

  /**
   * Get scheduling information for cron setup
   */
  getScheduleInfo(): string {
    return `
ACT WhatsApp Brief - Scheduling
================================

To send briefs automatically each morning, add this to your crontab:

  # Edit crontab
  crontab -e

  # Add this line for 7am daily (adjust timezone)
  0 7 * * * cd /path/to/app && node -e "require('./whatsappBriefService').send()" >> /tmp/whatsapp-brief.log 2>&1

Or use launchd on macOS:

  1. Create ~/Library/LaunchAgents/com.act.whatsapp-brief.plist
  2. Load: launchctl load ~/Library/LaunchAgents/com.act.whatsapp-brief.plist

Alternative: Use n8n, Zapier, or a scheduled Supabase Edge Function.
    `;
  }
}

// Factory function for easy instantiation
export function createWhatsAppBrief(
  config?: WhatsAppBriefConfig
): WhatsAppBriefService {
  return new WhatsAppBriefService(config);
}

// Singleton instance
export const whatsAppBrief = new WhatsAppBriefService();

export default WhatsAppBriefService;
