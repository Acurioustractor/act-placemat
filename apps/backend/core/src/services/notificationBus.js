/**
 * Notification Bus Service
 * 
 * Central service for sending notifications via Slack, Email, and other channels.
 * Handles approval workflows, digests, and alerts from all agents.
 */

import { EventEmitter } from 'events';
import { createSupabaseClient } from '../config/supabase.js';
import { Logger } from '../utils/logger.js';
import nodemailer from 'nodemailer';
import axios from 'axios';

export class NotificationBus extends EventEmitter {
  constructor() {
    super();
    this.supabase = createSupabaseClient();
    this.logger = new Logger('NotificationBus');
    
    // Queue for notifications
    this.notificationQueue = [];
    this.processing = false;
    
    // Initialize email transporter
    this.emailTransporter = this.initializeEmailTransporter();
    
    // Slack webhook URL from environment
    this.slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;
    
    // Notification templates
    this.templates = new Map();
    this.loadTemplates();
    
    // Start queue processor
    this.startQueueProcessor();
    
    this.logger.info('📢 Notification Bus initialized');
  }
  
  /**
   * Initialize email transporter
   */
  initializeEmailTransporter() {
    if (!process.env.SMTP_HOST) {
      this.logger.warn('Email configuration not found, email notifications disabled');
      return null;
    }
    
    return nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }
  
  /**
   * Send notification through specified channel
   */
  async send(notification) {
    try {
      // Validate notification
      if (!notification.channel || !notification.type) {
        throw new Error('Invalid notification: missing channel or type');
      }
      
      // Add to queue
      this.notificationQueue.push({
        ...notification,
        id: this.generateNotificationId(),
        timestamp: new Date().toISOString(),
        status: 'pending'
      });
      
      // Process queue if not already processing
      if (!this.processing) {
        this.processQueue();
      }
      
      return { status: 'queued', position: this.notificationQueue.length };
      
    } catch (error) {
      this.logger.error('Failed to queue notification:', error);
      throw error;
    }
  }
  
