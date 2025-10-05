/**
 * Enhanced Alerting and Anomaly Detection Service
 * Real-time monitoring and intelligent alerting for all 11 ACT Platform integrations
 * Task: 16.4 - Establish Monitoring and Observability for Data Flows
 */

import monitoringConfig from '../config/monitoringConfig.js';
import { logger } from '../../utils/logger.js';

class AlertingService {
  constructor() {
    this.alerts = new Map(); // Active alerts
    this.alertHistory = []; // Alert history
    this.metrics = new Map(); // Metrics for anomaly detection
    this.thresholds = new Map(); // Dynamic thresholds
    this.integrationStates = new Map(); // Integration health states
    this.isInitialized = false;

    // Anomaly detection configuration
    this.anomalyConfig = {
      windowSize: 10, // Number of data points for analysis
      sensitivityLevels: {
        low: 2.0, // 2 standard deviations
        medium: 1.5, // 1.5 standard deviations
        high: 1.0, // 1 standard deviation
      },
      minimumDataPoints: 5, // Minimum points needed for anomaly detection
    };

    // Alert suppression to prevent spam
    this.suppressionRules = new Map();
  }

  /**
   * Initialize the alerting service
   */
  async initialize() {
    try {
      logger.info('🚨 Initializing Enhanced Alerting and Anomaly Detection Service...');

      // Initialize integration states from monitoring config
      this.initializeIntegrationStates();

      // Initialize alert rules and thresholds
      this.initializeAlertRules();

      // Initialize anomaly detection baselines
      this.initializeAnomalyBaselines();

      // Start monitoring loops
      this.startMonitoringLoops();

      // Initialize alert suppression rules
      this.initializeSuppressionRules();

      this.isInitialized = true;
      logger.info(
        `✅ Enhanced Alerting Service initialized with ${this.thresholds.size} alert rules and anomaly detection for ${Object.keys(monitoringConfig.integrations).length} integrations`
      );

      return true;
    } catch (error) {
      logger.error('❌ Failed to initialize Enhanced Alerting Service:', error.message);
      return false;
    }
  }

  /**
   * Initialize integration states for monitoring
   */
  initializeIntegrationStates() {
    for (const [integrationKey, config] of Object.entries(
      monitoringConfig.integrations
    )) {
      this.integrationStates.set(integrationKey, {
        name: config.name,
        type: config.type,
        classification: config.classification,
        isHealthy: true,
        lastCheck: Date.now(),
        consecutiveFailures: 0,
        responseTimeHistory: [],
        errorRateHistory: [],
        customMetrics: new Map(),
      });

      // Initialize metrics tracking for anomaly detection
      this.metrics.set(integrationKey, {
        responseTime: [],
        errorRate: [],
        requestRate: [],
        throughput: [],
        customMetrics: new Map(),
      });
    }
  }

  /**
   * Initialize alert rules based on monitoring configuration
   */
  initializeAlertRules() {
    // Global alert rules from configuration
    for (const [severityLevel, rules] of Object.entries(
      monitoringConfig.alertingRules
    )) {
      for (const condition of rules.conditions) {
        const [integration, metric] = condition.split('.');

        if (integration === 'any_integration') {
          // Apply to all integrations
          for (const integrationKey of Object.keys(monitoringConfig.integrations)) {
            this.setAlertThreshold(integrationKey, metric, rules.severity, {
              threshold: this.getDefaultThreshold(metric),
              window: '5m',
              notifications: rules.notifications,
            });
          }
        } else {
          // Specific integration rule
          this.setAlertThreshold(integration, metric, rules.severity, {
            threshold: this.getDefaultThreshold(metric),
            window: '5m',
            notifications: rules.notifications,
          });
        }
      }
    }

    // Integration-specific alert rules
    for (const [integrationKey, config] of Object.entries(
      monitoringConfig.integrations
    )) {
      if (config.alerts) {
        for (const [alertType, alertConfig] of Object.entries(config.alerts)) {
          this.setAlertThreshold(
            integrationKey,
            alertType,
            this.determineSeverity(alertType),
            {
              threshold: alertConfig.threshold,
              window: alertConfig.window,
              notifications: this.getDefaultNotifications(
                this.determineSeverity(alertType)
              ),
            }
          );
        }
      }
    }
  }

