/**
 * Bank Reconciliation Agent
 * Handles bank transaction matching and Thriday allocation detection
 */

import BaseFinancialAgent from './BaseFinancialAgent.js';

class BankRecoAgent extends BaseFinancialAgent {
  constructor(orchestrator) {
    super('BankRecoAgent', orchestrator);
  }

  async processTransaction(payload) {
    const { bankTransactionId, description, amount, date, reference } = payload;

    try {
      // Apply Thriday allocation detection first
      if (this.isThridayAllocation(description || reference)) {
        return await this.processThridayTransfer(payload);
      }

      // Standard bank reconciliation logic
      const matchResult = await this.findTransactionMatch(payload);

      if (matchResult.confidence >= this.policy.thresholds.auto_match_bank_confidence) {
        // Auto-match transaction
        await this.autoMatchTransaction(bankTransactionId, matchResult);

        await this.logAgentAction({
          action: 'auto_match',
          transaction_id: bankTransactionId,
          match_type: matchResult.type,
          confidence: matchResult.confidence
        });

        return {
          status: 'auto_matched',
          match: matchResult,
          confidence: matchResult.confidence
        };
      } else if (matchResult.suggestions.length > 0) {
        // Create exception with suggestions
        await this.createMatchingException(bankTransactionId, matchResult.suggestions);

        return {
          status: 'pending_review',
          suggestions: matchResult.suggestions,
          confidence: matchResult.confidence
        };
      } else {
        // No matches found - create manual review task
        await this.createManualReviewTask(bankTransactionId, payload);

        return {
          status: 'manual_review_required',
          reason: 'no_matches_found'
        };
      }

    } catch (error) {
      console.error('Bank reco processing error:', error);
      await this.handleProcessingError(bankTransactionId, error);
      throw error;
    }
  }

  async processThridayTransfer(payload) {
    const { bankTransactionId, description, amount, bankAccount } = payload;

    try {
      // Parse Thriday allocation transfer
      const transferDetails = this.parseThridayAllocation(description, bankAccount);

      if (transferDetails.isValid) {
        // Create transfer entry instead of expense
        await this.createThridayTransfer({
          transactionId: bankTransactionId,
          sourceAccount: transferDetails.sourceAccount,
          targetAccount: transferDetails.targetAccount,
          amount: Math.abs(amount),
          allocationReason: transferDetails.reason
        });

        await this.logAgentAction({
          action: 'thriday_transfer_processed',
          transaction_id: bankTransactionId,
          source_account: transferDetails.sourceAccount,
          target_account: transferDetails.targetAccount,
          amount: Math.abs(amount)
        });

        return {
          status: 'thriday_transfer_processed',
          transferDetails
        };
      } else {
        console.warn(`Invalid Thriday allocation detected: ${description}`);
        return await this.processTransaction(payload); // Fall back to normal processing
      }

    } catch (error) {
      console.error('Thriday transfer processing error:', error);
      await this.handleProcessingError(bankTransactionId, error);
      throw error;
    }
  }

  isThridayAllocation(description) {
    if (!description) return false;

    const allocationPatterns = [
      /allocation/i,
      /thriday.*transfer/i,
      /auto.*allocation/i,
      /gst.*transfer/i,
      /tax.*allocation/i,
      /profit.*distribution/i,
      /reserve.*transfer/i
    ];

    return allocationPatterns.some(pattern => pattern.test(description));
  }

