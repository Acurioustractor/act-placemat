/**
 * Annual Cost Calculator & Savings Analyzer
 *
 * R&D Component: AI-Powered Subscription Cost Optimization
 * Hypothesis: Automated cost analysis identifies 15-30% potential savings through
 *             unused subscription cancellations, duplicate detection, and annual plan switches
 * Methodology: Calculate annualized costs from frequency patterns, detect duplicates via
 *              fuzzy vendor matching, identify unused subscriptions (low confidence scores),
 *              estimate savings from annual billing switches (15% avg discount)
 * Success Metric: >= $1,000 annual savings identified, accuracy ±10% vs manual audit
 * Findings: TBD after production use
 */

export class CostEstimator {
  constructor(supabase) {
    this.supabase = supabase;
  }

  /**
   * R&D Method: Comprehensive annual cost analysis with savings opportunities
   * Returns: { totalAnnual, breakdown, savingsOpportunities }
   */
  async estimateAnnualCosts(tenantId) {
    console.log('[Cost Estimator] Calculating annual costs for tenant:', tenantId);

    try {
      // Fetch all active subscriptions
      const { data: subscriptions, error } = await this.supabase
        .from('discovered_subscriptions')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('status', 'active');

      if (error) {
        console.error('[Cost Estimator] Error fetching subscriptions:', error);
        throw error;
      }

      if (!subscriptions || subscriptions.length === 0) {
        return {
          totalAnnual: 0,
          breakdown: [],
          savingsOpportunities: [],
          message: 'No active subscriptions found'
        };
      }

      console.log(`[Cost Estimator] Analyzing ${subscriptions.length} active subscriptions`);

      // Calculate annual cost for each subscription
      let totalAnnual = 0;
      const breakdown = [];

      for (const sub of subscriptions) {
        const annualCost = this.calculateAnnualCost(sub);
        totalAnnual += annualCost;

        breakdown.push({
          id: sub.id,
          vendor: sub.vendor,
          frequency: sub.frequency,
          amount: sub.amount,
          annualCost,
          confidence: sub.confidence
        });
      }

      // Sort breakdown by annual cost (highest first)
      breakdown.sort((a, b) => b.annualCost - a.annualCost);

      // Find savings opportunities
      const savingsOpportunities = await this.findSavingsOpportunities(subscriptions);

      // Calculate total potential savings
      const totalPotentialSavings = savingsOpportunities.reduce(
        (sum, opp) => sum + (opp.potentialSavings || 0),
        0
      );

      console.log('[Cost Estimator] Analysis complete:', {
        totalAnnual: totalAnnual.toFixed(2),
        subscriptionsAnalyzed: subscriptions.length,
        opportunitiesFound: savingsOpportunities.length,
        totalPotentialSavings: totalPotentialSavings.toFixed(2)
      });

      // R&D Metrics
      console.log('[R&D] Cost Analysis Metrics:', {
        totalAnnualCost: `$${totalAnnual.toFixed(2)}`,
        avgCostPerSub: `$${(totalAnnual / subscriptions.length).toFixed(2)}`,
        potentialSavingsRate: `${((totalPotentialSavings / totalAnnual) * 100).toFixed(1)}%`,
        opportunityTypes: savingsOpportunities.map(o => o.type)
      });

      return {
        totalAnnual,
        breakdown,
        savingsOpportunities,
        totalPotentialSavings,
        summary: {
          subscriptionCount: subscriptions.length,
          avgCostPerSubscription: totalAnnual / subscriptions.length,
          savingsRate: (totalPotentialSavings / totalAnnual) * 100
        }
      };
    } catch (error) {
      console.error('[Cost Estimator] Error during cost estimation:', error);
      throw error;
    }
  }

