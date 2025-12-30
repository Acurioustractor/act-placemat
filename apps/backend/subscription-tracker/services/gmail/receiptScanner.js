/**
 * Gmail Receipt Scanner
 *
 * R&D Component: Multi-Signal Email Detection for Subscription Discovery
 * Hypothesis: Gmail search with combined keyword patterns (subscription + receipt + invoice)
 *             will achieve 80%+ recall on discovering subscription-related emails with <10% false positives.
 * Methodology: Combine subscription/receipt/invoice terms, analyze sender/subject/body with weighted scoring
 * Success Metric: Recall >= 80%, Precision >= 90% on manual validation set
 * Findings: TBD after testing
 */

import config from '../../config/settings.js';

export class ReceiptScanner {
  constructor(gmailService) {
    this.gmailService = gmailService;
    this.keywords = {
      strong: config.gmail.keywords.strong,
      moderate: config.gmail.keywords.moderate
    };
  }

  /**
   * R&D Method: Multi-keyword Gmail search with date filtering
   * Hypothesis: Combining subscription-specific terms with receipt/invoice keywords
   *             reduces false positives by 40% vs. single-term search
   * Target: 80% recall, 90% precision on subscription emails
   */
  async scanForReceipts(options = {}) {
    const {
      maxResults = config.gmail.maxResults,
      timeframe = config.gmail.defaultTimeframe,
      includeThreads = false
    } = options;

    // Build Gmail search queries
    // Strategy: Use comprehensive queries to maximize recall while avoiding rate limits
    const queries = [
      // Primary query: catch most subscription emails
      `(subscription OR recurring OR "auto-renew") AND (receipt OR invoice OR billing) after:${this.getDateString(timeframe)}`,
      // Secondary: payment confirmations
      `("monthly" OR "yearly" OR "annual") AND ("payment" OR "charge" OR "subscription") after:${this.getDateString(timeframe)}`,
      // Tertiary: from common billing senders
      `from:(noreply OR billing OR subscriptions) subject:(receipt OR invoice OR payment) after:${this.getDateString(timeframe)}`
    ];

    const results = [];

    // Execute searches
    for (const query of queries) {
      try {
        const messages = await this.gmailService.searchEmails({
          query,
          maxResults
        });
        results.push(...(messages || []));
      } catch (error) {
        console.error(`[Gmail Scanner] Error with query "${query}":`, error.message);
        // Continue with other queries even if one fails
      }
    }

    // Deduplicate by message ID
    const uniqueMessages = [...new Map(
      results.map(m => [m.id, m])
    ).values()];

    // R&D Metric: Log recall rate estimation
    console.log(`[R&D] Gmail Scanner: Scanned ${uniqueMessages.length} unique messages from ${results.length} total results`);

    return uniqueMessages;
  }

  /**
   * Extract receipt/subscription signals from email metadata
   *
   * R&D Hypothesis: Sender domain + subject keywords + body analysis predicts subscription
   *                 with 85% accuracy (vs 60% from subject alone)
   *
   * Scoring Algorithm:
   * - Subscription keyword in subject: +0.3
   * - Receipt/invoice keyword: +0.2
   * - Has attachment (PDF/image): +0.15
   * - Subject score (0-1): * 0.2
   * - Body snippet score (0-1): * 0.15
   * Total: 0-1.0 confidence
   */
  analyzeEmailForSubscription(message) {
    const signals = {
      hasSubscriptionKeyword: false,
      hasReceiptKeyword: false,
      hasAttachment: false,
      fromKnownVendor: false,
      subjectScore: 0,
      bodyScore: 0
    };

    // Analyze subject line
    const subject = (message.subject || '').toLowerCase();
    signals.hasSubscriptionKeyword = /subscription|recurring|renew/i.test(subject);
    signals.hasReceiptKeyword = /receipt|invoice|billing/i.test(subject);
    signals.subjectScore = this.calculateTextScore(subject);

    // Analyze body snippet
    const snippet = (message.snippet || '').toLowerCase();
    signals.bodyScore = this.calculateTextScore(snippet);

    // Check for attachments (likely receipt PDFs)
    signals.hasAttachment = (message.attachmentCount || 0) > 0;

    // Calculate weighted confidence score
    const confidence = (
      (signals.hasSubscriptionKeyword ? 0.3 : 0) +
      (signals.hasReceiptKeyword ? 0.2 : 0) +
      (signals.hasAttachment ? 0.15 : 0) +
      (signals.subjectScore * 0.2) +
      (signals.bodyScore * 0.15)
    );

    return { signals, confidence };
  }

  /**
   * Calculate text relevance score (0-1) based on keyword presence
   * R&D: Weighted keyword matching for subscription detection
   */
  calculateTextScore(text) {
    if (!text) return 0;

    const textLower = text.toLowerCase();
    let score = 0;

    // Strong keywords worth more
    this.keywords.strong.forEach(keyword => {
      if (textLower.includes(keyword)) score += 0.4;
    });

    // Moderate keywords worth less
    this.keywords.moderate.forEach(keyword => {
      if (textLower.includes(keyword)) score += 0.15;
    });

    // Cap at 1.0
    return Math.min(score, 1.0);
  }

  /**
   * Convert timeframe string (e.g., "3m", "90d", "1y") to Gmail date format
   */
  getDateString(timeframe) {
    const match = timeframe.match(/(\d+)([mdy])/);
    if (!match) return new Date().toISOString().split('T')[0];

    const [, num, unit] = match;
    const date = new Date();
    const amount = parseInt(num);

    switch (unit) {
      case 'm':
        date.setMonth(date.getMonth() - amount);
        break;
      case 'd':
        date.setDate(date.getDate() - amount);
        break;
      case 'y':
        date.setFullYear(date.getFullYear() - amount);
        break;
    }

    // Format as YYYY/MM/DD for Gmail
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}/${month}/${day}`;
  }

  /**
   * Extract vendor name from email sender
   * Heuristic: Domain name (before TLD) is often the vendor
   */
  extractVendorFromEmail(message) {
    if (!message.from) return 'Unknown';

    // Try to extract email from "Name <email@domain.com>" format
    const emailMatch = message.from.match(/<(.+?)@(.+?)>/);
    if (emailMatch) {
      const domain = emailMatch[2];
      // Get first part of domain (e.g., "netflix" from "netflix.com")
      const vendor = domain.split('.')[0];
      return vendor.charAt(0).toUpperCase() + vendor.slice(1);  // Capitalize
    }

    // Fallback: Use the whole from field
    return message.from;
  }
}

/**
 * R&D Documentation Export
 * For AusIndustry R&D tax claim compliance
 */
export const RD_METADATA = {
  component: 'Gmail Receipt Scanner',
  hypothesis: 'Multi-keyword search with weighted scoring achieves 80%+ recall on subscription email detection',
  methodology: 'Combine subscription/receipt/invoice search terms, analyze sender/subject/body with weighted confidence scoring',
  successMetric: 'Recall >= 80%, Precision >= 90% on manual validation set of 100+ emails',
  findings: 'TBD after testing',
  category: 'Software Development',
  technicalUncertainty: 'Optimal keyword combinations and weighting factors for subscription vs. one-time purchase classification',
  estimatedHours: 3.5
};

export default ReceiptScanner;
