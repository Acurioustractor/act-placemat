/**
 * R&D Tax Incentive Agent
 * Identifies and links R&D activities to transactions
 */

import BaseFinancialAgent from './BaseFinancialAgent.js';

class RDTIAgent extends BaseFinancialAgent {
  constructor(orchestrator) {
    super('RDTIAgent', orchestrator);
  }

  async processTransaction(transactionPayload) {
    const { transactionId, amount, description, supplier, accountCode } = transactionPayload;

    try {
      // Check if transaction qualifies for R&D Tax Incentive
      const rdtiAssessment = this.assessRDTIEligibility(description, supplier, accountCode, amount);

      if (rdtiAssessment.eligible) {
        // Link to R&D activity
        await this.linkToRDActivity(transactionId, rdtiAssessment);

        await this.logAgentAction({
          action: 'rdti_transaction_linked',
          transaction_id: transactionId,
          amount,
          rd_category: rdtiAssessment.category,
          confidence: rdtiAssessment.confidence
        });

        return {
          status: 'linked',
          rdtiCategory: rdtiAssessment.category,
          estimatedBenefit: rdtiAssessment.estimatedBenefit
        };
      } else {
        return {
          status: 'not_eligible',
          reason: rdtiAssessment.reason
        };
      }

    } catch (error) {
      console.error('RDTI processing error:', error);
      await this.handleProcessingError(transactionId, error);
      throw error;
    }
  }

  assessRDTIEligibility(description, supplier, accountCode, amount) {
    const result = {
      eligible: false,
      category: null,
      confidence: 0.0,
      estimatedBenefit: 0,
      reason: null
    };

    // R&D eligible suppliers and patterns from policy
    const rdSuppliers = this.policy.rdti.eligible_suppliers || [];
    const rdPatterns = this.policy.rdti.activity_patterns || [];

    // Check if supplier is on R&D eligible list
    const matchingSupplier = rdSuppliers.find(supplier_rule =>
      supplier.toLowerCase().includes(supplier_rule.name.toLowerCase())
    );

    if (matchingSupplier) {
      result.eligible = true;
      result.category = matchingSupplier.category;
      result.confidence = 0.95;
      result.estimatedBenefit = this.calculateRDTIBenefit(amount, matchingSupplier.rate);
      result.reason = `Matched R&D supplier: ${matchingSupplier.name}`;
      return result;
    }

    // Check description patterns
    const searchText = `${description} ${supplier}`.toLowerCase();

    for (const pattern of rdPatterns) {
      if (pattern.keywords.some(keyword => searchText.includes(keyword.toLowerCase()))) {
        result.eligible = true;
        result.category = pattern.category;
        result.confidence = pattern.confidence;
        result.estimatedBenefit = this.calculateRDTIBenefit(amount, pattern.benefit_rate);
        result.reason = `Matched R&D pattern: ${pattern.keywords.join(', ')}`;
        break;
      }
    }

    // Default patterns for common R&D expenses
    const defaultPatterns = [
      {
        keywords: ['aws', 'google cloud', 'azure', 'hosting', 'cloud computing'],
        category: 'Software Development',
        confidence: 0.80,
        benefit_rate: 0.435 // 43.5% R&D tax offset
      },
      {
        keywords: ['github', 'gitlab', 'software license', 'development tool'],
        category: 'Software Development',
        confidence: 0.85,
        benefit_rate: 0.435
      },
      {
        keywords: ['contractor', 'consultant', 'development', 'programming'],
        category: 'Labour',
        confidence: 0.70,
        benefit_rate: 0.435
      },
      {
        keywords: ['research', 'testing', 'prototype', 'experiment'],
        category: 'Core R&D Activities',
        confidence: 0.90,
        benefit_rate: 0.435
      }
    ];

    if (!result.eligible) {
      for (const pattern of defaultPatterns) {
        if (pattern.keywords.some(keyword => searchText.includes(keyword))) {
          result.eligible = true;
          result.category = pattern.category;
          result.confidence = pattern.confidence;
          result.estimatedBenefit = this.calculateRDTIBenefit(amount, pattern.benefit_rate);
          result.reason = `Default R&D pattern match: ${pattern.keywords.join(', ')}`;
          break;
        }
      }
    }

    if (!result.eligible) {
      result.reason = 'No R&D patterns matched';
    }

    return result;
  }

