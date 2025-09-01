/**
 * Security Monitoring and Anomaly Detection for ACT Placemat
 * 
 * Real-time security event monitoring with machine learning-based anomaly detection,
 * threat intelligence integration, and Australian compliance alerting
 */

import { z } from 'zod';
import { EventEmitter } from 'events';
import { AuditLogger, AuditEvent } from '../audit/AuditLogger';

// === MONITORING CONFIGURATION ===

export const SecurityMonitorConfigSchema = z.object({
  // Monitoring settings
  enableRealTimeMonitoring: z.boolean().default(true),
  monitoringInterval: z.number().default(5000), // 5 seconds
  maxEventsPerInterval: z.number().default(1000),
  
  // Anomaly detection
  enableAnomalyDetection: z.boolean().default(true),
  anomalyThreshold: z.number().default(0.7), // 70% confidence
  learningPeriodDays: z.number().default(7),
  enableMachineLearning: z.boolean().default(true),
  
  // Alert settings
  enableAlerts: z.boolean().default(true),
  alertChannels: z.array(z.enum(['email', 'sms', 'webhook', 'slack', 'teams'])).default(['email']),
  alertThresholds: z.object({
    criticalEvents: z.number().default(1),
    highSeverityEvents: z.number().default(5),
    failedLogins: z.number().default(10),
    dataBreaches: z.number().default(1),
    indigenousDataViolations: z.number().default(1),
    anomalyScore: z.number().default(0.8)
  }),
  
  // Pattern detection
  enablePatternDetection: z.boolean().default(true),
  patternWindowMinutes: z.number().default(60),
  patterns: z.array(z.object({
    name: z.string(),
    eventTypes: z.array(z.string()),
    threshold: z.number(),
    timeWindow: z.number()
  })).default([]),
  
  // Threat intelligence
  enableThreatIntelligence: z.boolean().default(true),
  threatFeeds: z.array(z.string()).default([]),
  ipReputationCheck: z.boolean().default(true),
  
  // Australian compliance
  enableComplianceMonitoring: z.boolean().default(true),
  privacyActMonitoring: z.boolean().default(true),
  ismComplianceChecks: z.boolean().default(true),
  indigenousDataProtection: z.boolean().default(true),
  
  // Performance settings
  maxAlertsPerHour: z.number().default(100),
  alertCooldownMinutes: z.number().default(5),
  enableMetrics: z.boolean().default(true),
  metricsRetentionDays: z.number().default(30)
});

export type SecurityMonitorConfig = z.infer<typeof SecurityMonitorConfigSchema>;

// === MONITORING INTERFACES ===

export interface SecurityAlert {
  id: string;
  type: 'anomaly' | 'threshold' | 'pattern' | 'compliance' | 'threat';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  timestamp: Date;
  
  // Context
  events: AuditEvent[];
  source: {
    service: string;
    component: string;
    location?: string;
  };
  
  // Detection details
  detection: {
    method: string;
    confidence: number;
    threshold: number;
    actualValue: number;
  };
  
  // Response
  status: 'active' | 'investigating' | 'resolved' | 'false_positive';
  assignedTo?: string;
  resolvedAt?: Date;
  resolution?: string;
  
  // Metadata
  metadata: Record<string, any>;
  tags: string[];
  relatedAlerts: string[];
}

export interface AnomalyDetectionResult {
  isAnomaly: boolean;
  confidence: number;
  score: number;
  type: 'statistical' | 'behavioral' | 'temporal' | 'contextual';
  details: string;
  baseline: any;
  observed: any;
}

export interface ThreatIntelligence {
  ip: string;
  reputation: 'clean' | 'suspicious' | 'malicious';
  sources: string[];
  lastSeen: Date;
  categories: string[];
  confidence: number;
}

export interface SecurityMetrics {
  timestamp: Date;
  period: 'hour' | 'day' | 'week' | 'month';
  
