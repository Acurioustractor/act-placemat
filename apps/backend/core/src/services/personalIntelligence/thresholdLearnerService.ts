/**
 * Threshold Learner Service
 *
 * Analyzes recommendation outcomes to learn optimal thresholds.
 * Replaces hardcoded values like "14 days = stale" with learned
 * thresholds per contact type using Bayesian updating.
 *
 * Migrated from: act-personal-ai/services/threshold-learner.mjs
 */

import { db } from './databaseHelper.js';
import {
  ThresholdType,
  ContactSegment,
  ThresholdPrior,
  ThresholdResult,
  BayesianUpdateResult,
  ThresholdLearningResult,
  ThresholdAccuracyReport,
} from './types.js';

/**
 * Default priors - used when no learned value exists
 */
export const DEFAULT_PRIORS: Record<ThresholdType, Record<ContactSegment, ThresholdPrior>> = {
  stale_days: {
    default: { value: 14, strength: 2.0 },
    funder: { value: 7, strength: 2.0 },
    partner: { value: 10, strength: 2.0 },
    community: { value: 30, strength: 2.0 },
  },
  attention_days: {
    default: { value: 7, strength: 2.0 },
    funder: { value: 5, strength: 2.0 },
    partner: { value: 7, strength: 2.0 },
    community: { value: 14, strength: 2.0 },
  },
  normal_days: {
    default: { value: 3, strength: 2.0 },
    funder: { value: 2, strength: 2.0 },
    partner: { value: 3, strength: 2.0 },
    community: { value: 7, strength: 2.0 },
  },
  high_value: {
    default: { value: 5000, strength: 2.0 },
    funder: { value: 10000, strength: 2.0 },
    partner: { value: 10000, strength: 2.0 },
    community: { value: 3000, strength: 2.0 },
  },
};

/**
 * Threshold Learner Service class
 * Learns optimal thresholds from outcome data using Bayesian updating
 */
export class ThresholdLearnerService {
  /**
   * Get default threshold for a type and segment
   *
   * @param type - Threshold type (e.g., 'stale_days')
   * @param segment - Contact segment (e.g., 'funder', 'default')
   * @returns Default threshold value
   */
  getDefaultThreshold(type: ThresholdType, segment: ContactSegment | string = 'default'): number {
    const typeDefaults = DEFAULT_PRIORS[type];
    if (!typeDefaults) return 14;

    const prior = typeDefaults[segment as ContactSegment] || typeDefaults.default;
    return prior?.value || 14;
  }

  /**
   * Get a threshold value, using learned value if available, otherwise prior
   *
   * @param type - Threshold type (e.g., 'stale_days')
   * @param segment - Segment (e.g., 'funder', 'default')
   * @returns Promise resolving to threshold result
   */
  async getThreshold(type: ThresholdType, segment: ContactSegment = 'default'): Promise<ThresholdResult> {
    // Try to get learned threshold from database
    try {
      const { data, error } = await db.main
        .from('learned_thresholds')
        .select('value, confidence, sample_size')
        .eq('threshold_type', type)
        .eq('segment', segment)
        .single();

      if (!error && data && data.sample_size > 0) {
        return {
          value: data.value,
          confidence: data.confidence,
          isLearned: true,
          sampleSize: data.sample_size,
        };
      }
    } catch {
      // Fall through to default
    }

    // Fall back to prior
    const priorData = DEFAULT_PRIORS[type]?.[segment] || DEFAULT_PRIORS[type]?.default;
    return {
      value: priorData?.value || 14,
      confidence: 0.5,
      isLearned: false,
      sampleSize: 0,
    };
  }

  /**
   * Get all thresholds for a specific type
   *
   * @param type - Threshold type
   * @returns Promise resolving to map of segment to threshold data
   */
  async getThresholdsForType(type: ThresholdType): Promise<Record<string, ThresholdResult>> {
    const result: Record<string, ThresholdResult> = {};

    try {
      const { data, error } = await db.main
        .from('learned_thresholds')
        .select('*')
        .eq('threshold_type', type);

      if (error) {
        console.error('Error fetching thresholds:', error);
        return result;
      }

      for (const row of data || []) {
        result[row.segment] = {
          value: row.value,
          confidence: row.confidence,
          sampleSize: row.sample_size,
          isLearned: row.sample_size > 0,
        };
      }
    } catch (err) {
      console.error('Error in getThresholdsForType:', err);
    }

    return result;
  }