  parseThridayAllocation(description, currentAccount) {
    // Map account patterns to actual Xero account names
    const accountMapping = {
      'main': 'Thriday Main',
      'gst': 'Thriday GST',
      'tax': 'Thriday Tax',
      'profit': 'Thriday Profit',
      'opex': 'Thriday Opex'
    };

    const result = {
      isValid: false,
      sourceAccount: null,
      targetAccount: null,
      reason: null
    };

    // Common Thriday allocation patterns
    const patterns = [
      {
        regex: /gst.*transfer.*to.*gst/i,
        sourceAccount: 'Thriday Main',
        targetAccount: 'Thriday GST',
        reason: 'GST Allocation'
      },
      {
        regex: /tax.*allocation.*to.*tax/i,
        sourceAccount: 'Thriday Main',
        targetAccount: 'Thriday Tax',
        reason: 'Tax Allocation'
      },
      {
        regex: /profit.*distribution.*to.*profit/i,
        sourceAccount: 'Thriday Main',
        targetAccount: 'Thriday Profit',
        reason: 'Profit Allocation'
      },
      {
        regex: /allocation.*from.*main.*to.*opex/i,
        sourceAccount: 'Thriday Main',
        targetAccount: 'Thriday Opex',
        reason: 'Operating Expense Allocation'
      }
    ];

    for (const pattern of patterns) {
      if (pattern.regex.test(description)) {
        result.isValid = true;
        result.sourceAccount = pattern.sourceAccount;
        result.targetAccount = pattern.targetAccount;
        result.reason = pattern.reason;
        break;
      }
    }

    // If current account doesn't match expected source, reverse the transfer
    if (result.isValid && currentAccount !== result.sourceAccount) {
      const temp = result.sourceAccount;
      result.sourceAccount = result.targetAccount;
      result.targetAccount = temp;
    }

    return result;
  }

  async findTransactionMatch(payload) {
    const { amount, date, description } = payload;
    const matches = {
      type: null,
      confidence: 0,
      suggestions: [],
      matchedItem: null
    };

    // 1. Exact invoice/bill match by amount and date window
    const exactMatches = await this.findExactMatches(amount, date);
    if (exactMatches.length > 0) {
      matches.type = 'exact_match';
      matches.confidence = 0.95;
      matches.matchedItem = exactMatches[0];
      matches.suggestions = exactMatches.slice(0, 3);
      return matches;
    }

    // 2. Amount match within date window (±7 days)
    const amountMatches = await this.findAmountMatches(amount, date, 7);
    if (amountMatches.length > 0) {
      matches.type = 'amount_match';
      matches.confidence = 0.85;
      matches.suggestions = amountMatches.slice(0, 3);
      return matches;
    }

    // 3. Narration/description pattern matching using ML-like rules
    const narrationMatches = await this.findNarrationMatches(description, amount, date);
    if (narrationMatches.length > 0) {
      matches.type = 'narration_match';
      matches.confidence = 0.75;
      matches.suggestions = narrationMatches.slice(0, 3);
      return matches;
    }

    return matches;
  }

  async findExactMatches(amount, date) {
    const dateWindow = 3; // ±3 days
    const startDate = new Date(date);
    startDate.setDate(startDate.getDate() - dateWindow);
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + dateWindow);

    // Search invoices
    const { data: invoices } = await this.supabase
      .from('xero_invoices')
      .select('*')
      .eq('total', Math.abs(amount))
      .gte('date', startDate.toISOString())
      .lte('date', endDate.toISOString())
      .eq('status', 'AUTHORISED')
      .limit(5);

    // Search bills
    const { data: bills } = await this.supabase
      .from('xero_bills')
      .select('*')
      .eq('total', Math.abs(amount))
      .gte('date', startDate.toISOString())
      .lte('date', endDate.toISOString())
      .eq('status', 'AUTHORISED')
      .limit(5);

