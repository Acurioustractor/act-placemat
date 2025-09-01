/**
 * SLA Monitoring and Data Freshness Service
 * Monitors data freshness, API performance, and service level agreements
 */

import { createClient } from '@supabase/supabase-js';
import { EventEmitter } from 'events';

/**
 * SLA Monitoring Service
 * Tracks data freshness, API performance metrics, and SLA compliance
 */
class SLAMonitoringService extends EventEmitter {
  constructor() {
    super();
    
    // Initialize Supabase for monitoring data storage
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // SLA thresholds and targets
    this.slaTargets = {
      data_freshness: {
        stories: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
        storytellers: 48 * 60 * 60 * 1000, // 48 hours
        normalized_data: 6 * 60 * 60 * 1000, // 6 hours
        ml_embeddings: 12 * 60 * 60 * 1000, // 12 hours
      },
      api_performance: {
        response_time_p95: 2000, // 2 seconds
        response_time_p99: 5000, // 5 seconds
        availability: 99.9, // 99.9% uptime
        error_rate: 1.0, // Max 1% error rate
      },
      data_quality: {
        completeness: 95, // 95% complete data
        accuracy: 90, // 90% accurate data
        consistency: 95, // 95% consistent data
        validity: 98, // 98% valid data
      },
      processing_performance: {
        normalization_time: 30000, // 30 seconds max
        embedding_generation: 60000, // 1 minute max
        quality_check_time: 10000, // 10 seconds max
      }
    };

    // Current metrics tracking
    this.metrics = {
      api_calls: {
        total: 0,
        successful: 0,
        failed: 0,
        response_times: [],
        last_reset: new Date()
      },
      data_freshness: new Map(),
      quality_scores: new Map(),
      processing_times: new Map(),
      alerts: []
    };

    // Alert thresholds
    this.alertThresholds = {
      critical: 0.5, // 50% below SLA
      warning: 0.8, // 80% of SLA target
      info: 0.9 // 90% of SLA target
    };

    console.log('📊 SLA Monitoring Service initialized');
    
    // Start background monitoring
    this.startBackgroundMonitoring();
  }

  /**
   * Start background monitoring processes
   */
  startBackgroundMonitoring() {
    // Check data freshness every 5 minutes
    setInterval(() => this.checkDataFreshness(), 5 * 60 * 1000);
    
    // Calculate SLA compliance every 15 minutes
    setInterval(() => this.calculateSLACompliance(), 15 * 60 * 1000);
    
    // Clean old metrics every hour
    setInterval(() => this.cleanOldMetrics(), 60 * 60 * 1000);
    
    // Generate alerts every 10 minutes
    setInterval(() => this.generateAlerts(), 10 * 60 * 1000);
    
    console.log('🔄 Background SLA monitoring started');
  }

  /**
   * Record API call metrics
   */
  recordAPICall(endpoint, responseTime, success = true, errorType = null) {
    this.metrics.api_calls.total++;
    
    if (success) {
      this.metrics.api_calls.successful++;
    } else {
      this.metrics.api_calls.failed++;
    }
    
    // Store response times (keep last 1000)
    this.metrics.api_calls.response_times.push({
      endpoint,
      responseTime,
      timestamp: new Date(),
      success,
      errorType
    });
    
    if (this.metrics.api_calls.response_times.length > 1000) {
      this.metrics.api_calls.response_times.shift();
    }
    
    // Check if response time exceeds SLA
    if (responseTime > this.slaTargets.api_performance.response_time_p95) {
      this.emit('sla_violation', {
        type: 'response_time',
        endpoint,
        actual: responseTime,
        target: this.slaTargets.api_performance.response_time_p95,
        severity: responseTime > this.slaTargets.api_performance.response_time_p99 ? 'critical' : 'warning'
      });
    }
  }