  // Event metrics
  totalEvents: number;
  eventsByType: Record<string, number>;
  eventsBySeverity: Record<string, number>;
  
  // Alert metrics
  totalAlerts: number;
  alertsByType: Record<string, number>;
  alertsBySeverity: Record<string, number>;
  falsePositiveRate: number;
  
  // Anomaly metrics
  anomaliesDetected: number;
  anomalyRate: number;
  topAnomalies: Array<{
    type: string;
    count: number;
    avgConfidence: number;
  }>;
  
  // Threat metrics
  threatsBlocked: number;
  uniqueThreats: number;
  topThreats: Array<{
    type: string;
    count: number;
    severity: string;
  }>;
  
  // Performance metrics
  averageDetectionTime: number;
  averageResponseTime: number;
  systemLoad: number;
}

// === PATTERN DEFINITIONS ===

interface SecurityPattern {
  name: string;
  description: string;
  eventTypes: string[];
  conditions: PatternCondition[];
  threshold: number;
  timeWindow: number; // minutes
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface PatternCondition {
  field: string;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'regex';
  value: any;
}

// === SECURITY MONITOR IMPLEMENTATION ===

export class SecurityMonitor extends EventEmitter {
  private config: SecurityMonitorConfig;
  private auditLogger: AuditLogger;
  private isRunning = false;
  private monitoringTimer?: NodeJS.Timeout;
  
  // Detection engines
  private anomalyDetector: AnomalyDetector;
  private patternDetector: PatternDetector;
  private threatIntelligence: ThreatIntelligenceEngine;
  
  // State management
  private activeAlerts: Map<string, SecurityAlert> = new Map();
  private alertHistory: SecurityAlert[] = [];
  private metrics: SecurityMetrics[] = [];
  private eventBuffer: AuditEvent[] = [];
  private lastProcessedTime = new Date();

  constructor(config: SecurityMonitorConfig, auditLogger: AuditLogger) {
    super();
    this.config = SecurityMonitorConfigSchema.parse(config);
    this.auditLogger = auditLogger;
    
    // Initialize detection engines
    this.anomalyDetector = new AnomalyDetector(config);
    this.patternDetector = new PatternDetector(config);
    this.threatIntelligence = new ThreatIntelligenceEngine(config);
    
    // Set up default patterns
    this.setupDefaultPatterns();
  }

  // === MONITORING CONTROL ===

  /**
   * Start security monitoring
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.warn('Security monitor already running');
      return;
    }

    this.isRunning = true;
    this.lastProcessedTime = new Date();

    // Initialize detection engines
    await this.anomalyDetector.initialize();
    await this.threatIntelligence.initialize();

    // Start monitoring loop
    if (this.config.enableRealTimeMonitoring) {
      this.startMonitoringLoop();
    }

    // Start pattern detection
    if (this.config.enablePatternDetection) {
      this.patternDetector.start();
    }

    this.emit('started');
    console.log('Security monitoring started');
  }

  /**
   * Stop security monitoring
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    // Stop monitoring timer
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
    }

    // Stop detection engines
    this.patternDetector.stop();
    await this.threatIntelligence.shutdown();

    this.emit('stopped');
    console.log('Security monitoring stopped');
  }

  /**
   * Start the main monitoring loop
   */
  private startMonitoringLoop(): void {
    this.monitoringTimer = setInterval(async () => {
      try {
        await this.processNewEvents();
        await this.runAnomalyDetection();
        await this.updateMetrics();
        await this.cleanupOldData();
      } catch (error) {
        console.error('Monitoring loop error:', error);
        this.emit('error', error);
      }
    }, this.config.monitoringInterval);
  }

  // === EVENT PROCESSING ===

