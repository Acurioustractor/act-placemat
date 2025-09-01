#!/usr/bin/env node

/**
 * AI Workload Performance Benchmarking Tool
 * 
 * Comprehensive benchmarking for ACT Farmhand AI-powered features
 * - Tests AI response times and resource usage
 * - Measures concurrent request handling
 * - Profiles memory and CPU usage during AI operations
 * - Validates scalability for community dashboard loads
 */

import axios from 'axios';
import { performance } from 'perf_hooks';
import { createWriteStream } from 'fs';
import { mkdir } from 'fs/promises';
import path from 'path';

class AIPerformanceBenchmark {
  constructor(options = {}) {
    this.baseURL = options.baseURL || 'http://localhost:4000';
    this.iterations = options.iterations || 10;
    this.concurrentUsers = options.concurrentUsers || 5;
    this.results = [];
    this.outputDir = options.outputDir || './tools/testing/reports';
    
    // AI workload test scenarios
    this.testScenarios = [
      {
        name: 'Simple AI Query',
        endpoint: '/api/farmhand/query',
        method: 'POST',
        payload: { query: 'What are the current project opportunities in Melbourne?' },
        expectedResponseTime: 3000, // 3 seconds
        weight: 'light'
      },
      {
        name: 'Complex Intelligence Query',
        endpoint: '/api/intelligence/query',
        method: 'POST', 
        payload: { query: 'Analyze the relationship between community projects and funding outcomes in regional Australia' },
        expectedResponseTime: 8000, // 8 seconds
        weight: 'heavy'
      },
      {
        name: 'Decision Support Analysis',
        endpoint: '/api/ai-decision-support/analyze-decision',
        method: 'POST',
        payload: {
          decision: 'Should we expand to Queensland?',
          context: 'ACT is considering expansion into Queensland markets',
          factors: ['funding', 'community', 'partnerships', 'impact']
        },
        expectedResponseTime: 5000, // 5 seconds
        weight: 'medium'
      },
      {
        name: 'Weekly Intelligence Report',
        endpoint: '/api/farmhand/weekly-sprint',
        method: 'GET',
        payload: null,
        expectedResponseTime: 10000, // 10 seconds
        weight: 'heavy'
      },
      {
        name: 'Content Alignment Check',
        endpoint: '/api/farmhand/alignment-check',
        method: 'POST',
        payload: {
          content: 'We believe in community-led solutions that empower people to create sustainable change in their local areas.',
          context: 'website_copy'
        },
        expectedResponseTime: 2000, // 2 seconds
        weight: 'light'
      }
    ];
  }

  async initialize() {
    // Create output directory
    await mkdir(this.outputDir, { recursive: true });
    
    console.log('🧪 ACT Farmhand AI Performance Benchmark');
    console.log('=========================================');
    console.log(`📊 Testing ${this.testScenarios.length} AI workload scenarios`);
    console.log(`🔄 ${this.iterations} iterations per scenario`);
    console.log(`👥 ${this.concurrentUsers} concurrent users simulation`);
    console.log(`🎯 Target: ${this.baseURL}`);
    console.log('');
    
    // Check if backend is available
    try {
      const health = await axios.get(`${this.baseURL}/health`);
      console.log('✅ Backend health check passed');
      console.log(`📡 Backend version: ${health.data.version}`);
      console.log('');
    } catch (error) {
      console.error('❌ Backend health check failed:', error.message);
      process.exit(1);
    }
  }

  async runSingleRequest(scenario, userIndex = 0) {
    const startTime = performance.now();
    const startMemory = process.memoryUsage();
    
    try {
      const config = {
        method: scenario.method,
        url: `${this.baseURL}${scenario.endpoint}`,
        timeout: scenario.expectedResponseTime * 2, // 2x expected time as timeout
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': `AI-Benchmark/1.0 (User-${userIndex})`
        }
      };
      
      if (scenario.payload) {
        config.data = scenario.payload;
      }
      
      const response = await axios(config);
      const endTime = performance.now();
      const endMemory = process.memoryUsage();
      
      const duration = endTime - startTime;
      const memoryDelta = endMemory.heapUsed - startMemory.heapUsed;
      
      return {
        scenario: scenario.name,
        success: true,
        duration,
        memoryDelta,
        statusCode: response.status,
        responseSize: JSON.stringify(response.data).length,
        withinSLA: duration <= scenario.expectedResponseTime,
        userIndex,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      return {
        scenario: scenario.name,
        success: false,
        duration,
        error: error.message,
        statusCode: error.response?.status || 0,
        withinSLA: false,
        userIndex,
        timestamp: new Date().toISOString()
      };
    }
  }