  /**
   * Record data processing metrics
   */
  recordProcessingTime(operation, duration, recordCount = 1, success = true) {
    const key = `${operation}_${new Date().toISOString().split('T')[0]}`;
    
    if (!this.metrics.processing_times.has(key)) {
      this.metrics.processing_times.set(key, {
        operation,
        durations: [],
        records_processed: 0,
        success_count: 0,
        failure_count: 0,
        date: new Date().toISOString().split('T')[0]
      });
    }
    
    const metrics = this.metrics.processing_times.get(key);
    metrics.durations.push(duration);
    metrics.records_processed += recordCount;
    
    if (success) {
      metrics.success_count++;
    } else {
      metrics.failure_count++;
    }
    
    // Check SLA violation
    const target = this.slaTargets.processing_performance[operation];
    if (target && duration > target) {
      this.emit('sla_violation', {
        type: 'processing_time',
        operation,
        actual: duration,
        target,
        severity: duration > target * 2 ? 'critical' : 'warning'
      });
    }
  }

  /**
   * Check data freshness across all tables
   */
  async checkDataFreshness() {
    console.log('🔍 Checking data freshness...');
    
    try {
      const tables = [
        { name: 'stories', target: this.slaTargets.data_freshness.stories },
        { name: 'storytellers', target: this.slaTargets.data_freshness.storytellers },
        { name: 'normalized_documents', target: this.slaTargets.data_freshness.normalized_data },
        { name: 'normalized_stories', target: this.slaTargets.data_freshness.normalized_data },
        { name: 'normalized_storytellers', target: this.slaTargets.data_freshness.normalized_data }
      ];
      
      for (const table of tables) {
        const freshness = await this.checkTableFreshness(table.name);
        
        if (freshness) {
          this.metrics.data_freshness.set(table.name, {
            last_updated: freshness.last_updated,
            staleness_ms: freshness.staleness_ms,
            record_count: freshness.record_count,
            compliance: freshness.staleness_ms <= table.target,
            created_at: new Date()
          });
          
          // Check for SLA violations
          if (freshness.staleness_ms > table.target) {
            this.emit('sla_violation', {
              type: 'data_freshness',
              table: table.name,
              actual: freshness.staleness_ms,
              target: table.target,
              severity: freshness.staleness_ms > table.target * 2 ? 'critical' : 'warning'
            });
          }
        }
      }
      
    } catch (error) {
      console.error('Data freshness check failed:', error);
      this.emit('monitoring_error', { type: 'data_freshness', error: error.message });
    }
  }

  /**
   * Check freshness of a specific table
   */
  async checkTableFreshness(tableName) {
    try {
      // Try to get the most recent record, fallback to created_at if updated_at doesn't exist
      let data, error;
      
      // First try with updated_at
      ({ data, error } = await this.supabase
        .from(tableName)
        .select('updated_at, created_at')
        .order('updated_at', { ascending: false })
        .limit(1));
      
      // If updated_at column doesn't exist, fallback to created_at only
      if (error && error.code === '42703') {
        ({ data, error } = await this.supabase
          .from(tableName)
          .select('created_at')
          .order('created_at', { ascending: false })
          .limit(1));
      }
      
      if (error) throw error;
      
      if (!data || data.length === 0) {
        return {
          last_updated: null,
          staleness_ms: Infinity,
          record_count: 0
        };
      }
      
      const lastUpdate = new Date(data[0].updated_at || data[0].created_at);
      const now = new Date();
      const staleness = now - lastUpdate;
      
      // Get total record count
      const { count } = await this.supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });
      
