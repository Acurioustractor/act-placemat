/**
 * SLA Monitoring Service Tests
 * Comprehensive testing of SLA monitoring, data freshness tracking, and performance metrics
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import app from '../src/server.js';
import SLAMonitoringService from '../src/services/slaMonitoringService.js';

describe('SLA Monitoring API', () => {
  let slaService;

  beforeEach(() => {
    slaService = new SLAMonitoringService();
    
    // Mock some initial data for testing
    slaService.metrics.api_calls = {
      total: 100,
      successful: 95,
      failed: 5,
      response_times: [
        { endpoint: '/api/test', responseTime: 150, timestamp: new Date(), success: true },
        { endpoint: '/api/test', responseTime: 250, timestamp: new Date(), success: true },
        { endpoint: '/api/test', responseTime: 3000, timestamp: new Date(), success: false, errorType: '500_error' }
      ],
      last_reset: new Date(Date.now() - 60 * 60 * 1000) // 1 hour ago
    };

    // Mock data freshness data
    slaService.metrics.data_freshness.set('stories', {
      last_updated: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      staleness_ms: 2 * 60 * 60 * 1000, // 2 hours
      record_count: 150,
      compliance: true,
      checked_at: new Date()
    });

    slaService.metrics.data_freshness.set('normalized_documents', {
      last_updated: new Date(Date.now() - 8 * 60 * 60 * 1000), // 8 hours ago
      staleness_ms: 8 * 60 * 60 * 1000, // 8 hours
      record_count: 500,
      compliance: false, // Exceeds 6-hour SLA
      checked_at: new Date()
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/sla-monitoring/status', () => {
    it('should return current SLA status', async () => {
      const response = await request(app)
        .get('/api/sla-monitoring/status')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.sla_status).toHaveProperty('compliance');
      expect(response.body.sla_status).toHaveProperty('current_metrics');
      expect(response.body.sla_status).toHaveProperty('active_alerts');
      expect(response.body.sla_status).toHaveProperty('sla_targets');
      expect(response.body.sla_status).toHaveProperty('last_updated');
    });

    it('should include API performance metrics', async () => {
      const response = await request(app)
        .get('/api/sla-monitoring/status')
        .expect(200);

      const metrics = response.body.sla_status.current_metrics;
      expect(metrics).toHaveProperty('api_performance');
      expect(metrics.api_performance).toHaveProperty('total_calls');
      expect(metrics.api_performance).toHaveProperty('success_rate');
      expect(metrics.api_performance).toHaveProperty('avg_response_time');
    });
  });

  describe('GET /api/sla-monitoring/compliance', () => {
    it('should return detailed compliance report', async () => {
      const response = await request(app)
        .get('/api/sla-monitoring/compliance')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.compliance_report).toHaveProperty('overall_score');
      expect(response.body.compliance_report).toHaveProperty('data_freshness');
      expect(response.body.compliance_report).toHaveProperty('api_performance');
      expect(response.body.compliance_report).toHaveProperty('data_quality');
      expect(response.body.compliance_report).toHaveProperty('processing_performance');

      expect(response.body.summary).toHaveProperty('overall_grade');
      expect(response.body.summary).toHaveProperty('compliant');
      expect(response.body.summary).toHaveProperty('needs_attention');
    });

    it('should calculate correct compliance grades', async () => {
      const response = await request(app)
        .get('/api/sla-monitoring/compliance')
        .expect(200);

      const grade = response.body.summary.overall_grade;
      expect(['A', 'B', 'C', 'D', 'F']).toContain(grade);
    });
  });

  describe('GET /api/sla-monitoring/data-freshness', () => {
    it('should return data freshness metrics', async () => {
      const response = await request(app)
        .get('/api/sla-monitoring/data-freshness')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data_freshness).toHaveProperty('stories');
      expect(response.body.data_freshness).toHaveProperty('normalized_documents');
      
      expect(response.body.summary).toHaveProperty('total_tables');
      expect(response.body.summary).toHaveProperty('fresh_tables');
      expect(response.body.summary).toHaveProperty('stale_tables');
      expect(response.body.summary).toHaveProperty('oldest_data');
      expect(response.body.summary).toHaveProperty('newest_data');

      expect(response.body.sla_targets).toHaveProperty('stories');
      expect(response.body.sla_targets).toHaveProperty('normalized_data');
    });

    it('should identify stale tables correctly', async () => {
      const response = await request(app)
        .get('/api/sla-monitoring/data-freshness')
        .expect(200);

      const summary = response.body.summary;
      expect(summary.stale_tables).toBeGreaterThan(0); // normalized_documents should be stale
      expect(summary.fresh_tables).toBeGreaterThan(0); // stories should be fresh
    });
  });

  describe('GET /api/sla-monitoring/api-performance', () => {
    it('should return API performance metrics', async () => {
      const response = await request(app)
        .get('/api/sla-monitoring/api-performance')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.api_performance).toHaveProperty('compliance');
      expect(response.body.api_performance).toHaveProperty('recent_calls');
      expect(response.body.api_performance).toHaveProperty('metrics_period');

      const compliance = response.body.api_performance.compliance;
      expect(compliance).toHaveProperty('score');
      expect(compliance).toHaveProperty('details');
      expect(compliance.details).toHaveProperty('availability');
      expect(compliance.details).toHaveProperty('error_rate');
      expect(compliance.details).toHaveProperty('response_time_p95');
    });

    it('should calculate correct performance metrics', async () => {
      const response = await request(app)
        .get('/api/sla-monitoring/api-performance')
        .expect(200);

      const details = response.body.api_performance.compliance.details;
      expect(details.availability).toBe(95); // 95/100 = 95%
      expect(details.error_rate).toBe(5); // 5/100 = 5%
      expect(details.total_calls).toBe(100);
    });
  });

  describe('GET /api/sla-monitoring/alerts', () => {
    it('should return current alerts', async () => {
      // Add some test alerts
      slaService.metrics.alerts = [
        {
          id: 'test_alert_1',
          type: 'data_freshness',
          category: 'normalized_documents',
          severity: 'warning',
          score: 65,
          issues: ['Data is stale'],
          timestamp: new Date(),
          acknowledged: false
        },
        {
          id: 'test_alert_2',
          type: 'api_performance',
          category: 'response_time',
          severity: 'critical',
          score: 40,
          issues: ['High response times'],
          timestamp: new Date(),
          acknowledged: true
        }
      ];

      const response = await request(app)
        .get('/api/sla-monitoring/alerts')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.alerts).toHaveLength(2);
      expect(response.body.summary).toHaveProperty('total', 2);
      expect(response.body.summary).toHaveProperty('unacknowledged', 1);
      expect(response.body.summary.by_severity).toHaveProperty('critical', 1);
      expect(response.body.summary.by_severity).toHaveProperty('warning', 1);
    });

    it('should filter alerts by severity', async () => {
      slaService.metrics.alerts = [
        {
          id: 'critical_alert',
          severity: 'critical',
          timestamp: new Date(),
          acknowledged: false
        },
        {
          id: 'warning_alert',
          severity: 'warning',
          timestamp: new Date(),
          acknowledged: false
        }
      ];

      const response = await request(app)
        .get('/api/sla-monitoring/alerts?severity=critical')
        .expect(200);

      expect(response.body.alerts).toHaveLength(1);
      expect(response.body.alerts[0].severity).toBe('critical');
    });

    it('should filter alerts by acknowledgment status', async () => {
      slaService.metrics.alerts = [
        {
          id: 'ack_alert',
          acknowledged: true,
          timestamp: new Date()
        },
        {
          id: 'unack_alert',
          acknowledged: false,
          timestamp: new Date()
        }
      ];

      const response = await request(app)
        .get('/api/sla-monitoring/alerts?acknowledged=false')
        .expect(200);

      expect(response.body.alerts).toHaveLength(1);
      expect(response.body.alerts[0].acknowledged).toBe(false);
    });
  });

  describe('POST /api/sla-monitoring/alerts/:alertId/acknowledge', () => {
    it('should acknowledge an existing alert', async () => {
      const alertId = 'test_alert_123';
      slaService.metrics.alerts = [{
        id: alertId,
        acknowledged: false,
        timestamp: new Date()
      }];

      const response = await request(app)
        .post(`/api/sla-monitoring/alerts/${alertId}/acknowledge`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.alert_id).toBe(alertId);

      // Verify alert was acknowledged
      const alert = slaService.metrics.alerts.find(a => a.id === alertId);
      expect(alert.acknowledged).toBe(true);
    });

    it('should return 404 for non-existent alert', async () => {
      const response = await request(app)
        .post('/api/sla-monitoring/alerts/non_existent/acknowledge')
        .expect(404);

      expect(response.body.error).toContain('Alert not found');
    });
  });

  describe('POST /api/sla-monitoring/processing-time', () => {
    it('should record processing time metrics', async () => {
      const processingData = {
        operation: 'normalization_time',
        duration: 25000,
        recordCount: 50,
        success: true
      };

      const response = await request(app)
        .post('/api/sla-monitoring/processing-time')
        .send(processingData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.metrics).toMatchObject(processingData);
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/sla-monitoring/processing-time')
        .send({ operation: 'test' }) // Missing duration
        .expect(400);

      expect(response.body.error).toContain('Operation and duration are required');
    });
  });

  describe('GET /api/sla-monitoring/health', () => {
    it('should return monitoring service health status', async () => {
      const response = await request(app)
        .get('/api/sla-monitoring/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.health_status).toHaveProperty('service', 'operational');
      expect(response.body.health_status).toHaveProperty('monitoring_active', true);
      expect(response.body.health_status).toHaveProperty('metrics_collected');
      expect(response.body.monitoring_endpoints).toHaveProperty('status');
      expect(response.body.monitoring_endpoints).toHaveProperty('compliance');
    });
  });

  describe('GET /api/sla-monitoring/dashboard', () => {
    it('should return comprehensive dashboard data', async () => {
      const response = await request(app)
        .get('/api/sla-monitoring/dashboard')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.dashboard).toHaveProperty('overview');
      expect(response.body.dashboard).toHaveProperty('metrics_summary');
      expect(response.body.dashboard).toHaveProperty('recent_alerts');
      expect(response.body.dashboard).toHaveProperty('quick_actions');

      const overview = response.body.dashboard.overview;
      expect(overview).toHaveProperty('overall_sla_score');
      expect(overview).toHaveProperty('compliance_grade');
      expect(overview).toHaveProperty('system_health');
      expect(overview).toHaveProperty('active_alerts');
    });

    it('should include metrics summary for all categories', async () => {
      const response = await request(app)
        .get('/api/sla-monitoring/dashboard')
        .expect(200);

      const metrics = response.body.dashboard.metrics_summary;
      expect(metrics).toHaveProperty('data_freshness');
      expect(metrics).toHaveProperty('api_performance');
      expect(metrics).toHaveProperty('data_quality');
      expect(metrics).toHaveProperty('processing_performance');

      expect(metrics.data_freshness).toHaveProperty('score');
      expect(metrics.api_performance).toHaveProperty('score');
    });
  });

  describe('POST /api/sla-monitoring/data-freshness/check', () => {
    it('should force a data freshness check', async () => {
      vi.spyOn(slaService, 'checkDataFreshness').mockResolvedValue();

      const response = await request(app)
        .post('/api/sla-monitoring/data-freshness/check')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Data freshness check completed');
      expect(response.body.results).toBeDefined();
    });
  });

  describe('POST /api/sla-monitoring/metrics/reset', () => {
    it('should reset monitoring metrics', async () => {
      // Set up some initial metrics
      slaService.metrics.api_calls.total = 100;
      slaService.metrics.data_freshness.set('test', { value: 'test' });
      slaService.metrics.alerts = [{ id: 'test' }];

      const response = await request(app)
        .post('/api/sla-monitoring/metrics/reset')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('reset successfully');
    });
  });
});

describe('SLA Monitoring Service Unit Tests', () => {
  let slaService;

  beforeEach(() => {
    slaService = new SLAMonitoringService();
  });

  describe('API Call Recording', () => {
    it('should record successful API calls', () => {
      slaService.recordAPICall('/api/test', 150, true);

      expect(slaService.metrics.api_calls.total).toBe(1);
      expect(slaService.metrics.api_calls.successful).toBe(1);
      expect(slaService.metrics.api_calls.failed).toBe(0);
      expect(slaService.metrics.api_calls.response_times).toHaveLength(1);
      expect(slaService.metrics.api_calls.response_times[0].responseTime).toBe(150);
    });

    it('should record failed API calls', () => {
      slaService.recordAPICall('/api/test', 5000, false, '500_error');

      expect(slaService.metrics.api_calls.total).toBe(1);
      expect(slaService.metrics.api_calls.successful).toBe(0);
      expect(slaService.metrics.api_calls.failed).toBe(1);
      expect(slaService.metrics.api_calls.response_times[0].errorType).toBe('500_error');
    });

    it('should emit SLA violation for slow responses', (done) => {
      slaService.on('sla_violation', (violation) => {
        expect(violation.type).toBe('response_time');
        expect(violation.actual).toBe(3000);
        expect(violation.severity).toBe('warning');
        done();
      });

      slaService.recordAPICall('/api/slow', 3000, true);
    });
  });

  describe('Processing Time Recording', () => {
    it('should record processing metrics', () => {
      slaService.recordProcessingTime('normalization_time', 25000, 10, true);

      const today = new Date().toISOString().split('T')[0];
      const key = `normalization_time_${today}`;
      
      expect(slaService.metrics.processing_times.has(key)).toBe(true);
      
      const metrics = slaService.metrics.processing_times.get(key);
      expect(metrics.durations).toHaveLength(1);
      expect(metrics.records_processed).toBe(10);
      expect(metrics.success_count).toBe(1);
      expect(metrics.failure_count).toBe(0);
    });

    it('should emit SLA violation for slow processing', (done) => {
      slaService.on('sla_violation', (violation) => {
        expect(violation.type).toBe('processing_time');
        expect(violation.operation).toBe('normalization_time');
        expect(violation.severity).toBe('warning');
        done();
      });

      slaService.recordProcessingTime('normalization_time', 35000, 1, true);
    });
  });

  describe('Compliance Calculations', () => {
    it('should calculate data freshness compliance correctly', () => {
      // Add fresh and stale data
      slaService.metrics.data_freshness.set('fresh_table', {
        compliance: true,
        staleness_ms: 1000,
        last_updated: new Date()
      });
      
      slaService.metrics.data_freshness.set('stale_table', {
        compliance: false,
        staleness_ms: 10000000,
        last_updated: new Date(Date.now() - 10000000)
      });

      const compliance = slaService.calculateDataFreshnessCompliance();
      
      expect(compliance.score).toBe(50); // 1 out of 2 tables compliant
      expect(compliance.compliant_tables).toBe(1);
      expect(compliance.total_tables).toBe(2);
      expect(compliance.issues).toHaveLength(1);
    });

    it('should calculate API performance compliance correctly', () => {
      // Set up API metrics
      slaService.metrics.api_calls = {
        total: 100,
        successful: 95,
        failed: 5,
        response_times: Array.from({ length: 95 }, (_, i) => ({
          responseTime: 100 + i * 10, // Response times from 100ms to 1040ms
          success: true
        }))
      };

      const compliance = slaService.calculateAPIPerformanceCompliance();
      
      expect(compliance.details.availability).toBe(95);
      expect(compliance.details.error_rate).toBe(5);
      expect(compliance.score).toBeGreaterThan(50); // Should have reasonable score
    });
  });

  describe('Alert Management', () => {
    it('should add alerts correctly', () => {
      const alertData = {
        type: 'sla_compliance',
        category: 'data_freshness',
        severity: 'warning',
        score: 65,
        issues: ['Some tables are stale']
      };

      slaService.addAlert(alertData);

      expect(slaService.metrics.alerts).toHaveLength(1);
      expect(slaService.metrics.alerts[0]).toMatchObject(alertData);
      expect(slaService.metrics.alerts[0]).toHaveProperty('id');
      expect(slaService.metrics.alerts[0]).toHaveProperty('timestamp');
      expect(slaService.metrics.alerts[0].acknowledged).toBe(false);
    });

    it('should acknowledge alerts correctly', () => {
      const alertId = 'test_alert_123';
      slaService.metrics.alerts = [{
        id: alertId,
        acknowledged: false
      }];

      const result = slaService.acknowledgeAlert(alertId);
      
      expect(result).toBe(true);
      expect(slaService.metrics.alerts[0].acknowledged).toBe(true);
      expect(slaService.metrics.alerts[0]).toHaveProperty('acknowledged_at');
    });

    it('should return false for non-existent alert acknowledgment', () => {
      const result = slaService.acknowledgeAlert('non_existent');
      expect(result).toBe(false);
    });
  });

  describe('Health Status', () => {
    it('should return operational health status', () => {
      const health = slaService.getHealthStatus();
      
      expect(health.service).toBe('operational');
      expect(health.monitoring_active).toBe(true);
      expect(health.metrics_collected).toHaveProperty('api_calls');
      expect(health.metrics_collected).toHaveProperty('data_freshness_checks');
      expect(health.metrics_collected).toHaveProperty('processing_metrics');
      expect(health.metrics_collected).toHaveProperty('active_alerts');
    });
  });

  describe('Metrics Cleanup', () => {
    it('should clean old metrics correctly', () => {
      // Add old response times
      const oldTime = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago
      const recentTime = new Date(Date.now() - 1 * 60 * 60 * 1000); // 1 hour ago

      slaService.metrics.api_calls.response_times = [
        { timestamp: oldTime, responseTime: 100 },
        { timestamp: recentTime, responseTime: 200 }
      ];

      slaService.cleanOldMetrics();

      expect(slaService.metrics.api_calls.response_times).toHaveLength(1);
      expect(slaService.metrics.api_calls.response_times[0].responseTime).toBe(200);
    });
  });
});