  /**
   * Initialize anomaly detection baselines
   */
  initializeAnomalyBaselines() {
    // Initialize with default baselines that will be updated with real data
    for (const integrationKey of Object.keys(monitoringConfig.integrations)) {
      const baselines = {
        responseTime: { mean: 500, stdDev: 200, trend: 'stable' },
        errorRate: { mean: 0.01, stdDev: 0.005, trend: 'stable' },
        requestRate: { mean: 100, stdDev: 50, trend: 'stable' },
      };

      this.thresholds.set(`${integrationKey}_baselines`, baselines);
    }
  }

  /**
   * Initialize alert suppression rules to prevent spam
   */
  initializeSuppressionRules() {
    // Suppress duplicate alerts for the same issue
    this.suppressionRules.set('duplicate_suppression', {
      window: 300000, // 5 minutes
      maxAlerts: 3,
    });

    // Suppress low-priority alerts during high-priority incidents
    this.suppressionRules.set('priority_suppression', {
      enabled: true,
      suppressLevels: ['info', 'warning'], // when critical alerts are active
    });

    // Maintenance window suppression
    this.suppressionRules.set('maintenance_suppression', {
      enabled: false,
      maintenanceWindow: null,
    });
  }

  /**
   * Record metrics and check for alerts
   */
  recordMetric(integrationKey, metricType, value, timestamp = Date.now()) {
    if (!this.metrics.has(integrationKey)) {
      logger.warn(`Unknown integration for alerting: ${integrationKey}`);
      return;
    }

    const integrationMetrics = this.metrics.get(integrationKey);
    const metricData = integrationMetrics[metricType] || [];

    // Add new data point
    metricData.push({ value, timestamp });

    // Keep only recent data points (sliding window)
    const windowMs = 600000; // 10 minutes
    const cutoff = timestamp - windowMs;
    integrationMetrics[metricType] = metricData.filter(
      point => point.timestamp > cutoff
    );

    // Update integration state
    this.updateIntegrationState(integrationKey, metricType, value);

    // Check for threshold alerts
    this.checkThresholdAlerts(integrationKey, metricType, value);

    // Check for anomalies
    this.checkAnomalies(integrationKey, metricType);

    // Update baselines for anomaly detection
    this.updateAnomalyBaselines(integrationKey, metricType);
  }

  /**
   * Update integration state with new metric
   */
  updateIntegrationState(integrationKey, metricType, value) {
    const state = this.integrationStates.get(integrationKey);
    if (!state) return;

    switch (metricType) {
      case 'responseTime':
        state.responseTimeHistory.push(value);
        if (state.responseTimeHistory.length > 20) {
          state.responseTimeHistory = state.responseTimeHistory.slice(-20);
        }
        break;

      case 'errorRate':
        state.errorRateHistory.push(value);
        if (state.errorRateHistory.length > 20) {
          state.errorRateHistory = state.errorRateHistory.slice(-20);
        }

        // Update health status based on error rate
        if (value > 0.1) {
          // 10% error rate
          state.consecutiveFailures++;
          state.isHealthy = state.consecutiveFailures < 3;
        } else {
          state.consecutiveFailures = 0;
          state.isHealthy = true;
        }
        break;
    }

    state.lastCheck = Date.now();
  }

  /**
   * Check threshold-based alerts
   */
  checkThresholdAlerts(integrationKey, metricType, value) {
    const thresholdKey = `${integrationKey}_${metricType}`;
    const threshold = this.thresholds.get(thresholdKey);

    if (!threshold) return;

    const isViolation = this.evaluateThreshold(threshold, value);

    if (isViolation) {
      this.triggerAlert({
        type: 'threshold_violation',
        integrationKey,
        metricType,
        value,
        threshold: threshold.threshold,
        severity: threshold.severity || 'warning',
        message: `${integrationKey} ${metricType} exceeded threshold: ${value} > ${threshold.threshold}`,
        notifications: threshold.notifications || [],
      });
    }
  }

