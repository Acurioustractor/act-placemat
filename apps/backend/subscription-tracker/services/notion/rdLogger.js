/**
 * Notion R&D Activity Logger
 *
 * R&D Component: AusIndustry Compliance Tracking System
 * Hypothesis: Automated R&D activity logging reduces compliance overhead by 70%
 *             (vs manual documentation) while improving claim accuracy
 * Methodology: Real-time logging of hypothesis/methodology/findings to Notion database,
 *              automated time tracking, structured data model for AusIndustry requirements
 * Success Metric: <10min per activity to log, 100% traceability, zero rejected claims
 * Findings: TBD after Phase 1 claim submission
 */

import notionService from '../../../core/src/services/notionService.js';
import config from '../../config/settings.js';

export class RDLogger {
  constructor() {
    this.databaseId = config.rd.notionDatabaseId;
    this.defaultDeveloper = config.rd.defaultDeveloper;
    this.trackingEnabled = config.rd.trackingEnabled;
  }

  /**
   * Log R&D activity for AusIndustry compliance
   *
   * R&D Hypothesis: Structured logging with hypothesis/methodology/metrics
   *                 reduces audit risk by 80% vs ad-hoc documentation
   *
   * @param {Object} activity - R&D activity metadata
   * @returns {string} Notion page ID
   */
  async logActivity(activity) {
    if (!this.trackingEnabled) {
      console.log('[R&D Logger] Tracking disabled, skipping log');
      return null;
    }

    if (!this.databaseId) {
      console.warn('[R&D Logger] No Notion database ID configured, skipping');
      return null;
    }

    const {
      component,
      hypothesis,
      methodology,
      successMetric,
      findings = 'In progress',
      developer = this.defaultDeveloper,
      timeSpent = 0,  // hours
      category = 'Software Development',
      technicalUncertainty = null
    } = activity;

    try {
      const page = await notionService.createPage({
        parent: { database_id: this.databaseId },
        properties: {
          'Component': {
            title: [{ text: { content: component } }]
          },
          'Hypothesis': {
            rich_text: [{ text: { content: hypothesis } }]
          },
          'Methodology': {
            rich_text: [{ text: { content: methodology } }]
          },
          'Success Metric': {
            rich_text: [{ text: { content: successMetric } }]
          },
          'Findings': {
            rich_text: [{ text: { content: findings } }]
          },
          'Technical Uncertainty': {
            rich_text: technicalUncertainty
              ? [{ text: { content: technicalUncertainty } }]
              : []
          },
          'Developer': {
            select: { name: developer }
          },
          'Time Spent (hrs)': {
            number: timeSpent
          },
          'Category': {
            select: { name: category }
          },
          'Date': {
            date: { start: new Date().toISOString() }
          },
          'Status': {
            status: { name: findings === 'In progress' ? 'Active' : 'Complete' }
          }
        }
      });

      console.log(`[R&D Logger] Logged activity: ${component} (Page ID: ${page.id})`);
      return page.id;
    } catch (error) {
      console.error('[R&D Logger] Failed to log activity:', error.message);
      // Don't throw - logging should never break main flow
      return null;
    }
  }

  /**
   * Update findings after testing/validation
   *
   * @param {string} pageId - Notion page ID
   * @param {string} findings - Updated findings text
   * @param {number} additionalTime - Additional hours spent
   */
  async updateFindings(pageId, findings, additionalTime = 0) {
    if (!this.trackingEnabled || !pageId) {
      return;
    }

    try {
      // Get current time spent
      const page = await notionService.getPage(pageId);
      const currentTime = page.properties['Time Spent (hrs)'].number || 0;
      const newTime = currentTime + additionalTime;

      await notionService.updatePage(pageId, {
        properties: {
          'Findings': {
            rich_text: [{ text: { content: findings } }]
          },
          'Time Spent (hrs)': {
            number: newTime
          },
          'Status': {
            status: { name: 'Complete' }
          }
        }
      });

      console.log(`[R&D Logger] Updated findings for ${pageId}: ${findings.substring(0, 50)}...`);
    } catch (error) {
      console.error('[R&D Logger] Failed to update findings:', error.message);
    }
  }

