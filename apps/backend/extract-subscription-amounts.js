/**
 * Extract amounts from PDF attachments for subscriptions missing amount data
 *
 * Process:
 * 1. Query subscriptions with quality score >= 7 but missing amounts
 * 2. Download PDF attachments from Gmail
 * 3. Parse PDFs using AI/LLM (Anthropic Claude)
 * 4. Extract amount, date, vendor
 * 5. Update database with extracted data
 *
 * Based on best practices from:
 * - LlamaParse + Gemini workflow patterns
 * - JSON schema validation approach
 * - Gmail API attachment extraction
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import { GmailClient } from '../../mcp-servers/gmail-workspace/services/gmailClient.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize clients
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SERVICE_ACCOUNT_PATH = path.join(__dirname, 'subscription-tracker/config/service-account.json');
const gmailClient = new GmailClient(SERVICE_ACCOUNT_PATH);

const TENANT_ID = '786af1ed-e3ce-42fc-9ea9-ddf3447d79d0';
const TEMP_DIR = path.join(__dirname, '../../tmp/invoice-pdfs');

// Ensure temp directory exists
await fs.mkdir(TEMP_DIR, { recursive: true });

/**
 * Download PDF attachments from a Gmail message
 */
async function downloadPDFAttachments(userEmail, messageId) {
  // Get Gmail client for the user
  const gmail = await gmailClient.getGmailClient(userEmail);

  const message = await gmail.users.messages.get({
    userId: 'me',
    id: messageId,
    format: 'full',
  });

  const attachments = [];

  // Find PDF attachments
  function findPDFs(parts, parentFilename = '') {
    if (!parts) return;

    for (const part of parts) {
      if (part.mimeType === 'application/pdf' && part.body?.attachmentId) {
        attachments.push({
          attachmentId: part.body.attachmentId,
          filename: part.filename || `${parentFilename}_attachment.pdf`,
          size: part.body.size,
        });
      }

      if (part.parts) {
        findPDFs(part.parts, part.filename || parentFilename);
      }
    }
  }

  findPDFs(message.data.payload.parts);

  // Download each PDF
  const downloadedFiles = [];

  for (const attachment of attachments) {
    const attachmentData = await gmail.users.messages.attachments.get({
      userId: 'me',
      messageId: messageId,
      id: attachment.attachmentId,
    });

    const data = Buffer.from(attachmentData.data.data, 'base64');
    const filepath = path.join(TEMP_DIR, `${messageId}_${attachment.filename}`);

    await fs.writeFile(filepath, data);

    downloadedFiles.push({
      filepath,
      filename: attachment.filename,
      size: attachment.size,
    });

    console.log(`   Downloaded: ${attachment.filename} (${attachment.size} bytes)`);
  }

  return downloadedFiles;
}

/**
 * Parse PDF invoice using Claude Vision API
 */
async function parseInvoicePDF(filepath, expectedVendor) {
  // Read PDF as base64
  const pdfData = await fs.readFile(filepath);
  const base64PDF = pdfData.toString('base64');

  const prompt = `You are an invoice data extraction assistant. Analyze this PDF invoice and extract the following information in JSON format:

{
  "vendor": "Company name that issued the invoice",
  "amount": "Total amount (numeric value only, no currency symbols)",
  "currency": "Currency code (USD, AUD, etc.)",
  "invoice_number": "Invoice or receipt number",
  "invoice_date": "Date in YYYY-MM-DD format",
  "line_items": [
    {
      "description": "Item description",
      "amount": "Item amount"
    }
  ]
}

Expected vendor: ${expectedVendor}

IMPORTANT:
- Extract the TOTAL amount due or paid (not individual line items unless necessary for context)
- If multiple amounts exist (subtotal, tax, total), extract the final TOTAL amount
- For subscription invoices, extract the recurring amount
- Return ONLY valid JSON, no additional text
- If information is unclear, use null for that field`;

  const response = await anthropic.messages.create({
    model: 'claude-3-7-sonnet-20250219',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: base64PDF,
            },
          },
          {
            type: 'text',
            text: prompt,
          },
        ],
      },
    ],
  });

  // Extract JSON from response
  const text = response.content[0].text;

  // Try to find JSON in the response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No JSON found in Claude response');
  }

  const extracted = JSON.parse(jsonMatch[0]);

  return extracted;
}

/**
 * Main extraction process
 */
