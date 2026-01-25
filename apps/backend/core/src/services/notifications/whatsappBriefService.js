/**
 * WhatsApp Brief Service
 *
 * Sends morning actionable briefs via WhatsApp using Twilio.
 * Gracefully degrades if Twilio credentials are not configured.
 *
 * Configuration:
 * - TWILIO_ACCOUNT_SID: Twilio Account SID
 * - TWILIO_AUTH_TOKEN: Twilio Auth Token
 * - TWILIO_WHATSAPP_FROM: WhatsApp sender (e.g., whatsapp:+14155238886)
 * - WHATSAPP_TO: Default recipient (e.g., whatsapp:+61412345678)
 */

import { logger } from '../../utils/logger.js';
import actionableBriefService from './actionableBriefService.js';

class WhatsAppBriefService {
  constructor() {
    this.twilioSid = process.env.TWILIO_ACCOUNT_SID;
    this.twilioToken = process.env.TWILIO_AUTH_TOKEN;
    this.whatsappFrom = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';
    this.whatsappTo = process.env.WHATSAPP_TO || 'whatsapp:+61400000000';
  }

  /**
   * Check if Twilio is configured
   */
  isConfigured() {
    return !!(this.twilioSid && this.twilioToken);
  }

  /**
   * Format brief for WhatsApp (max 1600 chars)
   * @param {Object} briefData - Brief data from ActionableBriefService
   * @returns {string} Formatted WhatsApp message
   */
  formatMessage(briefData) {
    const { actions, summary } = briefData;
    const high = actions.filter(a => a.priority === 'high');

    const now = new Date();
    const dateStr = now.toLocaleDateString('en-AU', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });

    let msg = `*ACT Brief - ${dateStr}*\n\n`;

    // Summary
    msg += `*${summary.high}* high priority\n`;
    msg += `*${summary.emailCount || 0}* people to contact\n`;
    msg += `*$${(summary.totalValue / 1000).toFixed(0)}k* in pipeline\n\n`;

    // Top actions (limit to fit WhatsApp)
    if (high.length > 0) {
      msg += `*Today's Focus:*\n`;
      for (const action of high.slice(0, 4)) {
        const name = action.context?.contact || action.title;
        const stage = action.context?.stage ? ` (${action.context.stage})` : '';
        const icon = action.type === 'email' ? 'E' : 'T';
        msg += `\n[${icon}] *${name}*${stage}\n`;
        const desc = action.description || '';
        msg += `${desc.slice(0, 80)}${desc.length > 80 ? '...' : ''}\n`;
      }
    }

    // Footer
    msg += `\n---\n`;
    msg += `Open full brief: https://act.intelligence/dashboard\n`;

    return msg;
  }

  /**
   * Send WhatsApp message via Twilio
   * @param {string} to - Recipient WhatsApp number (e.g., whatsapp:+61412345678)
   * @param {Object} briefData - Optional pre-generated brief data
   * @returns {Object} Result with success status
   */
  async send(to = null, briefData = null) {
    const recipient = to || this.whatsappTo;

    // Generate brief if not provided
    if (!briefData) {
      briefData = await actionableBriefService.generateBrief();
    }

    const message = this.formatMessage(briefData);

    // If Twilio not configured, log instead of sending
    if (!this.isConfigured()) {
      logger.warn('Twilio credentials not configured - logging message instead of sending');
      logger.info('WhatsApp Message Preview:', {
        to: recipient,
        from: this.whatsappFrom,
        messageLength: message.length,
        message: message.substring(0, 200) + '...'
      });
      return {
        success: false,
        error: 'Twilio not configured',
        preview: message,
        wouldSendTo: recipient
      };
    }

    try {
      const auth = Buffer.from(`${this.twilioSid}:${this.twilioToken}`).toString('base64');

      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${this.twilioSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams({
            From: this.whatsappFrom,
            To: recipient,
            Body: message
          })
        }
      );

      const data = await response.json();

      if (response.ok) {
        logger.info('WhatsApp message sent successfully', {
          sid: data.sid,
          to: recipient
        });
        return { success: true, sid: data.sid, to: recipient };
      } else {
        logger.error('Twilio API error', { error: data.message, code: data.code });
        return { success: false, error: data.message, code: data.code };
      }
    } catch (error) {
      logger.error('Failed to send WhatsApp message', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Preview message without sending
   * @param {Object} briefData - Optional pre-generated brief data
   * @returns {Object} Preview information
   */
  async preview(briefData = null) {
    if (!briefData) {
      briefData = await actionableBriefService.generateBrief();
    }

    const message = this.formatMessage(briefData);

    return {
      from: this.whatsappFrom,
      to: this.whatsappTo,
      message,
      length: message.length,
      maxLength: 1600,
      isConfigured: this.isConfigured()
    };
  }

  /**
   * Get scheduling instructions
   * @returns {string} Cron scheduling instructions
   */
  getSchedulingInstructions() {
    return `
WhatsApp Brief - Scheduling
================================

To send briefs automatically each morning, add to crontab:

  # Edit crontab
  crontab -e

  # Add this line for 7am daily
  0 7 * * * curl -X POST https://your-api/api/v1/notifications/whatsapp

Or use:
- n8n workflow
- Zapier scheduled trigger
- Supabase Edge Function cron
    `;
  }
}

// Export singleton instance
const whatsappBriefService = new WhatsAppBriefService();
export default whatsappBriefService;
export { WhatsAppBriefService };
