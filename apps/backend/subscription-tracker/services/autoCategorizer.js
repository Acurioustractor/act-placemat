/**
 * Auto-Categorizer - Assign Categories to Subscriptions
 *
 * Uses vendor name matching and keyword detection to automatically
 * assign categories to subscriptions.
 *
 * Categories:
 * - Software/SaaS
 * - Communication
 * - Cloud Storage
 * - Finance/Accounting
 * - Travel
 * - Design/Creative
 * - Marketing
 * - Infrastructure/Hosting
 * - AI/ML Tools
 * - Other
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

export class AutoCategorizer {
  constructor(supabaseClient) {
    this.supabase = supabaseClient || createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Category mapping rules
    this.categoryRules = {
      'Software/SaaS': [
        'figma', 'canva', 'notion', 'airtable', 'monday', 'asana', 'trello',
        'typeform', 'surveymonkey', 'mailchimp', 'hubspot', 'salesforce',
        'zendesk', 'intercom', 'freshdesk', 'jira', 'confluence', 'github',
        'gitlab', 'linear', 'clickup', 'basecamp', 'miro', 'lucidchart',
      ],
      'Communication': [
        'zoom', 'slack', 'microsoft teams', 'google workspace', 'google meet',
        'skype', 'webex', 'discord', 'telegram', 'whatsapp', 'twilio',
        'vonage', 'ringcentral', 'dialpad',
      ],
      'Cloud Storage': [
        'dropbox', 'google drive', 'onedrive', 'box', 'icloud', 'backblaze',
        'sync.com', 'pcloud', 'mega', 'google one',
      ],
      'Finance/Accounting': [
        'xero', 'quickbooks', 'freshbooks', 'wave', 'zoho books', 'sage',
        'stripe', 'paypal', 'square', 'braintree', 'authorize.net',
      ],
      'Travel': [
        'virgin', 'qantas', 'jetstar', 'airbnb', 'booking.com', 'expedia',
        'uber', 'lyft', 'hertz', 'avis', 'budget',
      ],
      'Design/Creative': [
        'adobe', 'sketch', 'invision', 'abstract', 'zeplin', 'framer',
        'principle', 'affinity', 'corel', 'procreate', 'font', 'typography',
      ],
      'Marketing': [
        'mailchimp', 'constant contact', 'sendinblue', 'klaviyo', 'activecampaign',
        'convertkit', 'drip', 'aweber', 'getresponse', 'campaign monitor',
        'hootsuite', 'buffer', 'sprout social', 'later', 'planoly',
      ],
      'Infrastructure/Hosting': [
        'aws', 'amazon web services', 'google cloud', 'azure', 'digitalocean',
        'linode', 'vultr', 'heroku', 'netlify', 'vercel', 'cloudflare',
        'fastly', 'bunny', 'domains', 'domain', 'godaddy', 'namecheap',
      ],
      'AI/ML Tools': [
        'openai', 'anthropic', 'claude', 'chatgpt', 'midjourney', 'ideogram',
        'stable diffusion', 'runway', 'elevenlabs', 'descript', 'otter.ai',
        'jasper', 'copy.ai', 'writesonic', 'hyperwrite',
      ],
      'E-commerce': [
        'shopify', 'woocommerce', 'bigcommerce', 'magento', 'squarespace',
        'wix', 'weebly', 'ecwid',
      ],
      'Analytics': [
        'google analytics', 'mixpanel', 'amplitude', 'heap', 'segment',
        'hotjar', 'fullstory', 'logrocket', 'sentry', 'bugsnag',
      ],
      'Development': [
        'github', 'gitlab', 'bitbucket', 'jenkins', 'circleci', 'travis',
        'codecov', 'datadog', 'new relic', 'splunk', 'postman', 'insomnia',
      ],
    };
  }

  /**
   * Categorize a single subscription based on vendor name
   *
   * @param {string} vendor - Vendor name
   * @returns {string} Category name
   */
  categorizeVendor(vendor) {
    const vendorLower = vendor.toLowerCase();

    // Check each category's keywords
    for (const [category, keywords] of Object.entries(this.categoryRules)) {
      for (const keyword of keywords) {
        if (vendorLower.includes(keyword)) {
          return category;
        }
      }
    }

    // Special cases (exact matches or patterns)
    if (vendorLower.includes('apple') || vendorLower.includes('icloud')) {
      return 'Software/SaaS';
    }

    if (vendorLower.includes('amazon') && !vendorLower.includes('aws')) {
      return 'E-commerce';
    }

    if (vendorLower.includes('google') && vendorLower.includes('domains')) {
      return 'Infrastructure/Hosting';
    }

    // Default to Other
    return 'Other';
  }

  /**
   * Categorize all subscriptions for a tenant
   *
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Categorization results
   */
  async categorizeAllSubscriptions(tenantId) {
    console.log('🏷️  Fetching subscriptions...\n');

    // Fetch all subscriptions
    const { data: subscriptions, error } = await this.supabase
      .from('email_financial_documents')
      .select('id, vendor, category')
      .eq('tenant_id', tenantId)
      .eq('is_subscription', true);

    if (error) {
      throw new Error(`Failed to fetch subscriptions: ${error.message}`);
    }

    console.log(`Found ${subscriptions.length} subscriptions to categorize\n`);

    const results = {
      total: subscriptions.length,
      updated: 0,
      alreadyCategorized: 0,
      byCategory: {},
    };

    // Categorize each subscription
    for (const sub of subscriptions) {
      // Skip if already categorized
      if (sub.category && sub.category !== 'unknown' && sub.category !== 'Other') {
        results.alreadyCategorized++;
        continue;
      }

      // Determine category
      const category = this.categorizeVendor(sub.vendor);

      // Update database
      const { error: updateError } = await this.supabase
        .from('email_financial_documents')
        .update({ category })
        .eq('id', sub.id);

      if (updateError) {
        console.error(`Failed to update ${sub.vendor}: ${updateError.message}`);
        continue;
      }

      results.updated++;

      // Track by category
      if (!results.byCategory[category]) {
        results.byCategory[category] = [];
      }
      results.byCategory[category].push(sub.vendor);
    }

    return results;
  }

  /**
   * Get category summary
   *
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object[]>} Category breakdown
   */
  async getCategorySummary(tenantId) {
    const { data: subscriptions, error } = await this.supabase
      .from('email_financial_documents')
      .select('category, amount, subscription_frequency')
      .eq('tenant_id', tenantId)
      .eq('is_subscription', true);

    if (error) {
      throw new Error(`Failed to fetch: ${error.message}`);
    }

    // Group by category
    const byCategory = subscriptions.reduce((acc, sub) => {
      const cat = sub.category || 'Uncategorized';
      if (!acc[cat]) {
        acc[cat] = {
          category: cat,
          count: 0,
          totalMonthly: 0,
          totalYearly: 0,
        };
      }

      acc[cat].count++;

      // Calculate costs
      if (sub.amount) {
        if (sub.subscription_frequency === 'monthly') {
          acc[cat].totalMonthly += sub.amount;
          acc[cat].totalYearly += sub.amount * 12;
        } else if (sub.subscription_frequency === 'yearly') {
          acc[cat].totalYearly += sub.amount;
          acc[cat].totalMonthly += sub.amount / 12;
        }
      }

      return acc;
    }, {});

    // Convert to array and sort by cost
    return Object.values(byCategory)
      .sort((a, b) => b.totalYearly - a.totalYearly)
      .map(cat => ({
        ...cat,
        totalMonthly: parseFloat(cat.totalMonthly.toFixed(2)),
        totalYearly: parseFloat(cat.totalYearly.toFixed(2)),
      }));
  }
}

export default AutoCategorizer;