async function extractSubscriptionAmounts() {
  console.log('🔍 Finding subscriptions missing amounts...\n');

  // Query subscriptions with high quality score but missing amounts
  const { data: subscriptions, error } = await supabase
    .from('email_financial_documents')
    .select('*')
    .eq('tenant_id', TENANT_ID)
    .eq('is_subscription', true)
    .gte('data_quality_score', 7)
    .is('amount', null)
    .not('gmail_message_id', 'is', null)
    .order('vendor');

  if (error) {
    console.error('Database query failed:', error);
    return;
  }

  console.log(`Found ${subscriptions.length} subscriptions to process\n`);

  const results = {
    success: [],
    failed: [],
    skipped: [],
  };

  for (const subscription of subscriptions) {
    console.log(`\n📧 Processing: ${subscription.vendor}`);
    console.log(`   Email: ${subscription.account_email}`);
    console.log(`   Subject: ${subscription.subject}`);
    console.log(`   Message ID: ${subscription.gmail_message_id}`);

    try {
      // Download PDF attachments
      console.log('   Downloading attachments...');
      const attachments = await downloadPDFAttachments(
        subscription.account_email,
        subscription.gmail_message_id
      );

      if (attachments.length === 0) {
        console.log('   ⚠️  No PDF attachments found');
        results.skipped.push({
          vendor: subscription.vendor,
          reason: 'No PDF attachments',
        });
        continue;
      }

      console.log(`   Found ${attachments.length} PDF(s)`);

      // Parse the first PDF (usually the invoice)
      console.log('   Parsing invoice with Claude...');
      const extracted = await parseInvoicePDF(
        attachments[0].filepath,
        subscription.vendor
      );

      console.log('   ✅ Extracted data:', JSON.stringify(extracted, null, 2));

      // Validate extracted data
      if (!extracted.amount || isNaN(parseFloat(extracted.amount))) {
        console.log('   ⚠️  Failed to extract valid amount');
        results.failed.push({
          vendor: subscription.vendor,
          reason: 'Invalid amount extracted',
          extracted,
        });
        continue;
      }

      // Update database
      const updateData = {
        amount: parseFloat(extracted.amount),
        currency: extracted.currency || 'USD',
        raw_extraction: {
          ...(subscription.raw_extraction || {}),
          extracted_from_pdf: true,
          extraction_date: new Date().toISOString(),
          invoice_number: extracted.invoice_number,
          invoice_date: extracted.invoice_date,
          line_items: extracted.line_items,
          pdf_extraction: extracted,
        },
      };

      // If transaction_date is missing and we extracted invoice_date, use it
      if (!subscription.transaction_date && extracted.invoice_date) {
        updateData.transaction_date = extracted.invoice_date;
      }

      const { error: updateError } = await supabase
        .from('email_financial_documents')
        .update(updateData)
        .eq('id', subscription.id);

      if (updateError) {
        console.log('   ❌ Database update failed:', updateError.message);
        results.failed.push({
          vendor: subscription.vendor,
          reason: 'Database update failed',
          error: updateError.message,
        });
        continue;
      }

      console.log(`   💾 Updated database: $${extracted.amount} ${extracted.currency || ''}`);

      results.success.push({
        vendor: subscription.vendor,
        amount: extracted.amount,
        currency: extracted.currency,
      });

      // Clean up downloaded files
      for (const attachment of attachments) {
        await fs.unlink(attachment.filepath).catch(() => {});
      }

    } catch (err) {
      console.log('   ❌ Error:', err.message);
      results.failed.push({
        vendor: subscription.vendor,
        reason: err.message,
      });
    }
  }

  // Print summary
  console.log('\n\n📊 EXTRACTION SUMMARY');
  console.log('═══════════════════════════════════════');
  console.log(`✅ Successfully extracted: ${results.success.length}`);
  console.log(`❌ Failed: ${results.failed.length}`);
  console.log(`⚠️  Skipped (no PDFs): ${results.skipped.length}`);

  if (results.success.length > 0) {
    console.log('\n✅ Successful Extractions:');
    for (const item of results.success) {
      console.log(`   • ${item.vendor}: $${item.amount} ${item.currency || ''}`);
    }
  }

  if (results.failed.length > 0) {
    console.log('\n❌ Failed Extractions:');
    for (const item of results.failed) {
      console.log(`   • ${item.vendor}: ${item.reason}`);
    }
  }

  if (results.skipped.length > 0) {
    console.log('\n⚠️  Skipped (no PDF attachments):');
    for (const item of results.skipped) {
      console.log(`   • ${item.vendor}`);
    }
  }
}

// Run the extraction
console.log('🚀 Starting PDF invoice extraction...\n');
extractSubscriptionAmounts()
  .then(() => {
    console.log('\n✨ Extraction complete!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n💥 Fatal error:', err);
    process.exit(1);
  });
