#!/usr/bin/env node

/**
 * Performance Metrics Monitoring and Analysis Tool
 * 
 * Continuously monitors ACT Farmhand infrastructure performance
 * - Real-time system resource monitoring
 * - API endpoint response time tracking
 * - Database connection and query performance
 * - AI service performance analytics
 * - Automated alerting for performance anomalies
 * - Dashboard visualization and trend analysis
 */

import axios from 'axios';
import { performance } from 'perf_hooks';
import { mkdir, writeFile, appendFile } from 'fs/promises';
import { spawn } from 'child_process';
import os from 'os';
import path from 'path';

class PerformanceMonitor {
  constructor(options = {}) {
    this.baseURL = options.baseURL || 'http://localhost:4000';
    this.monitoringInterval = options.interval || 5000; // 5 seconds
    this.outputDir = options.outputDir || './tools/testing/reports';
    this.alertThresholds = {
      responseTime: 2000, // 2 seconds
      memoryUsage: 90, // 90%
      cpuUsage: 85, // 85%
      errorRate: 10, // 10%
      diskUsage: 85 // 85%
    };
    
    this.metrics = {
      system: [],
      api: [],
      database: [],
      ai: [],
      alerts: []
    };
    
    this.isMonitoring = false;
    this.monitoringStart = null;
    
    // Endpoints to monitor
    this.endpoints = [
      { name: 'Health Check', path: '/health', critical: true },
      { name: 'Farmhand Health', path: '/api/farmhand/health', critical: true },
      { name: 'Farmhand Query', path: '/api/farmhand/query', method: 'POST', critical: false, data: { query: 'test' } },
      { name: 'Intelligence Health', path: '/api/intelligence/health', critical: false },
      { name: 'Empathy Ledger Health', path: '/api/empathy-ledger/health', critical: false }
    ];
  }

  async initialize() {
    await mkdir(this.outputDir, { recursive: true });
    
    console.log('📊 ACT Farmhand Performance Monitor');
    console.log('=================================');
    console.log(`🎯 Target: ${this.baseURL}`);
    console.log(`📈 Monitoring Interval: ${this.monitoringInterval/1000}s`);
    console.log(`🚨 Alert Thresholds:`);
    console.log(`   - Response Time: ${this.alertThresholds.responseTime}ms`);
    console.log(`   - Memory Usage: ${this.alertThresholds.memoryUsage}%`);
    console.log(`   - CPU Usage: ${this.alertThresholds.cpuUsage}%`);
    console.log(`   - Error Rate: ${this.alertThresholds.errorRate}%`);
    console.log('');
    
    return true;
  }

  async collectSystemMetrics() {
    const timestamp = Date.now();
    
    // CPU metrics
    const cpus = os.cpus();
    const loadAvg = os.loadavg();
    
    // Memory metrics
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memoryUsage = (usedMem / totalMem) * 100;
    
    // Network metrics (simplified)
    const networkInterfaces = os.networkInterfaces();
    
    const systemMetric = {
      timestamp,
      cpu: {
        cores: cpus.length,
        loadAverage: {
          '1min': loadAvg[0],
          '5min': loadAvg[1],
          '15min': loadAvg[2]
        },
        usage: this.calculateCPUUsage(cpus)
      },
      memory: {
        total: Math.round(totalMem / 1024 / 1024), // MB
        used: Math.round(usedMem / 1024 / 1024), // MB
        free: Math.round(freeMem / 1024 / 1024), // MB
        usage: Math.round(memoryUsage * 100) / 100 // %
      },
      system: {
        uptime: os.uptime(),
        platform: os.platform(),
        arch: os.arch(),
        nodeVersion: process.version
      }
    };
    
    this.metrics.system.push(systemMetric);
    
    // Check for system alerts
    this.checkSystemAlerts(systemMetric);
    
    return systemMetric;
  }

