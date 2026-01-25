/**
 * ACT Email Digest Service
 *
 * Sends actionable briefs via email using SendGrid.
 *
 * Setup:
 * 1. Create SendGrid account: https://sendgrid.com
 * 2. Create API key with Mail Send permission
 * 3. Set environment variables:
 *    - SENDGRID_API_KEY
 *    - EMAIL_FROM (e.g., benjamin@act.place)
 *    - EMAIL_FROM_NAME (e.g., ACT Command Center)
 *
 * Migrated from: act-personal-ai/services/email-digest.mjs
 * Note: Original used Gmail API, this uses SendGrid for simpler setup
 */

import { ActionableAction } from './types.js';

/**
 * Configuration options for EmailDigestService
 */
export interface EmailDigestConfig {
  sendgridApiKey?: string;
  fromEmail?: string;
  fromName?: string;
  defaultRecipients?: string[];
}

/**
 * Result from sending an email digest
 */
export interface EmailSendResult {
  success: boolean;
  subject?: string;
  actionsCount?: number;
  recipients?: Array<{
    to: string;
    success: boolean;
    error?: string;
  }>;
  error?: string;
}

/**
 * Preview result for email digest
 */
export interface EmailPreviewResult {
  subject: string;
  html: string;
  text: string;
  actionsCount: number;
}

/**
 * Email Digest Service for sending actionable briefs via SendGrid
 */
export class EmailDigestService {
  private sendgridApiKey: string;
  private fromEmail: string;
  private fromName: string;
  private defaultRecipients: string[];

  constructor(config: EmailDigestConfig = {}) {
    this.sendgridApiKey =
      config.sendgridApiKey || process.env.SENDGRID_API_KEY || '';
    this.fromEmail =
      config.fromEmail || process.env.EMAIL_FROM || 'benjamin@act.place';
    this.fromName =
      config.fromName || process.env.EMAIL_FROM_NAME || 'ACT Command Center';
    this.defaultRecipients =
      config.defaultRecipients || ['benjamin@act.place'];
  }

  /**
   * Check if SendGrid is configured
   */
  isConfigured(): boolean {
    return !!this.sendgridApiKey;
  }