  /**
   * Calculate annual cost based on frequency
   */
  calculateAnnualCost(subscription) {
    if (!subscription.amount || subscription.amount <= 0) {
      return 0;
    }

    switch (subscription.frequency) {
      case 'monthly':
        return subscription.amount * 12;
      case 'quarterly':
        return subscription.amount * 4;
      case 'yearly':
        return subscription.amount;
      case 'irregular':
        // Estimate monthly for irregular patterns
        return subscription.amount * 12;
      case 'unknown':
      default:
        // Assume monthly for unknown frequency
        return subscription.amount * 12;
    }
  }

  /**
   * Find savings opportunities
   * 1. Unused subscriptions (low confidence <0.5)
   * 2. Duplicate vendors
   * 3. Annual plan savings (monthly subs >$10/mo)
   */
  async findSavingsOpportunities(subscriptions) {
    const opportunities = [];

    // 1. Unused subscriptions (low confidence)
    const unused = subscriptions.filter(s => s.confidence < 0.5);
    if (unused.length > 0) {
      const unusedSavings = unused.reduce(
        (sum, s) => sum + this.calculateAnnualCost(s),
        0
      );

      opportunities.push({
        type: 'unused_subscriptions',
        count: unused.length,
        potentialSavings: unusedSavings,
        subscriptions: unused.map(s => ({
          id: s.id,
          vendor: s.vendor,
          annualCost: this.calculateAnnualCost(s),
          confidence: s.confidence
        })),
        recommendation: `Review and cancel ${unused.length} low-confidence subscription${unused.length > 1 ? 's' : ''}`,
        priority: 'high'
      });
    }

    // 2. Duplicate vendors
    const duplicates = this.findDuplicates(subscriptions);
    if (duplicates.length > 0) {
      const duplicateSavings = duplicates.reduce((sum, dup) => {
        // Assume we can eliminate all but the cheapest subscription
        const costs = dup.subscriptions.map(s => this.calculateAnnualCost(s));
        const minCost = Math.min(...costs);
        const totalCost = costs.reduce((a, b) => a + b, 0);
        return sum + (totalCost - minCost);
      }, 0);

      opportunities.push({
        type: 'duplicate_vendors',
        count: duplicates.length,
        potentialSavings: duplicateSavings,
        duplicates: duplicates.map(dup => ({
          vendor: dup.vendor,
          subscriptionCount: dup.count,
          subscriptions: dup.subscriptions.map(s => ({
            id: s.id,
            amount: s.amount,
            frequency: s.frequency,
            annualCost: this.calculateAnnualCost(s)
          }))
        })),
        recommendation: `Consolidate ${duplicates.length} duplicate vendor${duplicates.length > 1 ? 's' : ''}`,
        priority: 'medium'
      });
    }

    // 3. Annual plan savings
    const monthlySubs = subscriptions.filter(
      s => s.frequency === 'monthly' && s.amount > 10
    );

    if (monthlySubs.length > 0) {
      // Assume 15% average savings by switching to annual billing
      const annualPlanSavings = monthlySubs.reduce((sum, s) => {
        const currentAnnualCost = this.calculateAnnualCost(s);
        return sum + (currentAnnualCost * 0.15);
      }, 0);

      opportunities.push({
        type: 'annual_plan_switch',
        count: monthlySubs.length,
        potentialSavings: annualPlanSavings,
        subscriptions: monthlySubs.map(s => ({
          id: s.id,
          vendor: s.vendor,
          currentMonthlyCost: s.amount,
          currentAnnualCost: this.calculateAnnualCost(s),
          estimatedAnnualPlanCost: this.calculateAnnualCost(s) * 0.85,
          estimatedSavings: this.calculateAnnualCost(s) * 0.15
        })),
        recommendation: `Switch ${monthlySubs.length} monthly subscription${monthlySubs.length > 1 ? 's' : ''} to annual billing (typically 15% savings)`,
        priority: 'low'
      });
    }

    return opportunities;
  }

