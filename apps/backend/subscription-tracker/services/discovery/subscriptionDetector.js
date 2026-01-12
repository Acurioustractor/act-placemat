/**
 * Subscription Discovery Engine
 *
 * R&D Component: Multi-Signal Fusion for Subscription Detection
 * Hypothesis: Combining Gmail receipt signals (0.4 weight) + Xero transaction patterns (0.4 weight) +
 *             AI extraction confidence (0.2 weight) achieves 90%+ accuracy in subscription detection
 *             (vs 70% from single-source analysis)
 * Methodology: Weighted aggregation of independent signals, vendor name normalization for matching,
 *              confidence scoring with signal fusion
 * Success Metric: Precision >= 90%, Recall >= 85%, F1 >= 0.87
 * Findings: TBD after manual validation
 */

import { ReceiptScanner } from '../gmail/receiptScanner.js';
import { MultiAccountScanner } from '../gmail/multiAccountScanner.js';
import { TransactionAnalyzer } from '../xero/transactionAnalyzer.js';
import { AIBridge } from '../ai/aibridge.js';
import config from '../../config/settings.js';

export class SubscriptionDetector {
  constructor(gmailService, supabase) {
    this.receiptScanner = new ReceiptScanner(gmailService);
    this.multiAccountScanner = new MultiAccountScanner();  // NEW: Multi-account scanner
    this.transactionAnalyzer = new TransactionAnalyzer(supabase);
    this.aiBridge = new AIBridge();
    this.supabase = supabase;  // Store Supabase client for database operations

    // Confidence thresholds
    this.minConfidence = config.minSubscriptionConfidence;

    // Signal weights (must sum to 1.0)
    this.weights = config.weights;
  }

  /**
   * R&D Method: Unified subscription discovery with multi-signal fusion
   * Hypothesis: Multi-signal fusion > individual methods
   * Target: 90% precision, 85% recall, F1 >= 0.87
   */
  async discoverSubscriptions(tenantId) {
    console.log('[R&D] Starting multi-signal subscription discovery...');
    const startTime = Date.now();

    try {
      // Phase 1: Gather signals from all sources in parallel
      console.log('[Discovery] Phase 1: Gathering signals...');
      const [gmailSignals, xeroSignals] = await Promise.all([
        this.getGmailSignals(),
        this.getXeroSignals(tenantId)
      ]);

      console.log(`[Discovery] Found ${gmailSignals.length} Gmail signals, ${xeroSignals.length} Xero signals`);

      // Phase 2: Cross-reference and aggregate by vendor
      console.log('[Discovery] Phase 2: Aggregating signals...');
      const aggregated = this.aggregateSignals(gmailSignals, xeroSignals);

      console.log(`[Discovery] Aggregated into ${aggregated.length} unique vendors`);

      // Phase 3: Enrich with AI extraction (optional, can be slow)
      // console.log('[Discovery] Phase 3: AI enrichment...');
      // const enriched = await this.enrichWithAI(aggregated);

      // Skip AI for now to speed up initial discovery
      const enriched = aggregated;

      // Phase 4: Calculate final confidence scores
      console.log('[Discovery] Phase 4: Calculating confidence scores...');
      const subscriptions = enriched
        .map(sub => this.calculateFinalScore(sub))
        .filter(sub => sub.confidence >= this.minConfidence)
        .sort((a, b) => b.confidence - a.confidence);

      // R&D Metrics
      const elapsed = Date.now() - startTime;
      console.log(`\n[R&D] Discovery Complete:`);
      console.log(`  - Total time: ${elapsed}ms`);
      console.log(`  - Subscriptions found: ${subscriptions.length}`);
      console.log(`  - Avg confidence: ${this.avgConfidence(subscriptions)}`);
      console.log(`  - Signal distribution:`, this.signalDistribution(subscriptions));

      return subscriptions;
    } catch (error) {
      console.error('[Discovery] Error during discovery:', error);
      throw error;
    }
  }