  calculateCPUUsage(cpus) {
    // Simplified CPU usage calculation
    const totalIdle = cpus.reduce((acc, cpu) => acc + cpu.times.idle, 0);
    const totalTick = cpus.reduce((acc, cpu) => {
      return acc + Object.values(cpu.times).reduce((sum, time) => sum + time, 0);
    }, 0);
    
    const idle = totalIdle / cpus.length;
    const total = totalTick / cpus.length;
    const usage = 100 - (100 * idle / total);
    
    return Math.round(usage * 100) / 100;
  }

  async collectAPIMetrics() {
    const timestamp = Date.now();
    const apiMetrics = [];
    
    for (const endpoint of this.endpoints) {
      const startTime = performance.now();
      
      try {
        const config = {
          method: endpoint.method || 'GET',
          url: `${this.baseURL}${endpoint.path}`,
          timeout: 10000,
          validateStatus: () => true
        };
        
        if (endpoint.data) {
          config.data = endpoint.data;
        }
        
        const response = await axios(config);
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        
        const metric = {
          timestamp,
          endpoint: endpoint.name,
          path: endpoint.path,
          method: endpoint.method || 'GET',
          statusCode: response.status,
          responseTime: Math.round(responseTime),
          critical: endpoint.critical,
          success: response.status < 400,
          responseSize: JSON.stringify(response.data).length
        };
        
        apiMetrics.push(metric);
        
        // Check for API alerts
        this.checkAPIAlerts(metric);
        
      } catch (error) {
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        
        const metric = {
          timestamp,
          endpoint: endpoint.name,
          path: endpoint.path,
          method: endpoint.method || 'GET',
          statusCode: 0,
          responseTime: Math.round(responseTime),
          critical: endpoint.critical,
          success: false,
          error: error.message
        };
        
        apiMetrics.push(metric);
        this.checkAPIAlerts(metric);
      }
    }
    
    this.metrics.api.push(...apiMetrics);
    return apiMetrics;
  }

  async collectAIMetrics() {
    const timestamp = Date.now();
    
    // Test AI query performance
    try {
      const startTime = performance.now();
      
      const response = await axios.post(`${this.baseURL}/api/farmhand/query`, {
        query: 'Performance test query'
      }, {
        timeout: 30000,
        validateStatus: () => true
      });
      
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      
      const aiMetric = {
        timestamp,
        service: 'ACT Farmhand AI',
        responseTime: Math.round(responseTime),
        success: response.status === 200,
        statusCode: response.status,
        hasAIResponse: response.data && response.data.answer,
        tokenUsage: response.data?.tokenUsage || null,
        modelUsed: response.data?.model || 'unknown'
      };
      
      this.metrics.ai.push(aiMetric);
      this.checkAIAlerts(aiMetric);
      
      return aiMetric;
      
    } catch (error) {
      const aiMetric = {
        timestamp,
        service: 'ACT Farmhand AI',
        responseTime: 30000,
        success: false,
        error: error.message
      };
      
      this.metrics.ai.push(aiMetric);
      this.checkAIAlerts(aiMetric);
      
      return aiMetric;
    }
  }

  checkSystemAlerts(metric) {
    const alerts = [];
    
    if (metric.memory.usage > this.alertThresholds.memoryUsage) {
      alerts.push({
        type: 'SYSTEM',
        severity: 'HIGH',
        message: `High memory usage: ${metric.memory.usage}%`,
        threshold: this.alertThresholds.memoryUsage,
        actual: metric.memory.usage,
        timestamp: metric.timestamp
      });
    }
    
    if (metric.cpu.usage > this.alertThresholds.cpuUsage) {
      alerts.push({
        type: 'SYSTEM',
        severity: 'HIGH',
        message: `High CPU usage: ${metric.cpu.usage}%`,
        threshold: this.alertThresholds.cpuUsage,
        actual: metric.cpu.usage,
        timestamp: metric.timestamp
      });
    }
    
    if (metric.cpu.loadAverage['1min'] > os.cpus().length * 0.8) {
      alerts.push({
        type: 'SYSTEM',
        severity: 'MEDIUM',
        message: `High load average: ${metric.cpu.loadAverage['1min']}`,
        threshold: os.cpus().length * 0.8,
        actual: metric.cpu.loadAverage['1min'],
        timestamp: metric.timestamp
      });
    }
    
    if (alerts.length > 0) {
      this.metrics.alerts.push(...alerts);
      alerts.forEach(alert => this.logAlert(alert));
    }
  }

