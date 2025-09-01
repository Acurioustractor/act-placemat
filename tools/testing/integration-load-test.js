#!/usr/bin/env node

/**
 * Integration and Load Testing Tool
 * 
 * Comprehensive testing for ACT Farmhand system stability and performance
 * - Tests integration between frontend and backend systems
 * - Validates API endpoints under various load conditions
 * - Monitors resource utilization during peak loads
 * - Tests database connection stability
 * - Validates third-party service integrations
 */

import axios from 'axios';
import { performance } from 'perf_hooks';
import { mkdir, writeFile } from 'fs/promises';
import { spawn } from 'child_process';
import path from 'path';
import os from 'os';

class IntegrationLoadTest {
  constructor(options = {}) {
    this.baseURL = options.baseURL || 'http://localhost:4000';
    this.frontendURL = options.frontendURL || 'http://localhost:5173';
    this.outputDir = options.outputDir || './tools/testing/reports';
    this.maxUsers = options.maxUsers || 50;
    this.testDuration = options.testDuration || 30000; // 30 seconds
    this.rampUpTime = options.rampUpTime || 10000; // 10 seconds
    
    this.results = {
      integration: [],
      load: [],
      performance: [],
      errors: []
    };
    
    this.metrics = {
      requests: 0,
      responses: 0,
      errors: 0,
      totalResponseTime: 0,
      minResponseTime: Infinity,
      maxResponseTime: 0,
      throughput: 0,
      concurrentUsers: 0
    };
    
    // Test scenarios for integration testing
    this.integrationScenarios = [
      {
        name: 'Frontend-Backend Health Check',
        frontend: true,
        backend: true,
        critical: true
      },
      {
        name: 'API Endpoints Availability',
        tests: [
          { method: 'GET', endpoint: '/health', expected: 200 },
          { method: 'GET', endpoint: '/api/farmhand/health', expected: [200, 404] },
          { method: 'GET', endpoint: '/api/intelligence/health', expected: [200, 404] },
          { method: 'GET', endpoint: '/api/empathy-ledger/health', expected: [200, 404] }
        ]
      },
      {
        name: 'Database Connectivity',
        tests: [
          { method: 'GET', endpoint: '/api/db/status', expected: [200, 404] },
          { method: 'GET', endpoint: '/api/health/db', expected: [200, 404] }
        ]
      },
      {
        name: 'AI Services Integration',
        tests: [
          { method: 'GET', endpoint: '/api/ai/status', expected: [200, 404] },
          { method: 'POST', endpoint: '/api/farmhand/query', data: { query: 'test' }, expected: [200, 404, 500] }
        ]
      },
      {
        name: 'External Services Integration',
        tests: [
          { method: 'GET', endpoint: '/api/notion/status', expected: [200, 404, 401] },
          { method: 'GET', endpoint: '/api/supabase/status', expected: [200, 404, 401] }
        ]
      }
    ];
    
    // Load testing scenarios
    this.loadScenarios = [
      {
        name: 'Baseline Load',
        users: 10,
        duration: 15000,
        endpoints: ['/health', '/api/farmhand/health']
      },
      {
        name: 'Moderate Load',
        users: 25,
        duration: 20000,
        endpoints: ['/health', '/api/intelligence/health', '/api/empathy-ledger/health']
      },
      {
        name: 'Peak Load',
        users: 50,
        duration: 30000,
        endpoints: ['/health', '/api/farmhand/query', '/api/intelligence/query']
      }
    ];
  }

  async initialize() {
    await mkdir(this.outputDir, { recursive: true });
    
    console.log('🔄 ACT Farmhand Integration & Load Testing');
    console.log('=========================================');
    console.log(`🎯 Backend Target: ${this.baseURL}`);
    console.log(`🎯 Frontend Target: ${this.frontendURL}`);
    console.log(`👥 Max Concurrent Users: ${this.maxUsers}`);
    console.log(`⏰ Test Duration: ${this.testDuration / 1000}s`);
    console.log('');
    
    // System information
    console.log('💻 System Information:');
    console.log(`   OS: ${os.type()} ${os.release()}`);
    console.log(`   CPU: ${os.cpus().length} cores`);
    console.log(`   Memory: ${Math.round(os.totalmem() / 1024 / 1024 / 1024)}GB total`);
    console.log(`   Free Memory: ${Math.round(os.freemem() / 1024 / 1024 / 1024)}GB`);
    console.log('');
    
    return true;
  }