  /**
   * Gather signals from Gmail receipt scanning
   * NEW: Supports multi-account scanning if enabled
   */
  async getGmailSignals() {
    try {
      let messages = [];

      // Try multi-account scanning if enabled
      if (config.gmail.multiAccount?.enabled) {
        console.log('[Discovery] Using multi-account Gmail scanner');
        const multiAccountMessages = await this.multiAccountScanner.scanAllAccounts({
          maxResults: config.gmail.maxResults,
          timeframe: config.gmail.defaultTimeframe
        });

        // If multi-account scan returns null, fall back to single-account
        if (multiAccountMessages === null) {
          console.log('[Discovery] Multi-account scan unavailable, falling back to single-account');
          messages = await this.receiptScanner.scanForReceipts({
            maxResults: config.gmail.maxResults
          });
        } else {
          messages = multiAccountMessages;
        }
      } else {
        // Use single-account scanner (default)
        console.log('[Discovery] Using single-account Gmail scanner');
        messages = await this.receiptScanner.scanForReceipts({
          maxResults: config.gmail.maxResults
        });
      }

      return messages.map(msg => {
        const analysis = this.receiptScanner.analyzeEmailForSubscription(msg);
        const vendor = this.receiptScanner.extractVendorFromEmail(msg);

        return {
          source: 'gmail',
          accountEmail: msg.accountEmail || null,  // NEW: Track which account found this
          vendor,
          amount: null,  // Will be extracted by AI if needed
          date: msg.internalDate ? new Date(parseInt(msg.internalDate)) : null,
          confidence: analysis.confidence,
          signals: analysis.signals,
          raw: {
            id: msg.id,
            subject: msg.subject,
            from: msg.from,
            snippet: msg.snippet,
            attachmentCount: msg.attachmentCount
          }
        };
      });
    } catch (error) {
      console.error('[Discovery] Gmail signal gathering failed:', error.message);
      return [];  // Return empty array on failure, don't crash
    }
  }

  /**
   * Gather signals from Xero transaction analysis
   */
  async getXeroSignals(tenantId) {
    try {
      const recurring = await this.transactionAnalyzer.findRecurringTransactions(tenantId);

      return recurring.map(rec => ({
        source: 'xero',
        vendor: rec.vendor,
        amount: rec.pattern.avgAmount,
        frequency: rec.pattern.frequency,
        confidence: rec.pattern.confidence,
        occurrences: rec.pattern.occurrences,
        // Add transaction metadata
        transactionDates: rec.transactionDates,
        transactionAmounts: rec.transactionAmounts,
        latestStatus: rec.latestStatus,
        isReconciled: rec.isReconciled,
        xeroContactId: rec.xeroContactId,
        xeroContactName: rec.xeroContactName,
        firstSeen: rec.pattern.firstSeen,
        lastSeen: rec.pattern.lastSeen,
        raw: {
          pattern: rec.pattern,
          transactionIds: rec.transactions.map(t => t.id)
        }
      }));
    } catch (error) {
      console.error('[Discovery] Xero signal gathering failed:', error.message);
      return [];  // Return empty array on failure, don't crash
    }
  }

  /**
   * Aggregate signals by vendor (fuzzy matching)
   *
   * R&D Hypothesis: Vendor name normalization reduces duplicates by 80%
   * Methodology: Lowercase, remove non-alphanumeric, first 20 chars for matching key
   */
  aggregateSignals(gmailSignals, xeroSignals) {
    const vendorMap = new Map();

    // Add Gmail signals
    gmailSignals.forEach(signal => {
      const normalizedVendor = this.normalizeVendor(signal.vendor);

      if (!vendorMap.has(normalizedVendor)) {
        vendorMap.set(normalizedVendor, {
          vendor: signal.vendor,  // Keep original name
          normalizedKey: normalizedVendor,
          gmailSignal: signal,
          xeroSignal: null
        });
      }
    });

    // Match Xero signals to Gmail signals
    xeroSignals.forEach(signal => {
      const normalizedVendor = this.normalizeVendor(signal.vendor);

      if (vendorMap.has(normalizedVendor)) {
        // Match found - combine signals
        const existing = vendorMap.get(normalizedVendor);
        existing.xeroSignal = signal;

        // Prefer Xero vendor name if it has transaction data
        if (signal.amount) {
          existing.vendor = signal.vendor;
        }
      } else {
        // No Gmail match, Xero-only signal
        vendorMap.set(normalizedVendor, {
          vendor: signal.vendor,
          normalizedKey: normalizedVendor,
          gmailSignal: null,
          xeroSignal: signal
        });
      }
    });

    return Array.from(vendorMap.values());
  }