  /**
   * Bayesian update for a threshold
   * Uses conjugate prior approach for continuous values
   *
   * @param priorValue - Prior estimate of threshold
   * @param priorStrength - How much to weight the prior (pseudo-observations)
   * @param observations - New observed optimal values
   * @returns Updated value and confidence
   */
  bayesianUpdate(priorValue: number, priorStrength: number, observations: number[]): BayesianUpdateResult {
    if (!observations || observations.length === 0) {
      return { value: priorValue, confidence: 0.5 };
    }

    // Calculate sample statistics
    const n = observations.length;
    const sampleMean = observations.reduce((a, b) => a + b, 0) / n;

    // Bayesian update (normal-normal conjugate)
    // Posterior mean = (prior_strength * prior + n * sample_mean) / (prior_strength + n)
    const totalWeight = priorStrength + n;
    const posteriorValue = (priorStrength * priorValue + n * sampleMean) / totalWeight;

    // Confidence based on sample size relative to prior
    // More observations = higher confidence
    const confidence = Math.min(0.95, 0.5 + (n / (n + priorStrength * 2)) * 0.45);

    return {
      value: Math.round(posteriorValue * 100) / 100, // Round to 2 decimal places
      confidence: Math.round(confidence * 100) / 100,
    };
  }

  /**
   * Determine segment from recommendation metadata
   */
  private determineSegment(outcome: any): ContactSegment {
    const metadata = outcome.metadata || {};
    const tags: string[] = metadata.tags || [];

    if (tags.some((t: string) => t.toLowerCase().includes('funder') || t.toLowerCase().includes('funding'))) {
      return 'funder';
    }
    if (tags.some((t: string) => t.toLowerCase().includes('partner'))) {
      return 'partner';
    }
    if (tags.some((t: string) => t.toLowerCase().includes('community'))) {
      return 'community';
    }

    return 'default';
  }

  /**
   * Analyze outcomes to determine optimal threshold for stale days
   *
   * @param segment - Contact segment to analyze
   * @returns Promise resolving to array of optimal day values
   */
  private async analyzeStaleThreshold(segment: ContactSegment = 'default'): Promise<number[]> {
    try {
      const { data: outcomes, error } = await db.main
        .from('recommendation_outcomes')
        .select('*')
        .in('recommendation_type', ['follow_up', 'relationship', 'stale_contact'])
        .not('outcome', 'is', null)
        .not('acted_upon', 'is', null);

      if (error || !outcomes?.length) {
        return [];
      }

      const optimalDays: number[] = [];

      for (const outcome of outcomes) {
        // Try to determine the segment of this recommendation
        const outcomeSegment = this.determineSegment(outcome);

        // Only use outcomes matching our segment (or 'default' for all)
        if (segment !== 'default' && outcomeSegment !== segment) {
          continue;
        }

        const metadata = outcome.metadata || {};
        const daysSinceContact = metadata.days_since_contact;

        if (daysSinceContact === undefined) continue;

        // If acted upon and successful, this was a good threshold
        if (outcome.acted_upon && outcome.outcome === 'success') {
          optimalDays.push(daysSinceContact);
        }
        // If not acted upon but outcome was still good, threshold was too aggressive
        else if (!outcome.acted_upon && outcome.outcome === 'success') {
          optimalDays.push(daysSinceContact + 7);
        }
        // If acted upon but unsuccessful, threshold was too late
        else if (outcome.acted_upon && outcome.outcome === 'failure') {
          optimalDays.push(Math.max(1, daysSinceContact - 7));
        }
      }

      return optimalDays;
    } catch (err) {
      console.error('Error analyzing stale threshold:', err);
      return [];
    }
  }