  /**
   * Process new audit events for monitoring
   */
  private async processNewEvents(): Promise<void> {
    try {
      // Get new events since last processing
      const newEvents = await this.auditLogger.query({
        dateRange: {
          from: this.lastProcessedTime,
          to: new Date()
        },
        limit: this.config.maxEventsPerInterval
      });

      if (newEvents.length === 0) {
        return;
      }

      // Add to buffer
      this.eventBuffer.push(...newEvents);

      // Process each event
      for (const event of newEvents) {
        await this.processEvent(event);
      }

      // Update last processed time
      this.lastProcessedTime = new Date();

      // Emit processing update
      this.emit('events_processed', {
        count: newEvents.length,
        totalBuffered: this.eventBuffer.length
      });

    } catch (error) {
      console.error('Failed to process new events:', error);
    }
  }

  /**
   * Process individual security event
   */
  private async processEvent(event: AuditEvent): Promise<void> {
    // Check for immediate security concerns
    await this.checkCriticalThresholds(event);
    
    // Check threat intelligence
    if (this.config.enableThreatIntelligence) {
      await this.checkThreatIntelligence(event);
    }
    
    // Check compliance violations
    if (this.config.enableComplianceMonitoring) {
      await this.checkComplianceViolations(event);
    }
    
    // Pattern detection
    if (this.config.enablePatternDetection) {
      await this.patternDetector.processEvent(event);
    }
  }

  /**
   * Check critical security thresholds
   */
  private async checkCriticalThresholds(event: AuditEvent): Promise<void> {
    const thresholds = this.config.alertThresholds;

    // Critical events - immediate alert
    if (event.severity === 'critical') {
      await this.createAlert({
        type: 'threshold',
        severity: 'critical',
        title: 'Critical Security Event Detected',
        description: `Critical event: ${event.description}`,
        events: [event],
        detection: {
          method: 'threshold',
          confidence: 1.0,
          threshold: thresholds.criticalEvents,
          actualValue: 1
        }
      });
    }

    // Security violations
    if (event.eventType === 'security_violation') {
      await this.createAlert({
        type: 'threshold',
        severity: 'high',
        title: 'Security Violation Detected',
        description: `Security violation: ${event.action}`,
        events: [event],
        detection: {
          method: 'threshold',
          confidence: 1.0,
          threshold: 1,
          actualValue: 1
        }
      });
    }

    // Indigenous data violations
    if (event.compliance.indigenousSovereignty && event.outcome === 'blocked') {
      await this.createAlert({
        type: 'compliance',
        severity: 'critical',
        title: 'Indigenous Data Sovereignty Violation',
        description: `Unauthorized access to Indigenous data: ${event.description}`,
        events: [event],
        detection: {
          method: 'compliance',
          confidence: 1.0,
          threshold: thresholds.indigenousDataViolations,
          actualValue: 1
        }
      });
    }
  }

  /**
   * Check threat intelligence for suspicious IPs
   */
  private async checkThreatIntelligence(event: AuditEvent): Promise<void> {
    const actorIP = event.actor.ipAddress;
    if (!actorIP) return;

    const threatInfo = await this.threatIntelligence.checkIP(actorIP);
    
    if (threatInfo.reputation === 'malicious') {
      await this.createAlert({
        type: 'threat',
        severity: 'high',
        title: 'Malicious IP Address Detected',
        description: `Activity from known malicious IP: ${actorIP}`,
        events: [event],
        detection: {
          method: 'threat_intelligence',
          confidence: threatInfo.confidence,
          threshold: 0.7,
          actualValue: threatInfo.confidence
        },
        metadata: {
          threatInfo,
          sources: threatInfo.sources
        }
      });
    } else if (threatInfo.reputation === 'suspicious') {
      await this.createAlert({
        type: 'threat',
        severity: 'medium',
        title: 'Suspicious IP Address Activity',
        description: `Activity from suspicious IP: ${actorIP}`,
        events: [event],
        detection: {
          method: 'threat_intelligence',
          confidence: threatInfo.confidence,
          threshold: 0.5,
          actualValue: threatInfo.confidence
        },
        metadata: { threatInfo }
      });
    }
  }