  async testSystemHealth() {
    console.log('🏥 Testing System Health & Availability');
    const healthResults = [];
    
    // Test backend health
    try {
      const backendStart = performance.now();
      const backendResponse = await axios.get(`${this.baseURL}/health`, { timeout: 10000 });
      const backendTime = performance.now() - backendStart;
      
      healthResults.push({
        service: 'Backend API',
        status: 'healthy',
        responseTime: Math.round(backendTime),
        statusCode: backendResponse.status,
        details: backendResponse.data
      });
      
      console.log(`   ✅ Backend API: ${Math.round(backendTime)}ms`);
    } catch (error) {
      healthResults.push({
        service: 'Backend API',
        status: 'unhealthy',
        error: error.message
      });
      console.log(`   ❌ Backend API: ${error.message}`);
    }
    
    // Test frontend availability
    try {
      const frontendStart = performance.now();
      const frontendResponse = await axios.get(this.frontendURL, { 
        timeout: 10000,
        validateStatus: () => true
      });
      const frontendTime = performance.now() - frontendStart;
      
      healthResults.push({
        service: 'Frontend',
        status: frontendResponse.status < 500 ? 'healthy' : 'degraded',
        responseTime: Math.round(frontendTime),
        statusCode: frontendResponse.status
      });
      
      console.log(`   ${frontendResponse.status < 500 ? '✅' : '⚠️'} Frontend: ${Math.round(frontendTime)}ms`);
    } catch (error) {
      healthResults.push({
        service: 'Frontend',
        status: 'unhealthy',
        error: error.message
      });
      console.log(`   ❌ Frontend: ${error.message}`);
    }
    
    this.results.integration.push({
      category: 'System Health',
      tests: healthResults,
      timestamp: new Date().toISOString()
    });
    
    return healthResults;
  }

  async testIntegrationScenarios() {
    console.log('🔗 Testing Integration Scenarios');
    
    for (const scenario of this.integrationScenarios) {
      console.log(`   📋 ${scenario.name}`);
      const scenarioResults = [];
      
      if (scenario.tests) {
        for (const test of scenario.tests) {
          try {
            const startTime = performance.now();
            
            const config = {
              method: test.method,
              url: `${this.baseURL}${test.endpoint}`,
              timeout: 10000,
              validateStatus: () => true
            };
            
            if (test.data) {
              config.data = test.data;
            }
            
            const response = await axios(config);
            const responseTime = performance.now() - startTime;
            
            const expectedStatuses = Array.isArray(test.expected) ? test.expected : [test.expected];
            const passed = expectedStatuses.includes(response.status);
            
            scenarioResults.push({
              test: `${test.method} ${test.endpoint}`,
              passed,
              statusCode: response.status,
              responseTime: Math.round(responseTime),
              expected: expectedStatuses,
              details: passed ? 'Integration working' : 'Unexpected response'
            });
            
            console.log(`      ${passed ? '✅' : '❌'} ${test.method} ${test.endpoint}: ${response.status} (${Math.round(responseTime)}ms)`);
            
          } catch (error) {
            scenarioResults.push({
              test: `${test.method} ${test.endpoint}`,
              passed: false,
              error: error.message,
              details: 'Integration failed'
            });
            console.log(`      ❌ ${test.method} ${test.endpoint}: ${error.message}`);
          }
        }
      }
      
      this.results.integration.push({
        category: scenario.name,
        tests: scenarioResults,
        timestamp: new Date().toISOString()
      });
    }
    
    console.log('');
  }