  /**
   * Convert markdown to HTML for email
   *
   * @param md - Markdown string to convert
   * @returns HTML string with email-friendly styling
   */
  markdownToHtml(md: string): string {
    // Simple markdown to HTML conversion
    let html = md
      // Headers
      .replace(
        /^### (.+)$/gm,
        '<h3 style="margin: 16px 0 8px 0; color: #1a1a1a;">$1</h3>'
      )
      .replace(
        /^## (.+)$/gm,
        '<h2 style="margin: 20px 0 12px 0; color: #1a1a1a; border-bottom: 1px solid #eee; padding-bottom: 8px;">$1</h2>'
      )
      .replace(
        /^# (.+)$/gm,
        '<h1 style="margin: 0 0 16px 0; color: #1a1a1a;">$1</h1>'
      )
      // Bold
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      // Links
      .replace(
        /\[([^\]]+)\]\(([^)]+)\)/g,
        '<a href="$2" style="color: #2563eb; text-decoration: none;">$1</a>'
      )
      // Lists
      .replace(/^- (.+)$/gm, '<li style="margin: 4px 0;">$1</li>')
      // Horizontal rules
      .replace(
        /^---$/gm,
        '<hr style="border: none; border-top: 1px solid #eee; margin: 16px 0;">'
      )
      // Paragraphs
      .replace(
        /\n\n/g,
        '</p><p style="margin: 12px 0; line-height: 1.6;">'
      )
      // Line breaks
      .replace(/\n/g, '<br>');

    // Wrap list items
    html = html.replace(
      /(<li[^>]*>.*?<\/li>)+/gs,
      '<ul style="margin: 12px 0; padding-left: 24px;">$&</ul>'
    );

    const now = new Date();
    const dateStr = now.toLocaleDateString('en-AU', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <div style="background: linear-gradient(135deg, #3b82f6, #8b5cf6); padding: 24px; color: white;">
      <h1 style="margin: 0; font-size: 24px;">ACT Daily Brief</h1>
      <p style="margin: 8px 0 0 0; opacity: 0.9;">${dateStr}</p>
    </div>
    <div style="padding: 24px; color: #333;">
      <p style="margin: 12px 0; line-height: 1.6;">${html}</p>
    </div>
    <div style="background: #f9f9f9; padding: 16px 24px; text-align: center; color: #666; font-size: 12px;">
      <p style="margin: 0;">The tractor shares its power take-off with different implements.</p>
      <p style="margin: 8px 0 0 0;"><a href="https://notion.so/ACT-Command-Center-2e1ebcf981cf81d89a83d1227f86fecb" style="color: #2563eb;">View in Notion</a></p>
    </div>
  </div>
</body>
</html>`;
  }

  /**
   * Create RFC 2822 formatted email (base64 URL-safe encoded)
   *
   * @param to - Recipient email
   * @param subject - Email subject
   * @param htmlBody - HTML content
   * @param textBody - Plain text content
   * @returns Base64 URL-safe encoded email
   */
  createEmail(
    to: string,
    subject: string,
    htmlBody: string,
    textBody: string
  ): string {
    const boundary = 'act_digest_boundary_' + Date.now();

    const email = [
      `From: ${this.fromName} <${this.fromEmail}>`,
      `To: ${to}`,
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      '',
      `--${boundary}`,
      'Content-Type: text/plain; charset="UTF-8"',
      '',
      textBody,
      '',
      `--${boundary}`,
      'Content-Type: text/html; charset="UTF-8"',
      '',
      htmlBody,
      '',
      `--${boundary}--`,
    ].join('\r\n');

    // Base64 URL-safe encode
    return Buffer.from(email)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  /**
   * Generate markdown from actions
   */
  private actionsToMarkdown(actions: ActionableAction[]): string {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-AU', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    let md = `# ACT Daily Brief\n\n**${dateStr}**\n\n`;

    if (actions.length === 0) {
      return md + 'No urgent actions needed today!\n';
    }

    const high = actions.filter((a) => a.priority === 'high');
    const medium = actions.filter((a) => a.priority === 'medium');

    if (high.length > 0) {
      md += '## High Priority\n\n';
      for (const action of high) {
        md += `### ${action.title}\n\n`;
        md += `${action.description}\n\n`;
        if (action.links?.email) {
          md += `- [Send Email](${action.links.email})\n`;
        }
        if (action.links?.ghl) {
          md += `- [View in GHL](${action.links.ghl})\n`;
        }
        md += '\n';
      }
    }

    if (medium.length > 0) {
      md += '## Medium Priority\n\n';
      for (const action of medium) {
        md += `### ${action.title}\n\n`;
        md += `${action.description}\n\n`;
        md += '\n';
      }
    }

    // Summary
    const emailActions = actions.filter((a) => a.type === 'email');
    const totalValue = actions.reduce((sum, a) => sum + (a.value || 0), 0);

    md += '---\n\n';
    md += `**Summary:** ${high.length} high, ${medium.length} medium priority actions\n`;
    if (emailActions.length > 0) {
      md += `${emailActions.length} people to contact\n`;
    }
    if (totalValue > 0) {
      md += `$${totalValue.toLocaleString()} in pipeline\n`;
    }

    return md;
  }

  /**
   * Send the actionable brief via email
   *
   * @param recipients - Array of email addresses
   * @param actions - Actions to include in the digest
   * @returns Send result
   */
  async sendDigest(
    recipients: string[] = this.defaultRecipients,
    actions: ActionableAction[] = []
  ): Promise<EmailSendResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        error:
          'SendGrid credentials not configured. Set SENDGRID_API_KEY environment variable.',
      };
    }

    console.log('Generating email digest...');

    const markdown = this.actionsToMarkdown(actions);
    const htmlBody = this.markdownToHtml(markdown);

    // Create plain text version (strip markdown formatting)
    const textBody = markdown
      .replace(/^#+\s*/gm, '')
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1: $2')
      .replace(/^- /gm, '* ');

    const now = new Date();
    const dateStr = now.toLocaleDateString('en-AU', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });

    const subject = `ACT Brief: ${actions.length} actions for ${dateStr}`;

    const results: Array<{ to: string; success: boolean; error?: string }> = [];

    for (const to of recipients) {
      console.log(`Sending to ${to}...`);

      try {
        const response = await fetch(
          'https://api.sendgrid.com/v3/mail/send',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${this.sendgridApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              personalizations: [{ to: [{ email: to }] }],
              from: { email: this.fromEmail, name: this.fromName },
              subject,
              content: [
                { type: 'text/plain', value: textBody },
                { type: 'text/html', value: htmlBody },
              ],
            }),
          }
        );

        if (response.ok || response.status === 202) {
          console.log(`  Sent to ${to}!`);
          results.push({ to, success: true });
        } else {
          const errorText = await response.text();
          console.error(`  Failed: ${errorText}`);
          results.push({ to, success: false, error: errorText });
        }
      } catch (err) {
        const error = (err as Error).message;
        console.error(`  Failed: ${error}`);
        results.push({ to, success: false, error });
      }
    }

    return {
      success: results.every((r) => r.success),
      subject,
      actionsCount: actions.length,
      recipients: results,
    };
  }

  /**
   * Preview the email without sending
   *
   * @param actions - Actions to preview
   * @returns Preview result
   */
  async previewDigest(actions: ActionableAction[]): Promise<EmailPreviewResult> {
    const markdown = this.actionsToMarkdown(actions);
    const htmlBody = this.markdownToHtml(markdown);

    // Create plain text version
    const textBody = markdown
      .replace(/^#+\s*/gm, '')
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1: $2')
      .replace(/^- /gm, '* ');

    const now = new Date();
    const dateStr = now.toLocaleDateString('en-AU', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });

    return {
      subject: `ACT Brief: ${actions.length} actions for ${dateStr}`,
      html: htmlBody,
      text: textBody,
      actionsCount: actions.length,
    };
  }
}

// Factory function for easy instantiation
export function createEmailDigest(
  config?: EmailDigestConfig
): EmailDigestService {
  return new EmailDigestService(config);
}

// Singleton instance
export const emailDigest = new EmailDigestService();

export default EmailDigestService;
