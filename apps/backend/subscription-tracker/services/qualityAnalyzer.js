/**
 * Quality Analyzer - Assess Data Completeness
 *
 * Analyzes subscription data quality to identify:
 * 1. Field completeness (what % have amounts, dates, etc.)
 * 2. By-vendor analysis (which vendors have complete data)
 * 3. By-account analysis (which email accounts are best tracked)
 * 4. Gaps and recommendations (what enrichment to run next)
 *
 * Provides A-F grading for each metric to easily identify priorities.
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

export class QualityAnalyzer {
  constructor(supabaseClient) {
    this.supabase = supabaseClient || createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
  }

  /**
   * Analyze overall data quality for a tenant
   *
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Quality metrics
   */
  async analyzeDataQuality(tenantId) {
    console.log(`🔍 Analyzing data quality for tenant ${tenantId}...\n`);

    // Fetch all subscriptions
    const { data: subscriptions, error } = await this.supabase
      .from('email_financial_documents')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_subscription', true);

    if (error) {
      throw new Error(`Failed to fetch subscriptions: ${error.message}`);
    }

    console.log(`Found ${subscriptions.length} total subscriptions\n`);

    // Calculate field completeness
    const fields = {
      amount: this.calculateCompleteness(subscriptions, 'amount'),
      vendor: this.calculateCompleteness(subscriptions, 'vendor'),
      transaction_date: this.calculateCompleteness(subscriptions, 'transaction_date'),
      frequency: this.calculateCompleteness(subscriptions, 'subscription_frequency'),
      category: this.calculateCompleteness(subscriptions, 'category'),
      tags: this.calculateCompletenessArray(subscriptions, 'tags'),
      account_email: this.calculateCompleteness(subscriptions, 'account_email'),
      currency: this.calculateCompleteness(subscriptions, 'currency'),
    };

    // Analyze by vendor
    const byVendor = this.analyzeByVendor(subscriptions);

    // Analyze by account
    const byAccount = this.analyzeByAccount(subscriptions);

    // Identify gaps and recommendations
    const gaps = this.identifyGaps(subscriptions);

    // Calculate overall quality score
    const overallScore = this.calculateOverallScore(fields);

    return {
      total: subscriptions.length,
      overallScore,
      fields,
      byVendor,
      byAccount,
      gaps,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Calculate completeness for a single field
   *
   * @param {Object[]} subscriptions - All subscriptions
   * @param {string} field - Field name
   * @returns {Object} Completeness metrics
   */
  calculateCompleteness(subscriptions, field) {
    const filled = subscriptions.filter(s =>
      s[field] != null &&
      s[field] !== '' &&
      s[field] !== 'unknown'
    ).length;

    const missing = subscriptions.length - filled;
    const percentage = (filled / subscriptions.length) * 100;

    return {
      filled,
      missing,
      percentage: parseFloat(percentage.toFixed(1)),
      grade: this.getGrade(percentage),
    };
  }

  /**
   * Calculate completeness for array fields (like tags)
   *
   * @param {Object[]} subscriptions - All subscriptions
   * @param {string} field - Field name
   * @returns {Object} Completeness metrics
   */
  calculateCompletenessArray(subscriptions, field) {
    const filled = subscriptions.filter(s =>
      Array.isArray(s[field]) && s[field].length > 0
    ).length;

    const missing = subscriptions.length - filled;
    const percentage = (filled / subscriptions.length) * 100;

    return {
      filled,
      missing,
      percentage: parseFloat(percentage.toFixed(1)),
      grade: this.getGrade(percentage),
    };
  }

  /**
   * Convert percentage to letter grade
   *
   * @param {number} percentage - Percentage (0-100)
   * @returns {string} Grade (A-F)
   */
  getGrade(percentage) {
    if (percentage >= 90) return 'A';
    if (percentage >= 75) return 'B';
    if (percentage >= 60) return 'C';
    if (percentage >= 40) return 'D';
    return 'F';
  }

  /**
   * Analyze completeness by vendor
   *
   * @param {Object[]} subscriptions - All subscriptions
   * @returns {Object[]} Vendor analysis
   */
  analyzeByVendor(subscriptions) {
    // Group by vendor
    const byVendor = subscriptions.reduce((acc, sub) => {
      const vendor = sub.vendor || 'Unknown';
      if (!acc[vendor]) acc[vendor] = [];
      acc[vendor].push(sub);
      return acc;
    }, {});

    // Calculate completeness for each vendor
    const analysis = Object.entries(byVendor).map(([vendor, subs]) => {
      const completeness = this.calculateOverallCompleteness(subs);
      const missingFields = this.identifyMissingFieldsForGroup(subs);

      return {
        vendor,
        count: subs.length,
        completeness: parseFloat(completeness.toFixed(1)),
        grade: this.getGrade(completeness),
        missingFields,
        hasAmount: subs.filter(s => s.amount != null).length,
        hasFrequency: subs.filter(s => s.subscription_frequency != null).length,
      };
    });

    // Sort by count (most subscriptions first)
    return analysis.sort((a, b) => b.count - a.count);
  }

  /**
   * Analyze completeness by email account
   *
   * @param {Object[]} subscriptions - All subscriptions
   * @returns {Object[]} Account analysis
   */
  analyzeByAccount(subscriptions) {
    // Group by account
    const byAccount = subscriptions.reduce((acc, sub) => {
      const account = sub.account_email || 'Unknown';
      if (!acc[account]) acc[account] = [];
      acc[account].push(sub);
      return acc;
    }, {});

    // Calculate completeness for each account
    const analysis = Object.entries(byAccount).map(([account, subs]) => {
      const completeness = this.calculateOverallCompleteness(subs);

      return {
        account,
        count: subs.length,
        completeness: parseFloat(completeness.toFixed(1)),
        grade: this.getGrade(completeness),
        hasAmount: subs.filter(s => s.amount != null).length,
        hasFrequency: subs.filter(s => s.subscription_frequency != null).length,
      };
    });

    // Sort by completeness (best first)
    return analysis.sort((a, b) => b.completeness - a.completeness);
  }

  /**
   * Calculate overall completeness for a group
   *
   * @param {Object[]} subscriptions - Subscriptions in group
   * @returns {number} Overall completeness percentage
   */
  calculateOverallCompleteness(subscriptions) {
    const fields = ['amount', 'transaction_date', 'subscription_frequency', 'vendor'];
    let totalFilled = 0;
    let totalFields = subscriptions.length * fields.length;

    for (const sub of subscriptions) {
      for (const field of fields) {
        if (sub[field] != null && sub[field] !== '' && sub[field] !== 'unknown') {
          totalFilled++;
        }
      }
    }

    return (totalFilled / totalFields) * 100;
  }

  /**
   * Identify missing fields for a group
   *
   * @param {Object[]} subscriptions - Subscriptions in group
   * @returns {string[]} Missing field names
   */
  identifyMissingFieldsForGroup(subscriptions) {
    const fields = {
      amount: 'amount',
      transaction_date: 'date',
      subscription_frequency: 'frequency',
      category: 'category',
    };

    const missing = [];

    for (const [field, label] of Object.entries(fields)) {
      const missingCount = subscriptions.filter(s =>
        s[field] == null || s[field] === '' || s[field] === 'unknown'
      ).length;

      if (missingCount > 0) {
        missing.push(`${label} (${missingCount})`);
      }
    }

    return missing;
  }

  /**
   * Identify gaps and generate recommendations
   *
   * @param {Object[]} subscriptions - All subscriptions
   * @returns {Object[]} Gaps with recommendations
   */
  identifyGaps(subscriptions) {
    const gaps = [];

    // Gap 1: Missing amounts
    const noAmount = subscriptions.filter(s => !s.amount);
    if (noAmount.length > 0) {
      const vendors = [...new Set(noAmount.map(s => s.vendor))];
      const hasPDF = noAmount.filter(s => s.raw_extraction?.extracted_from_pdf === false);

      gaps.push({
        type: 'missing_amount',
        severity: 'high',
        count: noAmount.length,
        percentage: ((noAmount.length / subscriptions.length) * 100).toFixed(1),
        vendors: vendors.slice(0, 10),
        recommendation: hasPDF.length > 0
          ? 'Run HTML email parser for inline receipts'
          : 'Run PDF extraction or check for attachments',
        action: 'node apps/backend/subscription-tracker/jobs/process-html-emails.js',
      });
    }

    // Gap 2: Missing frequency
    const noFrequency = subscriptions.filter(s => !s.subscription_frequency);
    if (noFrequency.length > 0) {
      gaps.push({
        type: 'missing_frequency',
        severity: 'medium',
        count: noFrequency.length,
        percentage: ((noFrequency.length / subscriptions.length) * 100).toFixed(1),
        recommendation: 'Run payment prediction algorithm to detect patterns',
        action: 'Implement payment pattern detection (Phase 4)',
      });
    }

    // Gap 3: Missing categories
    const noCategory = subscriptions.filter(s => !s.category || s.category === 'unknown');
    if (noCategory.length > 0) {
      gaps.push({
        type: 'missing_category',
        severity: 'low',
        count: noCategory.length,
        percentage: ((noCategory.length / subscriptions.length) * 100).toFixed(1),
        recommendation: 'Auto-categorize based on vendor names and keywords',
        action: 'Implement auto-categorization (future enhancement)',
      });
    }

    // Gap 4: Low quality scores
    const lowQuality = subscriptions.filter(s => s.data_quality_score < 7);
    if (lowQuality.length > 0) {
      gaps.push({
        type: 'low_quality_score',
        severity: 'medium',
        count: lowQuality.length,
        percentage: ((lowQuality.length / subscriptions.length) * 100).toFixed(1),
        recommendation: 'Review and clean up low-quality entries (forwarded emails, marketing)',
        action: 'Manual review required',
      });
    }

    return gaps.sort((a, b) => {
      const severityOrder = { high: 0, medium: 1, low: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }

  /**
   * Calculate overall quality score
   *
   * @param {Object} fields - Field completeness metrics
   * @returns {Object} Overall score
   */
  calculateOverallScore(fields) {
    // Weighted average (critical fields weighted higher)
    const weights = {
      amount: 0.3,
      vendor: 0.2,
      transaction_date: 0.2,
      frequency: 0.15,
      category: 0.05,
      currency: 0.05,
      account_email: 0.05,
    };

    let weightedSum = 0;
    let totalWeight = 0;

    for (const [field, weight] of Object.entries(weights)) {
      if (fields[field]) {
        weightedSum += fields[field].percentage * weight;
        totalWeight += weight;
      }
    }

    const score = weightedSum / totalWeight;

    return {
      score: parseFloat(score.toFixed(1)),
      grade: this.getGrade(score),
      interpretation: this.interpretScore(score),
    };
  }

  /**
   * Interpret overall score
   *
   * @param {number} score - Overall score (0-100)
   * @returns {string} Interpretation
   */
  interpretScore(score) {
    if (score >= 90) return 'Excellent - Data is highly complete';
    if (score >= 75) return 'Good - Most critical data present';
    if (score >= 60) return 'Fair - Some important gaps remain';
    if (score >= 40) return 'Poor - Significant data missing';
    return 'Critical - Major enrichment needed';
  }

  /**
   * Generate a summary report
   *
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<void>}
   */
  async generateReport(tenantId) {
    const quality = await this.analyzeDataQuality(tenantId);

    console.log('\n📊 DATA QUALITY REPORT');
    console.log('═══════════════════════════════════════\n');

    console.log(`Total Subscriptions: ${quality.total}`);
    console.log(`Overall Quality Score: ${quality.overallScore.score}% (Grade ${quality.overallScore.grade})`);
    console.log(`${quality.overallScore.interpretation}\n`);

    console.log('Field Completeness:');
    console.log('─'.repeat(70));

    for (const [field, metrics] of Object.entries(quality.fields)) {
      const bar = this.renderProgressBar(metrics.percentage);
      console.log(`  ${field.padEnd(20)} ${bar} ${metrics.percentage}% (${metrics.grade})`);
      console.log(`  ${' '.repeat(20)} ${metrics.filled} filled / ${metrics.missing} missing`);
    }

    console.log('\n\nTop Vendors by Count:');
    console.log('─'.repeat(70));

    for (const vendor of quality.byVendor.slice(0, 10)) {
      console.log(`\n  ${vendor.vendor} (${vendor.count} subscriptions)`);
      console.log(`    Completeness: ${vendor.completeness}% (Grade ${vendor.grade})`);
      console.log(`    Has amount: ${vendor.hasAmount}/${vendor.count}`);
      console.log(`    Has frequency: ${vendor.hasFrequency}/${vendor.count}`);
      if (vendor.missingFields.length > 0) {
        console.log(`    Missing: ${vendor.missingFields.join(', ')}`);
      }
    }

    console.log('\n\nBy Email Account:');
    console.log('─'.repeat(70));

    for (const account of quality.byAccount) {
      console.log(`\n  ${account.account} (${account.count} subscriptions)`);
      console.log(`    Completeness: ${account.completeness}% (Grade ${account.grade})`);
      console.log(`    Has amount: ${account.hasAmount}/${account.count}`);
    }

    console.log('\n\n🔍 IDENTIFIED GAPS');
    console.log('═══════════════════════════════════════\n');

    for (const gap of quality.gaps) {
      const emoji = gap.severity === 'high' ? '🔴' : gap.severity === 'medium' ? '🟡' : '🟢';
      console.log(`${emoji} ${gap.type.toUpperCase()} (${gap.severity.toUpperCase()})`);
      console.log(`   Count: ${gap.count} subscriptions (${gap.percentage}%)`);
      console.log(`   💡 ${gap.recommendation}`);
      console.log(`   ⚡ ${gap.action}`);
      console.log('');
    }

    return quality;
  }

  /**
   * Render a simple progress bar
   *
   * @param {number} percentage - Percentage (0-100)
   * @returns {string} Progress bar
   */
  renderProgressBar(percentage) {
    const width = 20;
    const filled = Math.round((percentage / 100) * width);
    const empty = width - filled;

    return '[' + '█'.repeat(filled) + '░'.repeat(empty) + ']';
  }
}

export default QualityAnalyzer;