  calculateRDTIBenefit(amount, benefitRate) {
    return Math.round(Math.abs(amount) * benefitRate * 100) / 100;
  }

  async linkToRDActivity(transactionId, assessment) {
    // Store R&D activity link
    const { error } = await this.supabase
      .from('rdti_activities')
      .insert({
        transaction_id: transactionId,
        rd_category: assessment.category,
        estimated_benefit: assessment.estimatedBenefit,
        confidence_score: assessment.confidence,
        classification_reason: assessment.reason,
        status: 'identified',
        created_at: new Date().toISOString()
      });

    if (error) {
      throw new Error(`Failed to link RDTI activity: ${error.message}`);
    }

    console.log(`✅ RDTI linked: Transaction ${transactionId} -> ${assessment.category} (${this.formatCurrency(assessment.estimatedBenefit)} benefit)`);
  }

  async generateQuarterlyReport() {
    const quarterInfo = this.getCurrentQuarter();

    // Get R&D activities for the quarter
    const { data: rdtiActivities } = await this.supabase
      .from('rdti_activities')
      .select('*')
      .gte('created_at', quarterInfo.startDate)
      .lte('created_at', quarterInfo.endDate);

    const totalExpenditure = rdtiActivities?.reduce((sum, activity) =>
      sum + Math.abs(activity.estimated_benefit / 0.435), 0) || 0;

    const totalBenefit = rdtiActivities?.reduce((sum, activity) =>
      sum + activity.estimated_benefit, 0) || 0;

    const report = {
      quarter: quarterInfo.quarter,
      total_rd_expenditure: totalExpenditure,
      estimated_benefit: totalBenefit,
      activity_count: rdtiActivities?.length || 0,
      by_category: this.groupActivitiesByCategory(rdtiActivities),
      generated_at: new Date().toISOString()
    };

    await this.logAgentAction({
      action: 'rdti_quarterly_report',
      quarter: quarterInfo.quarter,
      total_expenditure: totalExpenditure,
      estimated_benefit: totalBenefit
    });

    return report;
  }

  groupActivitiesByCategory(activities) {
    const categories = {};

    activities?.forEach(activity => {
      if (!categories[activity.rd_category]) {
        categories[activity.rd_category] = {
          count: 0,
          expenditure: 0,
          benefit: 0
        };
      }

      categories[activity.rd_category].count++;
      categories[activity.rd_category].expenditure += Math.abs(activity.estimated_benefit / 0.435);
      categories[activity.rd_category].benefit += activity.estimated_benefit;
    });

    return categories;
  }

  getCurrentQuarter() {
    // Same logic as BASPrepAgent
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    let quarter, startMonth, endMonth;

    if (month <= 3) {
      quarter = 'Q1';
      startMonth = 1;
      endMonth = 3;
    } else if (month <= 6) {
      quarter = 'Q2';
      startMonth = 4;
      endMonth = 6;
    } else if (month <= 9) {
      quarter = 'Q3';
      startMonth = 7;
      endMonth = 9;
    } else {
      quarter = 'Q4';
      startMonth = 10;
      endMonth = 12;
    }

    return {
      quarter: `${year}${quarter}`,
      year,
      startDate: new Date(year, startMonth - 1, 1).toISOString().split('T')[0],
      endDate: new Date(year, endMonth, 0).toISOString().split('T')[0]
    };
  }

  async getMetrics() {
    const currentQuarter = this.getCurrentQuarter();

    const { data: activities } = await this.supabase
      .from('rdti_activities')
      .select('*')
      .gte('created_at', currentQuarter.startDate);

    const totalBenefit = activities?.reduce((sum, activity) =>
      sum + activity.estimated_benefit, 0) || 0;

    return {
      current_quarter: currentQuarter.quarter,
      total_rd_transactions: activities?.length || 0,
      estimated_annual_benefit: totalBenefit * 4, // Rough annualized estimate
      avg_confidence: this.calculateAverageConfidence(activities),
      last_report_generated: new Date().toISOString()
    };
  }

  calculateAverageConfidence(activities) {
    if (!activities || activities.length === 0) return 0;

    const confidenceSum = activities.reduce((sum, activity) =>
      sum + (activity.confidence_score || 0), 0);

    return (confidenceSum / activities.length).toFixed(2);
  }
}

export default RDTIAgent;