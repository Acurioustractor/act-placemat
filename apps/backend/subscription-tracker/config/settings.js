/**
 * Subscription Tracker Configuration
 * Centralized settings for all services
 */

export const config = {
  // Confidence thresholds
  minSubscriptionConfidence: 0.05,  // 5% minimum to show all Gmail results for testing
  ocrConfidenceThreshold: parseFloat(process.env.OCR_CONFIDENCE_THRESHOLD || '0.75'),

  // Signal weights for multi-source fusion (must sum to 1.0)
  weights: {
    gmail: 0.4,   // Gmail receipt signals
    xero: 0.4,    // Xero transaction patterns
    ai: 0.2       // AI extraction confidence
  },

  // Transaction analysis parameters
  xero: {
    minOccurrences: 2,         // Minimum 2 transactions to detect pattern
    maxDayVariance: 5,         // Within 5 days of expected interval
    amountTolerance: 0.05,     // 5% amount variance allowed
    lookbackDays: 540          // Analyze last 540 days (18 months) - Xero data is 5 months old
  },

  // Gmail scanning parameters
  gmail: {
    maxResults: 100,           // Max emails per query (moderate to avoid rate limits)
    defaultTimeframe: '1y',    // 1 year lookback
    batchSize: 25,             // Process 25 emails at a time
    batchDelay: 2000,          // 2 second delay between batches (avoid rate limits)

    // Multi-account support (Service Account with domain-wide delegation)
    multiAccount: {
      enabled: process.env.GOOGLE_WORKSPACE_MULTI_ACCOUNT === 'true',
      serviceAccountPath: process.env.GOOGLE_SERVICE_ACCOUNT_PATH || './config/service-account.json',
      domain: process.env.GOOGLE_WORKSPACE_DOMAIN || 'act.place',
      accounts: (process.env.GOOGLE_WORKSPACE_ACCOUNTS || 'nicholas@act.place,hi@act.place,accounts@act.place,benjamin@act.place').split(',')
    },

    keywords: {
      strong: ['subscription', 'recurring', 'auto-renew', 'monthly charge'],
      moderate: ['payment', 'billing', 'invoice', 'receipt', 'renewal']
    }
  },

  // AI/ML parameters
  ai: {
    pythonPath: process.env.PYTHON_PATH || 'python3',
    nerModel: process.env.NER_MODEL || 'dslim/bert-base-NER',
    ocrPreprocessing: {
      contrastEnhancement: 2.0,
      medianFilterSize: 3
    }
  },

  // Caching
  cache: {
    discoveryTTL: parseInt(process.env.SUBSCRIPTION_CACHE_TTL || '86400'), // 24h default
  },

  // R&D tracking
  rd: {
    notionDatabaseId: process.env.NOTION_RD_DATABASE_ID,
    defaultDeveloper: 'Ben Knight',
    trackingEnabled: true
  },

  // Pattern detection
  patterns: {
    monthly: { minDays: 28, maxDays: 31 },
    yearly: { minDays: 360, maxDays: 370 },
    quarterly: { minDays: 88, maxDays: 93 }
  }
};

export default config;