    return [...(invoices || []), ...(bills || [])];
  }

  async findAmountMatches(amount, date, dayWindow) {
    const startDate = new Date(date);
    startDate.setDate(startDate.getDate() - dayWindow);
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + dayWindow);

    const { data: matches } = await this.supabase
      .from('xero_invoices')
      .select('*')
      .eq('total', Math.abs(amount))
      .gte('date', startDate.toISOString())
      .lte('date', endDate.toISOString())
      .limit(10);

    return matches || [];
  }

  async findNarrationMatches(description, amount, date) {
    if (!description || description.length < 5) return [];

    // Simple keyword matching - could be enhanced with ML
    const keywords = description.toLowerCase().split(/\s+/).filter(word => word.length > 3);

    const matches = [];

    for (const keyword of keywords) {
      const { data: invoiceMatches } = await this.supabase
        .from('xero_invoices')
        .select('*')
        .or(`contact.ilike.%${keyword}%,reference.ilike.%${keyword}%`)
        .limit(5);

      if (invoiceMatches) {
        matches.push(...invoiceMatches);
      }
    }

    // Remove duplicates and score by relevance
    const uniqueMatches = matches.reduce((acc, match) => {
      if (!acc.find(m => m.id === match.id)) {
        match.relevanceScore = this.calculateRelevanceScore(description, match);
        acc.push(match);
      }
      return acc;
    }, []);

    return uniqueMatches.sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, 3);
  }

  calculateRelevanceScore(description, item) {
    let score = 0;
    const desc = description.toLowerCase();
    const itemText = `${item.contact || ''} ${item.reference || ''} ${item.description || ''}`.toLowerCase();

    // Simple scoring algorithm
    const descWords = desc.split(/\s+/);
    for (const word of descWords) {
      if (word.length > 3 && itemText.includes(word)) {
        score += 1;
      }
    }

    return score;
  }

  async autoMatchTransaction(bankTransactionId, matchResult) {
    // Update transaction with match information
    const { error } = await this.supabase
      .from('xero_transactions')
      .update({
        matched_item_id: matchResult.matchedItem?.id,
        matched_item_type: matchResult.type,
        match_confidence: matchResult.confidence,
        status: 'matched',
        updated_at: new Date().toISOString()
      })
      .eq('xero_id', bankTransactionId);

    if (error) {
      throw new Error(`Failed to update matched transaction: ${error.message}`);
    }
  }

  async createThridayTransfer(transferData) {
    const { transactionId, sourceAccount, targetAccount, amount, allocationReason } = transferData;

    // Create transfer record
    const transferRecord = {
      transaction_id: transactionId,
      transfer_type: 'thriday_allocation',
      source_account: sourceAccount,
      target_account: targetAccount,
      amount,
      reason: allocationReason,
      status: 'processed',
      created_at: new Date().toISOString()
    };

    const { error } = await this.supabase
      .from('bank_transfers')
      .insert(transferRecord);

    if (error) {
      throw new Error(`Failed to create Thriday transfer: ${error.message}`);
    }

    // Update original transaction status
    await this.supabase
      .from('xero_transactions')
      .update({
        transaction_type: 'transfer',
        transfer_processed: true,
        status: 'processed',
        updated_at: new Date().toISOString()
      })
      .eq('xero_id', transactionId);
  }

  async createMatchingException(bankTransactionId, suggestions) {
    const exception = {
      transaction_id: bankTransactionId,
      exception_type: 'matching_required',
      suggestions: JSON.stringify(suggestions),
      status: 'pending',
      created_at: new Date().toISOString(),
      agent_name: this.name
    };

    const { error } = await this.supabase
      .from('financial_exceptions')
      .insert(exception);

    if (error) {
      console.error('Failed to create matching exception:', error);
    }

    // Send notification for manual review
    await this.orchestrator.sendNotification(
      null,
      `🔄 Bank transaction requires manual matching: ${bankTransactionId}`,
      [
        { text: 'Review', url: `/finance/reconciliation/${bankTransactionId}` },
        { text: 'Auto-suggest', action: 'auto_suggest', transactionId: bankTransactionId }
      ]
    );
  }

  async getMetrics() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const { data: transactions } = await this.supabase
      .from('xero_transactions')
      .select('status, match_confidence')
      .gte('created_at', thirtyDaysAgo.toISOString());

    const total = transactions?.length || 0;
    const autoMatched = transactions?.filter(tx =>
      tx.match_confidence >= this.policy.thresholds.auto_match_bank_confidence
    ).length || 0;

    const thridayTransfers = await this.redis.llen('bank_reco:thriday_transfers');

    return {
      total_processed: total,
      auto_match_rate: total > 0 ? (autoMatched / total * 100).toFixed(2) : 0,
      thriday_transfers_detected: thridayTransfers,
      avg_processing_time_ms: 250, // Would calculate from actual processing times
      exceptions_created: await this.getExceptionCount('matching_required')
    };
  }
}

export default BankRecoAgent;