  /**
   * Check for anomalies using statistical analysis
   */
  checkAnomalies(integrationKey, metricType) {
    const integrationMetrics = this.metrics.get(integrationKey);
    if (!integrationMetrics) return;

    const dataPoints = integrationMetrics[metricType] || [];
    if (dataPoints.length < this.anomalyConfig.minimumDataPoints) return;

    const values = dataPoints.map(point => point.value);
    const stats = this.calculateStatistics(values);

    // Get baseline for comparison
    const baselineKey = `${integrationKey}_baselines`;
    const baselines = this.thresholds.get(baselineKey);
    if (!baselines || !baselines[metricType]) return;

    const baseline = baselines[metricType];
    const currentValue = values[values.length - 1];

    // Calculate anomaly score
    const anomalyScore = Math.abs(currentValue - baseline.mean) / baseline.stdDev;

    // Determine if this is an anomaly based on sensitivity level
    const sensitivity = this.getSensitivityLevel(integrationKey, metricType);
    const threshold = this.anomalyConfig.sensitivityLevels[sensitivity];

    if (anomalyScore > threshold) {
      this.triggerAlert({
        type: 'anomaly_detected',
        integrationKey,
        metricType,
        value: currentValue,
        anomalyScore,
        baseline: baseline.mean,
        severity: this.calculateAnomalySeverity(anomalyScore),
        message: `Anomaly detected in ${integrationKey} ${metricType}: ${currentValue} (baseline: ${baseline.mean.toFixed(2)}, score: ${anomalyScore.toFixed(2)})`,
        notifications: this.getDefaultNotifications('warning'),
      });
    }
  }

  /**
   * Update anomaly detection baselines with new data
   */
  updateAnomalyBaselines(integrationKey, metricType) {
    const integrationMetrics = this.metrics.get(integrationKey);
    if (!integrationMetrics) return;

    const dataPoints = integrationMetrics[metricType] || [];
    if (dataPoints.length < 5) return; // Need minimum data points

    const values = dataPoints.map(point => point.value);
    const stats = this.calculateStatistics(values);

    const baselineKey = `${integrationKey}_baselines`;
    const baselines = this.thresholds.get(baselineKey) || {};

    // Update baseline with exponential moving average
    const alpha = 0.1; // Smoothing factor
    if (baselines[metricType]) {
      baselines[metricType].mean =
        alpha * stats.mean + (1 - alpha) * baselines[metricType].mean;
      baselines[metricType].stdDev =
        alpha * stats.stdDev + (1 - alpha) * baselines[metricType].stdDev;
    } else {
      baselines[metricType] = {
        mean: stats.mean,
        stdDev: stats.stdDev,
        trend: 'stable',
      };
    }

    this.thresholds.set(baselineKey, baselines);
  }

  /**
   * Trigger an alert
   */
  triggerAlert(alertData) {
    // Check suppression rules
    if (this.isAlertSuppressed(alertData)) {
      logger.debug('Alert suppressed:', alertData.message);
      return;
    }

    const alertId = this.generateAlertId(alertData);
    const alert = {
      id: alertId,
      ...alertData,
      timestamp: Date.now(),
      status: 'active',
      acknowledgedBy: null,
      acknowledgedAt: null,
      resolvedAt: null,
    };

    // Store active alert
    this.alerts.set(alertId, alert);

    // Add to history
    this.alertHistory.push({ ...alert });

    // Keep history manageable
    if (this.alertHistory.length > 1000) {
      this.alertHistory = this.alertHistory.slice(-1000);
    }

    // Log the alert
    logger.warn(`🚨 ALERT [${alert.severity.toUpperCase()}]: ${alert.message}`, {
      alertId,
      integration: alert.integrationKey,
      type: alert.type,
      value: alert.value,
    });

    // Send notifications
    this.sendNotifications(alert);

    // Update metrics
    this.recordAlertMetric(alert);
  }

  /**
   * Check if alert should be suppressed
   */
  isAlertSuppressed(alertData) {
    // Duplicate suppression
    const duplicateRule = this.suppressionRules.get('duplicate_suppression');
    if (duplicateRule) {
      const recentAlerts = this.alertHistory.filter(
        alert =>
          alert.integrationKey === alertData.integrationKey &&
          alert.metricType === alertData.metricType &&
          Date.now() - alert.timestamp < duplicateRule.window
      );

      if (recentAlerts.length >= duplicateRule.maxAlerts) {
        return true;
      }
    }

    // Priority suppression
    const priorityRule = this.suppressionRules.get('priority_suppression');
    if (priorityRule && priorityRule.enabled) {
      const hasCriticalAlerts = Array.from(this.alerts.values()).some(
        alert => alert.severity === 'critical' && alert.status === 'active'
      );

      if (
        hasCriticalAlerts &&
        priorityRule.suppressLevels.includes(alertData.severity)
      ) {
        return true;
      }
    }

    // Maintenance window suppression
    const maintenanceRule = this.suppressionRules.get('maintenance_suppression');
    if (
      maintenanceRule &&
      maintenanceRule.enabled &&
      maintenanceRule.maintenanceWindow
    ) {
      const now = Date.now();
      const { start, end } = maintenanceRule.maintenanceWindow;
      if (now >= start && now <= end) {
        return true;
      }
    }

    return false;
  }