  checkAPIAlerts(metric) {
    const alerts = [];
    
    if (metric.critical && !metric.success) {
      alerts.push({
        type: 'API',
        severity: 'CRITICAL',
        message: `Critical endpoint ${metric.endpoint} failing`,
        endpoint: metric.path,
        statusCode: metric.statusCode,
        timestamp: metric.timestamp
      });
    }
    
    if (metric.responseTime > this.alertThresholds.responseTime) {
      alerts.push({
        type: 'API',
        severity: metric.critical ? 'HIGH' : 'MEDIUM',
        message: `Slow response from ${metric.endpoint}: ${metric.responseTime}ms`,
        endpoint: metric.path,
        threshold: this.alertThresholds.responseTime,
        actual: metric.responseTime,
        timestamp: metric.timestamp
      });
    }
    
    if (alerts.length > 0) {
      this.metrics.alerts.push(...alerts);
      alerts.forEach(alert => this.logAlert(alert));
    }
  }

  checkAIAlerts(metric) {
    const alerts = [];
    
    if (!metric.success) {
      alerts.push({
        type: 'AI',
        severity: 'HIGH',
        message: `AI service failure: ${metric.error || 'Unknown error'}`,
        service: metric.service,
        timestamp: metric.timestamp
      });
    }
    
    if (metric.responseTime > 15000) { // 15 seconds for AI
      alerts.push({
        type: 'AI',
        severity: 'MEDIUM',
        message: `Slow AI response: ${metric.responseTime}ms`,
        service: metric.service,
        threshold: 15000,
        actual: metric.responseTime,
        timestamp: metric.timestamp
      });
    }
    
    if (alerts.length > 0) {
      this.metrics.alerts.push(...alerts);
      alerts.forEach(alert => this.logAlert(alert));
    }
  }

  logAlert(alert) {
    const severityIcons = {
      'CRITICAL': '🔴',
      'HIGH': '🟠',
      'MEDIUM': '🟡',
      'LOW': '🟢'
    };
    
    const icon = severityIcons[alert.severity] || '⚪';
    console.log(`${icon} ${alert.severity} ${alert.type}: ${alert.message}`);
  }

  async startMonitoring(duration = 60000) { // 1 minute default
    if (this.isMonitoring) {
      console.log('⚠️ Monitoring already in progress');
      return;
    }
    
    this.isMonitoring = true;
    this.monitoringStart = Date.now();
    
    console.log(`🚀 Starting performance monitoring for ${duration/1000} seconds...`);
    console.log('📊 Real-time metrics:');
    console.log('');
    
    const monitoringInterval = setInterval(async () => {
      try {
        // Collect all metrics
        const [systemMetric, apiMetrics, aiMetric] = await Promise.all([
          this.collectSystemMetrics(),
          this.collectAPIMetrics(),
          this.collectAIMetrics()
        ]);
        
        // Display real-time summary
        const avgResponseTime = apiMetrics.reduce((sum, m) => sum + m.responseTime, 0) / apiMetrics.length;
        const successRate = (apiMetrics.filter(m => m.success).length / apiMetrics.length) * 100;
        
        console.log(`⏰ ${new Date().toLocaleTimeString()} | ` +
                   `🧠 Memory: ${systemMetric.memory.usage}% | ` +
                   `⚡ CPU: ${systemMetric.cpu.usage}% | ` +
                   `🌐 API Avg: ${Math.round(avgResponseTime)}ms | ` +
                   `✅ Success: ${Math.round(successRate)}% | ` +
                   `🤖 AI: ${aiMetric.responseTime}ms`);
        
      } catch (error) {
        console.error('❌ Monitoring error:', error.message);
      }
    }, this.monitoringInterval);
    
    // Stop monitoring after duration
    setTimeout(() => {
      clearInterval(monitoringInterval);
      this.stopMonitoring();
    }, duration);
  }