  /**
   * Check for compliance violations
   */
  private async checkComplianceViolations(event: AuditEvent): Promise<void> {
    const violations: string[] = [];

    // Australian Privacy Act violations
    if (this.config.privacyActMonitoring && event.compliance.australianPrivacyAct) {
      if (event.eventType === 'data_access' && event.outcome === 'failure') {
        violations.push('Potential Privacy Act violation - unauthorized data access attempt');
      }
    }

    // ISM compliance violations
    if (this.config.ismComplianceChecks && event.security.complianceFrameworks.includes('ISM')) {
      if (event.security.riskLevel === 'critical' && event.outcome === 'failure') {
        violations.push('ISM compliance violation - critical security control failure');
      }
    }

    // Create alerts for violations
    for (const violation of violations) {
      await this.createAlert({
        type: 'compliance',
        severity: 'high',
        title: 'Compliance Violation Detected',
        description: violation,
        events: [event],
        detection: {
          method: 'compliance',
          confidence: 1.0,
          threshold: 1,
          actualValue: 1
        }
      });
    }
  }

  // === ANOMALY DETECTION ===

  /**
   * Run anomaly detection on recent events
   */
  private async runAnomalyDetection(): Promise<void> {
    if (!this.config.enableAnomalyDetection || this.eventBuffer.length === 0) {
      return;
    }

    try {
      const anomalies = await this.anomalyDetector.detectAnomalies(this.eventBuffer);
      
      for (const anomaly of anomalies) {
        if (anomaly.confidence >= this.config.anomalyThreshold) {
          await this.createAlert({
            type: 'anomaly',
            severity: this.mapAnomalySeverity(anomaly.confidence),
            title: `Anomaly Detected: ${anomaly.type}`,
            description: anomaly.details,
            events: [], // Anomalies may span multiple events
            detection: {
              method: 'anomaly_detection',
              confidence: anomaly.confidence,
              threshold: this.config.anomalyThreshold,
              actualValue: anomaly.score
            },
            metadata: {
              anomalyType: anomaly.type,
              baseline: anomaly.baseline,
              observed: anomaly.observed
            }
          });
        }
      }

    } catch (error) {
      console.error('Anomaly detection failed:', error);
    }
  }

  /**
   * Map anomaly confidence to alert severity
   */
  private mapAnomalySeverity(confidence: number): SecurityAlert['severity'] {
    if (confidence >= 0.9) return 'critical';
    if (confidence >= 0.8) return 'high';
    if (confidence >= 0.6) return 'medium';
    return 'low';
  }

  // === ALERT MANAGEMENT ===

  /**
   * Create and emit security alert
   */
  private async createAlert(alertData: Partial<SecurityAlert>): Promise<SecurityAlert> {
    const alert: SecurityAlert = {
      id: this.generateAlertId(),
      type: alertData.type || 'threshold',
      severity: alertData.severity || 'medium',
      title: alertData.title || 'Security Alert',
      description: alertData.description || '',
      timestamp: new Date(),
      events: alertData.events || [],
      source: alertData.source || {
        service: 'security-monitor',
        component: 'alert-engine'
      },
      detection: alertData.detection || {
        method: 'unknown',
        confidence: 0.5,
        threshold: 0.5,
        actualValue: 0.5
      },
      status: 'active',
      metadata: alertData.metadata || {},
      tags: alertData.tags || [],
      relatedAlerts: []
    };

    // Check for duplicate/similar alerts
    const similar = this.findSimilarAlerts(alert);
    if (similar.length > 0) {
      // Update existing alert instead of creating new one
      similar[0].events.push(...alert.events);
      similar[0].detection.actualValue += alert.detection.actualValue;
      return similar[0];
    }

    // Check alert rate limiting
    if (!this.checkAlertRateLimit()) {
      console.warn('Alert rate limit exceeded, suppressing alert:', alert.title);
      return alert;
    }

    // Store alert
    this.activeAlerts.set(alert.id, alert);
    this.alertHistory.push(alert);

    // Emit alert event
    this.emit('alert', alert);

    // Send notifications
    if (this.config.enableAlerts) {
      await this.sendAlertNotifications(alert);
    }

    // Log alert to audit system
    await this.auditLogger.logEvent({
      id: crypto.randomUUID(),
      eventType: 'security_violation',
      severity: alert.severity,
      action: 'alert_created',
      description: `Security alert created: ${alert.title}`,
      outcome: 'warning',
      timestamp: new Date(),
      source: {
        service: 'security-monitor',
        component: 'alert-engine'
      },
      actor: {
        type: 'system',
        id: 'security-monitor'
      },
      security: {
        classification: 'restricted',
        riskLevel: alert.severity === 'critical' ? 'critical' : 'high',
        requiresNotification: true,
        complianceFrameworks: ['ISM']
      },
      metadata: {
        alertId: alert.id,
        alertType: alert.type,
        confidence: alert.detection.confidence
      },
      compliance: {
        australianPrivacyAct: true,
        indigenousSovereignty: false,
        dataResidency: true
      }
    });

    console.log(`Security alert created: ${alert.title} (${alert.severity})`);
    return alert;
  }