      return {
        last_updated: lastUpdate,
        staleness_ms: staleness,
        record_count: count || 0
      };
      
    } catch (error) {
      console.error(`Failed to check freshness for ${tableName}:`, error);
      return null;
    }
  }

  /**
   * Calculate current SLA compliance
   */
  async calculateSLACompliance() {
    console.log('📈 Calculating SLA compliance...');
    
    const compliance = {
      overall_score: 0,
      data_freshness: this.calculateDataFreshnessCompliance(),
      api_performance: this.calculateAPIPerformanceCompliance(),
      data_quality: await this.calculateDataQualityCompliance(),
      processing_performance: this.calculateProcessingPerformanceCompliance(),
      timestamp: new Date()
    };
    
    // Calculate overall score (weighted average)
    const weights = {
      data_freshness: 0.3,
      api_performance: 0.3,
      data_quality: 0.25,
      processing_performance: 0.15
    };
    
    compliance.overall_score = 
      (compliance.data_freshness.score * weights.data_freshness) +
      (compliance.api_performance.score * weights.api_performance) +
      (compliance.data_quality.score * weights.data_quality) +
      (compliance.processing_performance.score * weights.processing_performance);
    
    // Store compliance record
    await this.storeComplianceRecord(compliance);
    
    return compliance;
  }

  /**
   * Calculate data freshness compliance
   */
  calculateDataFreshnessCompliance() {
    const tables = Array.from(this.metrics.data_freshness.entries());
    
    if (tables.length === 0) {
      return { score: 0, details: {}, issues: ['No data freshness metrics available'] };
    }
    
    let compliantTables = 0;
    const details = {};
    const issues = [];
    
    for (const [tableName, metrics] of tables) {
      const compliance = metrics.compliance;
      details[tableName] = {
        compliant: compliance,
        staleness_hours: Math.round(metrics.staleness_ms / (1000 * 60 * 60)),
        last_updated: metrics.last_updated
      };
      
      if (compliance) {
        compliantTables++;
      } else {
        issues.push(`${tableName} data is stale (${details[tableName].staleness_hours}h old)`);
      }
    }
    
    return {
      score: (compliantTables / tables.length) * 100,
      compliant_tables: compliantTables,
      total_tables: tables.length,
      details,
      issues
    };
  }

  /**
   * Calculate API performance compliance
   */
  calculateAPIPerformanceCompliance() {
    const calls = this.metrics.api_calls;
    
    if (calls.total === 0) {
      return { score: 100, details: {}, issues: [] };
    }
    
    // Calculate metrics
    const successRate = (calls.successful / calls.total) * 100;
    const errorRate = (calls.failed / calls.total) * 100;
    
    const responseTimes = calls.response_times
      .filter(call => call.success)
      .map(call => call.responseTime)
      .sort((a, b) => a - b);
    
    const p95 = responseTimes[Math.floor(responseTimes.length * 0.95)] || 0;
    const p99 = responseTimes[Math.floor(responseTimes.length * 0.99)] || 0;
    
    const details = {
      availability: successRate,
      error_rate: errorRate,
      response_time_p95: p95,
      response_time_p99: p99,
      total_calls: calls.total
    };
    
    const issues = [];
    let score = 100;
    
    // Check each SLA target
    if (successRate < this.slaTargets.api_performance.availability) {
      score -= 25;
      issues.push(`Low availability: ${successRate.toFixed(1)}% < ${this.slaTargets.api_performance.availability}%`);
    }
    
    if (errorRate > this.slaTargets.api_performance.error_rate) {
      score -= 25;
      issues.push(`High error rate: ${errorRate.toFixed(1)}% > ${this.slaTargets.api_performance.error_rate}%`);
    }
    
    if (p95 > this.slaTargets.api_performance.response_time_p95) {
      score -= 25;
      issues.push(`Slow P95 response time: ${p95}ms > ${this.slaTargets.api_performance.response_time_p95}ms`);
    }
    
    if (p99 > this.slaTargets.api_performance.response_time_p99) {
      score -= 25;
      issues.push(`Slow P99 response time: ${p99}ms > ${this.slaTargets.api_performance.response_time_p99}ms`);
    }
    
    return { score: Math.max(0, score), details, issues };
  }

  /**
   * Calculate data quality compliance
   */
  async calculateDataQualityCompliance() {
    try {
      // Get recent quality metrics from data_quality_audit table
      const { data, error } = await this.supabase
        .from('data_quality_audit')
        .select('*')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      if (!data || data.length === 0) {
        return { score: 50, details: {}, issues: ['No recent quality audit data available'] };
      }
      
      // Calculate average quality scores
      const avgQuality = {
        completeness: 0,
        accuracy: 0,
        consistency: 0,
        validity: 0
      };
      
      for (const record of data) {
        const dimensions = record.quality_dimensions || {};
        avgQuality.completeness += dimensions.completeness || 0;
        avgQuality.accuracy += dimensions.accuracy || 0;
        avgQuality.consistency += dimensions.consistency || 0;
        avgQuality.validity += dimensions.validity || 0;
      }
      
      Object.keys(avgQuality).forEach(key => {
        avgQuality[key] = avgQuality[key] / data.length;
      });
      
      const issues = [];
      let score = 100;
      
      // Check each quality dimension
      Object.entries(avgQuality).forEach(([dimension, value]) => {
        const target = this.slaTargets.data_quality[dimension];
        if (value < target) {
          const penalty = Math.min(25, (target - value) / target * 25);
          score -= penalty;
          issues.push(`Low ${dimension}: ${value.toFixed(1)}% < ${target}%`);
        }
      });
      
      return {
        score: Math.max(0, score),
        details: avgQuality,
        issues,
        records_analyzed: data.length
      };
      
    } catch (error) {
      console.error('Data quality compliance calculation failed:', error);
      return { score: 0, details: {}, issues: ['Failed to calculate data quality metrics'] };
    }
  }

  /**
   * Calculate processing performance compliance
   */
  calculateProcessingPerformanceCompliance() {
    const processes = Array.from(this.metrics.processing_times.values());
    
    if (processes.length === 0) {
      return { score: 100, details: {}, issues: [] };
    }
    
    const details = {};
    const issues = [];
    let totalScore = 0;
    let processCount = 0;
    
    for (const process of processes) {
      const avgDuration = process.durations.reduce((sum, d) => sum + d, 0) / process.durations.length;
      const successRate = (process.success_count / (process.success_count + process.failure_count)) * 100;
      
      details[process.operation] = {
        avg_duration: Math.round(avgDuration),
        success_rate: successRate,
        records_processed: process.records_processed
      };
      
      let processScore = 100;
      const target = this.slaTargets.processing_performance[process.operation];
      
      if (target && avgDuration > target) {
        processScore -= 50;
        issues.push(`Slow ${process.operation}: ${Math.round(avgDuration)}ms > ${target}ms`);
      }
      
      if (successRate < 95) {
        processScore -= 25;
        issues.push(`Low ${process.operation} success rate: ${successRate.toFixed(1)}%`);
      }
      
      totalScore += processScore;
      processCount++;
    }
    
    return {
      score: processCount > 0 ? totalScore / processCount : 100,
      details,
      issues
    };
  }

  /**
   * Generate and manage alerts
   */
  async generateAlerts() {
    const compliance = await this.calculateSLACompliance();
    const now = new Date();
    
    // Clear old alerts (older than 1 hour)
    this.metrics.alerts = this.metrics.alerts.filter(
      alert => now - new Date(alert.timestamp) < 60 * 60 * 1000
    );
    
    // Generate new alerts based on compliance
    this.checkComplianceAlerts(compliance);
    
    // Store alerts in database
    await this.storeAlerts();
  }

  /**
   * Check for compliance-based alerts
   */
  checkComplianceAlerts(compliance) {
    const categories = ['data_freshness', 'api_performance', 'data_quality', 'processing_performance'];
    
    for (const category of categories) {
      const categoryCompliance = compliance[category];
      if (!categoryCompliance) continue;
      
      const score = categoryCompliance.score;
      let severity = null;
      
      if (score < 50) {
        severity = 'critical';
      } else if (score < 70) {
        severity = 'warning';
      } else if (score < 90) {
        severity = 'info';
      }
      
      if (severity) {
        this.addAlert({
          type: 'sla_compliance',
          category,
          severity,
          score,
          issues: categoryCompliance.issues || [],
          details: categoryCompliance.details
        });
      }
    }
  }

  /**
   * Add an alert
   */
  addAlert(alert) {
    const alertWithTimestamp = {
      id: `${alert.type}_${alert.category}_${Date.now()}`,
      ...alert,
      timestamp: new Date(),
      acknowledged: false
    };
    
    this.metrics.alerts.push(alertWithTimestamp);
    this.emit('alert_generated', alertWithTimestamp);
    
    console.log(`🚨 Alert generated: ${alert.severity} - ${alert.category}`);
  }

  /**
   * Store compliance record in database
   */
  async storeComplianceRecord(compliance) {
    try {
      const { error } = await this.supabase
        .from('sla_compliance_history')
        .insert({
          overall_score: compliance.overall_score,
          data_freshness_score: compliance.data_freshness.score,
          api_performance_score: compliance.api_performance.score,
          data_quality_score: compliance.data_quality.score,
          processing_performance_score: compliance.processing_performance.score,
          compliance_details: compliance,
          recorded_at: new Date()
        });
      
      if (error) throw error;
      
    } catch (error) {
      if (error?.message?.includes('does not exist')) {
        console.warn('⚠️ sla_compliance table does not exist - skipping database storage');
        // Log to console instead for monitoring
        console.log('📊 SLA Compliance (Table Missing):', JSON.stringify({
          period: `${compliance.period_start} to ${compliance.period_end}`,
          overall_score: compliance.overall_score,
          scores: {
            data_freshness: compliance.data_freshness.score,
            api_performance: compliance.api_performance.score,
            data_quality: compliance.data_quality.score,
            processing_performance: compliance.processing_performance.score
          }
        }, null, 2));
      } else {
        console.error('Failed to store compliance record:', error);
      }
    }
  }

  /**
   * Store current alerts in database
   */
  async storeAlerts() {
    if (this.metrics.alerts.length === 0) return;
    
    try {
      const activeAlerts = this.metrics.alerts.filter(alert => !alert.stored);
      
      if (activeAlerts.length === 0) return;
      
      const { error } = await this.supabase
        .from('sla_alerts')
        .insert(activeAlerts.map(alert => ({
          alert_id: alert.id,
          alert_type: alert.type,
          category: alert.category,
          severity: alert.severity,
          score: alert.score,
          issues: alert.issues,
          details: alert.details,
          acknowledged: alert.acknowledged,
          created_at: alert.timestamp
        })));
      
      if (error) throw error;
      
      // Mark alerts as stored
      activeAlerts.forEach(alert => alert.stored = true);
      
    } catch (error) {
      if (error?.message?.includes('does not exist')) {
        console.warn('⚠️ sla_alerts table does not exist - skipping database storage');
        // Log alerts to console instead for monitoring
        console.log('🚨 Active SLA Alerts (Table Missing):');
        activeAlerts.forEach(alert => {
          console.log(`  - ${alert.severity.toUpperCase()}: ${alert.type} (${alert.category})`);
          alert.issues.forEach(issue => console.log(`    • ${issue}`));
        });
        // Still mark as "stored" to prevent repeated logging
        activeAlerts.forEach(alert => alert.stored = true);
      } else {
        console.error('Failed to store alerts:', error);
      }
    }
  }

  /**
   * Clean old metrics to prevent memory leaks
   */
  cleanOldMetrics() {
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    const cutoff = new Date(Date.now() - maxAge);
    
    // Clean old response times
    this.metrics.api_calls.response_times = this.metrics.api_calls.response_times
      .filter(call => new Date(call.timestamp) > cutoff);
    
    // Clean old processing times
    for (const [key, metrics] of this.metrics.processing_times.entries()) {
      if (new Date(metrics.date) < cutoff) {
        this.metrics.processing_times.delete(key);
      }
    }
    
    console.log('🧹 Cleaned old metrics');
  }

  /**
   * Get current SLA status
   */
  async getSLAStatus() {
    const compliance = await this.calculateSLACompliance();
    
    return {
      compliance,
      current_metrics: {
        data_freshness: Object.fromEntries(this.metrics.data_freshness),
        api_performance: {
          total_calls: this.metrics.api_calls.total,
          success_rate: this.metrics.api_calls.total > 0 
            ? (this.metrics.api_calls.successful / this.metrics.api_calls.total) * 100 
            : 100,
          avg_response_time: this.metrics.api_calls.response_times.length > 0
            ? this.metrics.api_calls.response_times.reduce((sum, call) => sum + call.responseTime, 0) / this.metrics.api_calls.response_times.length
            : 0
        }
      },
      active_alerts: this.metrics.alerts.filter(alert => !alert.acknowledged),
      sla_targets: this.slaTargets,
      last_updated: new Date()
    };
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId) {
    const alert = this.metrics.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      alert.acknowledged_at = new Date();
      return true;
    }
    return false;
  }

  /**
   * Get health check information
   */
  getHealthStatus() {
    return {
      service: 'operational',
      monitoring_active: true,
      metrics_collected: {
        api_calls: this.metrics.api_calls.total,
        data_freshness_checks: this.metrics.data_freshness.size,
        processing_metrics: this.metrics.processing_times.size,
        active_alerts: this.metrics.alerts.filter(a => !a.acknowledged).length
      },
      last_health_check: new Date()
    };
  }
}

export default SLAMonitoringService;