  /**
   * Learn all thresholds from outcome data
   *
   * @returns Promise resolving to learning results
   */
  async learnThresholds(): Promise<ThresholdLearningResult> {
    const results: ThresholdLearningResult = {
      updated: [],
      unchanged: [],
      errors: [],
    };

    const segments: ContactSegment[] = ['default', 'funder', 'partner', 'community'];

    // Learn stale_days thresholds for each segment
    for (const segment of segments) {
      try {
        const observations = await this.analyzeStaleThreshold(segment);

        if (observations.length === 0) {
          results.unchanged.push({ type: 'stale_days', segment, reason: 'No outcome data' });
          continue;
        }

        // Get current threshold
        const { data: current } = await db.main
          .from('learned_thresholds')
          .select('*')
          .eq('threshold_type', 'stale_days')
          .eq('segment', segment)
          .single();

        const priorValue = current?.prior_value || DEFAULT_PRIORS.stale_days[segment]?.value || 14;
        const priorStrength = current?.prior_strength || DEFAULT_PRIORS.stale_days[segment]?.strength || 2.0;

        // Bayesian update
        const { value, confidence } = this.bayesianUpdate(priorValue, priorStrength, observations);

        // Update database
        const { error } = await db.main
          .from('learned_thresholds')
          .upsert({
            threshold_type: 'stale_days',
            segment,
            value,
            confidence,
            sample_size: (current?.sample_size || 0) + observations.length,
            prior_value: priorValue,
            prior_strength: priorStrength,
            last_learned_at: new Date().toISOString(),
            learning_data: {
              last_observations: observations.slice(-20),
              last_update: new Date().toISOString(),
            },
          }, {
            onConflict: 'threshold_type,segment',
          });

        if (error) {
          results.errors.push({ type: 'stale_days', segment, error: error.message });
        } else {
          results.updated.push({
            type: 'stale_days',
            segment,
            previousValue: current?.value || priorValue,
            newValue: value,
            confidence,
            observations: observations.length,
          });
        }
      } catch (err) {
        results.errors.push({ type: 'stale_days', segment, error: (err as Error).message });
      }
    }

    // Calculate attention_days as percentage of stale_days
    for (const segment of segments) {
      try {
        const staleThreshold = await this.getThreshold('stale_days', segment);
        if (staleThreshold) {
          const attentionValue = Math.round(staleThreshold.value * 0.5);

          const { error } = await db.main
            .from('learned_thresholds')
            .upsert({
              threshold_type: 'attention_days',
              segment,
              value: attentionValue,
              confidence: staleThreshold.confidence * 0.9,
              sample_size: staleThreshold.sampleSize,
              prior_value: DEFAULT_PRIORS.attention_days[segment]?.value || 7,
              prior_strength: DEFAULT_PRIORS.attention_days[segment]?.strength || 2.0,
              last_learned_at: new Date().toISOString(),
            }, {
              onConflict: 'threshold_type,segment',
            });

          if (!error) {
            results.updated.push({
              type: 'attention_days',
              segment,
              newValue: attentionValue,
              derivedFrom: 'stale_days',
            });
          }
        }
      } catch {
        // Ignore errors for derived thresholds
      }
    }

    // Calculate normal_days as percentage of attention_days
    for (const segment of segments) {
      try {
        const attentionThreshold = await this.getThreshold('attention_days', segment);
        if (attentionThreshold) {
          const normalValue = Math.max(1, Math.round(attentionThreshold.value * 0.4));

          const { error } = await db.main
            .from('learned_thresholds')
            .upsert({
              threshold_type: 'normal_days',
              segment,
              value: normalValue,
              confidence: attentionThreshold.confidence * 0.9,
              sample_size: attentionThreshold.sampleSize,
              prior_value: DEFAULT_PRIORS.normal_days[segment]?.value || 3,
              prior_strength: DEFAULT_PRIORS.normal_days[segment]?.strength || 2.0,
              last_learned_at: new Date().toISOString(),
            }, {
              onConflict: 'threshold_type,segment',
            });

          if (!error) {
            results.updated.push({
              type: 'normal_days',
              segment,
              newValue: normalValue,
              derivedFrom: 'attention_days',
            });
          }
        }
      } catch {
        // Ignore errors for derived thresholds
      }
    }

    return results;
  }

  /**
   * Get accuracy report showing how well learned thresholds perform
   *
   * @returns Promise resolving to accuracy report
   */
  async getAccuracyReport(): Promise<ThresholdAccuracyReport> {
    const report: ThresholdAccuracyReport = {
      generated: new Date().toISOString(),
      thresholds: {} as any,
      recommendations: {
        total: 0,
        acted: 0,
        successful: 0,
      },
    };

    try {
      // Get all learned thresholds
      const { data: thresholds } = await db.main
        .from('learned_thresholds')
        .select('*')
        .order('threshold_type')
        .order('segment');

      for (const t of thresholds || []) {
        if (!report.thresholds[t.threshold_type as ThresholdType]) {
          report.thresholds[t.threshold_type as ThresholdType] = {} as any;
        }

        report.thresholds[t.threshold_type as ThresholdType][t.segment as ContactSegment] = {
          value: t.value,
          confidence: t.confidence,
          sampleSize: t.sample_size,
          priorValue: t.prior_value,
          changeFromPrior: t.value - t.prior_value,
          lastLearned: t.last_learned_at,
        };
      }

      // Get recommendation stats
      const { data: outcomes } = await db.main
        .from('recommendation_outcomes')
        .select('acted_upon, outcome')
        .not('outcome', 'is', null);

      for (const o of outcomes || []) {
        report.recommendations.total++;
        if (o.acted_upon) report.recommendations.acted++;
        if (o.outcome === 'success') report.recommendations.successful++;
      }

      if (report.recommendations.total > 0) {
        report.recommendations.actedRate = Math.round(
          (report.recommendations.acted / report.recommendations.total) * 100
        );
        report.recommendations.successRate = Math.round(
          (report.recommendations.successful / report.recommendations.total) * 100
        );
      }
    } catch (err) {
      console.error('Error generating accuracy report:', err);
    }

    return report;
  }

  /**
   * Reset all thresholds to their prior values
   */
  async resetThresholds(): Promise<{ reset: boolean }> {
    try {
      for (const [type, segments] of Object.entries(DEFAULT_PRIORS)) {
        for (const [segment, prior] of Object.entries(segments)) {
          await db.main
            .from('learned_thresholds')
            .update({
              value: prior.value,
              confidence: 0.5,
              sample_size: 0,
              last_learned_at: null,
              learning_data: {},
            })
            .eq('threshold_type', type)
            .eq('segment', segment);
        }
      }
    } catch (err) {
      console.error('Error resetting thresholds:', err);
      return { reset: false };
    }

    return { reset: true };
  }
}

// Singleton instance
export const thresholdLearner = new ThresholdLearnerService();

export default thresholdLearner;