  /**
   * Find similar active alerts
   */
  private findSimilarAlerts(alert: SecurityAlert): SecurityAlert[] {
    const timeWindow = 5 * 60 * 1000; // 5 minutes
    const cutoff = new Date(Date.now() - timeWindow);

    return Array.from(this.activeAlerts.values()).filter(existing => 
      existing.type === alert.type &&
      existing.title === alert.title &&
      existing.timestamp > cutoff &&
      existing.status === 'active'
    );
  }

  /**
   * Check alert rate limiting
   */
  private checkAlertRateLimit(): boolean {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentAlerts = this.alertHistory.filter(a => a.timestamp > oneHourAgo);
    
    return recentAlerts.length < this.config.maxAlertsPerHour;
  }

  /**
   * Send alert notifications
   */
  private async sendAlertNotifications(alert: SecurityAlert): Promise<void> {
    for (const channel of this.config.alertChannels) {
      try {
        switch (channel) {
          case 'email':
            await this.sendEmailAlert(alert);
            break;
          case 'webhook':
            await this.sendWebhookAlert(alert);
            break;
          case 'slack':
            await this.sendSlackAlert(alert);
            break;
          default:
            console.log(`Alert notification sent via ${channel}:`, alert.title);
        }
      } catch (error) {
        console.error(`Failed to send ${channel} alert:`, error);
      }
    }
  }

  /**
   * Send email alert (placeholder)
   */
  private async sendEmailAlert(alert: SecurityAlert): Promise<void> {
    // In production, integrate with email service
    console.log(`EMAIL ALERT: [${alert.severity.toUpperCase()}] ${alert.title}`);
    console.log(`Description: ${alert.description}`);
    console.log(`Time: ${alert.timestamp.toISOString()}`);
  }

  /**
   * Send webhook alert (placeholder)
   */
  private async sendWebhookAlert(alert: SecurityAlert): Promise<void> {
    // In production, send HTTP POST to configured webhook URL
    const payload = {
      alert_id: alert.id,
      severity: alert.severity,
      title: alert.title,
      description: alert.description,
      timestamp: alert.timestamp.toISOString(),
      detection: alert.detection
    };
    
    console.log('WEBHOOK ALERT:', JSON.stringify(payload, null, 2));
  }

  /**
   * Send Slack alert (placeholder)
   */
  private async sendSlackAlert(alert: SecurityAlert): Promise<void> {
    // In production, send to Slack webhook
    const color = {
      critical: '#FF0000',
      high: '#FF6600',
      medium: '#FFCC00',
      low: '#00FF00'
    }[alert.severity];

    console.log(`SLACK ALERT: [${alert.severity.toUpperCase()}] ${alert.title} (${color})`);
  }