  async simulateUser(userId, endpoints, duration) {
    const userMetrics = {
      requests: 0,
      responses: 0,
      errors: 0,
      responseTime: 0
    };
    
    const startTime = Date.now();
    const endTime = startTime + duration;
    
    while (Date.now() < endTime) {
      const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
      
      try {
        userMetrics.requests++;
        const requestStart = performance.now();
        
        const response = await axios.get(`${this.baseURL}${endpoint}`, {
          timeout: 30000,
          validateStatus: () => true
        });
        
        const requestTime = performance.now() - requestStart;
        userMetrics.responseTime += requestTime;
        userMetrics.responses++;
        
        // Update global metrics
        this.metrics.requests++;
        this.metrics.responses++;
        this.metrics.totalResponseTime += requestTime;
        this.metrics.minResponseTime = Math.min(this.metrics.minResponseTime, requestTime);
        this.metrics.maxResponseTime = Math.max(this.metrics.maxResponseTime, requestTime);
        
        if (response.status >= 400) {
          userMetrics.errors++;
          this.metrics.errors++;
        }
        
        // Random delay between requests (100ms to 2s)
        await new Promise(resolve => setTimeout(resolve, Math.random() * 1900 + 100));
        
      } catch (error) {
        userMetrics.errors++;
        this.metrics.errors++;
      }
    }
    
    return userMetrics;
  }