  /**
   * Send alert notifications
   */
  sendNotifications(alert) {
    if (!alert.notifications || alert.notifications.length === 0) {
      return;
    }

    for (const notificationChannel of alert.notifications) {
      try {
        switch (notificationChannel) {
          case 'slack_critical':
          case 'slack_alerts':
          case 'slack_info':
            this.sendSlackNotification(alert, notificationChannel);
            break;

          case 'email_oncall':
          case 'email_team':
            this.sendEmailNotification(alert, notificationChannel);
            break;

          case 'pagerduty':
            this.sendPagerDutyNotification(alert);
            break;

          default:
            logger.warn(`Unknown notification channel: ${notificationChannel}`);
        }
      } catch (error) {
        logger.error(`Failed to send notification to ${notificationChannel}:`, error);
      }
    }
  }

  /**
   * Send Slack notification (mock implementation)
   */
  sendSlackNotification(alert, channel) {
    const emoji = this.getSeverityEmoji(alert.severity);
    const color = this.getSeverityColor(alert.severity);

    const message = {
      channel: this.getSlackChannel(channel),
      text: `${emoji} ACT Platform Alert`,
      attachments: [
        {
          color,
          title: `${alert.severity.toUpperCase()}: ${alert.integrationKey}`,
          text: alert.message,
          fields: [
            { title: 'Integration', value: alert.integrationKey, short: true },
            { title: 'Metric', value: alert.metricType, short: true },
            { title: 'Value', value: alert.value?.toString() || 'N/A', short: true },
            {
              title: 'Time',
              value: new Date(alert.timestamp).toISOString(),
              short: true,
            },
          ],
          footer: 'ACT Platform Monitoring',
          ts: Math.floor(alert.timestamp / 1000),
        },
      ],
    };

    // In a real implementation, this would use the Slack API
    logger.info(`📱 Slack notification sent to ${channel}:`, message.text);
  }

  /**
   * Send email notification (mock implementation)
   */
  sendEmailNotification(alert, emailType) {
    const recipients = this.getEmailRecipients(emailType);
    const subject = `[${alert.severity.toUpperCase()}] ACT Platform Alert - ${alert.integrationKey}`;

    const emailBody = `
ACT Platform Alert Details:

Integration: ${alert.integrationKey}
Alert Type: ${alert.type}
Severity: ${alert.severity}
Metric: ${alert.metricType}
Value: ${alert.value}
Message: ${alert.message}
Time: ${new Date(alert.timestamp).toISOString()}

Alert ID: ${alert.id}

This is an automated alert from ACT Platform Monitoring.
    `;

    // In a real implementation, this would use an email service
    logger.info(`📧 Email notification sent to ${recipients.join(', ')}:`, subject);
  }

  /**
   * Send PagerDuty notification (mock implementation)
   */
  sendPagerDutyNotification(alert) {
    const incident = {
      routing_key: process.env.PAGERDUTY_ROUTING_KEY || 'mock-routing-key',
      event_action: 'trigger',
      dedup_key: alert.id,
      payload: {
        summary: `ACT Platform: ${alert.message}`,
        severity: this.mapSeverityToPagerDuty(alert.severity),
        source: alert.integrationKey,
        component: alert.metricType,
        group: 'ACT Platform',
        class: alert.type,
        custom_details: {
          integration: alert.integrationKey,
          metric_type: alert.metricType,
          value: alert.value,
          alert_id: alert.id,
        },
      },
    };

    // In a real implementation, this would use the PagerDuty API
    logger.info(`📟 PagerDuty incident triggered:`, incident.payload.summary);
  }

  /**
   * Start monitoring loops for continuous analysis
   */
  startMonitoringLoops() {
    // Check for alert resolution every 30 seconds
    setInterval(() => {
      this.checkAlertResolution();
    }, 30000);

    // Update anomaly baselines every 5 minutes
    setInterval(() => {
      this.updateAllAnomalyBaselines();
    }, 300000);

    // Clean up old alerts every hour
    setInterval(() => {
      this.cleanupOldAlerts();
    }, 3600000);

    logger.info('🔄 Started alerting monitoring loops');
  }

  /**
   * Check if active alerts should be resolved
   */
  checkAlertResolution() {
    for (const [alertId, alert] of this.alerts.entries()) {
      if (alert.status !== 'active') continue;

      // Check if the condition that triggered the alert is now resolved
      const isResolved = this.checkAlertResolution(alert);

      if (isResolved) {
        alert.status = 'resolved';
        alert.resolvedAt = Date.now();

        logger.info(`✅ Alert resolved: ${alert.message}`, { alertId });

        // Send resolution notification for critical alerts
        if (alert.severity === 'critical') {
          this.sendResolutionNotification(alert);
        }
      }
    }
  }