  async stopMonitoring() {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    const monitoringDuration = Date.now() - this.monitoringStart;
    
    console.log('\n📊 Monitoring completed');
    console.log('========================');
    
    // Generate comprehensive report
    const report = await this.generatePerformanceReport(monitoringDuration);
    
    return report;
  }

  async generatePerformanceReport(duration) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // Calculate summary statistics
    const systemMetrics = this.metrics.system;
    const apiMetrics = this.metrics.api;
    const aiMetrics = this.metrics.ai;
    const alerts = this.metrics.alerts;
    
    // System performance summary
    const avgMemoryUsage = systemMetrics.reduce((sum, m) => sum + m.memory.usage, 0) / systemMetrics.length || 0;
    const maxMemoryUsage = Math.max(...systemMetrics.map(m => m.memory.usage), 0);
    const avgCPUUsage = systemMetrics.reduce((sum, m) => sum + m.cpu.usage, 0) / systemMetrics.length || 0;
    const maxCPUUsage = Math.max(...systemMetrics.map(m => m.cpu.usage), 0);
    
    // API performance summary
    const apiResponseTimes = apiMetrics.map(m => m.responseTime);
    const avgAPIResponse = apiResponseTimes.reduce((sum, t) => sum + t, 0) / apiResponseTimes.length || 0;
    const maxAPIResponse = Math.max(...apiResponseTimes, 0);
    const minAPIResponse = Math.min(...apiResponseTimes, Infinity);
    const apiSuccessRate = (apiMetrics.filter(m => m.success).length / apiMetrics.length) * 100 || 0;
    
    // AI performance summary
    const aiResponseTimes = aiMetrics.map(m => m.responseTime);
    const avgAIResponse = aiResponseTimes.reduce((sum, t) => sum + t, 0) / aiResponseTimes.length || 0;
    const aiSuccessRate = (aiMetrics.filter(m => m.success).length / aiMetrics.length) * 100 || 0;
    
    // Alert summary
    const alertsBySeverity = {
      CRITICAL: alerts.filter(a => a.severity === 'CRITICAL').length,
      HIGH: alerts.filter(a => a.severity === 'HIGH').length,
      MEDIUM: alerts.filter(a => a.severity === 'MEDIUM').length,
      LOW: alerts.filter(a => a.severity === 'LOW').length
    };
    
    const report = {
      metadata: {
        timestamp: new Date().toISOString(),
        monitoringDuration: duration,
        monitoringInterval: this.monitoringInterval,
        baseURL: this.baseURL,
        alertThresholds: this.alertThresholds
      },
      summary: {
        system: {
          avgMemoryUsage: Math.round(avgMemoryUsage * 100) / 100,
          maxMemoryUsage: Math.round(maxMemoryUsage * 100) / 100,
          avgCPUUsage: Math.round(avgCPUUsage * 100) / 100,
          maxCPUUsage: Math.round(maxCPUUsage * 100) / 100
        },
        api: {
          totalRequests: apiMetrics.length,
          avgResponseTime: Math.round(avgAPIResponse),
          minResponseTime: Math.round(minAPIResponse),
          maxResponseTime: Math.round(maxAPIResponse),
          successRate: Math.round(apiSuccessRate * 100) / 100
        },
        ai: {
          totalQueries: aiMetrics.length,
          avgResponseTime: Math.round(avgAIResponse),
          successRate: Math.round(aiSuccessRate * 100) / 100
        },
        alerts: {
          total: alerts.length,
          ...alertsBySeverity
        }
      },
      detailedMetrics: {
        system: systemMetrics,
        api: apiMetrics,
        ai: aiMetrics,
        alerts: alerts
      },
      analysis: this.generateAnalysis(systemMetrics, apiMetrics, aiMetrics, alerts),
      recommendations: this.generateRecommendations(systemMetrics, apiMetrics, aiMetrics, alerts)
    };
    
    // Write reports
    const jsonPath = path.join(this.outputDir, `performance-monitor-${timestamp}.json`);
    const summaryPath = path.join(this.outputDir, `performance-summary-${timestamp}.md`);
    