  async runConcurrentTest(scenario) {
    console.log(`🚀 Testing: ${scenario.name} (${scenario.weight} workload)`);
    console.log(`   Expected response time: ${scenario.expectedResponseTime}ms`);
    
    const promises = [];
    
    // Create concurrent requests
    for (let user = 0; user < this.concurrentUsers; user++) {
      for (let i = 0; i < this.iterations; i++) {
        promises.push(
          this.runSingleRequest(scenario, user).then(result => {
            result.iteration = i;
            return result;
          })
        );
      }
    }
    
    const results = await Promise.all(promises);
    this.results.push(...results);
    
    // Calculate metrics for this scenario
    const successfulResults = results.filter(r => r.success);
    const failedResults = results.filter(r => !r.success);
    const withinSLA = successfulResults.filter(r => r.withinSLA);
    
    const avgDuration = successfulResults.reduce((sum, r) => sum + r.duration, 0) / successfulResults.length || 0;
    const maxDuration = Math.max(...successfulResults.map(r => r.duration), 0);
    const minDuration = Math.min(...successfulResults.map(r => r.duration), Infinity);
    const slaCompliance = (withinSLA.length / results.length) * 100;
    
    console.log(`   📊 Results: ${successfulResults.length}/${results.length} successful`);
    console.log(`   ⏱️  Average: ${Math.round(avgDuration)}ms | Min: ${Math.round(minDuration)}ms | Max: ${Math.round(maxDuration)}ms`);
    console.log(`   🎯 SLA Compliance: ${slaCompliance.toFixed(1)}% (target: ≤${scenario.expectedResponseTime}ms)`);
    
    if (failedResults.length > 0) {
      console.log(`   ❌ Failures: ${failedResults.length}`);
      failedResults.slice(0, 3).forEach(result => {
        console.log(`      - ${result.error}`);
      });
    }
    
    console.log('');
    
    return {
      scenario: scenario.name,
      totalRequests: results.length,
      successful: successfulResults.length,
      failed: failedResults.length,
      avgDuration: Math.round(avgDuration),
      minDuration: Math.round(minDuration),
      maxDuration: Math.round(maxDuration),
      slaCompliance: slaCompliance,
      expectedResponseTime: scenario.expectedResponseTime,
      weight: scenario.weight
    };
  }

  async runBenchmark() {
    console.log('🏃‍♂️ Starting AI workload benchmark...\n');
    
    const scenarioResults = [];
    
    for (const scenario of this.testScenarios) {
      const result = await this.runConcurrentTest(scenario);
      scenarioResults.push(result);
      
      // Brief pause between scenarios to avoid overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    return scenarioResults;
  }

  generateReport(scenarioResults) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(this.outputDir, `ai-benchmark-${timestamp}.json`);
    
    // Calculate overall metrics
    const totalRequests = scenarioResults.reduce((sum, s) => sum + s.totalRequests, 0);
    const totalSuccessful = scenarioResults.reduce((sum, s) => sum + s.successful, 0);
    const totalFailed = scenarioResults.reduce((sum, s) => sum + s.failed, 0);
    const overallSLA = scenarioResults.reduce((sum, s) => sum + s.slaCompliance, 0) / scenarioResults.length;
    
    const report = {
      metadata: {
        timestamp: new Date().toISOString(),
        testConfiguration: {
          iterations: this.iterations,
          concurrentUsers: this.concurrentUsers,
          scenarios: this.testScenarios.length,
          baseURL: this.baseURL
        },
        systemInfo: {
          nodeVersion: process.version,
          platform: process.platform,
          arch: process.arch,
          memory: process.memoryUsage()
        }
      },
      summary: {
        totalRequests,
        successful: totalSuccessful,
        failed: totalFailed,
        successRate: ((totalSuccessful / totalRequests) * 100).toFixed(2),
        overallSLACompliance: overallSLA.toFixed(2)
      },
      scenarioResults,
      rawResults: this.results,
      recommendations: this.generateRecommendations(scenarioResults)
    };
    
    // Write JSON report
    const jsonReport = JSON.stringify(report, null, 2);
    require('fs').writeFileSync(reportPath, jsonReport);
    
    // Write human-readable summary
    const summaryPath = path.join(this.outputDir, `ai-benchmark-summary-${timestamp}.md`);
    const summaryReport = this.generateMarkdownSummary(report);
    require('fs').writeFileSync(summaryPath, summaryReport);
    
    console.log('📋 BENCHMARK COMPLETE');
    console.log('====================');
    console.log(`📊 Total Requests: ${totalRequests}`);
    console.log(`✅ Successful: ${totalSuccessful} (${((totalSuccessful / totalRequests) * 100).toFixed(1)}%)`);
    console.log(`❌ Failed: ${totalFailed} (${((totalFailed / totalRequests) * 100).toFixed(1)}%)`);
    console.log(`🎯 SLA Compliance: ${overallSLA.toFixed(1)}%`);
    console.log('');
    console.log(`📄 Full report: ${reportPath}`);
    console.log(`📝 Summary: ${summaryPath}`);
    
    return report;
  }

