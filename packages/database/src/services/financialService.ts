/**
 * Financial Service
 * Personal finance management with Australian compliance and Beautiful Obsolescence tracking
 * Supports community economic networks and extractive system alternatives
 */

import type {
  FinancialTransaction,
  Budget,
  TransactionType,
  BudgetPeriod,
} from '../../generated/client';
import { getPrismaClient } from '../index';

export class FinancialService {
  private prisma = getPrismaClient();

  /**
   * Create a new financial transaction
   */
  async createTransaction(
    profileId: string,
    transactionData: {
      amount: number;
      currency: string;
      description: string;
      category: string;
      transactionType: TransactionType;
      transactionDate: Date;
      merchant?: string;
      location?: string;
      paymentMethod?: string;
      extractiveSystemAlternative?: boolean;
      communityBenefit?: boolean;
      tags?: string[];
      receiptUrl?: string;
      notes?: string;
    }
  ): Promise<FinancialTransaction> {
    return this.prisma.financialTransaction.create({
      data: {
        profileId,
        // Australian defaults
        currency: transactionData.currency || 'AUD',
        timezone: 'Australia/Sydney',
        ...transactionData,
      },
    });
  }

  /**
   * Get transactions for a date range
   */
  async getTransactions(
    profileId: string,
    startDate: Date,
    endDate: Date,
    filters?: {
      transactionType?: TransactionType;
      category?: string;
      minAmount?: number;
      maxAmount?: number;
      extractiveSystemAlternative?: boolean;
      communityBenefit?: boolean;
      tags?: string[];
    }
  ): Promise<FinancialTransaction[]> {
    return this.prisma.financialTransaction.findMany({
      where: {
        profileId,
        transactionDate: {
          gte: startDate,
          lte: endDate,
        },
        ...(filters?.transactionType && {
          transactionType: filters.transactionType,
        }),
        ...(filters?.category && {
          category: { equals: filters.category, mode: 'insensitive' },
        }),
        ...(filters?.minAmount && { amount: { gte: filters.minAmount } }),
        ...(filters?.maxAmount && { amount: { lte: filters.maxAmount } }),
        ...(filters?.extractiveSystemAlternative !== undefined && {
          extractiveSystemAlternative: filters.extractiveSystemAlternative,
        }),
        ...(filters?.communityBenefit !== undefined && {
          communityBenefit: filters.communityBenefit,
        }),
        ...(filters?.tags && {
          tags: { hasSome: filters.tags },
        }),
      },
      orderBy: { transactionDate: 'desc' },
    });
  }

  /**
   * Create a new budget
   */
  async createBudget(
    profileId: string,
    budgetData: {
      name: string;
      description?: string;
      category: string;
      budgetAmount: number;
      currency: string;
      period: BudgetPeriod;
      startDate: Date;
      endDate?: Date;
      alertThreshold?: number;
      trackExtractiveAlternatives?: boolean;
      communityGoals?: boolean;
    }
  ): Promise<Budget> {
    return this.prisma.budget.create({
      data: {
        profileId,
        currency: budgetData.currency || 'AUD',
        isActive: true,
        currentSpent: 0,
        ...budgetData,
      },
    });
  }

  /**
   * Get active budgets for a profile
   */
  async getActiveBudgets(profileId: string): Promise<Budget[]> {
    return this.prisma.budget.findMany({
      where: {
        profileId,
        isActive: true,
      },
      orderBy: [{ period: 'asc' }, { createdAt: 'desc' }],
    });
  }

  /**
   * Update budget spending based on new transactions
   */
  async updateBudgetSpending(profileId: string): Promise<void> {
    const budgets = await this.getActiveBudgets(profileId);

    for (const budget of budgets) {
      const currentPeriodTransactions = await this.getTransactionsForBudgetPeriod(
        profileId,
        budget
      );

      const totalSpent = currentPeriodTransactions
        .filter(t => t.transactionType === 'EXPENSE' && t.category === budget.category)
        .reduce((sum, t) => sum + t.amount, 0);

      await this.prisma.budget.update({
        where: { id: budget.id },
        data: {
          currentSpent: totalSpent,
          lastUpdated: new Date(),
        },
      });

      // Check for budget alerts
      if (
        budget.alertThreshold &&
        totalSpent >= (budget.budgetAmount * budget.alertThreshold) / 100
      ) {
        await this.createBudgetAlert(budget.id, totalSpent);
      }
    }
  }

