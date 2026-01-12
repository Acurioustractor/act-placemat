#!/usr/bin/env node
/**
 * Fix Forwarded Email Vendor Extraction
 *
 * Problem: Emails with "Fwd:" prefix extract the forwarder's name (Nicholas Marchesi)
 * as the vendor instead of the actual vendor from the subject line.
 *
 * Solution:
 * 1. Find all subscriptions with vendor="Nicholas Marchesi" or "Nicholas"
 * 2. Check if subject starts with "Fwd:"
 * 3. Extract real vendor from subject line (e.g., "Fwd: Your tax invoice from Apple" → "Apple")
 * 4. Update vendor field with correct vendor
 * 5. Re-run categorization on fixed vendors
 *
 * Usage:
 *   node apps/backend/subscription-tracker/jobs/fix-forwarded-emails.js
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const TENANT_ID = '786af1ed-e3ce-42fc-9ea9-ddf3447d79d0';

/**
 * Extract vendor from forwarded email subject
 * Examples:
 *   "Fwd: Your tax invoice from Apple." → "Apple"
 *   "Fwd: Here is your Typeform invoice" → "Typeform"
 *   "Fwd: Receipt from Stripe" → "Stripe"
 */
function extractVendorFromSubject(subject) {
  if (!subject || !subject.toLowerCase().startsWith('fwd:')) {
    return null;
  }

  // Remove "Fwd:" prefix
  const cleanSubject = subject.replace(/^Fwd:\s*/i, '').trim();

  // Common patterns for vendor extraction
  const patterns = [
    /(?:from|by)\s+([A-Z][A-Za-z0-9\s&.]+?)(?:\.|$|\s-)/i, // "from Apple" or "by Apple"
    /your\s+([A-Z][A-Za-z0-9\s&.]+?)\s+(?:invoice|receipt|subscription)/i, // "your Apple invoice"
    /([A-Z][A-Za-z0-9\s&.]+?)\s+(?:invoice|receipt|subscription)/i, // "Apple invoice"
    /^([A-Z][A-Za-z0-9\s&.]+?)(?:\s+-|\s+\||:)/i, // "Apple - Invoice" or "Apple | Receipt"
  ];

  for (const pattern of patterns) {
    const match = cleanSubject.match(pattern);
    if (match && match[1]) {
      let vendor = match[1].trim();

      // Clean up common false positives
      if (['Your', 'Here', 'This', 'The', 'A', 'An'].includes(vendor)) {
        continue;
      }

      // Remove trailing punctuation
      vendor = vendor.replace(/[.,;:!?]+$/, '').trim();

      return vendor;
    }
  }

  return null;
}

/**
 * Alternative: Try to extract vendor from email body or raw_extraction metadata
 */
function extractVendorFromMetadata(record) {
  // Check if raw_extraction has vendor info
  if (record.raw_extraction?.vendor) {
    return record.raw_extraction.vendor;
  }

  // Check if there's a "to:" field in raw_extraction (original sender before forward)
  if (record.raw_extraction?.original_sender) {
    return record.raw_extraction.original_sender;
  }

  return null;
}

async function main() {
  console.log('🔧 Starting Forwarded Email Vendor Fix...\n');
  console.log(`Tenant ID: ${TENANT_ID}`);
  console.log(`Timestamp: ${new Date().toISOString()}\n`);

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    // Step 1: Find all forwarded emails with incorrect vendor
    console.log('📊 FINDING FORWARDED EMAILS');
    console.log('═══════════════════════════════════════\n');

    const { data: problematic, error: fetchError } = await supabase
      .from('email_financial_documents')
      .select('*')
      .eq('tenant_id', TENANT_ID)
      .eq('is_subscription', true)
      .or('vendor.eq.Nicholas Marchesi,vendor.eq.Nicholas')
      .ilike('subject', 'Fwd:%');

    if (fetchError) {
      throw new Error(`Failed to fetch forwarded emails: ${fetchError.message}`);
    }

    console.log(`Found ${problematic.length} forwarded emails with incorrect vendor\n`);

    if (problematic.length === 0) {
      console.log('✅ No forwarded emails to fix!');
      process.exit(0);
    }

    // Step 2: Extract correct vendors and update
    console.log('🔍 EXTRACTING CORRECT VENDORS');
    console.log('═══════════════════════════════════════\n');

    const results = {
      fixed: 0,
      failed: 0,
      skipped: 0,
      fixes: [],
    };

    for (const record of problematic) {
      console.log(`Processing: ${record.subject}`);
      console.log(`  Current vendor: ${record.vendor}`);

      // Try to extract vendor from subject
      let correctVendor = extractVendorFromSubject(record.subject);

      // If that fails, try metadata
      if (!correctVendor) {
        correctVendor = extractVendorFromMetadata(record);
      }

      if (!correctVendor) {
        console.log(`  ⚠️  Could not extract vendor - skipping\n`);
        results.skipped++;
        continue;
      }

      console.log(`  ✅ Extracted vendor: ${correctVendor}`);

      // Update the record
      const { error: updateError } = await supabase
        .from('email_financial_documents')
        .update({
          vendor: correctVendor,
          // Clear category so it gets re-categorized
          category: null,
          // Add note about fix
          raw_extraction: {
            ...record.raw_extraction,
            vendor_fix: {
              original_vendor: record.vendor,
              corrected_vendor: correctVendor,
              fix_date: new Date().toISOString(),
              fix_reason: 'Forwarded email vendor extraction correction',
            },
          },
        })
        .eq('id', record.id);

      if (updateError) {
        console.log(`  ❌ Failed to update: ${updateError.message}\n`);
        results.failed++;
        continue;
      }

      console.log(`  ✅ Updated successfully\n`);
      results.fixed++;
      results.fixes.push({
        id: record.id,
        subject: record.subject,
        oldVendor: record.vendor,
        newVendor: correctVendor,
        amount: record.amount,
      });
    }

    // Summary
    console.log('\n\n📊 FIX SUMMARY');
    console.log('═══════════════════════════════════════');
    console.log(`Total forwarded emails found: ${problematic.length}`);
    console.log(`✅ Fixed: ${results.fixed}`);
    console.log(`⏭️  Skipped: ${results.skipped} (could not extract vendor)`);
    console.log(`❌ Failed: ${results.failed}\n`);

    if (results.fixed > 0) {
      console.log('📋 VENDOR CORRECTIONS:');
      console.log('─'.repeat(70));
      for (const fix of results.fixes) {
        console.log(`  • ${fix.oldVendor} → ${fix.newVendor}`);
        console.log(`    Subject: ${fix.subject}`);
        console.log(`    Amount: $${fix.amount}\n`);
      }
    }

    console.log('\n💡 NEXT STEPS');
    console.log('═══════════════════════════════════════');
    console.log('1. Run auto-categorization to categorize fixed vendors');
    console.log('2. Verify vendors in dashboard');
    console.log('3. Check for any remaining "Nicholas Marchesi" entries\n');

    console.log('✨ Fix complete!');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the fix
main();