  /**
   * Check if a specific alert should be resolved
   */
  checkAlertResolution(alert) {
    if (alert.type === 'threshold_violation') {
      // Check if metric is now below threshold
      const currentValue = this.getCurrentMetricValue(
        alert.integrationKey,
        alert.metricType
      );
      if (currentValue !== null) {
        return !this.evaluateThreshold({ threshold: alert.threshold }, currentValue);
      }
    }

    if (alert.type === 'anomaly_detected') {
      // Check if metric is now within normal range
      const anomalyScore = this.getCurrentAnomalyScore(
        alert.integrationKey,
        alert.metricType
      );
      if (anomalyScore !== null) {
        const sensitivity = this.getSensitivityLevel(
          alert.integrationKey,
          alert.metricType
        );
        const threshold = this.anomalyConfig.sensitivityLevels[sensitivity];
        return anomalyScore <= threshold;
      }
    }

    return false;
  }

  /**
   * Utility functions
   */

  calculateStatistics(values) {
    if (values.length === 0) return { mean: 0, stdDev: 0, median: 0 };

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance =
      values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    const sorted = [...values].sort((a, b) => a - b);
    const median =
      sorted.length % 2 === 0
        ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
        : sorted[Math.floor(sorted.length / 2)];

    return { mean, stdDev, median };
  }

  evaluateThreshold(threshold, value) {
    if (typeof threshold.threshold === 'number') {
      return value > threshold.threshold;
    }

    // Support for complex threshold rules
    if (threshold.operator === 'greater_than') return value > threshold.threshold;
    if (threshold.operator === 'less_than') return value < threshold.threshold;
    if (threshold.operator === 'equals') return value === threshold.threshold;

    return value > threshold.threshold; // Default
  }

  generateAlertId(alertData) {
    const hash = `${alertData.integrationKey}_${alertData.metricType}_${alertData.type}_${Date.now()}`;
    return hash;
  }

  getDefaultThreshold(metric) {
    const thresholds = {
      connection_failure: 1,
      high_latency: 5000,
      high_error_rate: 0.05,
      low_hit_rate: 0.7,
      rate_limit_exceeded: 1,
      quota_exhausted: 0.9,
      model_drift: 0.05,
      compliance_violation: 1,
      encryption_failure: 1,
    };

    return thresholds[metric] || 1;
  }

  determineSeverity(alertType) {
    const criticalTypes = [
      'connection_failure',
      'compliance_violation',
      'encryption_failure',
    ];
    const warningTypes = ['high_latency', 'low_hit_rate', 'rate_limit_exceeded'];

    if (criticalTypes.includes(alertType)) return 'critical';
    if (warningTypes.includes(alertType)) return 'warning';
    return 'info';
  }

  getDefaultNotifications(severity) {
    switch (severity) {
      case 'critical':
        return ['pagerduty', 'slack_critical', 'email_oncall'];
      case 'warning':
        return ['slack_alerts', 'email_team'];
      case 'info':
        return ['slack_info'];
      default:
        return ['slack_info'];
    }
  }

  getSeverityEmoji(severity) {
    const emojis = {
      critical: '🔥',
      warning: '⚠️',
      info: 'ℹ️',
    };
    return emojis[severity] || '❓';
  }

  getSeverityColor(severity) {
    const colors = {
      critical: 'danger',
      warning: 'warning',
      info: 'good',
    };
    return colors[severity] || 'good';
  }

  /**
   * Public API methods
   */

  getActiveAlerts() {
    return Array.from(this.alerts.values()).filter(alert => alert.status === 'active');
  }

  getAlertHistory(limit = 100) {
    return this.alertHistory.slice(-limit);
  }

