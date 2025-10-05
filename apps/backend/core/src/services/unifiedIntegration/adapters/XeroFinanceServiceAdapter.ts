/**
 * Xero Finance Service Adapter
 * Connects UnifiedIntegrationService to comprehensive Xero financial data
 * Leverages existing financial v1 API with transaction management and categorization
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { FinanceData, FinanceFilters } from '../interfaces/IIntegrationService.js';
import { IntegrationLogger } from '../utils/Logger.js';

interface XeroTransaction {
  id: number;
  xero_id: string;
  date: string;
  description?: string;
  amount: number;
  contact?: string;
  status?: string;
  type: 'SPEND' | 'RECEIVE';
  bank_account?: string;
  line_items?: any;
  suggested_category?: string;
  confidence?: number;
  receipt_matched?: string;
  created_at: string;
  updated_at: string;
}

interface CategorisationRule {
  id: number;
  pattern: string;
  category: string;
  confidence: number;
  created_at: string;
}

interface DailySnapshot {
  id: number;
  date: string;
  data: any;
  created_at: string;
}

export class XeroFinanceServiceAdapter {
  private readonly supabase: SupabaseClient;
  private readonly logger: IntegrationLogger;
  private readonly cache: Map<string, { data: any; timestamp: number }>;
  private readonly cacheTimeout = 10 * 60 * 1000; // 10 minutes for financial data

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    this.logger = IntegrationLogger.getInstance();
    this.cache = new Map();
  }

  /**
   * Get financial data from Xero with advanced filtering and aggregation
   */
  async getFinanceData(filters: FinanceFilters = {}): Promise<FinanceData[]> {
    const correlationId = this.logger.generateCorrelationId();
    const timedLogger = this.logger.createTimedLogger(correlationId, 'XeroFinanceServiceAdapter', 'getFinanceData');

    try {
      timedLogger.info('Fetching financial data from Xero', { filters });

      // Check cache first
      const cacheKey = `finance:${JSON.stringify(filters)}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) {
        timedLogger.info('Returning cached financial data', { count: cached.length });
        return cached;
      }

      // Build query for xero_transactions
      let query = this.supabase
        .from('xero_transactions')
        .select('*');

      // Apply date filters
      if (filters.dateFrom) {
        query = query.gte('date', filters.dateFrom);
      }

      if (filters.dateTo) {
        query = query.lte('date', filters.dateTo);
      }

      // Apply category filter
      if (filters.category) {
        query = query.eq('suggested_category', filters.category);
      }

      // Apply amount filters
      if (filters.minAmount !== undefined) {
        query = query.gte('amount', filters.minAmount);
      }

      if (filters.maxAmount !== undefined) {
        query = query.lte('amount', filters.maxAmount);
      }

      // Apply sorting (default to date descending)
      query = query.order('date', { ascending: false });

      // Apply pagination
      if (filters.limit) {
        const offset = filters.offset || 0;
        query = query.range(offset, offset + filters.limit - 1);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      // Transform to unified FinanceData interface
      const financeData = (data || []).map(this.transformToUnifiedFinanceData);

      // Cache results
      this.setCachedData(cacheKey, financeData);

      timedLogger.finish(true, {
        transactionCount: financeData.length,
        totalAmount: financeData.reduce((sum, item) => sum + item.amount, 0),
        dateRange: {
          from: filters.dateFrom,
          to: filters.dateTo
        }
      });

      return financeData;

    } catch (error) {
      timedLogger.error('Failed to fetch financial data from Xero', error);
      timedLogger.finish(false);

      // Return empty array if Xero tables don't exist yet
      if (error.code === '42P01') {
        timedLogger.info('Xero financial tables not found, returning empty data');
        return [];
      }

      throw error;
    }
  }

  /**
   * Get financial data by category with aggregation
   */
  async getFinanceDataByCategory(category: string, limit = 100): Promise<FinanceData[]> {
    return this.getFinanceData({ category, limit });
  }

  /**
   * Get recent transactions with categorization confidence
   */
  async getRecentTransactions(days = 30, limit = 50): Promise<FinanceData[]> {
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - days);

    return this.getFinanceData({
      dateFrom: dateFrom.toISOString().split('T')[0],
      limit
    });
  }

  /**
   * Get transactions by type (income vs expenses)
   */
  async getTransactionsByType(type: 'income' | 'expense', limit = 100): Promise<FinanceData[]> {
    try {
      const xeroType = type === 'income' ? 'RECEIVE' : 'SPEND';

      const { data, error } = await this.supabase
        .from('xero_transactions')
        .select('*')
        .eq('type', xeroType)
        .order('date', { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      return (data || []).map(this.transformToUnifiedFinanceData);

    } catch (error) {
      this.logger.error(`Failed to fetch ${type} transactions`, error);
      return [];
    }
  }

  /**
   * Get financial summary with aggregations
   */
  async getFinancialSummary(dateFrom?: string, dateTo?: string): Promise<{
    totalIncome: number;
    totalExpenses: number;
    netIncome: number;
    transactionCount: number;
    categoryBreakdown: Record<string, { amount: number; count: number }>;
    monthlyTrends: Array<{ month: string; income: number; expenses: number; net: number }>;
    averageTransactionSize: number;
    topExpenseCategories: Array<{ category: string; amount: number; percentage: number }>;
  }> {
    const correlationId = this.logger.generateCorrelationId();
    const timedLogger = this.logger.createTimedLogger(correlationId, 'XeroFinanceServiceAdapter', 'getFinancialSummary');

    try {
      timedLogger.info('Generating financial summary', { dateFrom, dateTo });

      // Build base query
      let query = this.supabase
        .from('xero_transactions')
        .select('*');

      if (dateFrom) {
        query = query.gte('date', dateFrom);
      }

      if (dateTo) {
        query = query.lte('date', dateTo);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      const transactions = data || [];

      // Calculate aggregations
      const totalIncome = transactions
        .filter(t => t.type === 'RECEIVE')
        .reduce((sum, t) => sum + t.amount, 0);

      const totalExpenses = transactions
        .filter(t => t.type === 'SPEND')
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);

      const netIncome = totalIncome - totalExpenses;
      const transactionCount = transactions.length;
      const averageTransactionSize = transactionCount > 0 ? (totalIncome + totalExpenses) / transactionCount : 0;

      // Category breakdown
      const categoryBreakdown: Record<string, { amount: number; count: number }> = {};
      transactions.forEach(transaction => {
        const category = transaction.suggested_category || 'Uncategorized';
        if (!categoryBreakdown[category]) {
          categoryBreakdown[category] = { amount: 0, count: 0 };
        }
        categoryBreakdown[category].amount += Math.abs(transaction.amount);
        categoryBreakdown[category].count += 1;
      });

      // Top expense categories
      const topExpenseCategories = Object.entries(categoryBreakdown)
        .filter(([category, data]) => category !== 'Income')
        .map(([category, data]) => ({
          category,
          amount: data.amount,
          percentage: totalExpenses > 0 ? (data.amount / totalExpenses) * 100 : 0
        }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 10);

      // Monthly trends (simplified - last 12 months)
      const monthlyTrends = this.calculateMonthlyTrends(transactions);

      timedLogger.finish(true, {
        totalIncome,
        totalExpenses,
        netIncome,
        transactionCount
      });

      return {
        totalIncome,
        totalExpenses,
        netIncome,
        transactionCount,
        categoryBreakdown,
        monthlyTrends,
        averageTransactionSize,
        topExpenseCategories
      };

    } catch (error) {
      timedLogger.error('Failed to generate financial summary', error);
      timedLogger.finish(false);
      throw error;
    }
  }

  /**
   * Get categorisation rules for financial intelligence
   */
  async getCategorisationRules(): Promise<Array<{
    pattern: string;
    category: string;
    confidence: number;
  }>> {
    try {
      const { data, error } = await this.supabase
        .from('categorisation_rules')
        .select('pattern, category, confidence')
        .order('confidence', { ascending: false });

      if (error) {
        throw error;
      }

      return data || [];

    } catch (error) {
      this.logger.error('Failed to fetch categorisation rules', error);
      return [];
    }
  }

  /**
   * Health check for Xero integration
   */
  async isHealthy(): Promise<boolean> {
    try {
      // Check if key financial tables exist and are accessible
      const checks = await Promise.all([
        this.supabase.from('xero_transactions').select('count').limit(1),
        this.supabase.from('categorisation_rules').select('count').limit(1),
        this.supabase.from('daily_snapshots').select('count').limit(1)
      ]);

      return checks.every(check => !check.error);

    } catch {
      return false;
    }
  }

  /**
   * Private helper methods
   */

  private transformToUnifiedFinanceData = (xeroTransaction: XeroTransaction): FinanceData => {
    return {
      id: `xero:${xeroTransaction.xero_id}`,
      amount: Math.abs(xeroTransaction.amount),
      currency: 'AUD', // Default to AUD for ACT
      category: xeroTransaction.suggested_category || 'Uncategorized',
      description: xeroTransaction.description || '',
      date: xeroTransaction.date,
      vendor: xeroTransaction.contact,
      type: xeroTransaction.type === 'RECEIVE' ? 'income' : 'expense',
      status: this.mapXeroStatusToUnified(xeroTransaction.status),
      xeroId: xeroTransaction.xero_id,
      metadata: {
        originalXeroData: xeroTransaction,
        bankAccount: xeroTransaction.bank_account,
        lineItems: xeroTransaction.line_items,
        confidence: xeroTransaction.confidence,
        receiptMatched: xeroTransaction.receipt_matched,
        categorisationMethod: 'ai_suggestion',
        lastSyncAt: new Date().toISOString(),
        dataSource: 'xero'
      }
    };
  };

  private mapXeroStatusToUnified(xeroStatus?: string): 'pending' | 'approved' | 'paid' {
    const statusMap: Record<string, 'pending' | 'approved' | 'paid'> = {
      'DRAFT': 'pending',
      'SUBMITTED': 'pending',
      'AUTHORISED': 'approved',
      'PAID': 'paid',
      'VOIDED': 'pending'
    };

    return statusMap[xeroStatus || ''] || 'approved';
  }

  private calculateMonthlyTrends(transactions: XeroTransaction[]): Array<{
    month: string;
    income: number;
    expenses: number;
    net: number;
  }> {
    const monthlyData = new Map<string, { income: number; expenses: number }>();

    transactions.forEach(transaction => {
      const date = new Date(transaction.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, { income: 0, expenses: 0 });
      }

      const monthData = monthlyData.get(monthKey)!;

      if (transaction.type === 'RECEIVE') {
        monthData.income += transaction.amount;
      } else {
        monthData.expenses += Math.abs(transaction.amount);
      }
    });

    return Array.from(monthlyData.entries())
      .map(([month, data]) => ({
        month,
        income: data.income,
        expenses: data.expenses,
        net: data.income - data.expenses
      }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-12); // Last 12 months
  }

  private getCachedData(key: string): any {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  private setCachedData(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });

    // Clean up old cache entries
    if (this.cache.size > 50) {
      const oldestKeys = Array.from(this.cache.keys()).slice(0, 10);
      oldestKeys.forEach(key => this.cache.delete(key));
    }
  }
}