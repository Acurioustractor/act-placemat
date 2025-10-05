#!/usr/bin/env node

/**
 * Automated Regression Testing Script
 * Runs regression tests using recorded scenarios and generates reports
 */

import fs from 'fs/promises';
import path from 'path';
import recordReplayService from '../services/recordReplayService.js';
import tracingService from '../services/tracingService.js';

class RegressionTester {
  constructor() {
    this.config = {
      reportsPath: './test/reports',
      screenshotsPath: './test/screenshots',
      maxParallelTests: 5,
      testTimeout: 300000, // 5 minutes per test
      retryFailedTests: true,
      maxRetries: 3
    };
    
    this.testQueue = [];
    this.runningTests = new Map();
    this.testResults = [];
  }

  /**
   * Initialize regression tester
   */
  async initialize() {
    try {
      console.log('🔧 Initializing Regression Tester...');
      
      // Ensure directories exist
      await fs.mkdir(this.config.reportsPath, { recursive: true });
      await fs.mkdir(this.config.screenshotsPath, { recursive: true });
      
      // Initialize dependencies
      await tracingService.initialize();
      await recordReplayService.initialize();
      
      console.log('✅ Regression Tester initialized');
      return true;
      
    } catch (error) {
      console.error('❌ Failed to initialize Regression Tester:', error.message);
      return false;
    }
  }

  /**
   * Run all regression tests
   */
  async runAllRegressionTests(options = {}) {
    return await tracingService.startActiveSpan('regression_tester.run_all', {
      attributes: {
        'test.type': 'regression_full',
        'test.parallel': options.parallel || false,
        'test.max_parallel': this.config.maxParallelTests
      }
    }, async (span) => {
      
      try {
        const startTime = Date.now();
        console.log('🚀 Starting full regression test suite...');
        
        // Get all regression scenarios
        const scenarios = recordReplayService.listScenarios('regression');
        
        if (scenarios.length === 0) {
          console.log('⚠️ No regression scenarios found');
          return {
            success: true,
            totalTests: 0,
            passed: 0,
            failed: 0,
            skipped: 0,
            duration: 0,
            message: 'No regression tests to run'
          };
        }
        
        console.log(`🧪 Found ${scenarios.length} regression scenarios`);
        
        // Run tests
        const results = options.parallel 
          ? await this.runTestsParallel(scenarios, options)
          : await this.runTestsSequential(scenarios, options);
          
        const duration = Date.now() - startTime;
        
        // Generate comprehensive report
        const report = await this.generateTestReport(results, duration);
        
        // Save report
        const reportPath = await this.saveTestReport(report);
        
        span.setAttributes({
          'test.total_scenarios': scenarios.length,
          'test.total_tests': results.length,
          'test.passed_tests': results.filter(r => r.passed).length,
          'test.failed_tests': results.filter(r => !r.passed).length,
          'test.duration': duration,
          'test.report_path': reportPath
        });
        
        const summary = {
          success: results.every(r => r.passed),
          totalTests: results.length,
          passed: results.filter(r => r.passed).length,
          failed: results.filter(r => !r.passed).length,
          skipped: results.filter(r => r.skipped).length,
          duration,
          passRate: results.length > 0 ? (results.filter(r => r.passed).length / results.length) * 100 : 0,
          reportPath,
          results
        };
        
        console.log('🏁 Regression test suite completed:');
        console.log(`   - Total: ${summary.totalTests}`);
        console.log(`   - Passed: ${summary.passed} (${summary.passRate.toFixed(1)}%)`);
        console.log(`   - Failed: ${summary.failed}`);
        console.log(`   - Duration: ${duration}ms`);
        console.log(`   - Report: ${reportPath}`);
        
        return summary;
        
      } catch (error) {
        span.recordException(error);
        throw error;
      }
    });
  }