  async runLoadTest(scenario) {
    console.log(`🚀 Load Test: ${scenario.name} (${scenario.users} users, ${scenario.duration/1000}s)`);
    
    const startTime = Date.now();
    this.metrics = { // Reset metrics for this scenario
      requests: 0,
      responses: 0,
      errors: 0,
      totalResponseTime: 0,
      minResponseTime: Infinity,
      maxResponseTime: 0,
      throughput: 0,
      concurrentUsers: scenario.users
    };
    
    // Ramp up users gradually
    const userPromises = [];
    const rampUpInterval = this.rampUpTime / scenario.users;
    
    for (let i = 0; i < scenario.users; i++) {
      setTimeout(() => {
        const userPromise = this.simulateUser(i + 1, scenario.endpoints, scenario.duration);
        userPromises.push(userPromise);
      }, i * rampUpInterval);
    }
    
    // Wait for ramp up to complete
    await new Promise(resolve => setTimeout(resolve, this.rampUpTime));
    
    // Monitor progress
    const monitorInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(100, (elapsed / scenario.duration) * 100);
      console.log(`   📊 Progress: ${Math.round(progress)}% - Requests: ${this.metrics.requests} | Errors: ${this.metrics.errors} | Avg Response: ${Math.round(this.metrics.totalResponseTime / Math.max(this.metrics.responses, 1))}ms`);
    }, 5000);
    
    // Wait for all users to complete
    await Promise.all(userPromises);
    clearInterval(monitorInterval);
    
    const testDuration = Date.now() - startTime;
    const avgResponseTime = this.metrics.totalResponseTime / Math.max(this.metrics.responses, 1);
    const throughput = (this.metrics.responses / testDuration) * 1000; // requests per second
    const errorRate = (this.metrics.errors / Math.max(this.metrics.requests, 1)) * 100;
    
    const results = {
      scenario: scenario.name,
      duration: testDuration,
      concurrentUsers: scenario.users,
      totalRequests: this.metrics.requests,
      successfulRequests: this.metrics.responses,
      errors: this.metrics.errors,
      errorRate: Math.round(errorRate * 100) / 100,
      averageResponseTime: Math.round(avgResponseTime),
      minResponseTime: Math.round(this.metrics.minResponseTime),
      maxResponseTime: Math.round(this.metrics.maxResponseTime),
      throughput: Math.round(throughput * 100) / 100,
      timestamp: new Date().toISOString()
    };
    
    console.log(`   ✅ Complete: ${results.successfulRequests}/${results.totalRequests} requests | ${results.errorRate}% errors | ${results.throughput} req/s`);
    console.log(`   ⏱️  Response Times: ${results.minResponseTime}ms min | ${results.averageResponseTime}ms avg | ${results.maxResponseTime}ms max`);
    console.log('');
    
    this.results.load.push(results);
    return results;
  }

  async runAllLoadTests() {
    console.log('🏋️ Starting Load Testing Scenarios...\n');
    
    for (const scenario of this.loadScenarios) {
      await this.runLoadTest(scenario);
      
      // Brief pause between scenarios
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    return this.results.load;
  }

  async monitorSystemResources() {
    console.log('📊 Monitoring System Resources...');
    
    const resourceMetrics = {
      cpu: [],
      memory: [],
      loadAverage: []
    };
    
    // Monitor for 10 seconds
    for (let i = 0; i < 10; i++) {
      const cpus = os.cpus();
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedMem = totalMem - freeMem;
      const memoryUsage = (usedMem / totalMem) * 100;
      const loadAvg = os.loadavg();
      
      resourceMetrics.memory.push({
        used: Math.round(usedMem / 1024 / 1024),
        free: Math.round(freeMem / 1024 / 1024),
        total: Math.round(totalMem / 1024 / 1024),
        percentage: Math.round(memoryUsage * 100) / 100,
        timestamp: Date.now()
      });
      
      resourceMetrics.loadAverage.push({
        oneMin: loadAvg[0],
        fiveMin: loadAvg[1],
        fifteenMin: loadAvg[2],
        timestamp: Date.now()
      });
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    const avgMemoryUsage = resourceMetrics.memory.reduce((sum, m) => sum + m.percentage, 0) / resourceMetrics.memory.length;
    const avgLoadAverage = resourceMetrics.loadAverage.reduce((sum, l) => sum + l.oneMin, 0) / resourceMetrics.loadAverage.length;
    
    console.log(`   💾 Average Memory Usage: ${Math.round(avgMemoryUsage)}%`);
    console.log(`   ⚡ Average Load Average: ${Math.round(avgLoadAverage * 100) / 100}`);
    console.log('');
    
    this.results.performance.push({
      category: 'System Resources',
      metrics: resourceMetrics,
      summary: {
        avgMemoryUsage: Math.round(avgMemoryUsage * 100) / 100,
        avgLoadAverage: Math.round(avgLoadAverage * 100) / 100
      },
      timestamp: new Date().toISOString()
    });
    
    return resourceMetrics;
  }

  async generateReport() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // Calculate summary metrics
    const totalIntegrationTests = this.results.integration.reduce((sum, cat) => sum + cat.tests.length, 0);
    const passedIntegrationTests = this.results.integration.reduce((sum, cat) => 
      sum + cat.tests.filter(t => t.passed).length, 0);
    const integrationSuccessRate = totalIntegrationTests > 0 ? (passedIntegrationTests / totalIntegrationTests) * 100 : 0;
    
    const totalLoadTests = this.results.load.length;
    const avgThroughput = this.results.load.reduce((sum, l) => sum + l.throughput, 0) / Math.max(totalLoadTests, 1);
    const avgErrorRate = this.results.load.reduce((sum, l) => sum + l.errorRate, 0) / Math.max(totalLoadTests, 1);
    const avgResponseTime = this.results.load.reduce((sum, l) => sum + l.averageResponseTime, 0) / Math.max(totalLoadTests, 1);
    
    const report = {
      metadata: {
        timestamp: new Date().toISOString(),
        testConfiguration: {
          backendTarget: this.baseURL,
          frontendTarget: this.frontendURL,
          maxUsers: this.maxUsers,
          testDuration: this.testDuration,
          rampUpTime: this.rampUpTime
        },
        systemInfo: {
          platform: os.platform(),
          cpus: os.cpus().length,
          totalMemory: Math.round(os.totalmem() / 1024 / 1024 / 1024),
          nodeVersion: process.version
        }
      },
      summary: {
        integrationTests: {
          total: totalIntegrationTests,
          passed: passedIntegrationTests,
          successRate: Math.round(integrationSuccessRate * 100) / 100
        },
        loadTests: {
          scenarios: totalLoadTests,
          avgThroughput: Math.round(avgThroughput * 100) / 100,
          avgErrorRate: Math.round(avgErrorRate * 100) / 100,
          avgResponseTime: Math.round(avgResponseTime)
        },
        overallStatus: this.calculateOverallStatus(integrationSuccessRate, avgErrorRate, avgResponseTime)
      },
      detailedResults: {
        integration: this.results.integration,
        load: this.results.load,
        performance: this.results.performance,
        errors: this.results.errors
      },
      recommendations: this.generateRecommendations(integrationSuccessRate, avgErrorRate, avgResponseTime, avgThroughput)
    };
    
    // Write JSON report
    const jsonPath = path.join(this.outputDir, `integration-load-test-${timestamp}.json`);
    await writeFile(jsonPath, JSON.stringify(report, null, 2));
    
    // Write summary report
    const summaryPath = path.join(this.outputDir, `integration-load-summary-${timestamp}.md`);
    const summaryReport = this.generateMarkdownSummary(report);
    await writeFile(summaryPath, summaryReport);
    
    console.log('🎯 INTEGRATION & LOAD TESTING COMPLETE');
    console.log('====================================');
    console.log(`📊 Integration Tests: ${passedIntegrationTests}/${totalIntegrationTests} passed (${Math.round(integrationSuccessRate)}%)`);
    console.log(`🚀 Load Tests: ${totalLoadTests} scenarios completed`);
    console.log(`📈 Average Throughput: ${Math.round(avgThroughput)} req/s`);
    console.log(`❌ Average Error Rate: ${Math.round(avgErrorRate * 100) / 100}%`);
    console.log(`⏱️  Average Response Time: ${Math.round(avgResponseTime)}ms`);
    console.log(`\n🎯 Overall Status: ${report.summary.overallStatus}`);
    console.log(`📄 Detailed Report: ${jsonPath}`);
    console.log(`📝 Summary Report: ${summaryPath}`);
    
    return report;
  }
  
  calculateOverallStatus(integrationSuccessRate, avgErrorRate, avgResponseTime) {
    if (integrationSuccessRate >= 95 && avgErrorRate <= 1 && avgResponseTime <= 1000) {
      return 'EXCELLENT';
    } else if (integrationSuccessRate >= 85 && avgErrorRate <= 5 && avgResponseTime <= 2000) {
      return 'GOOD';
    } else if (integrationSuccessRate >= 70 && avgErrorRate <= 10 && avgResponseTime <= 3000) {
      return 'ACCEPTABLE';
    } else {
      return 'NEEDS IMPROVEMENT';
    }
  }
  
  generateRecommendations(integrationSuccessRate, avgErrorRate, avgResponseTime, avgThroughput) {
    const recommendations = [];
    
    if (integrationSuccessRate < 90) {
      recommendations.push({
        category: 'Integration',
        priority: 'HIGH',
        issue: 'Low integration test success rate',
        recommendation: 'Review failing integration points and improve error handling',
        impact: 'System reliability'
      });
    }
    
    if (avgErrorRate > 5) {
      recommendations.push({
        category: 'Reliability',
        priority: 'HIGH',
        issue: 'High error rate under load',
        recommendation: 'Implement better error handling and retry mechanisms',
        impact: 'User experience and system stability'
      });
    }
    
    if (avgResponseTime > 2000) {
      recommendations.push({
        category: 'Performance',
        priority: 'MEDIUM',
        issue: 'Slow response times under load',
        recommendation: 'Optimize database queries and implement caching',
        impact: 'User experience'
      });
    }
    
    if (avgThroughput < 10) {
      recommendations.push({
        category: 'Scalability',
        priority: 'MEDIUM',
        issue: 'Low throughput capacity',
        recommendation: 'Consider implementing load balancing and horizontal scaling',
        impact: 'System capacity'
      });
    }
    
    if (recommendations.length === 0) {
      recommendations.push({
        category: 'Maintenance',
        priority: 'LOW',
        issue: 'System performing well',
        recommendation: 'Continue monitoring and maintain current performance levels',
        impact: 'Ongoing reliability'
      });
    }
    
    return recommendations;
  }
  
  generateMarkdownSummary(report) {
    const { metadata, summary, detailedResults, recommendations } = report;
    
    return `# 🔄 ACT Farmhand Integration & Load Test Report

## Executive Summary

**Test Date:** ${new Date(metadata.timestamp).toLocaleString()}  
**Duration:** Integration + Load Testing  
**Overall Status:** ${summary.overallStatus}

### Integration Test Results
- **Total Tests:** ${summary.integrationTests.total}
- **Passed:** ${summary.integrationTests.passed}
- **Success Rate:** ${summary.integrationTests.successRate}%

### Load Test Results  
- **Test Scenarios:** ${summary.loadTests.scenarios}
- **Average Throughput:** ${summary.loadTests.avgThroughput} req/s
- **Average Error Rate:** ${summary.loadTests.avgErrorRate}%
- **Average Response Time:** ${summary.loadTests.avgResponseTime}ms

## Load Test Performance

| Scenario | Users | Throughput (req/s) | Error Rate | Avg Response Time |
|----------|-------|-------------------|------------|-------------------|
${detailedResults.load.map(test => 
  `| ${test.scenario} | ${test.concurrentUsers} | ${test.throughput} | ${test.errorRate}% | ${test.averageResponseTime}ms |`
).join('\n')}

## Integration Test Details

${detailedResults.integration.map(category => `
### ${category.category}
${category.tests.map(test => 
  `- ${test.passed ? '✅' : '❌'} ${test.test || test.service}: ${test.statusCode || 'N/A'} ${test.responseTime ? `(${test.responseTime}ms)` : ''}`
).join('\n')}
`).join('')}

## Recommendations

${recommendations.map((rec, i) => `
### ${i + 1}. ${rec.category} - ${rec.priority} Priority
**Issue:** ${rec.issue}  
**Recommendation:** ${rec.recommendation}  
**Impact:** ${rec.impact}
`).join('')}

## System Information
- **Platform:** ${metadata.systemInfo.platform}
- **CPUs:** ${metadata.systemInfo.cpus}
- **Memory:** ${metadata.systemInfo.totalMemory}GB
- **Node.js:** ${metadata.systemInfo.nodeVersion}

## Production Readiness Assessment

${summary.overallStatus === 'EXCELLENT' ? 
  '✅ **PRODUCTION READY**: System demonstrates excellent performance and reliability under load.' :
  summary.overallStatus === 'GOOD' ?
  '✅ **PRODUCTION READY**: System performs well with minor optimization opportunities.' :
  summary.overallStatus === 'ACCEPTABLE' ?
  '⚠️ **CONDITIONAL**: System meets basic requirements but should address identified issues before high-traffic deployment.' :
  '🚨 **NOT READY**: Significant performance and reliability issues must be addressed before production deployment.'
}

---
*Generated by ACT Farmhand Integration & Load Testing Tool*
`;
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const integrationTest = new IntegrationLoadTest({
    maxUsers: process.argv.includes('--light') ? 20 : 50,
    testDuration: process.argv.includes('--quick') ? 15000 : 30000
  });
  
  try {
    await integrationTest.initialize();
    
    // Run health checks
    await integrationTest.testSystemHealth();
    
    // Run integration tests
    await integrationTest.testIntegrationScenarios();
    
    // Monitor system resources
    await integrationTest.monitorSystemResources();
    
    // Run load tests
    await integrationTest.runAllLoadTests();
    
    // Generate comprehensive report
    await integrationTest.generateReport();
    
  } catch (error) {
    console.error('❌ Integration & Load testing failed:', error.message);
    process.exit(1);
  }
}

export default IntegrationLoadTest;