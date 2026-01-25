/**
 * Notification Processing Module
 * Handles notification sending via email, Slack, and database storage
 */

import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import { NOTIFICATION_TIMING } from '../shared/constants.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Email transporter configuration
 */
const mailer = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

/**
 * Send consolidated notifications via email, Slack, and database
 * @param {Object[]} notifications - Array of notifications to send
 * @returns {void}
 */
export async function sendNotifications(notifications) {
  // Group by priority
  const highPriority = notifications.filter(n => n.priority === 'high');
  const mediumPriority = notifications.filter(n => n.priority === 'medium');
  const lowPriority = notifications.filter(n => n.priority === 'low');

  // Build email content
  let emailContent = `
    <h2>ACT Bookkeeping Notifications</h2>
    <p>You have ${notifications.length} bookkeeping items that need attention:</p>
  `;

  if (highPriority.length > 0) {
    emailContent += '<h3>High Priority</h3><ul>';
    for (const notif of highPriority) {
      emailContent += `<li><strong>${notif.message}</strong>`;
      if (notif.action) emailContent += `<br>Action: ${notif.action}`;
      emailContent += '</li>';
    }
    emailContent += '</ul>';
  }

  if (mediumPriority.length > 0) {
    emailContent += '<h3>Medium Priority</h3><ul>';
    for (const notif of mediumPriority) {
      emailContent += `<li>${notif.message}`;
      if (notif.action) emailContent += `<br>Action: ${notif.action}`;
      emailContent += '</li>';
    }
    emailContent += '</ul>';
  }

  if (lowPriority.length > 0) {
    emailContent += '<h3>Low Priority (FYI)</h3><ul>';
    for (const notif of lowPriority) {
      emailContent += `<li>${notif.message}</li>`;
    }
    emailContent += '</ul>';
  }

  emailContent += `
    <hr>
    <p>Log in to the ACT Dashboard to review and take action on these items.</p>
    <p>Reply with STOP to pause these notifications.</p>
  `;

  // Send email notification
  if (process.env.SMTP_USER) {
    try {
      await mailer.sendMail({
        from: process.env.EMAIL_FROM || 'noreply@acurioustractor.org',
        to: process.env.TEAM_EMAIL || 'team@acurioustractor.org',
        subject: `ACT Bookkeeping: ${highPriority.length} urgent items`,
        html: emailContent
      });
      console.log('Email notification sent');
    } catch (error) {
      console.error('Email send error:', error);
    }
  }

  // Store in database for dashboard
  await storeNotifications(notifications);

  // Send to Slack if configured
  if (process.env.SLACK_WEBHOOK_URL) {
    await sendSlackNotification(notifications);
  }
}

/**
 * Store notifications in database
 * @param {Object[]} notifications - Notifications to store
 * @returns {void}
 */
export async function storeNotifications(notifications) {
  const records = notifications.map(n => ({
    type: n.type,
    priority: n.priority,
    message: n.message,
    data: n,
    created_at: new Date().toISOString(),
    read: false
  }));

  await supabase
    .from('bookkeeping_notifications')
    .insert(records);
}

/**
 * Send Slack notification for high-priority items
 * @param {Object[]} notifications - Notifications to send
 * @returns {void}
 */
export async function sendSlackNotification(notifications) {
  const high = notifications.filter(n => n.priority === 'high');
  if (high.length === 0) return;

  const blocks = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*ACT Bookkeeping Alert* - ${high.length} urgent items`
      }
    }
  ];

  for (const notif of high.slice(0, 5)) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `- ${notif.message}`
      }
    });
  }

  try {
    await fetch(process.env.SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blocks })
    });
  } catch (error) {
    console.error('Slack notification error:', error);
  }
}

/**
 * Notification history manager for cooldown
 */
export class NotificationHistory {
  constructor() {
    this.history = new Map();
  }

  /**
   * Check if recently notified
   * @param {string} key - Notification key
   * @returns {boolean} Whether recently notified
   */
  wasRecentlyNotified(key) {
    const lastNotified = this.history.get(key);
    if (!lastNotified) return false;
    return Date.now() - lastNotified < NOTIFICATION_TIMING.notificationCooldownHours * 60 * 60 * 1000;
  }

  /**
   * Mark as notified
   * @param {string} key - Notification key
   * @returns {void}
   */
  markNotified(key) {
    this.history.set(key, Date.now());

    // Clean old entries
    if (this.history.size > 1000) {
      const cutoff = Date.now() - NOTIFICATION_TIMING.cleanupAfterDays * 24 * 60 * 60 * 1000;
      for (const [k, v] of this.history.entries()) {
        if (v < cutoff) this.history.delete(k);
      }
    }
  }
}

export default {
  sendNotifications,
  storeNotifications,
  sendSlackNotification,
  NotificationHistory
};