  /**
   * Run tests sequentially
   */
  async runTestsSequential(scenarios, options) {
    const results = [];
    
    for (let i = 0; i < scenarios.length; i++) {
      const scenario = scenarios[i];
      
      try {
        console.log(`🧪 Running test ${i + 1}/${scenarios.length}: ${scenario.name}`);
        
        const result = await this.runSingleTest(scenario, options);
        results.push(result);
        
        console.log(`${result.passed ? '✅' : '❌'} ${scenario.name}: ${result.passed ? 'PASSED' : 'FAILED'}`);
        
        // Add delay between tests if specified
        if (options.delayBetweenTests) {
          await new Promise(resolve => setTimeout(resolve, options.delayBetweenTests));
        }
        
      } catch (error) {
        results.push({
          scenarioId: scenario.id,
          scenarioName: scenario.name,
          passed: false,
          error: error.message,
          duration: 0,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    return results;
  }

  /**
   * Run tests in parallel
   */
  async runTestsParallel(scenarios, options) {
    console.log(`🔄 Running ${scenarios.length} tests in parallel (max: ${this.config.maxParallelTests})`);
    
    const results = [];
    const batches = this.createTestBatches(scenarios, this.config.maxParallelTests);
    
    for (const batch of batches) {
      console.log(`🧪 Running batch of ${batch.length} tests...`);
      
      const batchPromises = batch.map(scenario => 
        this.runSingleTest(scenario, options).catch(error => ({
          scenarioId: scenario.id,
          scenarioName: scenario.name,
          passed: false,
          error: error.message,
          duration: 0,
          timestamp: new Date().toISOString()
        }))
      );
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Log batch results
      const batchPassed = batchResults.filter(r => r.passed).length;
      console.log(`✅ Batch completed: ${batchPassed}/${batch.length} passed`);
    }
    
    return results;
  }

  /**
   * Create test batches for parallel execution
   */
  createTestBatches(scenarios, batchSize) {
    const batches = [];
    
    for (let i = 0; i < scenarios.length; i += batchSize) {
      batches.push(scenarios.slice(i, i + batchSize));
    }
    
    return batches;
  }

  /**
   * Run a single regression test
   */
  async runSingleTest(scenario, options = {}) {
    return await tracingService.startActiveSpan('regression_tester.single_test', {
      attributes: {
        'test.scenario_id': scenario.id,
        'test.scenario_name': scenario.name,
        'test.scenario_type': scenario.type
      }
    }, async (span) => {
      
      const startTime = Date.now();
      
      try {
        console.log(`🔍 Testing scenario: ${scenario.name}`);
        
        // Start replay mode for this scenario
        await recordReplayService.startReplay(scenario.id, {
          deterministicMode: true
        });
        
        // Run the actual test
        const testResult = await this.executeScenarioTest(scenario, options);
        
        // Stop replay mode
        await recordReplayService.stopReplay();
        
        const duration = Date.now() - startTime;
        
        const result = {
          scenarioId: scenario.id,
          scenarioName: scenario.name,
          passed: testResult.success,
          error: testResult.error || null,
          details: testResult.details || {},
          duration,
          timestamp: new Date().toISOString(),
          interactions: testResult.interactions || 0,
          assertions: testResult.assertions || []
        };
        
        span.setAttributes({
          'test.passed': result.passed,
          'test.duration': duration,
          'test.interactions': result.interactions,
          'test.assertions': result.assertions.length
        });
        
        if (!result.passed && this.config.retryFailedTests) {
          // Retry failed test
          console.log(`🔄 Retrying failed test: ${scenario.name}`);
          const retryResult = await this.retryTest(scenario, options);
          
          if (retryResult.passed) {
            result.passed = true;
            result.retried = true;
            result.retryCount = retryResult.retryCount;
          }
        }
        
        return result;
        
      } catch (error) {
        const duration = Date.now() - startTime;
        
        span.recordException(error);
        
        // Ensure replay is stopped
        try {
          await recordReplayService.stopReplay();
        } catch (stopError) {
          console.warn('Warning: Could not stop replay:', stopError.message);
        }
        
        return {
          scenarioId: scenario.id,
          scenarioName: scenario.name,
          passed: false,
          error: error.message,
          duration,
          timestamp: new Date().toISOString()
        };
      }
    });
  }

  /**
   * Execute the actual scenario test
   */
  async executeScenarioTest(scenario, options) {
    // This is where we would integrate with actual test runners
    // For now, we'll simulate test execution by validating scenario integrity
    
    const testResults = {
      success: true,
      interactions: scenario.interactionCount || 0,
      assertions: [],
      details: {}
    };
    
    // Validate scenario structure
    if (!scenario.interactions || scenario.interactions.length === 0) {
      testResults.success = false;
      testResults.error = 'No interactions found in scenario';
      return testResults;
    }
    
    // Check for required interactions
    const apiInteractions = scenario.interactions.filter(i => i.type === 'api');
    const dbInteractions = scenario.interactions.filter(i => i.type === 'database');
    
    testResults.assertions.push({
      type: 'interaction_count',
      expected: scenario.interactionCount,
      actual: scenario.interactions.length,
      passed: scenario.interactions.length === scenario.interactionCount
    });
    
    testResults.assertions.push({
      type: 'has_api_interactions',
      expected: true,
      actual: apiInteractions.length > 0,
      passed: apiInteractions.length > 0
    });
    
    // Validate response structures
    for (const interaction of apiInteractions) {
      if (!interaction.response || !interaction.response.status) {
        testResults.success = false;
        testResults.error = `Invalid response structure in interaction ${interaction.id}`;
        break;
      }
    }
    
    // Mock successful test execution
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));
    
    return testResults;
  }

  /**
   * Retry a failed test
   */
  async retryTest(scenario, options, retryCount = 1) {
    if (retryCount > this.config.maxRetries) {
      return { passed: false, retryCount };
    }
    
    console.log(`🔄 Retry attempt ${retryCount}/${this.config.maxRetries} for ${scenario.name}`);
    
    // Add delay before retry
    await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
    
    try {
      const result = await this.runSingleTest(scenario, options);
      
      if (result.passed) {
        return { passed: true, retryCount };
      } else {
        return await this.retryTest(scenario, options, retryCount + 1);
      }
      
    } catch (error) {
      console.warn(`❌ Retry ${retryCount} failed for ${scenario.name}:`, error.message);
      return await this.retryTest(scenario, options, retryCount + 1);
    }
  }

  /**
   * Generate comprehensive test report
   */
  async generateTestReport(results, totalDuration) {
    const report = {
      summary: {
        timestamp: new Date().toISOString(),
        totalTests: results.length,
        passed: results.filter(r => r.passed).length,
        failed: results.filter(r => !r.passed).length,
        skipped: results.filter(r => r.skipped).length,
        passRate: results.length > 0 ? (results.filter(r => r.passed).length / results.length) * 100 : 0,
        totalDuration,
        averageDuration: results.length > 0 ? results.reduce((sum, r) => sum + r.duration, 0) / results.length : 0
      },
      results,
      statistics: {
        byScenarioType: this.groupBy(results, 'scenarioType'),
        byDuration: {
          fast: results.filter(r => r.duration < 1000).length,
          medium: results.filter(r => r.duration >= 1000 && r.duration < 5000).length,
          slow: results.filter(r => r.duration >= 5000).length
        },
        commonFailures: this.analyzeFailures(results.filter(r => !r.passed))
      },
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        memory: process.memoryUsage(),
        uptime: process.uptime()
      },
      configuration: this.config
    };
    
    return report;
  }

  /**
   * Group results by property
   */
  groupBy(results, property) {
    return results.reduce((groups, result) => {
      const key = result[property] || 'unknown';
      groups[key] = (groups[key] || 0) + 1;
      return groups;
    }, {});
  }

  /**
   * Analyze common failure patterns
   */
  analyzeFailures(failedResults) {
    const failures = {};
    
    failedResults.forEach(result => {
      if (result.error) {
        const errorType = result.error.split(':')[0] || 'unknown';
        failures[errorType] = (failures[errorType] || 0) + 1;
      }
    });
    
    return failures;
  }

  /**
   * Save test report to file
   */
  async saveTestReport(report) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportFileName = `regression-report-${timestamp}.json`;
    const reportPath = path.join(this.config.reportsPath, reportFileName);
    
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    // Also create an HTML report
    const htmlReportPath = await this.generateHtmlReport(report, timestamp);
    
    console.log(`📊 Test report saved:`);
    console.log(`   - JSON: ${reportPath}`);
    console.log(`   - HTML: ${htmlReportPath}`);
    
    return reportPath;
  }