  generateRecommendations(scenarioResults) {
    const recommendations = [];
    
    // Check for performance issues
    const poorPerformers = scenarioResults.filter(s => s.slaCompliance < 80);
    if (poorPerformers.length > 0) {
      recommendations.push({
        type: 'performance',
        severity: 'high',
        message: `${poorPerformers.length} AI endpoints are not meeting SLA targets`,
        scenarios: poorPerformers.map(s => s.scenario),
        action: 'Consider optimizing AI model calls, implementing caching, or increasing server resources'
      });
    }
    
    // Check for reliability issues
    const unreliableScenarios = scenarioResults.filter(s => s.failed > 0);
    if (unreliableScenarios.length > 0) {
      recommendations.push({
        type: 'reliability',
        severity: 'medium',
        message: `${unreliableScenarios.length} AI endpoints experienced failures`,
        scenarios: unreliableScenarios.map(s => s.scenario),
        action: 'Implement retry logic and better error handling for AI service calls'
      });
    }
    
    // Check for heavy workloads
    const heavyWorkloads = scenarioResults.filter(s => s.weight === 'heavy' && s.avgDuration > 8000);
    if (heavyWorkloads.length > 0) {
      recommendations.push({
        type: 'scalability',
        severity: 'medium',
        message: 'Heavy AI workloads may impact user experience under high load',
        scenarios: heavyWorkloads.map(s => s.scenario),
        action: 'Consider implementing background job processing for heavy AI operations'
      });
    }
    
    // Positive recommendations
    const goodPerformers = scenarioResults.filter(s => s.slaCompliance >= 95);
    if (goodPerformers.length > 0) {
      recommendations.push({
        type: 'success',
        severity: 'info',
        message: `${goodPerformers.length} AI endpoints are performing excellently`,
        scenarios: goodPerformers.map(s => s.scenario),
        action: 'These endpoints are ready for production deployment'
      });
    }
    
    return recommendations;
  }

  generateMarkdownSummary(report) {
    const { metadata, summary, scenarioResults, recommendations } = report;
    
    return `# 🚜 ACT Farmhand AI Performance Benchmark Report

## 📊 Test Summary

**Test Date:** ${new Date(metadata.timestamp).toLocaleString()}  
**Configuration:** ${metadata.testConfiguration.iterations} iterations × ${metadata.testConfiguration.concurrentUsers} concurrent users  
**Total Scenarios:** ${metadata.testConfiguration.scenarios}

### Overall Results
- **Total Requests:** ${summary.totalRequests}
- **Success Rate:** ${summary.successRate}%
- **SLA Compliance:** ${summary.overallSLACompliance}%

## 🎯 Scenario Performance

| Scenario | Requests | Success Rate | Avg Response | SLA Compliance | Status |
|----------|----------|--------------|--------------|----------------|---------|
${scenarioResults.map(s => {
  const successRate = ((s.successful / s.totalRequests) * 100).toFixed(1);
  const status = s.slaCompliance >= 80 ? '✅' : s.slaCompliance >= 60 ? '⚠️' : '❌';
  return `| ${s.scenario} | ${s.totalRequests} | ${successRate}% | ${s.avgDuration}ms | ${s.slaCompliance.toFixed(1)}% | ${status} |`;
}).join('\n')}

## 🔍 Recommendations

${recommendations.map(rec => `
### ${rec.type.toUpperCase()} - ${rec.severity.toUpperCase()}
**Issue:** ${rec.message}  
**Affected:** ${rec.scenarios.join(', ')}  
**Action:** ${rec.action}
`).join('\n')}

## 🛠️ System Information
- **Node.js:** ${metadata.systemInfo.nodeVersion}
- **Platform:** ${metadata.systemInfo.platform}
- **Architecture:** ${metadata.systemInfo.arch}
- **Memory Usage:** ${Math.round(metadata.systemInfo.memory.heapUsed / 1024 / 1024)}MB

---
*Generated by ACT Farmhand AI Performance Benchmark Tool*
`;
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const benchmark = new AIPerformanceBenchmark({
    iterations: process.argv.includes('--quick') ? 3 : 10,
    concurrentUsers: process.argv.includes('--light') ? 2 : 5,
    baseURL: process.env.BENCHMARK_URL || 'http://localhost:4000'
  });
  
  try {
    await benchmark.initialize();
    const results = await benchmark.runBenchmark();
    benchmark.generateReport(results);
  } catch (error) {
    console.error('❌ Benchmark failed:', error.message);
    process.exit(1);
  }
}

export default AIPerformanceBenchmark;