  /**
   * Generate R&D summary for AusIndustry application
   *
   * R&D Method: Aggregate all logged activities within date range,
   *             calculate total hours, success metrics, and ROI
   * Target: Generate compliant summary in <5 minutes
   *
   * @param {string} startDate - ISO date string
   * @param {string} endDate - ISO date string
   * @returns {Object} R&D summary statistics
   */
  async generateRDSummary(startDate, endDate) {
    if (!this.trackingEnabled || !this.databaseId) {
      return {
        error: 'R&D tracking not configured',
        totalActivities: 0,
        totalHours: 0
      };
    }

    try {
      const activities = await notionService.queryDatabase(this.databaseId, {
        filter: {
          and: [
            {
              property: 'Date',
              date: { on_or_after: startDate }
            },
            {
              property: 'Date',
              date: { on_or_before: endDate }
            }
          ]
        }
      });

      const summary = {
        totalActivities: activities.length,
        totalHours: this.calculateTotalHours(activities),
        components: this.extractComponents(activities),
        hypothesesTested: activities.length,
        successRate: this.calculateSuccessRate(activities),
        byCategory: this.groupByCategory(activities),
        byDeveloper: this.groupByDeveloper(activities),
        estimatedClaimValue: null  // Calculated below
      };

      // Calculate R&D tax claim value (43.5% offset on eligible costs)
      const hourlyRate = 150;  // Average dev rate
      const totalCost = summary.totalHours * hourlyRate;
      summary.estimatedClaimValue = {
        totalCost,
        offsetRate: 0.435,
        estimatedRefund: totalCost * 0.435
      };

      console.log(`[R&D Summary] ${activities.length} activities, ${summary.totalHours}hrs, $${summary.estimatedClaimValue.estimatedRefund.toFixed(2)} estimated refund`);

      return summary;
    } catch (error) {
      console.error('[R&D Logger] Failed to generate summary:', error.message);
      return {
        error: error.message,
        totalActivities: 0,
        totalHours: 0
      };
    }
  }

  /**
   * Log component metadata from code exports
   * Convenience method for auto-logging RD_METADATA exports
   *
   * @param {Object} metadata - RD_METADATA object from component
   * @returns {string} Notion page ID
   */
  async logComponentMetadata(metadata) {
    return this.logActivity({
      component: metadata.component,
      hypothesis: metadata.hypothesis,
      methodology: metadata.methodology,
      successMetric: metadata.successMetric,
      findings: metadata.findings || 'In progress',
      category: metadata.category || 'Software Development',
      technicalUncertainty: metadata.technicalUncertainty,
      timeSpent: metadata.estimatedHours || 0
    });
  }

  // Helper methods
  calculateTotalHours(activities) {
    return activities.reduce((sum, activity) => {
      const hours = activity.properties['Time Spent (hrs)']?.number || 0;
      return sum + hours;
    }, 0);
  }

  extractComponents(activities) {
    return [...new Set(
      activities.map(a => a.properties.Component.title[0]?.text.content || 'Unknown')
    )];
  }

  calculateSuccessRate(activities) {
    if (activities.length === 0) return 0;

    const completed = activities.filter(activity => {
      const status = activity.properties.Status?.status?.name;
      const findings = activity.properties.Findings?.rich_text[0]?.text.content || '';

      return status === 'Complete' &&
             (findings.toLowerCase().includes('achieved') ||
              findings.toLowerCase().includes('success') ||
              findings.toLowerCase().includes('met target'));
    });

    return (completed.length / activities.length * 100).toFixed(1);
  }

  groupByCategory(activities) {
    const groups = {};

    activities.forEach(activity => {
      const category = activity.properties.Category?.select?.name || 'Uncategorized';
      if (!groups[category]) {
        groups[category] = { count: 0, hours: 0 };
      }
      groups[category].count++;
      groups[category].hours += activity.properties['Time Spent (hrs)']?.number || 0;
    });

    return groups;
  }

  groupByDeveloper(activities) {
    const groups = {};

    activities.forEach(activity => {
      const developer = activity.properties.Developer?.select?.name || 'Unknown';
      if (!groups[developer]) {
        groups[developer] = { count: 0, hours: 0 };
      }
      groups[developer].count++;
      groups[developer].hours += activity.properties['Time Spent (hrs)']?.number || 0;
    });

    return groups;
  }
}

/**
 * R&D Documentation Export
 * For AusIndustry R&D tax claim compliance
 */
export const RD_METADATA = {
  component: 'Notion R&D Logger',
  hypothesis: 'Automated R&D logging reduces compliance overhead by 70% vs manual documentation',
  methodology: 'Real-time Notion database logging with structured AusIndustry-compliant data model',
  successMetric: '<10min per activity to log, 100% traceability, zero rejected claims',
  findings: 'TBD after Phase 1 tax claim submission',
  category: 'Software Development',
  technicalUncertainty: 'Optimal data structure for maximizing claim acceptance while minimizing documentation burden',
  estimatedHours: 3.0
};

export default RDLogger;