  // === PATTERN SETUP ===

  /**
   * Setup default security patterns
   */
  private setupDefaultPatterns(): void {
    const defaultPatterns: SecurityPattern[] = [
      {
        name: 'brute_force_attack',
        description: 'Multiple failed login attempts from same IP',
        eventTypes: ['authentication'],
        conditions: [
          { field: 'outcome', operator: 'equals', value: 'failure' },
          { field: 'action', operator: 'equals', value: 'login' }
        ],
        threshold: 10,
        timeWindow: 10,
        severity: 'high'
      },
      {
        name: 'privilege_escalation',
        description: 'Rapid role changes or permission escalation',
        eventTypes: ['authorization', 'user_management'],
        conditions: [
          { field: 'action', operator: 'contains', value: 'role' },
          { field: 'outcome', operator: 'equals', value: 'success' }
        ],
        threshold: 5,
        timeWindow: 30,
        severity: 'critical'
      },
      {
        name: 'data_exfiltration',
        description: 'Large volume of data access in short time',
        eventTypes: ['data_access'],
        conditions: [
          { field: 'action', operator: 'equals', value: 'export' },
          { field: 'outcome', operator: 'equals', value: 'success' }
        ],
        threshold: 20,
        timeWindow: 60,
        severity: 'high'
      },
      {
        name: 'indigenous_data_violations',
        description: 'Multiple violations of Indigenous data sovereignty',
        eventTypes: ['sovereignty_access'],
        conditions: [
          { field: 'outcome', operator: 'equals', value: 'blocked' }
        ],
        threshold: 3,
        timeWindow: 60,
        severity: 'critical'
      }
    ];

    // Add default patterns to config
    this.config.patterns.push(...defaultPatterns.map(p => ({
      name: p.name,
      eventTypes: p.eventTypes,
      threshold: p.threshold,
      timeWindow: p.timeWindow
    })));
  }

  // === UTILITY METHODS ===

  /**
   * Generate unique alert ID
   */
  private generateAlertId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `alert_${timestamp}_${random}`;
  }

  /**
   * Update security metrics
   */
  private async updateMetrics(): Promise<void> {
    if (!this.config.enableMetrics) return;

    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Get recent events and alerts
    const recentEvents = this.eventBuffer.filter(e => e.timestamp > oneHourAgo);
    const recentAlerts = this.alertHistory.filter(a => a.timestamp > oneHourAgo);

    const metrics: SecurityMetrics = {
      timestamp: now,
      period: 'hour',
      
      // Event metrics
      totalEvents: recentEvents.length,
      eventsByType: this.groupBy(recentEvents, 'eventType'),
      eventsBySeverity: this.groupBy(recentEvents, 'severity'),
      
      // Alert metrics
      totalAlerts: recentAlerts.length,
      alertsByType: this.groupBy(recentAlerts, 'type'),
      alertsBySeverity: this.groupBy(recentAlerts, 'severity'),
      falsePositiveRate: this.calculateFalsePositiveRate(recentAlerts),
      
      // Anomaly metrics
      anomaliesDetected: recentAlerts.filter(a => a.type === 'anomaly').length,
      anomalyRate: recentAlerts.filter(a => a.type === 'anomaly').length / Math.max(recentEvents.length, 1),
      topAnomalies: [],
      
      // Threat metrics
      threatsBlocked: recentAlerts.filter(a => a.type === 'threat').length,
      uniqueThreats: new Set(recentAlerts.filter(a => a.type === 'threat').map(a => a.description)).size,
      topThreats: [],
      
      // Performance metrics
      averageDetectionTime: 0, // Would be calculated from actual detection times
      averageResponseTime: 0,  // Would be calculated from alert response times
      systemLoad: process.cpuUsage().user / 1000000 // Convert to seconds
    };

    this.metrics.push(metrics);

    // Cleanup old metrics
    const retentionCutoff = new Date(now.getTime() - this.config.metricsRetentionDays * 24 * 60 * 60 * 1000);
    this.metrics = this.metrics.filter(m => m.timestamp > retentionCutoff);

    this.emit('metrics_updated', metrics);
  }

