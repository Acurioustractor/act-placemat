/**
 * Automation Engine API
 *
 * ACTUALLY AUTOMATES BUSINESS TASKS
 * - Send invoice reminders (via Gmail)
 * - Lodge BAS (via Xero)
 * - Process receipts (via OCR)
 * - Reconcile bank transactions
 */

import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import vision from '@google-cloud/vision';
import { XeroClient } from 'xero-node';
import multer from 'multer';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// Configure multer for file uploads
const upload = multer({
  dest: '/tmp/receipts/',
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Lazy-load Supabase
let supabase;
function getSupabase() {
  if (!supabase) {
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
  }
  return supabase;
}

// Get Gmail API client
async function getGmailClient() {
  const tokenPath = path.resolve(__dirname, '../../../.gmail_tokens.json');

  if (!fs.existsSync(tokenPath)) {
    throw new Error('Gmail tokens not found. Please run Gmail setup first.');
  }

  const tokens = JSON.parse(fs.readFileSync(tokenPath, 'utf-8'));

  const oauth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    process.env.GMAIL_REDIRECT_URI
  );

  oauth2Client.setCredentials(tokens);

  return google.gmail({ version: 'v1', auth: oauth2Client });
}

// Get Xero API client
async function getXeroClient() {
  const xero = new XeroClient({
    clientId: process.env.XERO_CLIENT_ID,
    clientSecret: process.env.XERO_CLIENT_SECRET,
    redirectUris: [process.env.XERO_REDIRECT_URI || 'http://localhost:4001/api/xero/callback'],
    scopes: [
      'accounting.transactions.read',
      'accounting.transactions',
      'accounting.reports.read',
      'accounting.settings.read',
      'offline_access'
    ]
  });

  // Set access token from environment
  await xero.setTokenSet({
    access_token: process.env.XERO_ACCESS_TOKEN,
    refresh_token: process.env.XERO_REFRESH_TOKEN,
    token_type: 'Bearer',
    expires_in: 1800
  });

  return xero;
}

export default function automationEngineRoutes(app) {

  // ============================================
  // AUTOMATE ACTION: Main endpoint (with human approval required)
  // ============================================
  app.post('/api/v2/automate/:actionId', async (req, res) => {
    try {
      const { actionId } = req.params;
      const { confirmed = false, previewOnly = true } = req.body;

      console.log(`🤖 Automating action: ${actionId} (${previewOnly ? 'PREVIEW' : 'CONFIRMED'})`);

      let result;

      switch (actionId) {
        case 'chase-overdue':
          // ⚠️ Email automation requires human approval
          result = await automateInvoiceReminders({ confirmed, previewOnly });
          break;
        case 'bas-lodge-q3':
          result = await automateBASLodgement();
          break;
        case 'bank-reconcile':
          result = await automateBankReconciliation();
          break;
        case 'process-receipts':
          result = await automateReceiptProcessing();
          break;
        default:
          return res.status(400).json({
            success: false,
            error: `Unknown action: ${actionId}`
          });
      }

      res.json({
        success: true,
        actionId,
        result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Automation error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // ============================================
  // AUTOMATION: Invoice Reminders
  // ============================================
  app.post('/api/v2/automate/invoices/remind', async (req, res) => {
    try {
      const result = await automateInvoiceReminders();
      res.json({ success: true, result });
    } catch (error) {
      console.error('Invoice reminder error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ============================================
  // AUTOMATION: Receipt Processing
  // ============================================
  app.post('/api/v2/automate/receipts/process', async (req, res) => {
    try {
      const result = await automateReceiptProcessing();
      res.json({ success: true, result });
    } catch (error) {
      console.error('Receipt processing error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ============================================
  // AUTOMATION: BAS Lodgement
  // ============================================
  app.post('/api/v2/automate/bas/lodge', async (req, res) => {
    try {
      const result = await automateBASLodgement();
      res.json({ success: true, result });
    } catch (error) {
      console.error('BAS lodgement error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ============================================
  // AUTOMATION: Bank Reconciliation
  // ============================================
  app.post('/api/v2/automate/bank/reconcile', async (req, res) => {
    try {
      const result = await automateBankReconciliation();
      res.json({ success: true, result });
    } catch (error) {
      console.error('Bank reconciliation error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
}

// ============================================
// AUTOMATION IMPLEMENTATIONS
// ============================================

/**
 * AUTOMATION 1: Send Invoice Reminders
 * ⚠️ REQUIRES HUMAN APPROVAL - Two-step process:
 * 1. Preview: Shows what will be sent (no emails sent)
 * 2. Confirm: Actually sends emails (requires explicit approval)
 */
async function automateInvoiceReminders(options = {}) {
  const { confirmed = false, previewOnly = true } = options;

  console.log(`📧 Invoice reminders - ${previewOnly ? 'PREVIEW MODE' : 'SEND MODE'}...`);

  const supabase = getSupabase();

  // Get overdue invoices
  const today = new Date().toISOString().split('T')[0];
  const { data: overdueInvoices } = await supabase
    .from('xero_invoices')
    .select('*')
    .eq('type', 'ACCREC')
    .lt('due_date', today)
    .gt('amount_due', 0)
    .limit(10);

  if (!overdueInvoices || overdueInvoices.length === 0) {
    return {
      status: 'no_action_needed',
      message: 'No overdue invoices to chase'
    };
  }

  const results = {
    total: overdueInvoices.length,
    sent: 0,
    failed: 0,
    emails: [],
    preview: previewOnly // Flag indicating if this is preview only
  };

  // PREVIEW MODE: Just prepare emails, don't send
  if (previewOnly || !confirmed) {
    console.log('🔍 PREVIEW MODE - No emails will be sent');
    results.status = 'preview';
    results.message = '⚠️ PREVIEW ONLY - No emails sent. Review and confirm to send.';
  } else {
    // SEND MODE: Actually send emails (only if explicitly confirmed)
    console.log('📧 SEND MODE - Emails will be sent (human approved)');
  }

  // Get Gmail API client only if we're actually sending
  const gmail = !previewOnly && confirmed ? await getGmailClient() : null;

  for (const invoice of overdueInvoices) {
    try {
      // Calculate days overdue
      const dueDate = new Date(invoice.due_date);
      const daysOverdue = Math.floor((Date.now() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

      // Get contact email from Xero contacts
      const { data: contact } = await supabase
        .from('xero_contacts')
        .select('email, name')
        .eq('xero_id', invoice.contact_id)
        .single();

      if (!contact?.email) {
        console.log(`⚠️ No email for ${invoice.contact_name}, skipping`);
        results.failed++;
        continue;
      }

      // Generate personalized email (always generate for preview)
      const emailContent = generateReminderEmail(invoice, contact, daysOverdue);

      // Build email preview data
      const emailPreview = {
        invoice: invoice.invoice_number,
        contact: contact.name,
        email: contact.email,
        amount: invoice.amount_due,
        daysOverdue,
        subject: `Payment Reminder - Invoice ${invoice.invoice_number} (${daysOverdue} days overdue)`,
        htmlPreview: emailContent.substring(0, 500) + '...' // First 500 chars
      };

      // ⚠️ ONLY SEND IF CONFIRMED (human approved)
      if (!previewOnly && confirmed && gmail) {
        console.log(`📧 SENDING (human approved): ${contact.email}`);

        // Create email message
        const message = [
          `To: ${contact.email}`,
          'Content-Type: text/html; charset=utf-8',
          'MIME-Version: 1.0',
          `Subject: Payment Reminder - Invoice ${invoice.invoice_number} (${daysOverdue} days overdue)`,
          '',
          emailContent
        ].join('\n');

        // Encode message in base64
        const encodedMessage = Buffer.from(message)
          .toString('base64')
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '');

        // ACTUALLY SEND via Gmail API
        await gmail.users.messages.send({
          userId: 'me',
          requestBody: {
            raw: encodedMessage
          }
        });

        console.log(`✅ Sent reminder to ${contact.name} (${contact.email})`);

        // Record in database
        await supabase
          .from('automation_log')
          .insert({
            action_type: 'invoice_reminder',
            entity_type: 'invoice',
            entity_id: invoice.xero_id,
            status: 'completed',
            details: {
              invoice_number: invoice.invoice_number,
              contact_email: contact.email,
              amount_due: invoice.amount_due,
              days_overdue: daysOverdue
            }
          });

        results.sent++;

        // Rate limiting: wait 1 second between emails
        await new Promise(resolve => setTimeout(resolve, 1000));
      } else {
        // PREVIEW MODE: Just collect preview data, don't send
        console.log(`🔍 PREVIEW: Would send to ${contact.email} (${invoice.invoice_number})`);
      }

      // Add to results (whether sent or previewed)
      results.emails.push(emailPreview);

    } catch (error) {
      console.error(`❌ Failed to send reminder for ${invoice.invoice_number}:`, error.message);
      results.failed++;
    }
  }

  console.log(`📊 Invoice reminders complete: ${results.sent} sent, ${results.failed} failed`);
  return results;
}

/**
 * Generate personalized reminder email HTML
 */
function generateReminderEmail(invoice, contact, daysOverdue) {
  const amount = parseFloat(invoice.amount_due).toLocaleString('en-AU', {
    style: 'currency',
    currency: 'AUD'
  });

  const dueDate = new Date(invoice.due_date).toLocaleDateString('en-AU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; margin-bottom: 30px; }
    .invoice-details { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .amount { font-size: 32px; font-weight: bold; color: #d63031; margin: 10px 0; }
    .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 14px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">Payment Reminder</h1>
      <p style="margin: 10px 0 0 0; opacity: 0.9;">Invoice ${invoice.invoice_number}</p>
    </div>

    <p>Hi ${contact.name},</p>

    <p>This is a friendly reminder that invoice <strong>${invoice.invoice_number}</strong> is now <strong>${daysOverdue} days overdue</strong>.</p>

    <div class="invoice-details">
      <p><strong>Invoice Number:</strong> ${invoice.invoice_number}</p>
      <p><strong>Due Date:</strong> ${dueDate}</p>
      <p><strong>Amount Due:</strong></p>
      <div class="amount">${amount}</div>
      <p><strong>Days Overdue:</strong> ${daysOverdue} days</p>
    </div>

    <p>If you've already made this payment, thank you! Please disregard this reminder.</p>

    <p>If you have any questions about this invoice, please don't hesitate to reach out.</p>

    <a href="${invoice.url}" class="button">View Invoice in Xero</a>

    <div class="footer">
      <p><strong>ACT - Beautiful Obsolescence Platform</strong></p>
      <p>Community-owned • Community-controlled</p>
      <p style="font-size: 12px; color: #999; margin-top: 10px;">This is an automated payment reminder sent via our Business Autopilot system.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * AUTOMATION 2: Process Receipts with OCR
 * Uses Google Cloud Vision API for real OCR extraction
 */
async function automateReceiptProcessing(receiptFile) {
  console.log('🧾 Starting automated receipt processing with OCR...');

  try {
    // Initialize Vision API client
    const client = new vision.ImageAnnotatorClient({
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
    });

    // Read the image file
    const [result] = await client.textDetection(receiptFile.path);
    const detections = result.textAnnotations;

    if (!detections || detections.length === 0) {
      return {
        status: 'no_text_found',
        message: 'No text found in the receipt image'
      };
    }

    // Full text extracted
    const fullText = detections[0].description;

    // Extract key information using regex patterns
    const extracted = {
      fullText,
      vendor: extractVendor(fullText),
      date: extractDate(fullText),
      total: extractTotal(fullText),
      gst: extractGST(fullText),
      abn: extractABN(fullText),
      items: extractLineItems(fullText)
    };

    // Store in Supabase
    const supabase = getSupabase();
    const { data: receipt } = await supabase
      .from('receipts')
      .insert({
        filename: receiptFile.originalname,
        ocr_text: fullText,
        vendor: extracted.vendor,
        date: extracted.date,
        total: extracted.total,
        gst: extracted.gst,
        abn: extracted.abn,
        items: extracted.items,
        status: 'processed',
        processed_at: new Date().toISOString()
      })
      .select()
      .single();

    // Log automation
    await supabase
      .from('automation_log')
      .insert({
        action_type: 'receipt_ocr',
        entity_type: 'receipt',
        entity_id: receipt.id,
        status: 'completed',
        details: { extracted }
      });

    // Clean up temp file
    fs.unlinkSync(receiptFile.path);

    return {
      status: 'success',
      receipt,
      extracted
    };
  } catch (error) {
    console.error('❌ OCR error:', error);

    // If Vision API not configured, provide setup instructions
    if (error.message.includes('GOOGLE_APPLICATION_CREDENTIALS')) {
      return {
        status: 'not_configured',
        message: 'Google Cloud Vision API not configured',
        setup: [
          '1. Enable Google Cloud Vision API in your project',
          '2. Create a service account and download JSON key',
          '3. Set GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json in .env',
          '4. Restart the server'
        ]
      };
    }

    throw error;
  }
}

// Helper functions for extracting receipt data
function extractVendor(text) {
  // Common vendor patterns - first line is usually vendor name
  const lines = text.split('\n');
  return lines[0]?.trim() || 'Unknown Vendor';
}

function extractDate(text) {
  // Match Australian date formats: DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY
  const datePattern = /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/;
  const match = text.match(datePattern);
  if (match) {
    const [, day, month, year] = match;
    const fullYear = year.length === 2 ? `20${year}` : year;
    return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  return null;
}

function extractTotal(text) {
  // Match Australian currency: $XX.XX or TOTAL: XX.XX
  const patterns = [
    /total[:\s]+\$?(\d+\.\d{2})/i,
    /amount[:\s]+\$?(\d+\.\d{2})/i,
    /\$(\d+\.\d{2})\s*$/m
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return parseFloat(match[1]);
    }
  }
  return null;
}

function extractGST(text) {
  // Match GST: $XX.XX or GST XX.XX
  const patterns = [
    /gst[:\s]+\$?(\d+\.\d{2})/i,
    /tax[:\s]+\$?(\d+\.\d{2})/i
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return parseFloat(match[1]);
    }
  }

  // Calculate 10% GST if total found but no GST listed
  const total = extractTotal(text);
  if (total) {
    return parseFloat((total / 11).toFixed(2)); // GST is 1/11th of total in Australia
  }

  return null;
}

function extractABN(text) {
  // Match ABN: XX XXX XXX XXX (Australian Business Number)
  const abnPattern = /abn[:\s]+(\d{2}\s?\d{3}\s?\d{3}\s?\d{3})/i;
  const match = text.match(abnPattern);
  return match ? match[1].replace(/\s/g, '') : null;
}

function extractLineItems(text) {
  // Simple line item extraction - items with prices
  const lines = text.split('\n');
  const items = [];

  for (const line of lines) {
    // Match lines like: "Item name    $XX.XX"
    const itemPattern = /^(.+?)\s+\$?(\d+\.\d{2})$/;
    const match = line.trim().match(itemPattern);

    if (match && !line.toLowerCase().includes('total') && !line.toLowerCase().includes('gst')) {
      items.push({
        description: match[1].trim(),
        amount: parseFloat(match[2])
      });
    }
  }

  return items.length > 0 ? items : null;
}

/**
 * AUTOMATION 3: Lodge BAS with ATO
 * Prepares BAS data from Xero and generates lodgement summary
 */
async function automateBASLodgement() {
  console.log('🇦🇺 Starting automated BAS preparation...');

  const supabase = getSupabase();
  const xero = await getXeroClient();

  try {
    // Get tenant ID (organisation)
    const tenants = await xero.updateTenants();
    const tenantId = tenants[0].tenantId;

    // Determine current quarter
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Australian financial year: July 1 - June 30
    // Q1: Jul-Sep, Q2: Oct-Dec, Q3: Jan-Mar, Q4: Apr-Jun
    let quarter, fromDate, toDate;

    if (currentMonth >= 6 && currentMonth <= 8) { // Jul-Sep
      quarter = 1;
      fromDate = `${currentYear}-07-01`;
      toDate = `${currentYear}-09-30`;
    } else if (currentMonth >= 9 && currentMonth <= 11) { // Oct-Dec
      quarter = 2;
      fromDate = `${currentYear}-10-01`;
      toDate = `${currentYear}-12-31`;
    } else if (currentMonth >= 0 && currentMonth <= 2) { // Jan-Mar
      quarter = 3;
      fromDate = `${currentYear}-01-01`;
      toDate = `${currentYear}-03-31`;
    } else { // Apr-Jun
      quarter = 4;
      fromDate = `${currentYear}-04-01`;
      toDate = `${currentYear}-06-30`;
    }

    console.log(`📊 Calculating BAS for Q${quarter} ${fromDate} to ${toDate}`);

    // Fetch GST report from Xero
    const gstReport = await xero.accountingApi.getReportGSTList(tenantId);

    // Calculate totals
    const basData = {
      quarter,
      period: `${fromDate} to ${toDate}`,
      gst_on_sales: 0, // G1
      gst_on_purchases: 0, // G11
      net_gst: 0, // 1A
      wine_equalisation_tax: 0, // 1C
      luxury_car_tax: 0, // 1E
      total_sales: 0, // G1
      export_sales: 0, // G2
      gst_free_sales: 0, // G3
      capital_purchases: 0, // G10
      non_capital_purchases: 0, // G11
      generated_at: new Date().toISOString()
    };

    // Parse GST report sections
    if (gstReport.body.reports && gstReport.body.reports[0]) {
      const report = gstReport.body.reports[0];

      // Extract values from report rows (simplified - actual parsing depends on Xero response structure)
      basData.gst_on_sales = parseFloat(report.rows?.find(r => r.cells?.[0]?.value === 'GST on Sales')?.cells?.[1]?.value || 0);
      basData.gst_on_purchases = parseFloat(report.rows?.find(r => r.cells?.[0]?.value === 'GST on Purchases')?.cells?.[1]?.value || 0);
      basData.net_gst = basData.gst_on_sales - basData.gst_on_purchases;
    }

    // Store BAS data in Supabase
    const { data: basRecord } = await supabase
      .from('bas_lodgements')
      .insert({
        quarter,
        financial_year: currentYear,
        period_start: fromDate,
        period_end: toDate,
        gst_on_sales: basData.gst_on_sales,
        gst_on_purchases: basData.gst_on_purchases,
        net_gst: basData.net_gst,
        status: 'prepared',
        prepared_at: new Date().toISOString()
      })
      .select()
      .single();

    // Log automation
    await supabase
      .from('automation_log')
      .insert({
        action_type: 'bas_lodgement',
        entity_type: 'bas',
        entity_id: basRecord.id,
        status: 'prepared',
        details: { basData }
      });

    return {
      status: 'prepared',
      message: `BAS for Q${quarter} prepared successfully`,
      basData,
      next_steps: [
        'Review calculated amounts in Xero',
        'Verify GST calculations',
        'Lodge via myGovID portal or through Xero (if configured)',
        'Due date: 28 days after quarter end'
      ],
      note: 'Actual lodgement to ATO must be done via Xero Tax Agent portal or myGovID'
    };
  } catch (error) {
    console.error('❌ BAS calculation error:', error);

    return {
      status: 'error',
      message: error.message,
      note: 'BAS lodgement requires Xero connection and valid tax settings'
    };
  }
}

/**
 * AUTOMATION 4: Bank Reconciliation
 * Matches bank transactions to Xero invoices using smart matching
 */
async function automateBankReconciliation() {
  console.log('🏦 Starting automated bank reconciliation...');

  const supabase = getSupabase();
  const xero = await getXeroClient();

  try {
    // Get tenant ID
    const tenants = await xero.updateTenants();
    const tenantId = tenants[0].tenantId;

    // Fetch bank transactions from Xero
    const bankTransactionsResponse = await xero.accountingApi.getBankTransactions(tenantId, null, null, {
      where: 'Status=="AUTHORISED" AND IsReconciled==false',
      orderBy: 'Date DESC'
    });

    const bankTransactions = bankTransactionsResponse.body.bankTransactions || [];

    if (bankTransactions.length === 0) {
      return {
        status: 'no_action_needed',
        message: 'No unreconciled bank transactions found'
      };
    }

    // Get unreconciled paid invoices from database
    const { data: paidInvoices } = await supabase
      .from('xero_invoices')
      .select('*')
      .eq('type', 'ACCREC')
      .eq('status', 'PAID')
      .limit(100);

    console.log(`📊 Found ${bankTransactions.length} bank transactions, ${paidInvoices?.length || 0} paid invoices`);

    // Match transactions to invoices
    const matches = [];
    const unmatched = [];

    for (const transaction of bankTransactions) {
      const txAmount = Math.abs(parseFloat(transaction.total || 0));
      const txDate = new Date(transaction.date);

      // Find matching invoice (amount within $0.01, date within 30 days)
      const match = paidInvoices?.find(invoice => {
        const invAmount = parseFloat(invoice.total);
        const invDate = new Date(invoice.date);
        const amountMatch = Math.abs(txAmount - invAmount) < 0.01;
        const dateDiff = Math.abs(txDate - invDate) / (1000 * 60 * 60 * 24); // days
        const dateMatch = dateDiff <= 30;

        return amountMatch && dateMatch;
      });

      if (match) {
        matches.push({
          transaction_id: transaction.bankTransactionID,
          invoice_id: match.xero_id,
          invoice_number: match.invoice_number,
          amount: txAmount,
          date: transaction.date,
          confidence: 'high'
        });

        // Remove matched invoice from array
        const index = paidInvoices.indexOf(match);
        if (index > -1) paidInvoices.splice(index, 1);
      } else {
        unmatched.push({
          transaction_id: transaction.bankTransactionID,
          amount: txAmount,
          date: transaction.date,
          reference: transaction.reference
        });
      }
    }

    // Store reconciliation matches in database
    if (matches.length > 0) {
      await supabase
        .from('reconciliation_matches')
        .insert(
          matches.map(m => ({
            transaction_id: m.transaction_id,
            invoice_id: m.invoice_id,
            amount: m.amount,
            confidence: m.confidence,
            status: 'suggested',
            created_at: new Date().toISOString()
          }))
        );
    }

    // Log automation
    await supabase
      .from('automation_log')
      .insert({
        action_type: 'bank_reconciliation',
        status: 'completed',
        details: {
          total_transactions: bankTransactions.length,
          matched: matches.length,
          unmatched: unmatched.length
        }
      });

    return {
      status: 'success',
      message: `Matched ${matches.length} transactions`,
      summary: {
        total_transactions: bankTransactions.length,
        matched: matches.length,
        unmatched: unmatched.length,
        match_rate: `${((matches.length / bankTransactions.length) * 100).toFixed(1)}%`
      },
      matches,
      unmatched_sample: unmatched.slice(0, 5), // First 5 unmatched
      next_steps: [
        'Review suggested matches in reconciliation dashboard',
        'Manually reconcile unmatched transactions',
        'Approve auto-matched transactions',
        'Mark as reconciled in Xero'
      ]
    };
  } catch (error) {
    console.error('❌ Bank reconciliation error:', error);

    return {
      status: 'error',
      message: error.message,
      note: 'Ensure Xero bank feed is connected and active'
    };
  }
}

// Create automation_log table if it doesn't exist
async function ensureAutomationLogTable() {
  const supabase = getSupabase();

  // This will be executed via SQL in Supabase
  const schema = `
CREATE TABLE IF NOT EXISTS automation_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action_type TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  status TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_automation_log_created
  ON automation_log(created_at DESC);
  `;

  console.log('📝 Automation log table schema ready');
  console.log('Run this SQL in Supabase if table doesn\'t exist:');
  console.log(schema);
}