  /**
   * Find duplicate vendors using fuzzy matching
   */
  findDuplicates(subscriptions) {
    const vendorMap = {};

    // Normalize vendor names and group
    subscriptions.forEach(sub => {
      const normalized = this.normalizeVendor(sub.vendor);

      if (!vendorMap[normalized]) {
        vendorMap[normalized] = [];
      }

      vendorMap[normalized].push(sub);
    });

    // Find groups with multiple subscriptions (duplicates)
    const duplicates = Object.entries(vendorMap)
      .filter(([_, subs]) => subs.length > 1)
      .map(([normalizedVendor, subs]) => ({
        vendor: subs[0].vendor,  // Use first subscription's original vendor name
        normalizedVendor,
        count: subs.length,
        subscriptions: subs
      }));

    return duplicates;
  }

  /**
   * Normalize vendor name for duplicate detection
   * Same strategy as subscription detector
   */
  normalizeVendor(vendor) {
    if (!vendor) return 'unknown';

    return vendor
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .substring(0, 20);
  }

  /**
   * Calculate analytics summary for V1 API
   * Takes subscriptions array directly (not tenant ID)
   */
  async calculateAnalyticsSummary(subscriptions) {
    console.log(`[Cost Estimator] Calculating analytics summary for ${subscriptions.length} subscriptions`);

    if (!subscriptions || subscriptions.length === 0) {
      return {
        totalAnnualCost: 0,
        subscriptionCount: 0,
        avgConfidence: 0,
        savingsOpportunities: []
      };
    }

    // Calculate total annual cost
    let totalAnnualCost = 0;
    let totalConfidence = 0;

    subscriptions.forEach(sub => {
      totalAnnualCost += this.calculateAnnualCost(sub);
      totalConfidence += sub.confidence || 0;
    });

    const avgConfidence = totalConfidence / subscriptions.length;

    // Find savings opportunities
    const savingsOpportunities = await this.findSavingsOpportunities(subscriptions);

    return {
      totalAnnualCost,
      subscriptionCount: subscriptions.length,
      avgConfidence,
      savingsOpportunities
    };
  }

  /**
   * Cache annual costs in database for quick dashboard queries
   */
  async cacheAnnualCosts(tenantId) {
    console.log('[Cost Estimator] Caching annual costs for tenant:', tenantId);

    const { data: subscriptions, error: fetchError } = await this.supabase
      .from('discovered_subscriptions')
      .select('id, amount, frequency')
      .eq('tenant_id', tenantId)
      .eq('status', 'active');

    if (fetchError) {
      console.error('[Cost Estimator] Error fetching subscriptions for caching:', fetchError);
      throw fetchError;
    }

    for (const sub of subscriptions) {
      const annualCost = this.calculateAnnualCost(sub);

      const { error: updateError } = await this.supabase
        .from('discovered_subscriptions')
        .update({ annual_cost_cached: annualCost })
        .eq('id', sub.id);

      if (updateError) {
        console.error(`[Cost Estimator] Error caching cost for subscription ${sub.id}:`, updateError);
      }
    }

    console.log(`[Cost Estimator] Cached annual costs for ${subscriptions.length} subscriptions`);
  }
}

/**
 * R&D Documentation Export
 * For AusIndustry R&D tax claim compliance
 */
export const RD_METADATA = {
  component: 'Cost Estimator & Savings Analyzer',
  hypothesis: 'Automated cost analysis identifies 15-30% potential savings via unused subscription cancellations, duplicate detection, and annual plan switches',
  methodology: 'Calculate annualized costs from frequency patterns, fuzzy match vendors for duplicate detection, analyze confidence scores for unused subscriptions, estimate 15% savings from annual billing',
  successMetric: '>= $1,000 annual savings identified per user, cost estimation accuracy ±10% vs manual spreadsheet audit',
  findings: 'TBD after production use and user savings tracking',
  category: 'Data Analysis',
  technicalUncertainty: 'Optimal heuristics for identifying truly unused subscriptions (low confidence threshold) vs subscriptions that are actively used but have weak detection signals',
  estimatedHours: 4.0
};

export default CostEstimator;