  /**
   * Process notification queue
   */
  async processQueue() {
    if (this.processing || this.notificationQueue.length === 0) {
      return;
    }
    
    this.processing = true;
    
    while (this.notificationQueue.length > 0) {
      const notification = this.notificationQueue.shift();
      
      try {
        // Route to appropriate handler
        switch (notification.channel) {
          case 'slack':
            await this.sendSlack(notification);
            break;
          case 'email':
            await this.sendEmail(notification);
            break;
          case 'both':
            await Promise.all([
              this.sendSlack(notification),
              this.sendEmail(notification)
            ]);
            break;
          default:
            throw new Error(`Unknown channel: ${notification.channel}`);
        }
        
        // Update status
        notification.status = 'sent';
        await this.logNotification(notification);
        
      } catch (error) {
        this.logger.error(`Failed to send notification ${notification.id}:`, error);
        notification.status = 'failed';
        notification.error = error.message;
        await this.logNotification(notification);
      }
      
      // Small delay between notifications
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    this.processing = false;
  }
  
  /**
   * Send Slack notification
   */
  async sendSlack(notification) {
    if (!this.slackWebhookUrl) {
      this.logger.warn('Slack webhook not configured');
      return;
    }
    
    try {
      // Get template and render
      const message = await this.renderTemplate(notification);
      
      // Format for Slack
      const slackMessage = {
        text: message.title,
        blocks: this.formatSlackBlocks(message),
        channel: notification.slackChannel || '#finance'
      };
      
      // Send to Slack
      const response = await axios.post(this.slackWebhookUrl, slackMessage);
      
      if (response.data !== 'ok') {
        throw new Error(`Slack API error: ${response.data}`);
      }
      
      this.logger.info(`Slack notification sent: ${notification.type}`);
      
    } catch (error) {
      this.logger.error('Slack send failed:', error);
      throw error;
    }
  }
  
  /**
   * Send email notification
   */
  async sendEmail(notification) {
    if (!this.emailTransporter) {
      this.logger.warn('Email transporter not configured');
      return;
    }
    
    try {
      // Get template and render
      const message = await this.renderTemplate(notification);
      
      // Format for email
      const emailMessage = {
        from: process.env.EMAIL_FROM || 'ACT Platform <noreply@act.com.au>',
        to: notification.email || process.env.EMAIL_TO,
        subject: message.title,
        html: this.formatEmailHtml(message),
        text: message.text
      };
      
      // Send email
      await this.emailTransporter.sendMail(emailMessage);
      
      this.logger.info(`Email notification sent: ${notification.type}`);
      
    } catch (error) {
      this.logger.error('Email send failed:', error);
      throw error;
    }
  }
  
  /**
   * Render notification template
   */
  async renderTemplate(notification) {
    const template = this.templates.get(notification.type);
    
    if (!template) {
      // Default template
      return {
        title: notification.title || 'ACT Platform Notification',
        text: notification.message || 'No message provided',
        data: notification.data || {},
        actions: notification.actions || []
      };
    }
    
    // Process template with data
    return template(notification);
  }
  
  /**
   * Format Slack blocks
   */
  formatSlackBlocks(message) {
    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: message.title
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: message.text
        }
      }
    ];
    
    // Add data fields
    if (message.data && Object.keys(message.data).length > 0) {
      const fields = Object.entries(message.data).map(([key, value]) => ({
        type: 'mrkdwn',
        text: `*${this.humanize(key)}:*\n${value}`
      }));
      
      blocks.push({
        type: 'section',
        fields: fields.slice(0, 10) // Slack limit
      });
    }
    
    // Add actions
    if (message.actions && message.actions.length > 0) {
      blocks.push({
        type: 'actions',
        elements: message.actions.map(action => ({
          type: 'button',
          text: {
            type: 'plain_text',
            text: action.label
          },
          url: action.url,
          style: action.style || 'primary'
        }))
      });
    }
    
    return blocks;
  }
  
  /**
   * Format email HTML
   */
  formatEmailHtml(message) {
    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
    .data-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    .data-table th, .data-table td { padding: 10px; border-bottom: 1px solid #ddd; text-align: left; }
    .data-table th { font-weight: bold; }
    .actions { margin-top: 30px; }
    .button { display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 4px; margin-right: 10px; }
    .button.secondary { background-color: #6c757d; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>${message.title}</h2>
    </div>
    
    <p>${message.text.replace(/\n/g, '<br>')}</p>
    
    ${this.formatDataTable(message.data)}
    
    ${this.formatActions(message.actions)}
    
    <div class="footer">
      <p>This is an automated notification from the ACT Platform.</p>
      <p>Generated at ${new Date().toLocaleString('en-AU', { timeZone: 'Australia/Brisbane' })}</p>
    </div>
  </div>
</body>
</html>`;
  }
  
  /**
   * Format data as HTML table
   */
  formatDataTable(data) {
    if (!data || Object.keys(data).length === 0) {
      return '';
    }
    
    const rows = Object.entries(data).map(([key, value]) => `
      <tr>
        <th>${this.humanize(key)}</th>
        <td>${value}</td>
      </tr>
    `).join('');
    
    return `
      <table class="data-table">
        <tbody>
          ${rows}
        </tbody>
      </table>
    `;
  }
  
  /**
   * Format actions as HTML buttons
   */
  formatActions(actions) {
    if (!actions || actions.length === 0) {
      return '';
    }
    
    const buttons = actions.map(action => `
      <a href="${action.url}" class="button ${action.style === 'secondary' ? 'secondary' : ''}">
        ${action.label}
      </a>
    `).join('');
    
    return `<div class="actions">${buttons}</div>`;
  }
  
  /**
   * Load notification templates
   */
  loadTemplates() {
    // Bill approval required template
    this.templates.set('bill_approval_required', (notification) => ({
      title: '📋 Bill Approval Required',
      text: `A new bill from ${notification.data.supplier} requires your approval.`,
      data: {
        supplier: notification.data.supplier,
        amount: `$${notification.data.amount.toFixed(2)}`,
        confidence: `${(notification.data.confidence * 100).toFixed(0)}%`,
        suggestedAccount: notification.data.suggestedCoding?.accountCode || 'Unknown',
        reasons: (notification.data.reasons || []).join(', ')
      },
      actions: [
        {
          label: 'Approve',
          url: `${process.env.APP_URL}/api/approvals/${notification.data.billId}/approve`,
          style: 'primary'
        },
        {
          label: 'Review in Xero',
          url: `https://go.xero.com/organisationlogin/default.aspx?redirect=/AccountsPayable/View.aspx?InvoiceID=${notification.data.billId}`,
          style: 'secondary'
        }
      ]
    }));
    
    // BAS ready template
    this.templates.set('bas_ready', (notification) => ({
      title: '📊 BAS Pack Ready for Review',
      text: `Your ${notification.data.period} BAS pack is ready for review.`,
      data: {
        period: notification.data.period,
        gstCollected: `$${notification.data.gstCollected?.toFixed(2) || '0.00'}`,
        gstPaid: `$${notification.data.gstPaid?.toFixed(2) || '0.00'}`,
        paygWithheld: `$${notification.data.paygWithheld?.toFixed(2) || '0.00'}`,
        exceptions: notification.data.exceptionCount || 0
      },
      actions: [
        {
          label: 'Download BAS Pack',
          url: `${process.env.APP_URL}/api/reports/bas_pack?entity=${notification.data.entity}&period=${notification.data.period}`,
          style: 'primary'
        }
      ]
    }));
    
    // Payment reminder template
    this.templates.set('payment_reminder', (notification) => ({
      title: '💰 Payment Reminder',
      text: `Invoice ${notification.data.invoiceNumber} is ${notification.data.daysOverdue} days overdue.`,
      data: {
        customer: notification.data.customer,
        invoiceNumber: notification.data.invoiceNumber,
        amount: `$${notification.data.amount.toFixed(2)}`,
        dueDate: notification.data.dueDate,
        daysOverdue: notification.data.daysOverdue
      },
      actions: [
        {
          label: 'Send Reminder',
          url: `${process.env.APP_URL}/api/ar/reminders/${notification.data.invoiceId}/send`,
          style: 'primary'
        },
        {
          label: 'View Invoice',
          url: notification.data.invoiceUrl,
          style: 'secondary'
        }
      ]
    }));
    
    // Daily digest template
    this.templates.set('daily_digest', (notification) => ({
      title: '📅 Daily Finance Digest',
      text: 'Here\'s your daily financial summary:',
      data: notification.data,
      actions: [
        {
          label: 'View Dashboard',
          url: `${process.env.APP_URL}/dashboard`,
          style: 'primary'
        }
      ]
    }));
  }
  
  /**
   * Log notification to database
   */
  async logNotification(notification) {
    try {
      await this.supabase
        .from('notification_logs')
        .insert({
          notification_id: notification.id,
          type: notification.type,
          channel: notification.channel,
          status: notification.status,
          error: notification.error,
          data: notification.data,
          timestamp: notification.timestamp
        });
    } catch (error) {
      this.logger.error('Failed to log notification:', error);
    }
  }
  
  /**
   * Send approval required notification
   */
  async sendApprovalRequired(data) {
    return this.send({
      type: 'bill_approval_required',
      channel: 'both',
      data
    });
  }
  
  /**
   * Send BAS ready notification
   */
  async sendBASReady(data) {
    return this.send({
      type: 'bas_ready',
      channel: 'both',
      data
    });
  }
  
  /**
   * Send payment reminder
   */
  async sendPaymentReminder(data) {
    return this.send({
      type: 'payment_reminder',
      channel: 'email',
      email: data.customerEmail,
      data
    });
  }
  
  /**
   * Send daily digest
   */
  async sendDailyDigest(data) {
    return this.send({
      type: 'daily_digest',
      channel: 'slack',
      data
    });
  }
  
  /**
   * Start queue processor
   */
  startQueueProcessor() {
    setInterval(() => {
      if (!this.processing && this.notificationQueue.length > 0) {
        this.processQueue();
      }
    }, 5000);
  }
  
  /**
   * Generate unique notification ID
   */
  generateNotificationId() {
    return `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Convert key to human readable format
   */
  humanize(key) {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .replace(/^\w/, c => c.toUpperCase())
      .trim();
  }
  
  /**
   * Get health status
   */
  getHealth() {
    return {
      status: 'healthy',
      queueLength: this.notificationQueue.length,
      processing: this.processing,
      emailConfigured: !!this.emailTransporter,
      slackConfigured: !!this.slackWebhookUrl
    };
  }
}

// Singleton instance
let notificationBus = null;

export function getNotificationBus() {
  if (!notificationBus) {
    notificationBus = new NotificationBus();
  }
  return notificationBus;
}

export default NotificationBus;