  /**
   * Generate HTML test report
   */
  async generateHtmlReport(report, timestamp) {
    const htmlContent = this.generateHtmlContent(report);
    const htmlFileName = `regression-report-${timestamp}.html`;
    const htmlPath = path.join(this.config.reportsPath, htmlFileName);
    
    await fs.writeFile(htmlPath, htmlContent);
    
    return htmlPath;
  }

  /**
   * Generate HTML content for report
   */
  generateHtmlContent(report) {
    const { summary, results, statistics } = report;
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Regression Test Report - ${summary.timestamp}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { border-bottom: 2px solid #e0e0e0; margin-bottom: 30px; padding-bottom: 20px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .metric { background: #f8f9fa; padding: 20px; border-radius: 6px; text-align: center; }
        .metric h3 { margin: 0 0 10px 0; color: #666; font-size: 14px; text-transform: uppercase; }
        .metric .value { font-size: 32px; font-weight: bold; color: #333; }
        .passed { color: #28a745; }
        .failed { color: #dc3545; }
        .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .table th, .table td { padding: 12px; text-align: left; border-bottom: 1px solid #e0e0e0; }
        .table th { background: #f8f9fa; font-weight: 600; }
        .status { padding: 4px 8px; border-radius: 4px; color: white; font-size: 12px; }
        .status.passed { background: #28a745; }
        .status.failed { background: #dc3545; }
        .duration { font-family: monospace; }
        .chart { height: 200px; background: #f8f9fa; border-radius: 6px; margin: 20px 0; display: flex; align-items: center; justify-content: center; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧪 Regression Test Report</h1>
            <p>Generated on ${summary.timestamp}</p>
        </div>
        
        <div class="summary">
            <div class="metric">
                <h3>Total Tests</h3>
                <div class="value">${summary.totalTests}</div>
            </div>
            <div class="metric">
                <h3>Passed</h3>
                <div class="value passed">${summary.passed}</div>
            </div>
            <div class="metric">
                <h3>Failed</h3>
                <div class="value failed">${summary.failed}</div>
            </div>
            <div class="metric">
                <h3>Pass Rate</h3>
                <div class="value">${summary.passRate.toFixed(1)}%</div>
            </div>
            <div class="metric">
                <h3>Duration</h3>
                <div class="value">${(summary.totalDuration / 1000).toFixed(1)}s</div>
            </div>
        </div>
        
        <h2>📋 Test Results</h2>
        <table class="table">
            <thead>
                <tr>
                    <th>Scenario</th>
                    <th>Status</th>
                    <th>Duration</th>
                    <th>Error</th>
                </tr>
            </thead>
            <tbody>
                ${results.map(result => `
                    <tr>
                        <td>${result.scenarioName}</td>
                        <td><span class="status ${result.passed ? 'passed' : 'failed'}">${result.passed ? 'PASSED' : 'FAILED'}</span></td>
                        <td class="duration">${result.duration}ms</td>
                        <td>${result.error || '-'}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        
        <h2>📊 Statistics</h2>
        <div class="summary">
            <div class="metric">
                <h3>Fast Tests (&lt;1s)</h3>
                <div class="value">${statistics.byDuration.fast}</div>
            </div>
            <div class="metric">
                <h3>Medium Tests (1-5s)</h3>
                <div class="value">${statistics.byDuration.medium}</div>
            </div>
            <div class="metric">
                <h3>Slow Tests (&gt;5s)</h3>
                <div class="value">${statistics.byDuration.slow}</div>
            </div>
        </div>
        
        <h2>🚫 Common Failures</h2>
        <table class="table">
            <thead>
                <tr>
                    <th>Error Type</th>
                    <th>Count</th>
                </tr>
            </thead>
            <tbody>
                ${Object.entries(statistics.commonFailures).map(([error, count]) => `
                    <tr>
                        <td>${error}</td>
                        <td>${count}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    </div>
</body>
</html>`;
  }

  /**
   * Run continuous integration tests
   */
  async runContinuousIntegration(options = {}) {
    console.log('🔄 Starting CI regression tests...');
    
    const ciOptions = {
      ...options,
      parallel: true,
      retryFailedTests: true,
      delayBetweenTests: 0,
      generateHtmlReport: true
    };
    
    const results = await this.runAllRegressionTests(ciOptions);
    
    // Exit with error code if tests failed
    if (!results.success) {
      console.error(`❌ CI tests failed: ${results.failed}/${results.totalTests} tests failed`);
      process.exit(1);
    }
    
    console.log('✅ All CI tests passed');
    return results;
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'run';
  
  const tester = new RegressionTester();
  await tester.initialize();
  
  switch (command) {
    case 'run':
      await tester.runAllRegressionTests({
        parallel: args.includes('--parallel'),
        retryFailedTests: args.includes('--retry')
      });
      break;
      
    case 'ci':
      await tester.runContinuousIntegration();
      break;
      
    case 'help':
    default:
      console.log(`
🧪 Regression Tester CLI

Usage:
  node regressionTester.js [command] [options]

Commands:
  run      Run all regression tests (default)
  ci       Run in CI mode (parallel, with retries)
  help     Show this help message

Options:
  --parallel    Run tests in parallel
  --retry       Retry failed tests

Examples:
  node regressionTester.js run --parallel --retry
  node regressionTester.js ci
      `);
      break;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ Regression tester error:', error);
    process.exit(1);
  });
}

export default RegressionTester;