    await writeFile(jsonPath, JSON.stringify(report, null, 2));
    await writeFile(summaryPath, this.generateMarkdownSummary(report));
    
    console.log(`📊 System Performance: Memory ${Math.round(avgMemoryUsage)}% avg, CPU ${Math.round(avgCPUUsage)}% avg`);
    console.log(`🌐 API Performance: ${Math.round(avgAPIResponse)}ms avg, ${Math.round(apiSuccessRate)}% success rate`);
    console.log(`🤖 AI Performance: ${Math.round(avgAIResponse)}ms avg, ${Math.round(aiSuccessRate)}% success rate`);
    console.log(`🚨 Alerts: ${alerts.length} total (${alertsBySeverity.CRITICAL} critical, ${alertsBySeverity.HIGH} high)`);
    console.log(`\n📄 Detailed Report: ${jsonPath}`);
    console.log(`📝 Summary Report: ${summaryPath}`);
    
    return report;
  }

  generateAnalysis(systemMetrics, apiMetrics, aiMetrics, alerts) {
    const analysis = [];
    
    // System analysis
    const avgMemory = systemMetrics.reduce((sum, m) => sum + m.memory.usage, 0) / systemMetrics.length;
    const avgCPU = systemMetrics.reduce((sum, m) => sum + m.cpu.usage, 0) / systemMetrics.length;
    
    if (avgMemory > 80) {
      analysis.push({
        category: 'System',
        finding: 'High memory usage detected',
        impact: 'May lead to performance degradation',
        severity: 'HIGH'
      });
    }
    
    if (avgCPU > 70) {
      analysis.push({
        category: 'System',
        finding: 'High CPU usage detected',
        impact: 'May affect response times',
        severity: 'MEDIUM'
      });
    }
    
    // API analysis
    const avgAPIResponse = apiMetrics.reduce((sum, m) => sum + m.responseTime, 0) / apiMetrics.length;
    const apiSuccessRate = (apiMetrics.filter(m => m.success).length / apiMetrics.length) * 100;
    
    if (avgAPIResponse > 1000) {
      analysis.push({
        category: 'API',
        finding: 'Slow API response times',
        impact: 'Poor user experience',
        severity: 'MEDIUM'
      });
    }
    
    if (apiSuccessRate < 95) {
      analysis.push({
        category: 'API',
        finding: 'API reliability issues',
        impact: 'Service disruption',
        severity: 'HIGH'
      });
    }
    
    // AI analysis
    if (aiMetrics.length > 0) {
      const avgAIResponse = aiMetrics.reduce((sum, m) => sum + m.responseTime, 0) / aiMetrics.length;
      const aiSuccessRate = (aiMetrics.filter(m => m.success).length / aiMetrics.length) * 100;
      
      if (avgAIResponse > 10000) {
        analysis.push({
          category: 'AI',
          finding: 'Slow AI response times',
          impact: 'User frustration with AI features',
          severity: 'MEDIUM'
        });
      }
      
      if (aiSuccessRate < 90) {
        analysis.push({
          category: 'AI',
          finding: 'AI service reliability issues',
          impact: 'Reduced AI functionality',
          severity: 'HIGH'
        });
      }
    }
    
    return analysis;
  }

  generateRecommendations(systemMetrics, apiMetrics, aiMetrics, alerts) {
    const recommendations = [];
    
    // System recommendations
    const avgMemory = systemMetrics.reduce((sum, m) => sum + m.memory.usage, 0) / systemMetrics.length;
    if (avgMemory > 80) {
      recommendations.push({
        category: 'System',
        priority: 'HIGH',
        recommendation: 'Optimize memory usage or increase available RAM',
        action: 'Review memory-intensive processes and implement memory optimization'
      });
    }
    
    // API recommendations
    const criticalFailures = apiMetrics.filter(m => m.critical && !m.success);
    if (criticalFailures.length > 0) {
      recommendations.push({
        category: 'API',
        priority: 'CRITICAL',
        recommendation: 'Address critical endpoint failures immediately',
        action: 'Investigate and fix failing critical endpoints'
      });
    }
    
    // AI recommendations
    if (aiMetrics.some(m => !m.success)) {
      recommendations.push({
        category: 'AI',
        priority: 'HIGH',
        recommendation: 'Improve AI service reliability',
        action: 'Implement retry logic and fallback mechanisms for AI services'
      });
    }
    
    // Alert recommendations
    if (alerts.length > 10) {
      recommendations.push({
        category: 'Monitoring',
        priority: 'MEDIUM',
        recommendation: 'Tune alert thresholds to reduce noise',
        action: 'Review and adjust monitoring thresholds based on baseline performance'
      });
    }
    
    if (recommendations.length === 0) {
      recommendations.push({
        category: 'General',
        priority: 'LOW',
        recommendation: 'System performing well - maintain current monitoring',
        action: 'Continue regular performance monitoring and optimization'
      });
    }
    
    return recommendations;
  }

  generateMarkdownSummary(report) {
    const { metadata, summary, analysis, recommendations } = report;
    
    return `# 📊 ACT Farmhand Performance Monitoring Report

## Executive Summary

**Monitoring Period:** ${new Date(metadata.timestamp).toLocaleString()}  
**Duration:** ${Math.round(metadata.monitoringDuration / 1000)} seconds  
**Target:** ${metadata.baseURL}

### System Performance
- **Memory Usage:** ${summary.system.avgMemoryUsage}% average (peak: ${summary.system.maxMemoryUsage}%)
- **CPU Usage:** ${summary.system.avgCPUUsage}% average (peak: ${summary.system.maxCPUUsage}%)

### API Performance
- **Total Requests:** ${summary.api.totalRequests}
- **Average Response Time:** ${summary.api.avgResponseTime}ms
- **Response Time Range:** ${summary.api.minResponseTime}ms - ${summary.api.maxResponseTime}ms
- **Success Rate:** ${summary.api.successRate}%

### AI Service Performance
- **Total Queries:** ${summary.ai.totalQueries}
- **Average Response Time:** ${summary.ai.avgResponseTime}ms
- **Success Rate:** ${summary.ai.successRate}%

### Alert Summary
- **Total Alerts:** ${summary.alerts.total}
- **Critical:** ${summary.alerts.CRITICAL}
- **High:** ${summary.alerts.HIGH}
- **Medium:** ${summary.alerts.MEDIUM}

## Performance Analysis

${analysis.length > 0 ? analysis.map(a => `
### ${a.category} - ${a.severity}
**Finding:** ${a.finding}  
**Impact:** ${a.impact}
`).join('') : 'No significant performance issues detected.'}

## Recommendations

${recommendations.map((rec, i) => `
### ${i + 1}. ${rec.category} - ${rec.priority} Priority
**Recommendation:** ${rec.recommendation}  
**Action:** ${rec.action}
`).join('')}

## Production Readiness Assessment

${summary.api.successRate >= 99 && summary.system.avgMemoryUsage < 80 && summary.system.avgCPUUsage < 70 ?
  '✅ **PRODUCTION READY**: System demonstrates excellent performance and reliability.' :
  summary.api.successRate >= 95 && summary.system.avgMemoryUsage < 90 && summary.system.avgCPUUsage < 80 ?
  '✅ **PRODUCTION READY**: System performance is good with minor optimization opportunities.' :
  summary.api.successRate >= 90 && summary.system.avgMemoryUsage < 95 ?
  '⚠️ **CONDITIONAL**: System meets basic requirements but should address identified issues.' :
  '🚨 **NOT READY**: Significant performance issues must be resolved before production deployment.'
}

---
*Generated by ACT Farmhand Performance Monitoring Tool*
`;
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const monitor = new PerformanceMonitor({
    baseURL: process.env.MONITOR_URL || 'http://localhost:4000',
    interval: process.argv.includes('--fast') ? 2000 : 5000
  });
  
  const duration = process.argv.includes('--quick') ? 30000 : 60000;
  
  try {
    await monitor.initialize();
    await monitor.startMonitoring(duration);
  } catch (error) {
    console.error('❌ Performance monitoring failed:', error.message);
    process.exit(1);
  }
}

export default PerformanceMonitor;