  /**
   * Group array by property
   */
  private groupBy<T>(array: T[], property: keyof T): Record<string, number> {
    return array.reduce((acc, item) => {
      const key = String(item[property]);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  /**
   * Calculate false positive rate
   */
  private calculateFalsePositiveRate(alerts: SecurityAlert[]): number {
    const falsePositives = alerts.filter(a => a.status === 'false_positive').length;
    return alerts.length > 0 ? falsePositives / alerts.length : 0;
  }

  /**
   * Clean up old data
   */
  private async cleanupOldData(): Promise<void> {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours

    // Clean event buffer
    this.eventBuffer = this.eventBuffer.filter(e => e.timestamp > cutoff);

    // Clean resolved alerts
    for (const [id, alert] of this.activeAlerts.entries()) {
      if (alert.status === 'resolved' && alert.timestamp < cutoff) {
        this.activeAlerts.delete(id);
      }
    }

    // Limit alert history
    if (this.alertHistory.length > 10000) {
      this.alertHistory = this.alertHistory.slice(-5000);
    }
  }

  // === PUBLIC API ===

  /**
   * Get current security status
   */
  getSecurityStatus(): {
    isRunning: boolean;
    activeAlerts: SecurityAlert[];
    recentMetrics: SecurityMetrics | null;
    systemHealth: 'healthy' | 'warning' | 'critical';
  } {
    const activeAlerts = Array.from(this.activeAlerts.values());
    const recentMetrics = this.metrics[this.metrics.length - 1] || null;
    
    let systemHealth: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (activeAlerts.some(a => a.severity === 'critical')) {
      systemHealth = 'critical';
    } else if (activeAlerts.some(a => a.severity === 'high')) {
      systemHealth = 'warning';
    }

    return {
      isRunning: this.isRunning,
      activeAlerts,
      recentMetrics,
      systemHealth
    };
  }

  /**
   * Get alert by ID
   */
  getAlert(alertId: string): SecurityAlert | null {
    return this.activeAlerts.get(alertId) || null;
  }

  /**
   * Update alert status
   */
  async updateAlertStatus(alertId: string, status: SecurityAlert['status'], resolution?: string): Promise<void> {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) {
      throw new Error(`Alert ${alertId} not found`);
    }

    alert.status = status;
    if (resolution) {
      alert.resolution = resolution;
    }
    if (status === 'resolved') {
      alert.resolvedAt = new Date();
    }

    this.emit('alert_updated', alert);

    // Log status change
    await this.auditLogger.logEvent({
      id: crypto.randomUUID(),
      eventType: 'admin_action',
      severity: 'low',
      action: 'alert_status_change',
      description: `Alert ${alertId} status changed to ${status}`,
      outcome: 'success',
      timestamp: new Date(),
      source: {
        service: 'security-monitor',
        component: 'alert-manager'
      },
      actor: {
        type: 'system',
        id: 'security-monitor'
      },
      target: {
        type: 'alert',
        id: alertId
      },
      security: {
        classification: 'internal',
        riskLevel: 'low',
        requiresNotification: false,
        complianceFrameworks: []
      },
      metadata: {
        oldStatus: alert.status,
        newStatus: status,
        resolution
      },
      compliance: {
        australianPrivacyAct: false,
        indigenousSovereignty: false,
        dataResidency: true
      }
    });
  }

  /**
   * Get security metrics for time period
   */
  getMetrics(period: 'hour' | 'day' | 'week' = 'day'): SecurityMetrics[] {
    const now = new Date();
    let cutoff: Date;

    switch (period) {
      case 'hour':
        cutoff = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case 'day':
        cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
    }

    return this.metrics.filter(m => m.timestamp > cutoff);
  }

  /**
   * Force anomaly detection run
   */
  async triggerAnomalyDetection(): Promise<AnomalyDetectionResult[]> {
    return this.anomalyDetector.detectAnomalies(this.eventBuffer);
  }
}

// === ANOMALY DETECTOR ===

class AnomalyDetector {
  private config: SecurityMonitorConfig;
  private baselines: Map<string, any> = new Map();
  private models: Map<string, any> = new Map();

  constructor(config: SecurityMonitorConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    // Initialize statistical baselines and ML models
    console.log('Anomaly detector initialized');
  }

  async detectAnomalies(events: AuditEvent[]): Promise<AnomalyDetectionResult[]> {
    const anomalies: AnomalyDetectionResult[] = [];

    // Statistical anomaly detection
    anomalies.push(...await this.detectStatisticalAnomalies(events));
    
    // Behavioral anomaly detection
    anomalies.push(...await this.detectBehavioralAnomalies(events));
    
    // Temporal anomaly detection
    anomalies.push(...await this.detectTemporalAnomalies(events));

    return anomalies.filter(a => a.confidence >= this.config.anomalyThreshold);
  }

  private async detectStatisticalAnomalies(events: AuditEvent[]): Promise<AnomalyDetectionResult[]> {
    // Placeholder for statistical anomaly detection
    return [];
  }

  private async detectBehavioralAnomalies(events: AuditEvent[]): Promise<AnomalyDetectionResult[]> {
    // Placeholder for behavioral anomaly detection
    return [];
  }

  private async detectTemporalAnomalies(events: AuditEvent[]): Promise<AnomalyDetectionResult[]> {
    // Placeholder for temporal anomaly detection
    return [];
  }
}

// === PATTERN DETECTOR ===

class PatternDetector {
  private config: SecurityMonitorConfig;
  private isRunning = false;
  private eventWindows: Map<string, AuditEvent[]> = new Map();

  constructor(config: SecurityMonitorConfig) {
    this.config = config;
  }

  start(): void {
    this.isRunning = true;
  }

  stop(): void {
    this.isRunning = false;
  }

  async processEvent(event: AuditEvent): Promise<void> {
    if (!this.isRunning) return;

    // Add event to relevant pattern windows
    for (const pattern of this.config.patterns) {
      if (pattern.eventTypes.includes(event.eventType)) {
        const windowKey = pattern.name;
        
        if (!this.eventWindows.has(windowKey)) {
          this.eventWindows.set(windowKey, []);
        }
        
        const window = this.eventWindows.get(windowKey)!;
        window.push(event);
        
        // Clean old events from window
        const cutoff = new Date(Date.now() - pattern.timeWindow * 60 * 1000);
        this.eventWindows.set(windowKey, window.filter(e => e.timestamp > cutoff));
        
        // Check if pattern threshold is met
        if (window.length >= pattern.threshold) {
          // Pattern detected - would emit alert
          console.log(`Pattern detected: ${pattern.name} (${window.length} events)`);
        }
      }
    }
  }
}

// === THREAT INTELLIGENCE ENGINE ===

class ThreatIntelligenceEngine {
  private config: SecurityMonitorConfig;
  private ipCache: Map<string, ThreatIntelligence> = new Map();

  constructor(config: SecurityMonitorConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    // Initialize threat feeds
    console.log('Threat intelligence engine initialized');
  }

  async checkIP(ip: string): Promise<ThreatIntelligence> {
    // Check cache first
    const cached = this.ipCache.get(ip);
    if (cached) {
      return cached;
    }

    // Query threat feeds (placeholder)
    const threatInfo: ThreatIntelligence = {
      ip,
      reputation: 'clean',
      sources: [],
      lastSeen: new Date(),
      categories: [],
      confidence: 0.1
    };

    // Cache result
    this.ipCache.set(ip, threatInfo);
    
    return threatInfo;
  }

  async shutdown(): Promise<void> {
    this.ipCache.clear();
  }
}