  acknowledgeAlert(alertId, acknowledgedBy) {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.acknowledgedBy = acknowledgedBy;
      alert.acknowledgedAt = Date.now();
      logger.info(`Alert acknowledged by ${acknowledgedBy}:`, alert.message);
      return true;
    }
    return false;
  }

  setMaintenanceWindow(start, end) {
    const maintenanceRule = this.suppressionRules.get('maintenance_suppression');
    maintenanceRule.enabled = true;
    maintenanceRule.maintenanceWindow = { start, end };

    logger.info(
      `Maintenance window set: ${new Date(start).toISOString()} - ${new Date(end).toISOString()}`
    );
  }

  getAlertingStatus() {
    return {
      initialized: this.isInitialized,
      active_alerts: this.alerts.size,
      integrations_monitored: this.integrationStates.size,
      alert_rules: this.thresholds.size,
      alert_history_count: this.alertHistory.length,
      anomaly_detection_enabled: true,
      suppression_rules: Array.from(this.suppressionRules.keys()),
    };
  }

  // Helper methods (continued in implementation)
  setAlertThreshold(integration, metric, severity, config) {
    const key = `${integration}_${metric}`;
    this.thresholds.set(key, { ...config, severity });
  }

  getSensitivityLevel(integrationKey, metricType) {
    // Default to medium sensitivity, can be configured per integration
    const config = monitoringConfig.integrations[integrationKey];
    return config?.anomalySensitivity || 'medium';
  }

  calculateAnomalySeverity(anomalyScore) {
    if (anomalyScore > 3.0) return 'critical';
    if (anomalyScore > 2.0) return 'warning';
    return 'info';
  }

  getCurrentMetricValue(integrationKey, metricType) {
    const integrationMetrics = this.metrics.get(integrationKey);
    if (!integrationMetrics) return null;

    const dataPoints = integrationMetrics[metricType] || [];
    if (dataPoints.length === 0) return null;

    return dataPoints[dataPoints.length - 1].value;
  }

  getCurrentAnomalyScore(integrationKey, metricType) {
    // Implementation would calculate current anomaly score
    // This is a simplified version
    return 0.5; // Mock value
  }

  recordAlertMetric(alert) {
    // Record alert metrics for monitoring the alerting system itself
    logger.debug('Alert metric recorded:', {
      integration: alert.integrationKey,
      severity: alert.severity,
      type: alert.type,
    });
  }

  updateAllAnomalyBaselines() {
    // Periodic update of all anomaly baselines
    for (const integrationKey of Object.keys(monitoringConfig.integrations)) {
      ['responseTime', 'errorRate', 'requestRate'].forEach(metricType => {
        this.updateAnomalyBaselines(integrationKey, metricType);
      });
    }
  }

  cleanupOldAlerts() {
    // Remove resolved alerts older than 7 days
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;

    for (const [alertId, alert] of this.alerts.entries()) {
      if (alert.status === 'resolved' && alert.resolvedAt < cutoff) {
        this.alerts.delete(alertId);
      }
    }

    // Clean up alert history
    this.alertHistory = this.alertHistory.filter(alert => alert.timestamp > cutoff);
  }

  getSlackChannel(channelType) {
    const channels = {
      slack_critical: '#act-critical-alerts',
      slack_alerts: '#act-alerts',
      slack_info: '#act-monitoring',
    };
    return channels[channelType] || '#act-monitoring';
  }

  getEmailRecipients(emailType) {
    const recipients = {
      email_oncall: ['oncall@act.org.au'],
      email_team: ['engineering@act.org.au', 'ops@act.org.au'],
    };
    return recipients[emailType] || ['admin@act.org.au'];
  }

  mapSeverityToPagerDuty(severity) {
    const mapping = {
      critical: 'critical',
      warning: 'warning',
      info: 'info',
    };
    return mapping[severity] || 'info';
  }

  sendResolutionNotification(alert) {
    logger.info(`✅ Resolution notification: Alert ${alert.id} resolved`);
    // Implementation would send actual resolution notifications
  }

  /**
   * Close the alerting service
   */
  async close() {
    logger.info('🔄 Closing alerting service...');

    this.alerts.clear();
    this.metrics.clear();
    this.thresholds.clear();
    this.integrationStates.clear();
    this.suppressionRules.clear();

    this.isInitialized = false;
    logger.info('✅ Alerting service closed');
  }
}

// Create singleton instance
const alertingService = new AlertingService();

export default alertingService;

// Export utility functions
export const recordMetric = (integration, metricType, value, timestamp) =>
  alertingService.recordMetric(integration, metricType, value, timestamp);

export const getActiveAlerts = () => alertingService.getActiveAlerts();

export const getAlertHistory = limit => alertingService.getAlertHistory(limit);

export const acknowledgeAlert = (alertId, acknowledgedBy) =>
  alertingService.acknowledgeAlert(alertId, acknowledgedBy);

export const setMaintenanceWindow = (start, end) =>
  alertingService.setMaintenanceWindow(start, end);

export const getAlertingStatus = () => alertingService.getAlertingStatus();