  /**
   * Get transactions for a specific budget period
   */
  private async getTransactionsForBudgetPeriod(
    profileId: string,
    budget: Budget
  ): Promise<FinancialTransaction[]> {
    const { startDate, endDate } = this.getBudgetPeriodDates(budget);

    return this.getTransactions(profileId, startDate, endDate, {
      transactionType: 'EXPENSE',
      category: budget.category,
    });
  }

  /**
   * Calculate budget period dates
   */
  private getBudgetPeriodDates(budget: Budget): { startDate: Date; endDate: Date } {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    switch (budget.period) {
      case 'WEEKLY':
        startDate = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() - now.getDay()
        );
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        break;

      case 'MONTHLY':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;

      case 'QUARTERLY':
        const quarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), quarter * 3, 1);
        endDate = new Date(now.getFullYear(), (quarter + 1) * 3, 0);
        break;

      case 'YEARLY':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31);
        break;

      case 'CUSTOM':
      default:
        startDate = budget.startDate;
        endDate = budget.endDate || now;
        break;
    }

    return { startDate, endDate };
  }

  /**
   * Create budget alert (placeholder - would integrate with notification system)
   */
  private async createBudgetAlert(
    budgetId: string,
    currentSpent: number
  ): Promise<void> {
    // In a real implementation, this would create notifications
    console.log(`Budget alert: Budget ${budgetId} has spent ${currentSpent}`);
  }

  /**
   * Get financial analytics for a profile
   */
  async getFinancialAnalytics(
    profileId: string,
    months: number = 6
  ): Promise<{
    totalIncome: number;
    totalExpenses: number;
    netIncome: number;
    avgMonthlyIncome: number;
    avgMonthlyExpenses: number;
    topExpenseCategories: Array<{ category: string; amount: number; count: number }>;
    incomeCategories: Array<{ category: string; amount: number; count: number }>;
    extractiveSystemAlternatives: {
      totalAmount: number;
      percentage: number;
      count: number;
    };
    communityBenefitSpending: {
      totalAmount: number;
      percentage: number;
      count: number;
    };
    monthlyTrends: Array<{
      month: string;
      income: number;
      expenses: number;
      net: number;
    }>;
    budgetPerformance: Array<{
      budgetName: string;
      allocated: number;
      spent: number;
      remaining: number;
      percentageUsed: number;
    }>;
  }> {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const transactions = await this.getTransactions(profileId, startDate, new Date());
    const budgets = await this.getActiveBudgets(profileId);

    // Calculate basic metrics
    const incomeTransactions = transactions.filter(t => t.transactionType === 'INCOME');
    const expenseTransactions = transactions.filter(
      t => t.transactionType === 'EXPENSE'
    );

    const totalIncome = incomeTransactions.reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = expenseTransactions.reduce((sum, t) => sum + t.amount, 0);
    const netIncome = totalIncome - totalExpenses;

    const avgMonthlyIncome = totalIncome / months;
    const avgMonthlyExpenses = totalExpenses / months;

    // Category analysis
    const expenseCategoryMap = new Map<string, { amount: number; count: number }>();
    expenseTransactions.forEach(t => {
      const current = expenseCategoryMap.get(t.category) || { amount: 0, count: 0 };
      expenseCategoryMap.set(t.category, {
        amount: current.amount + t.amount,
        count: current.count + 1,
      });
    });

    const topExpenseCategories = Array.from(expenseCategoryMap.entries())
      .map(([category, data]) => ({ category, ...data }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);

    const incomeCategoryMap = new Map<string, { amount: number; count: number }>();
    incomeTransactions.forEach(t => {
      const current = incomeCategoryMap.get(t.category) || { amount: 0, count: 0 };
      incomeCategoryMap.set(t.category, {
        amount: current.amount + t.amount,
        count: current.count + 1,
      });
    });

    const incomeCategories = Array.from(incomeCategoryMap.entries())
      .map(([category, data]) => ({ category, ...data }))
      .sort((a, b) => b.amount - a.amount);

    // Beautiful Obsolescence tracking
    const extractiveAlternatives = transactions.filter(
      t => t.extractiveSystemAlternative
    );
    const extractiveSystemAlternatives = {
      totalAmount: extractiveAlternatives.reduce((sum, t) => sum + t.amount, 0),
      percentage:
        totalExpenses > 0
          ? (extractiveAlternatives.reduce((sum, t) => sum + t.amount, 0) /
              totalExpenses) *
            100
          : 0,
      count: extractiveAlternatives.length,
    };

    const communityBenefitTx = transactions.filter(t => t.communityBenefit);
    const communityBenefitSpending = {
      totalAmount: communityBenefitTx.reduce((sum, t) => sum + t.amount, 0),
      percentage:
        totalExpenses > 0
          ? (communityBenefitTx.reduce((sum, t) => sum + t.amount, 0) / totalExpenses) *
            100
          : 0,
      count: communityBenefitTx.length,
    };

    // Monthly trends
    const monthlyTrends = this.calculateMonthlyTrends(transactions, months);

    // Budget performance
    const budgetPerformance = budgets.map(budget => ({
      budgetName: budget.name,
      allocated: budget.budgetAmount,
      spent: budget.currentSpent,
      remaining: budget.budgetAmount - budget.currentSpent,
      percentageUsed: (budget.currentSpent / budget.budgetAmount) * 100,
    }));

    return {
      totalIncome,
      totalExpenses,
      netIncome,
      avgMonthlyIncome,
      avgMonthlyExpenses,
      topExpenseCategories,
      incomeCategories,
      extractiveSystemAlternatives,
      communityBenefitSpending,
      monthlyTrends,
      budgetPerformance,
    };
  }

  /**
   * Calculate monthly spending trends
   */
  private calculateMonthlyTrends(
    transactions: FinancialTransaction[],
    months: number
  ): Array<{ month: string; income: number; expenses: number; net: number }> {
    const trends = new Map<string, { income: number; expenses: number }>();

    transactions.forEach(transaction => {
      const monthKey = transaction.transactionDate.toISOString().substring(0, 7); // YYYY-MM
      const current = trends.get(monthKey) || { income: 0, expenses: 0 };

      if (transaction.transactionType === 'INCOME') {
        current.income += transaction.amount;
      } else {
        current.expenses += transaction.amount;
      }

      trends.set(monthKey, current);
    });

    return Array.from(trends.entries())
      .map(([month, data]) => ({
        month,
        income: data.income,
        expenses: data.expenses,
        net: data.income - data.expenses,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }

  /**
   * Get Beautiful Obsolescence impact report
   */
  async getBeautifulObsolescenceReport(
    profileId: string,
    months: number = 12
  ): Promise<{
    extractiveSystemAlternatives: {
      totalSpent: number;
      monthlyAverage: number;
      topCategories: Array<{ category: string; amount: number }>;
      growthTrend: number; // percentage change from first to last period
    };
    communityEconomicImpact: {
      totalContributed: number;
      localBusinessSupport: number;
      cooperativeSpending: number;
      skillShareEconomy: number;
    };
    traditionalSystemReduction: {
      corporateSpendingReduction: number;
      extractiveAlternativesAdopted: string[];
      sustainabilityScore: number;
    };
  }> {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const transactions = await this.getTransactions(profileId, startDate, new Date(), {
      extractiveSystemAlternative: true,
    });

    const communityTransactions = await this.getTransactions(
      profileId,
      startDate,
      new Date(),
      {
        communityBenefit: true,
      }
    );

    // Extractive system alternatives analysis
    const totalSpent = transactions.reduce((sum, t) => sum + t.amount, 0);
    const monthlyAverage = totalSpent / months;

    const categorySpending = new Map<string, number>();
    transactions.forEach(t => {
      const current = categorySpending.get(t.category) || 0;
      categorySpending.set(t.category, current + t.amount);
    });

    const topCategories = Array.from(categorySpending.entries())
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    // Calculate growth trend (simplified)
    const firstHalf = transactions.filter(
      t =>
        t.transactionDate <
        new Date(startDate.getTime() + (months * 30 * 24 * 60 * 60 * 1000) / 2)
    );
    const secondHalf = transactions.filter(
      t =>
        t.transactionDate >=
        new Date(startDate.getTime() + (months * 30 * 24 * 60 * 60 * 1000) / 2)
    );

    const firstHalfTotal = firstHalf.reduce((sum, t) => sum + t.amount, 0);
    const secondHalfTotal = secondHalf.reduce((sum, t) => sum + t.amount, 0);
    const growthTrend =
      firstHalfTotal > 0
        ? ((secondHalfTotal - firstHalfTotal) / firstHalfTotal) * 100
        : 0;

    // Community economic impact
    const totalContributed = communityTransactions.reduce(
      (sum, t) => sum + t.amount,
      0
    );

    // These would be calculated based on transaction tags/categories in a real implementation
    const localBusinessSupport = communityTransactions
      .filter(t => t.tags?.includes('local-business'))
      .reduce((sum, t) => sum + t.amount, 0);

    const cooperativeSpending = communityTransactions
      .filter(t => t.tags?.includes('cooperative'))
      .reduce((sum, t) => sum + t.amount, 0);

    const skillShareEconomy = communityTransactions
      .filter(t => t.tags?.includes('skill-share'))
      .reduce((sum, t) => sum + t.amount, 0);

    // Traditional system reduction metrics
    const allTransactions = await this.getTransactions(
      profileId,
      startDate,
      new Date()
    );
    const corporateTransactions = allTransactions.filter(
      t => !t.extractiveSystemAlternative && !t.communityBenefit
    );
    const corporateSpendingReduction = corporateTransactions.reduce(
      (sum, t) => sum + t.amount,
      0
    );

    const extractiveAlternativesAdopted = Array.from(
      new Set(transactions.flatMap(t => t.tags || []))
    );

    // Simple sustainability score based on percentage of spending on alternatives
    const totalSpending = allTransactions
      .filter(t => t.transactionType === 'EXPENSE')
      .reduce((sum, t) => sum + t.amount, 0);

    const sustainabilityScore =
      totalSpending > 0 ? ((totalSpent + totalContributed) / totalSpending) * 100 : 0;

    return {
      extractiveSystemAlternatives: {
        totalSpent,
        monthlyAverage,
        topCategories,
        growthTrend,
      },
      communityEconomicImpact: {
        totalContributed,
        localBusinessSupport,
        cooperativeSpending,
        skillShareEconomy,
      },
      traditionalSystemReduction: {
        corporateSpendingReduction,
        extractiveAlternativesAdopted,
        sustainabilityScore,
      },
    };
  }

  /**
   * Update budget settings
   */
  async updateBudget(
    budgetId: string,
    updates: Partial<Omit<Budget, 'id' | 'profileId' | 'createdAt' | 'updatedAt'>>
  ): Promise<Budget> {
    return this.prisma.budget.update({
      where: { id: budgetId },
      data: {
        ...updates,
        lastUpdated: new Date(),
      },
    });
  }

  /**
   * Update transaction details
   */
  async updateTransaction(
    transactionId: string,
    updates: Partial<
      Omit<FinancialTransaction, 'id' | 'profileId' | 'createdAt' | 'updatedAt'>
    >
  ): Promise<FinancialTransaction> {
    return this.prisma.financialTransaction.update({
      where: { id: transactionId },
      data: {
        ...updates,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Delete transaction
   */
  async deleteTransaction(transactionId: string): Promise<void> {
    await this.prisma.financialTransaction.delete({
      where: { id: transactionId },
    });
  }

  /**
   * Deactivate budget
   */
  async deactivateBudget(budgetId: string): Promise<Budget> {
    return this.updateBudget(budgetId, { isActive: false });
  }
}
