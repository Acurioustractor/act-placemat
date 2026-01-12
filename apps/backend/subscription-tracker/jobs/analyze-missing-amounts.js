#!/usr/bin/env node
/**
 * Analyze Missing Amounts - Systematically Review Subscriptions Without Amounts
 *
 * Analyzes the 65 subscriptions still missing amounts to understand:
 * 1. Which vendors are affected
 * 2. What data sources are available (email, PDF, HTML, Xero)
 * 3. Quality scores (to filter out low-quality entries)
 * 4. Recommendations for enrichment
 *
 * Usage:
 *   node apps/backend/subscription-tracker/jobs/analyze-missing-amounts.js
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const TENANT_ID = '786af1ed-e3ce-42fc-9ea9-ddf3447d79d0';

async function main() {
  console.log('🔍 Analyzing Subscriptions Missing Amounts...\n');
  console.log(`Tenant ID: ${TENANT_ID}`);
  console.log(`Timestamp: ${new Date().toISOString()}\n`);

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    // Fetch subscriptions missing amounts
    const { data: missing, error } = await supabase
      .from('email_financial_documents')
      .select('*')
      .eq('tenant_id', TENANT_ID)
      .eq('is_subscription', true)
      .is('amount', null);

    if (error) {
      throw new Error(`Failed to fetch: ${error.message}`);
    }

    console.log('📊 SUMMARY');
    console.log('═══════════════════════════════════════');
    console.log(`Total subscriptions missing amounts: ${missing.length}\n`);

    // Group by quality score
    const highQuality = missing.filter(s => s.data_quality_score >= 7);
    const mediumQuality = missing.filter(s => s.data_quality_score >= 5 && s.data_quality_score < 7);
    const lowQuality = missing.filter(s => s.data_quality_score < 5);

    console.log('By Quality Score:');
    console.log('─'.repeat(70));
    console.log(`  High (≥7):   ${highQuality.length} subscriptions - Worth investigating`);
    console.log(`  Medium (5-6): ${mediumQuality.length} subscriptions - Maybe worth checking`);
    console.log(`  Low (<5):     ${lowQuality.length} subscriptions - Likely not real subscriptions\n`);

    // Group by vendor
    const byVendor = missing.reduce((acc, sub) => {
      const vendor = sub.vendor || 'Unknown';
      if (!acc[vendor]) {
        acc[vendor] = [];
      }
      acc[vendor].push(sub);
      return acc;
    }, {});

    console.log('\n📦 BY VENDOR (High Quality Only)');
    console.log('═══════════════════════════════════════\n');

    const highQualityByVendor = Object.entries(byVendor)
      .map(([vendor, subs]) => ({
        vendor,
        subs: subs.filter(s => s.data_quality_score >= 7),
      }))
      .filter(({ subs }) => subs.length > 0)
      .sort((a, b) => b.subs.length - a.subs.length);

    for (const { vendor, subs } of highQualityByVendor) {
      console.log(`${vendor} (${subs.length} ${subs.length === 1 ? 'subscription' : 'subscriptions'})`);
      console.log('─'.repeat(70));

      for (const sub of subs) {
        const hasAttachment = sub.raw_extraction?.has_attachment || false;
        const extractedFromPDF = sub.raw_extraction?.extracted_from_pdf || false;
        const extractedFromHTML = sub.raw_extraction?.extracted_from_html || false;

        let dataSource = '❓ Unknown';
        if (extractedFromPDF) dataSource = '📄 PDF (already attempted)';
        else if (extractedFromHTML) dataSource = '🌐 HTML (already attempted)';
        else if (hasAttachment) dataSource = '📎 Has attachment (not yet parsed)';
        else dataSource = '📧 Email only (no attachment)';

        console.log(`  • ${sub.subject.substring(0, 60)}...`);
        console.log(`    Account: ${sub.account_email}`);
        console.log(`    Quality: ${sub.data_quality_score}/10`);
        console.log(`    Source: ${dataSource}`);
        console.log(`    Date: ${sub.transaction_date || 'N/A'}`);
        console.log('');
      }
    }

    // Analyze data sources
    console.log('\n📊 DATA SOURCE ANALYSIS');
    console.log('═══════════════════════════════════════\n');

    const pdfAttempted = highQuality.filter(s => s.raw_extraction?.extracted_from_pdf === true).length;
    const htmlAttempted = highQuality.filter(s => s.raw_extraction?.extracted_from_html === true).length;
    const hasAttachment = highQuality.filter(s =>
      s.raw_extraction?.has_attachment === true &&
      !s.raw_extraction?.extracted_from_pdf
    ).length;
    const emailOnly = highQuality.filter(s => !s.raw_extraction?.has_attachment).length;

    console.log(`PDF extraction attempted:     ${pdfAttempted} (failed to extract)`);
    console.log(`HTML parsing attempted:       ${htmlAttempted} (failed to extract)`);
    console.log(`Has attachments (not parsed): ${hasAttachment} (opportunity)`);
    console.log(`Email only (no attachments):  ${emailOnly} (manual review needed)\n`);

    // Recommendations
    console.log('\n💡 RECOMMENDATIONS');
    console.log('═══════════════════════════════════════\n');

    if (hasAttachment > 0) {
      console.log(`1. ✅ Parse ${hasAttachment} subscriptions with unparsed attachments`);
      console.log('   → Run PDF extractor on these specific emails\n');
    }

    if (pdfAttempted > 0) {
      console.log(`2. 🔍 Review ${pdfAttempted} failed PDF extractions`);
      console.log('   → Check if PDFs are image-based (need OCR)');
      console.log('   → Check if extraction failed due to format issues\n');
    }

    if (emailOnly > 0) {
      console.log(`3. 📧 Check ${emailOnly} email-only subscriptions`);
      console.log('   → May have inline amounts in email body');
      console.log('   → May need manual entry');
      console.log('   → May not be real subscriptions (marketing emails)\n');
    }

    if (lowQuality.length > 0) {
      console.log(`4. 🗑️  Consider removing ${lowQuality.length} low-quality entries`);
      console.log('   → Quality score < 5 indicates forwarded emails or marketing');
      console.log('   → Not likely to be actionable subscriptions\n');
    }

    // Cross-reference with Xero
    console.log('\n💰 XERO CROSS-REFERENCE');
    console.log('═══════════════════════════════════════\n');

    const { data: xeroMatches } = await supabase
      .from('xero_bank_transactions')
      .select('*')
      .eq('type', 'SPEND')
      .in('contact_name', [...new Set(highQuality.map(s => s.vendor))]);

    if (xeroMatches && xeroMatches.length > 0) {
      console.log(`Found ${xeroMatches.length} Xero transactions for vendors missing amounts:\n`);

      const matchedVendors = [...new Set(xeroMatches.map(t => t.contact_name))];
      for (const vendor of matchedVendors) {
        const transactions = xeroMatches.filter(t => t.contact_name === vendor);
        const avgAmount = transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0) / transactions.length;

        console.log(`  ${vendor}:`);
        console.log(`    ${transactions.length} Xero transactions`);
        console.log(`    Avg amount: $${avgAmount.toFixed(2)}`);
        console.log(`    💡 Could use Xero data to backfill amounts\n`);
      }
    } else {
      console.log('No Xero matches found for high-quality missing subscriptions.\n');
    }

    console.log('\n✨ Analysis complete!');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the analysis
main();