  /**
   * Enrich aggregated subscriptions with AI extraction
   * (Optional - can be slow, use for high-value subscriptions)
   */
  async enrichWithAI(aggregated) {
    // TODO: For each Gmail signal with attachments, run OCR + NER
    // This would extract: amount, date, vendor confirmation
    // And add the AI signal weight

    // For now, return as-is (AI enrichment is optional Phase 2 feature)
    return aggregated;
  }

  /**
   * Calculate final confidence score with weighted averaging
   *
   * R&D Formula: (gmail_conf * 0.4) + (xero_conf * 0.4) + (ai_conf * 0.2)
   */
  calculateFinalScore(subscription) {
    const gmailConf = subscription.gmailSignal?.confidence || 0;
    const xeroConf = subscription.xeroSignal?.confidence || 0;
    const aiConf = 0;  // TODO: Add AI extraction confidence when implemented

    const weightedScore = (
      (gmailConf * this.weights.gmail) +
      (xeroConf * this.weights.xero) +
      (aiConf * this.weights.ai)
    );

    // Determine primary amount and frequency
    const amount = subscription.xeroSignal?.amount || null;
    const frequency = subscription.xeroSignal?.frequency || 'unknown';

    return {
      vendor: subscription.vendor,
      amount,
      frequency,
      confidence: weightedScore,
      signals: {
        gmail: gmailConf,
        xero: xeroConf,
        ai: aiConf
      },
      sources: {
        hasGmail: !!subscription.gmailSignal,
        hasXero: !!subscription.xeroSignal,
        hasAI: false
      },
      metadata: {
        gmailMessageId: subscription.gmailSignal?.raw?.id,
        xeroContactId: subscription.xeroSignal?.xeroContactId,
        xeroTransactionIds: subscription.xeroSignal?.raw?.transactionIds,
        occurrences: subscription.xeroSignal?.occurrences,
        // Transaction details
        transactionDates: subscription.xeroSignal?.transactionDates || [],
        transactionAmounts: subscription.xeroSignal?.transactionAmounts || [],
        firstSeen: subscription.xeroSignal?.firstSeen,
        lastSeen: subscription.xeroSignal?.lastSeen,
        latestStatus: subscription.xeroSignal?.latestStatus,
        isReconciled: subscription.xeroSignal?.isReconciled || false
      }
    };
  }

  /**
   * Normalize vendor name for fuzzy matching
   * Strategy: Lowercase, remove non-alphanumeric, take first 20 chars
   */
  normalizeVendor(vendor) {
    if (!vendor) return 'unknown';

    return vendor
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')  // Remove all non-alphanumeric
      .substring(0, 20);           // First 20 chars only
  }

  /**
   * Calculate average confidence across all subscriptions
   */
  avgConfidence(subscriptions) {
    if (subscriptions.length === 0) return '0.000';

    const sum = subscriptions.reduce((acc, s) => acc + s.confidence, 0);
    const avg = sum / subscriptions.length;

    return avg.toFixed(3);
  }

  /**
   * Analyze signal source distribution
   * Helps validate multi-signal hypothesis
   */
  signalDistribution(subscriptions) {
    const dist = {
      gmailOnly: 0,
      xeroOnly: 0,
      both: 0,
      total: subscriptions.length
    };

    subscriptions.forEach(sub => {
      if (sub.sources.hasGmail && sub.sources.hasXero) {
        dist.both++;
      } else if (sub.sources.hasGmail) {
        dist.gmailOnly++;
      } else if (sub.sources.hasXero) {
        dist.xeroOnly++;
      }
    });

    return dist;
  }

