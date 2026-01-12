/**
 * HTML Email Parser - Extract Amounts from Inline Receipts
 *
 * Handles vendors that send receipts in email body instead of PDF attachments:
 * - Canva (3 subscriptions)
 * - Figma (2 subscriptions)
 * - Xero (1 subscription)
 *
 * Uses Claude AI to extract structured financial data from HTML emails,
 * similar to the proven PDF extraction approach (100% success rate).
 */

import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import * as cheerio from 'cheerio';
import { GmailClient } from '../../../../mcp-servers/gmail-workspace/services/gmailClient.js';
import 'dotenv/config';

export class HtmlEmailParser {
  constructor(gmailClient, supabaseClient, anthropicClient) {
    this.gmailClient = gmailClient;
    this.supabase = supabaseClient || createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    this.anthropic = anthropicClient || new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  /**
   * Parse HTML email to extract subscription data
   *
   * @param {string} htmlContent - Raw HTML email content
   * @param {string} expectedVendor - Expected vendor name (for validation)
   * @returns {Promise<Object>} Extracted data
   */
  async parseHtmlEmail(htmlContent, expectedVendor) {
    // Load HTML with cheerio and extract text
    const $ = cheerio.load(htmlContent);

    // Remove noise (style, script tags)
    $('style, script, img').remove();

    // Extract text content
    const textContent = $('body').text()
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();

    // Use Claude to extract structured data
    const prompt = `Extract subscription billing information from this email receipt:

${textContent.substring(0, 4000)}

Expected vendor: ${expectedVendor}

Return JSON with:
{
  "vendor": "Company name",
  "amount": "Total amount (numeric only, no currency symbols)",
  "currency": "Currency code (USD, AUD, etc.)",
  "date": "Transaction date (YYYY-MM-DD)",
  "invoice_number": "Receipt/invoice number if present",
  "subscription_type": "Plan name (e.g., 'Pro', 'Premium', 'Business')"
}

IMPORTANT:
- Extract the TOTAL amount charged (not subtotal)
- Look for keywords: total, charged, paid, amount due
- Return ONLY valid JSON, no additional text
- Use null for missing fields`;

    const response = await this.anthropic.messages.create({
      model: 'claude-3-7-sonnet-20250219',
      max_tokens: 512,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    const text = response.content[0].text;

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to extract JSON from Claude response');
    }

    const extracted = JSON.parse(jsonMatch[0]);

    // Validate extracted data
    if (!extracted.amount || isNaN(parseFloat(extracted.amount))) {
      throw new Error('Invalid amount extracted');
    }

    return {
      vendor: extracted.vendor,
      amount: parseFloat(extracted.amount),
      currency: extracted.currency || 'USD',
      date: extracted.date,
      invoice_number: extracted.invoice_number,
      subscription_type: extracted.subscription_type,
    };
  }

  /**
   * Process all subscriptions missing amounts that have HTML content
   *
   * @param {string} tenantId - Tenant ID
   * @param {string[]} vendors - Specific vendors to process (default: Canva, Figma, Xero)
   * @returns {Promise<Object>} Processing results
   */
  async processHtmlSubscriptions(tenantId, vendors = ['Canva', 'Figma', 'Xero']) {
    console.log('🔍 Finding HTML-only subscriptions...\n');

    // Find subscriptions missing amounts but with quality score >= 7
    const { data: subscriptions, error } = await this.supabase
      .from('email_financial_documents')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_subscription', true)
      .is('amount', null)
      .gte('data_quality_score', 7)
      .in('vendor', vendors);

    if (error) {
      throw new Error(`Failed to query subscriptions: ${error.message}`);
    }

    console.log(`Found ${subscriptions.length} HTML subscriptions to process\n`);

    const results = {
      success: [],
      failed: [],
      skipped: [],
    };

    for (const sub of subscriptions) {
      console.log(`\n📧 Processing: ${sub.vendor}`);
      console.log(`   Email: ${sub.account_email}`);
      console.log(`   Subject: ${sub.subject}`);

      try {
        // Fetch full email content from Gmail
        console.log('   Fetching email from Gmail...');
        const gmail = await this.gmailClient.getGmailClient(sub.account_email);

        const message = await gmail.users.messages.get({
          userId: 'me',
          id: sub.gmail_message_id,
          format: 'full',
        });

        // Extract HTML body
        const htmlPart = this.findHtmlPart(message.data.payload);

        if (!htmlPart) {
          console.log('   ⚠️  No HTML content found');
          results.skipped.push({
            vendor: sub.vendor,
            reason: 'No HTML content',
          });
          continue;
        }

        const htmlContent = Buffer.from(htmlPart.body.data, 'base64').toString('utf-8');

        // Parse with Claude
        console.log('   Parsing HTML with Claude AI...');
        const extracted = await this.parseHtmlEmail(htmlContent, sub.vendor);

        console.log(`   ✅ Extracted: $${extracted.amount} ${extracted.currency}`);

        // Update database
        const updateData = {
          amount: extracted.amount,
          currency: extracted.currency,
          transaction_date: extracted.date || sub.transaction_date,
          raw_extraction: {
            ...(sub.raw_extraction || {}),
            extracted_from_html: true,
            extraction_date: new Date().toISOString(),
            html_extraction: extracted,
          },
        };

        const { error: updateError } = await this.supabase
          .from('email_financial_documents')
          .update(updateData)
          .eq('id', sub.id);

        if (updateError) {
          console.log(`   ❌ Database update failed: ${updateError.message}`);
          results.failed.push({
            vendor: sub.vendor,
            reason: 'Database update failed',
            error: updateError.message,
          });
          continue;
        }

        console.log('   💾 Database updated successfully');

        results.success.push({
          vendor: sub.vendor,
          amount: extracted.amount,
          currency: extracted.currency,
        });

      } catch (err) {
        console.log(`   ❌ Error: ${err.message}`);
        results.failed.push({
          vendor: sub.vendor,
          reason: err.message,
        });
      }
    }

    return results;
  }

  /**
   * Find HTML part in email payload
   *
   * @param {Object} payload - Gmail message payload
   * @returns {Object|null} HTML part or null
   */
  findHtmlPart(payload) {
    // Direct match
    if (payload.mimeType === 'text/html' && payload.body?.data) {
      return payload;
    }

    // Recursive search in multipart messages
    if (payload.parts) {
      for (const part of payload.parts) {
        const found = this.findHtmlPart(part);
        if (found) return found;
      }
    }

    return null;
  }

  /**
   * Get summary of HTML-parseable subscriptions
   *
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Summary stats
   */
  async getSummary(tenantId) {
    const vendors = ['Canva', 'Figma', 'Xero'];

    const { data: missing, error } = await this.supabase
      .from('email_financial_documents')
      .select('vendor, account_email, subject')
      .eq('tenant_id', tenantId)
      .eq('is_subscription', true)
      .is('amount', null)
      .gte('data_quality_score', 7)
      .in('vendor', vendors);

    if (error) {
      throw new Error(`Failed to query: ${error.message}`);
    }

    // Group by vendor
    const byVendor = missing.reduce((acc, sub) => {
      if (!acc[sub.vendor]) acc[sub.vendor] = [];
      acc[sub.vendor].push(sub);
      return acc;
    }, {});

    return {
      total: missing.length,
      byVendor,
      vendors: Object.keys(byVendor),
    };
  }
}

export default HtmlEmailParser;
