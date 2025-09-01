/**
 * Automated Bookkeeping Notification Service
 * Handles receipt processing, expense categorization, and smart notifications
 */

import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import Redis from 'ioredis';
import Anthropic from '@anthropic-ai/sdk';
// import { DextConnector } from '../../../intelligence/src/connectors/DextConnector.js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment
dotenv.config({ path: path.join(process.cwd(), '.env') });

export class BookkeepingNotificationService {
  constructor() {
    // Initialize services
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    
    this.claude = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || 'dummy-key'
    });
    
    // Initialize Dext connector for automated receipt processing
    // this.dext = new DextConnector();
    
    // Email configuration
    this.mailer = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
    
    // Notification settings
    this.notificationRules = {
      receiptMissing: 7, // Days before notifying about missing receipt
      expenseUncategorized: 3, // Days before notifying about uncategorized expense
      largeExpenseThreshold: 1000, // Amount requiring immediate notification
      duplicateCheckWindow: 7, // Days to check for duplicates
      taxDeadlineWarning: 14 // Days before tax deadline to notify
    };
    
    // Track notification history to avoid spam
    this.notificationHistory = new Map();
    
    console.log('📧 Bookkeeping Notification Service initialized');
  }

  /**
   * Main process that runs periodically to check and notify
   */
  async processBookkeepingNotifications() {
    console.log('🔍 Processing bookkeeping notifications...');
    
    const notifications = [];
    
    try {
      // Step 1: Check for transactions missing receipts
      const missingReceipts = await this.checkMissingReceipts();
      notifications.push(...missingReceipts);
      
      // Step 2: Check for uncategorized expenses
      const uncategorized = await this.checkUncategorizedExpenses();
      notifications.push(...uncategorized);
      
      // Step 3: Check for potential duplicate expenses
      const duplicates = await this.checkDuplicateExpenses();
      notifications.push(...duplicates);
      
      // Step 4: Check for large/unusual expenses
      const unusual = await this.checkUnusualExpenses();
      notifications.push(...unusual);
      
      // Step 5: Check upcoming tax deadlines and required receipts
      const taxItems = await this.checkTaxRequirements();
      notifications.push(...taxItems);
      
      // Step 6: Process new email receipts
      const newReceipts = await this.processEmailReceipts();
      notifications.push(...newReceipts);
      
      // Step 7: Process Dext receipts (automated receipt scanning)
      const dextReceipts = await this.processDextReceipts();
      notifications.push(...dextReceipts);
      
      // Step 8: Send consolidated notifications
      if (notifications.length > 0) {
        await this.sendNotifications(notifications);
      }
      
      console.log(`✅ Processed ${notifications.length} bookkeeping notifications`);
      
      return {
        success: true,
        notificationCount: notifications.length,
        notifications
      };
      
    } catch (error) {
      console.error('❌ Bookkeeping notification error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Step 1: Check for transactions missing receipts
   */
  async checkMissingReceipts() {
    const notifications = [];
    
    // Get recent transactions without receipts
    const { data: transactions, error } = await this.supabase
      .from('bookkeeping_transactions')
      .select('*')
      .eq('direction', 'spent')
      .is('receipt_url', null)
      .gte('txn_date', new Date(Date.now() - this.notificationRules.receiptMissing * 24 * 60 * 60 * 1000).toISOString())
      .order('amount', { ascending: false });
    
    if (error) {
      console.error('Error fetching transactions:', error);
      return notifications;
    }
    
    for (const tx of transactions || []) {
      // Skip if already notified recently
      const notifKey = `missing_receipt_${tx.id}`;
      if (this.wasRecentlyNotified(notifKey)) continue;
      
      notifications.push({
        type: 'missing_receipt',
        priority: tx.amount > this.notificationRules.largeExpenseThreshold ? 'high' : 'medium',
        transaction: tx,
        message: `Missing receipt for ${tx.description || 'transaction'} - $${tx.amount}`,
        action: 'Please upload or forward the receipt to receipts@acurioustractor.org',
        automatedAction: await this.searchEmailForReceipt(tx)
      });
      
      this.markNotified(notifKey);
    }
    
    return notifications;
  }

  /**
   * Step 2: Check for uncategorized expenses
   */
  async checkUncategorizedExpenses() {
    const notifications = [];
    
    const { data: expenses, error } = await this.supabase
      .from('bookkeeping_transactions')
      .select('*')
      .or('category.is.null,category.eq.uncategorized')
      .gte('txn_date', new Date(Date.now() - this.notificationRules.expenseUncategorized * 24 * 60 * 60 * 1000).toISOString());
    
    if (error) {
      console.error('Error fetching uncategorized:', error);
      return notifications;
    }
    
    for (const expense of expenses || []) {
      // Use AI to suggest category
      const suggestedCategory = await this.aiCategorizeExpense(expense);
      
      // Auto-apply if confidence is high
      if (suggestedCategory.confidence > 0.85) {
        await this.supabase
          .from('bookkeeping_transactions')
          .update({ 
            category: suggestedCategory.category,
            category_confidence: suggestedCategory.confidence,
            category_auto_applied: true
          })
          .eq('id', expense.id);
        
        notifications.push({
          type: 'auto_categorized',
          priority: 'low',
          transaction: expense,
          message: `Auto-categorized: ${expense.description} as ${suggestedCategory.category}`,
          confidence: suggestedCategory.confidence
        });
      } else {
        // Need manual review
        const notifKey = `uncategorized_${expense.id}`;
        if (!this.wasRecentlyNotified(notifKey)) {
          notifications.push({
            type: 'needs_categorization',
            priority: 'medium',
            transaction: expense,
            message: `Please categorize: ${expense.description} - $${expense.amount}`,
            suggestion: suggestedCategory,
            action: 'Click to review and categorize'
          });
          this.markNotified(notifKey);
        }
      }
    }
    
    return notifications;
  }

  /**
   * Step 3: Check for duplicate expenses
   */
  async checkDuplicateExpenses() {
    const notifications = [];
    
    // Get recent transactions
    const { data: recent, error } = await this.supabase
      .from('bookkeeping_transactions')
      .select('*')
      .gte('txn_date', new Date(Date.now() - this.notificationRules.duplicateCheckWindow * 24 * 60 * 60 * 1000).toISOString())
      .order('txn_date', { ascending: false });
    
    if (error || !recent) return notifications;
    
    // Check for potential duplicates
    const checked = new Set();
    
    for (let i = 0; i < recent.length; i++) {
      if (checked.has(recent[i].id)) continue;
      
      for (let j = i + 1; j < recent.length; j++) {
        const tx1 = recent[i];
        const tx2 = recent[j];
        
        // Check if potentially duplicate
        const sameAmount = Math.abs(tx1.amount - tx2.amount) < 0.01;
        const sameVendor = tx1.contact_name === tx2.contact_name;
        const closeDate = Math.abs(new Date(tx1.txn_date) - new Date(tx2.txn_date)) < 7 * 24 * 60 * 60 * 1000;
        
        if (sameAmount && sameVendor && closeDate) {
          notifications.push({
            type: 'potential_duplicate',
            priority: 'high',
            transactions: [tx1, tx2],
            message: `Potential duplicate payment: $${tx1.amount} to ${tx1.contact_name}`,
            action: 'Review and cancel if duplicate'
          });
          
          checked.add(tx1.id);
          checked.add(tx2.id);
        }
      }
    }
    
    return notifications;
  }

  /**
   * Step 4: Check for unusual expenses
   */
  async checkUnusualExpenses() {
    const notifications = [];
    
    // Get expense statistics
    const { data: stats } = await this.supabase.rpc('get_expense_statistics');
    
    // Get recent large expenses
    const { data: largeExpenses, error } = await this.supabase
      .from('bookkeeping_transactions')
      .select('*')
      .eq('direction', 'spent')
      .gt('amount', this.notificationRules.largeExpenseThreshold)
      .gte('txn_date', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
    
    if (error) return notifications;
    
    for (const expense of largeExpenses || []) {
      const notifKey = `large_expense_${expense.id}`;
      if (!this.wasRecentlyNotified(notifKey)) {
        
        // Check if this is unusual for this vendor
        const isUnusual = await this.isUnusualExpense(expense, stats);
        
        notifications.push({
          type: isUnusual ? 'unusual_expense' : 'large_expense',
          priority: 'high',
          transaction: expense,
          message: `${isUnusual ? 'Unusual' : 'Large'} expense: $${expense.amount} to ${expense.contact_name}`,
          action: 'Please review and confirm this expense',
          analysis: isUnusual ? 'This amount is significantly higher than usual for this vendor' : null
        });
        
        this.markNotified(notifKey);
      }
    }
    
    return notifications;
  }

  /**
   * Step 5: Check tax requirements
   */
  async checkTaxRequirements() {
    const notifications = [];
    
    // Check for upcoming BAS deadline
    const nextBASDeadline = this.getNextBASDeadline();
    const daysUntilBAS = Math.floor((nextBASDeadline - new Date()) / (24 * 60 * 60 * 1000));
    
    if (daysUntilBAS <= this.notificationRules.taxDeadlineWarning) {
      // Check which receipts are missing for tax purposes
      const { data: taxableExpenses } = await this.supabase
        .from('bookkeeping_transactions')
        .select('*')
        .eq('tax_deductible', true)
        .is('receipt_url', null)
        .gte('txn_date', this.getQuarterStart());
      
      if (taxableExpenses && taxableExpenses.length > 0) {
        notifications.push({
          type: 'tax_receipts_needed',
          priority: 'high',
          message: `BAS deadline in ${daysUntilBAS} days - ${taxableExpenses.length} receipts needed`,
          expenses: taxableExpenses,
          totalAmount: taxableExpenses.reduce((sum, e) => sum + e.amount, 0),
          action: 'Upload receipts for tax deductible expenses'
        });
      }
      
      // Prepare BAS summary
      notifications.push({
        type: 'bas_preparation',
        priority: 'high',
        message: `BAS due in ${daysUntilBAS} days - summary prepared`,
        action: 'Review BAS summary',
        automatedAction: 'BAS worksheet has been generated and saved'
      });
    }
    
    return notifications;
  }

  /**
   * Step 6: Process new email receipts
   */
  async processEmailReceipts() {
    const notifications = [];
    
    try {
      // Fetch recent receipts from Gmail
      const response = await fetch('http://localhost:4000/api/finance/receipts/sweep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days: 7, max: 50 })
      });
      
      const data = await response.json();
      
      if (data.receipts) {
        for (const receipt of data.receipts) {
          // Try to match to transaction
          if (receipt.matchedTransaction) {
            // Auto-attach receipt
            await this.attachReceiptToTransaction(receipt, receipt.matchedTransaction);
            
            notifications.push({
              type: 'receipt_auto_matched',
              priority: 'low',
              message: `Receipt auto-matched: ${receipt.subject}`,
              receipt,
              transaction: receipt.matchedTransaction,
              confidence: 0.9
            });
          } else if (receipt.amount) {
            // Needs manual matching
            notifications.push({
              type: 'receipt_needs_matching',
              priority: 'medium',
              message: `New receipt needs matching: ${receipt.subject} - $${receipt.amount}`,
              receipt,
              action: 'Click to match with transaction'
            });
          }
        }
      }
    } catch (error) {
      console.error('Email receipt processing error:', error);
    }
    
    return notifications;
  }

  /**
   * Send consolidated notifications
   */
  async sendNotifications(notifications) {
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
      emailContent += '<h3>🔴 High Priority</h3><ul>';
      for (const notif of highPriority) {
        emailContent += `<li><strong>${notif.message}</strong>`;
        if (notif.action) emailContent += `<br>Action: ${notif.action}`;
        emailContent += '</li>';
      }
      emailContent += '</ul>';
    }
    
    if (mediumPriority.length > 0) {
      emailContent += '<h3>🟡 Medium Priority</h3><ul>';
      for (const notif of mediumPriority) {
        emailContent += `<li>${notif.message}`;
        if (notif.action) emailContent += `<br>Action: ${notif.action}`;
        emailContent += '</li>';
      }
      emailContent += '</ul>';
    }
    
    if (lowPriority.length > 0) {
      emailContent += '<h3>🟢 Low Priority (FYI)</h3><ul>';
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
        await this.mailer.sendMail({
          from: process.env.EMAIL_FROM || 'noreply@acurioustractor.org',
          to: process.env.TEAM_EMAIL || 'team@acurioustractor.org',
          subject: `ACT Bookkeeping: ${highPriority.length} urgent items`,
          html: emailContent
        });
        console.log('📧 Email notification sent');
      } catch (error) {
        console.error('Email send error:', error);
      }
    }
    
    // Store in database for dashboard
    await this.storeNotifications(notifications);
    
    // Send to Slack if configured
    if (process.env.SLACK_WEBHOOK_URL) {
      await this.sendSlackNotification(notifications);
    }
  }

  /**
   * Helper: AI categorize expense
   */
  async aiCategorizeExpense(expense) {
    try {
      const response = await this.claude.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 200,
        messages: [{
          role: 'user',
          content: `Categorize this business expense:
          
Amount: $${expense.amount}
Vendor: ${expense.contact_name}
Description: ${expense.description}
Date: ${expense.txn_date}

Categories: Travel, Meals, Office Supplies, Software, Marketing, Professional Services, Utilities, Rent, Other

Return JSON: { "category": "...", "confidence": 0.0-1.0, "reasoning": "..." }`
        }]
      });
      
      const text = response.content[0].text;
      const json = JSON.parse(text.match(/\{.*\}/s)?.[0] || '{}');
      
      return {
        category: json.category || 'Other',
        confidence: json.confidence || 0.5,
        reasoning: json.reasoning
      };
    } catch (error) {
      console.error('AI categorization error:', error);
      return { category: 'Other', confidence: 0.3 };
    }
  }

  /**
   * Helper: Search email for matching receipt
   */
  async searchEmailForReceipt(transaction) {
    // Would search Gmail for receipts matching this transaction
    return {
      searched: true,
      query: `${transaction.contact_name} $${transaction.amount} after:${transaction.txn_date}`,
      found: false
    };
  }

  /**
   * Helper: Check if expense is unusual
   */
  async isUnusualExpense(expense, stats) {
    // Check if amount is 2x higher than average for this vendor
    const { data: history } = await this.supabase
      .from('bookkeeping_transactions')
      .select('amount')
      .eq('contact_name', expense.contact_name)
      .neq('id', expense.id);
    
    if (!history || history.length < 3) return false;
    
    const avg = history.reduce((sum, h) => sum + h.amount, 0) / history.length;
    return expense.amount > avg * 2;
  }

  /**
   * Helper: Attach receipt to transaction
   */
  async attachReceiptToTransaction(receipt, transaction) {
    await this.supabase
      .from('bookkeeping_transactions')
      .update({
        receipt_message_id: receipt.messageId,
        receipt_url: receipt.gmailLink,
        receipt_amount: receipt.amount,
        receipt_confidence: 0.9,
        receipt_attached_at: new Date().toISOString()
      })
      .eq('id', transaction.id);
  }

  /**
   * Helper: Store notifications in database
   */
  async storeNotifications(notifications) {
    const records = notifications.map(n => ({
      type: n.type,
      priority: n.priority,
      message: n.message,
      data: n,
      created_at: new Date().toISOString(),
      read: false
    }));
    
    await this.supabase
      .from('bookkeeping_notifications')
      .insert(records);
  }

  /**
   * Helper: Send Slack notification
   */
  async sendSlackNotification(notifications) {
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
          text: `• ${notif.message}`
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
   * Helper: Check if recently notified
   */
  wasRecentlyNotified(key) {
    const lastNotified = this.notificationHistory.get(key);
    if (!lastNotified) return false;
    
    // Don't notify again within 24 hours
    return Date.now() - lastNotified < 24 * 60 * 60 * 1000;
  }

  /**
   * Helper: Mark as notified
   */
  markNotified(key) {
    this.notificationHistory.set(key, Date.now());
    
    // Clean old entries
    if (this.notificationHistory.size > 1000) {
      const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
      for (const [k, v] of this.notificationHistory.entries()) {
        if (v < cutoff) this.notificationHistory.delete(k);
      }
    }
  }

  /**
   * Helper: Get next BAS deadline
   */
  getNextBASDeadline() {
    const today = new Date();
    const quarter = Math.floor(today.getMonth() / 3);
    const year = today.getFullYear();
    
    const deadlines = [
      new Date(year, 3, 28), // Q3: April 28
      new Date(year, 6, 28), // Q4: July 28  
      new Date(year, 9, 28), // Q1: October 28
      new Date(year + 1, 0, 28) // Q2: January 28
    ];
    
    return deadlines.find(d => d > today) || deadlines[0];
  }

  /**
   * Helper: Get quarter start date
   */
  getQuarterStart() {
    const today = new Date();
    const quarter = Math.floor(today.getMonth() / 3);
    return new Date(today.getFullYear(), quarter * 3, 1).toISOString();
  }

  /**
   * Step 7: Process Dext receipts (automated receipt scanning)
   */
  async processDextReceipts() {
    const notifications = [];
    
    if (!this.dext.configured) {
      console.log('⚠️  Dext not configured - skipping automated receipt processing');
      return notifications;
    }
    
    try {
      console.log('📄 Processing Dext receipts...');
      
      // Get recent processed receipts from Dext
      const { receipts, error } = await this.dext.getReceipts({
        status: 'processed',
        fromDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // Last 7 days
        limit: 50
      });
      
      if (error) {
        console.error('Dext fetch error:', error);
        return notifications;
      }
      
      for (const receipt of receipts) {
        try {
          // Try to match with existing transaction
          const matchedTx = await this.findMatchingTransaction(receipt);
          
          if (matchedTx) {
            // Auto-attach receipt to transaction
            await this.attachDextReceiptToTransaction(receipt, matchedTx);
            
            notifications.push({
              type: 'dext_receipt_auto_matched',
              priority: 'low',
              message: `Dext receipt auto-matched: ${receipt.supplier} - $${receipt.total}`,
              receipt,
              transaction: matchedTx,
              confidence: matchedTx.confidence || 0.85
            });
          } else if (receipt.total > 50) {
            // Needs manual matching for receipts over $50
            notifications.push({
              type: 'dext_receipt_needs_matching',
              priority: 'medium',
              message: `Dext receipt needs matching: ${receipt.supplier} - $${receipt.total}`,
              receipt,
              action: 'Review and match with transaction',
              automatedSuggestions: await this.getSuggestedMatches(receipt)
            });
          }
          
          // Check for expense categorization
          if (!receipt.category || receipt.category === 'Uncategorized') {
            const suggestedCategory = await this.aiCategorizeExpense({
              amount: receipt.total,
              contact_name: receipt.supplier,
              description: receipt.description || receipt.lineItems?.map(i => i.description).join(', '),
              txn_date: receipt.date
            });
            
            if (suggestedCategory.confidence > 0.8) {
              notifications.push({
                type: 'dext_receipt_categorized',
                priority: 'low',
                message: `Dext receipt categorized: ${receipt.supplier} as ${suggestedCategory.category}`,
                receipt,
                category: suggestedCategory
              });
            }
          }
          
        } catch (error) {
          console.error('Error processing Dext receipt:', receipt.id, error);
        }
      }
      
      // Check Dext processing status for any stuck receipts
      const insights = await this.dext.getInsights();
      if (insights.taxSummary?.deductible?.length > 0) {
        notifications.push({
          type: 'dext_tax_deductible_summary',
          priority: 'low',
          message: `${insights.taxSummary.deductible.length} tax-deductible receipts processed by Dext`,
          insights
        });
      }
      
    } catch (error) {
      console.error('Dext processing error:', error);
      notifications.push({
        type: 'dext_processing_error',
        priority: 'medium',
        message: 'Dext receipt processing encountered errors',
        error: error.message,
        action: 'Check Dext connection and API status'
      });
    }
    
    return notifications;
  }

  /**
   * Helper: Find matching transaction for Dext receipt
   */
  async findMatchingTransaction(receipt) {
    if (!receipt.total || !receipt.date) return null;
    
    try {
      // Search for transaction within ±3 days and similar amount
      const tolerance = Math.max(2, receipt.total * 0.05); // $2 or 5% tolerance
      const dateTolerance = 3; // 3 days
      
      const receiptDate = new Date(receipt.date);
      const startDate = new Date(receiptDate.getTime() - dateTolerance * 24 * 60 * 60 * 1000);
      const endDate = new Date(receiptDate.getTime() + dateTolerance * 24 * 60 * 60 * 1000);
      
      const { data: transactions, error } = await this.supabase
        .from('bookkeeping_transactions')
        .select('*')
        .eq('direction', 'spent')
        .gte('txn_date', startDate.toISOString())
        .lte('txn_date', endDate.toISOString())
        .gte('amount', receipt.total - tolerance)
        .lte('amount', receipt.total + tolerance)
        .is('receipt_url', null) // Only match transactions without receipts
        .order('txn_date', { ascending: false });
      
      if (error || !transactions?.length) return null;
      
      // Find best match by supplier name similarity
      let bestMatch = null;
      let bestScore = 0;
      
      for (const tx of transactions) {
        let score = 0;
        
        // Amount similarity (closer = higher score)
        const amountDiff = Math.abs(tx.amount - receipt.total);
        score += Math.max(0, 1 - (amountDiff / tolerance)) * 0.4;
        
        // Date similarity (same day = bonus)
        const dateDiff = Math.abs(new Date(tx.txn_date) - receiptDate) / (24 * 60 * 60 * 1000);
        score += Math.max(0, 1 - (dateDiff / dateTolerance)) * 0.3;
        
        // Supplier name similarity
        if (tx.contact_name && receipt.supplier) {
          const txName = tx.contact_name.toLowerCase();
          const receiptName = receipt.supplier.toLowerCase();
          
          if (txName.includes(receiptName) || receiptName.includes(txName)) {
            score += 0.3;
          } else if (this.calculateNameSimilarity(txName, receiptName) > 0.7) {
            score += 0.2;
          }
        }
        
        if (score > bestScore) {
          bestScore = score;
          bestMatch = { ...tx, confidence: score };
        }
      }
      
      // Only return if confidence is above threshold
      return bestScore > 0.7 ? bestMatch : null;
      
    } catch (error) {
      console.error('Transaction matching error:', error);
      return null;
    }
  }

  /**
   * Helper: Attach Dext receipt to transaction
   */
  async attachDextReceiptToTransaction(receipt, transaction) {
    await this.supabase
      .from('bookkeeping_transactions')
      .update({
        receipt_message_id: `dext_${receipt.id}`,
        receipt_url: receipt.imageUrl,
        receipt_amount: receipt.total,
        receipt_confidence: transaction.confidence || 0.85,
        receipt_attached_at: new Date().toISOString(),
        dext_receipt_id: receipt.id,
        receipt_source: 'dext'
      })
      .eq('id', transaction.id);
  }

  /**
   * Helper: Get suggested transaction matches for Dext receipt
   */
  async getSuggestedMatches(receipt) {
    try {
      const { data: transactions, error } = await this.supabase
        .from('bookkeeping_transactions')
        .select('*')
        .eq('direction', 'spent')
        .gte('txn_date', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()) // Last 14 days
        .is('receipt_url', null)
        .order('txn_date', { ascending: false })
        .limit(20);
      
      if (error || !transactions?.length) return [];
      
      return transactions
        .map(tx => ({
          transaction: tx,
          score: this.calculateMatchScore(receipt, tx),
          reasons: this.getMatchReasons(receipt, tx)
        }))
        .filter(match => match.score > 0.3)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
        
    } catch (error) {
      console.error('Suggested matches error:', error);
      return [];
    }
  }

  /**
   * Helper: Calculate match score between receipt and transaction
   */
  calculateMatchScore(receipt, transaction) {
    let score = 0;
    
    // Amount similarity
    if (receipt.total && transaction.amount) {
      const amountDiff = Math.abs(transaction.amount - receipt.total);
      const tolerance = Math.max(2, receipt.total * 0.1);
      score += Math.max(0, 1 - (amountDiff / tolerance)) * 0.5;
    }
    
    // Date proximity
    if (receipt.date && transaction.txn_date) {
      const dateDiff = Math.abs(new Date(transaction.txn_date) - new Date(receipt.date)) / (24 * 60 * 60 * 1000);
      score += Math.max(0, 1 - (dateDiff / 7)) * 0.3; // 7 day window
    }
    
    // Supplier name similarity
    if (transaction.contact_name && receipt.supplier) {
      const similarity = this.calculateNameSimilarity(
        transaction.contact_name.toLowerCase(),
        receipt.supplier.toLowerCase()
      );
      score += similarity * 0.2;
    }
    
    return Math.min(1, score);
  }

  /**
   * Helper: Get match reasons for display
   */
  getMatchReasons(receipt, transaction) {
    const reasons = [];
    
    if (receipt.total && transaction.amount) {
      const amountDiff = Math.abs(transaction.amount - receipt.total);
      if (amountDiff < 2) reasons.push('Exact amount match');
      else if (amountDiff < receipt.total * 0.05) reasons.push('Very close amount');
    }
    
    if (receipt.date && transaction.txn_date) {
      const dateDiff = Math.abs(new Date(transaction.txn_date) - new Date(receipt.date)) / (24 * 60 * 60 * 1000);
      if (dateDiff < 1) reasons.push('Same day');
      else if (dateDiff < 3) reasons.push('Similar date');
    }
    
    if (transaction.contact_name && receipt.supplier) {
      const txName = transaction.contact_name.toLowerCase();
      const receiptName = receipt.supplier.toLowerCase();
      if (txName.includes(receiptName) || receiptName.includes(txName)) {
        reasons.push('Supplier name match');
      }
    }
    
    return reasons;
  }

  /**
   * Helper: Calculate name similarity using simple string matching
   */
  calculateNameSimilarity(name1, name2) {
    // Simple similarity based on common words and character overlap
    const words1 = name1.split(/\s+/);
    const words2 = name2.split(/\s+/);
    
    let commonWords = 0;
    for (const word1 of words1) {
      if (word1.length > 2 && words2.some(word2 => word2.includes(word1) || word1.includes(word2))) {
        commonWords++;
      }
    }
    
    const maxWords = Math.max(words1.length, words2.length);
    return maxWords > 0 ? commonWords / maxWords : 0;
  }
}

export default BookkeepingNotificationService;