  /**
   * List subscriptions from database with pagination
   * V1 API method for querying persisted subscriptions
   */
  async listSubscriptions(options = {}) {
    const {
      tenantId,
      limit = 20,
      offset = 0,
      minConfidence,
      sortBy = 'confidence',
      sortOrder = 'desc'
    } = options;

    if (!this.supabase) {
      throw new Error('Supabase client not initialized - cannot query database');
    }

    console.log('[SUBSCRIPTION DETECTOR] Querying email_financial_documents table with is_subscription=true');

    let query = this.supabase
      .from('email_financial_documents')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .eq('is_subscription', true)
      .range(offset, offset + limit - 1)
      .order(sortBy, { ascending: sortOrder === 'asc' });

    // Filter by minimum confidence if provided
    if (minConfidence !== undefined && minConfidence !== null) {
      query = query.gte('confidence', minConfidence);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('[SubscriptionDetector] List query failed:', error);
      throw error;
    }

    return {
      items: data || [],
      total: count || 0,
      limit,
      offset
    };
  }

  /**
   * Get single subscription by ID
   * V1 API method for fetching subscription details
   */
  async getSubscription(id, tenantId) {
    if (!this.supabase) {
      throw new Error('Supabase client not initialized - cannot query database');
    }

    const { data, error } = await this.supabase
      .from('email_financial_documents')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .eq('is_subscription', true)
      .single();

    if (error) {
      console.error('[SubscriptionDetector] Get query failed:', error);
      throw error;
    }

    return data;
  }

  /**
   * Store discovered subscriptions to database
   * Maps discovered subscription format to database schema
   */
  async storeSubscriptions(tenantId, subscriptions) {
    if (!this.supabase) {
      throw new Error('Supabase client not initialized - cannot store to database');
    }

    // DEBUG: Log first subscription's metadata
    if (subscriptions.length > 0) {
      console.log('[DEBUG] First subscription metadata:', JSON.stringify(subscriptions[0].metadata, null, 2));
    }

    const records = subscriptions.map(sub => ({
      tenant_id: tenantId,
      vendor: sub.vendor,
      amount: sub.amount || null,  // Use amount from aggregated signal
      currency: 'AUD',
      frequency: sub.frequency || 'unknown',
      confidence: sub.confidence,
      status: 'active',
      signals: sub.signals,
      gmail_message_id: sub.metadata?.gmailMessageId || null,
      xero_contact_id: sub.metadata?.xeroContactId || null,
      first_detected: new Date().toISOString(),
      last_scanned: new Date().toISOString(),
      // Add transaction metadata as JSON
      metadata: {
        transactionDates: sub.metadata?.transactionDates || [],
        transactionAmounts: sub.metadata?.transactionAmounts || [],
        firstSeen: sub.metadata?.firstSeen,
        lastSeen: sub.metadata?.lastSeen,
        latestStatus: sub.metadata?.latestStatus,
        isReconciled: sub.metadata?.isReconciled || false,
        occurrences: sub.metadata?.occurrences
      }
    }));

    console.log('[SubscriptionDetector] Attempting to store:', {
      count: records.length,
      sample: JSON.stringify(records[0], null, 2)
    });

    // Upsert (insert or update if vendor already exists for tenant)
    const { data, error } = await this.supabase
      .from('discovered_subscriptions')
      .upsert(records, {
        onConflict: 'tenant_id,vendor',
        ignoreDuplicates: false
      })
      .select();

    if (error) {
      console.error('[SubscriptionDetector] Store failed:', {
        error,
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      throw error;
    }

    console.log(`[SubscriptionDetector] Stored ${data?.length || 0} subscriptions to database`);
    return data;
  }
}

/**
 * R&D Documentation Export
 * For AusIndustry R&D tax claim compliance
 */
export const RD_METADATA = {
  component: 'Subscription Discovery Engine',
  hypothesis: 'Multi-signal fusion (Gmail 40% + Xero 40% + AI 20%) achieves 90%+ accuracy vs 70% single-source',
  methodology: 'Weighted aggregation of independent detection signals, vendor normalization for fuzzy matching, confidence scoring with signal fusion algorithm',
  successMetric: 'Precision >= 90%, Recall >= 85%, F1 >= 0.87 on manual validation set',
  findings: 'TBD after manual validation on 50+ discovered subscriptions',
  category: 'AI Research',
  technicalUncertainty: 'Optimal signal weighting and vendor matching strategy for maximizing subscription detection accuracy while minimizing false positives',
  estimatedHours: 4.5
};

export default SubscriptionDetector;
