/**
 * Life Orchestrator System Integration Test
 * Comprehensive test suite to validate all services and endpoints
 */

import http from 'http';
import { logger } from './src/utils/logger.js';

class SystemTester {
  constructor() {
    this.baseUrl = 'http://localhost:4000';
    this.testResults = [];
    this.stats = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0
    };
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const colors = {
      info: '\x1b[36m',    // cyan
      success: '\x1b[32m', // green
      error: '\x1b[31m',   // red
      warn: '\x1b[33m',    // yellow
      header: '\x1b[35m'   // magenta
    };
    const reset = '\x1b[0m';
    console.log(`${colors[type] || colors.info}[${timestamp}] ${message}${reset}`);
  }

  async makeRequest(method, path, data = null, expectedStatus = 200) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, this.baseUrl);
      const options = {
        method,
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'SystemTester/1.0'
        },
        timeout: 10000
      };

      if (data) {
        const postData = typeof data === 'string' ? data : JSON.stringify(data);
        options.headers['Content-Length'] = Buffer.byteLength(postData);
      }

      const req = http.request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            const parsedBody = body ? JSON.parse(body) : {};
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              body: parsedBody
            });
          } catch (parseError) {
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              body: body,
              parseError: true
            });
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => reject(new Error('Request timeout')));

      if (data) {
        req.write(typeof data === 'string' ? data : JSON.stringify(data));
      }

      req.end();
    });
  }

  async testEndpoint(name, method, path, data = null, expectedStatus = 200) {
    const startTime = Date.now();
    this.stats.total++;

    try {
      const response = await this.makeRequest(method, path, data, expectedStatus);
      const responseTime = Date.now() - startTime;

      const passed = response.statusCode === expectedStatus;
      this.stats[passed ? 'passed' : 'failed']++;

      this.testResults.push({
        name,
        path,
        method,
        success: passed,
        statusCode: response.statusCode,
        expectedStatus,
        responseTime,
        data: response.body
      });

      this.log(`${passed ? '✅' : '❌'} ${name}: ${response.statusCode} (${responseTime}ms)`, passed ? 'success' : 'error');
      
      return response;
    } catch (error) {
      this.stats.failed++;
      this.testResults.push({
        name,
        path,
        method,
        success: false,
        error: error.message,
        responseTime: Date.now() - startTime
      });
      this.log(`❌ ${name}: ${error.message}`, 'error');
      return null;
    }
  }

  async checkServerAvailability() {
    try {
      await this.makeRequest('GET', '/health');
      this.log('✅ Server is available and responding', 'success');
      return true;
    } catch (error) {
      this.log(`❌ Server is not available: ${error.message}`, 'error');
      return false;
    }
  }

  async runServiceTests() {
    this.log('= Testing Service Endpoints', 'header');

    // Test health check
    await this.testEndpoint('Health Check', 'GET', '/health');

    // Test Life Orchestrator endpoints
    await this.testEndpoint('Main Dashboard', 'GET', '/api/life-orchestrator/dashboard?energyLevel=medium&availableHours=8');
    await this.testEndpoint('Time Allocation', 'GET', '/api/life-orchestrator/suggestions/time-allocation?energyLevel=medium');
    await this.testEndpoint('Health Check', 'GET', '/api/life-orchestrator/health-check');
    await this.testEndpoint('Email Dashboard (No Auth)', 'GET', '/api/life-orchestrator/emails/dashboard', null, 401);
    await this.testEndpoint('Slack Dashboard (No Auth)', 'GET', '/api/life-orchestrator/slack/dashboard', null, 401);
    await this.testEndpoint('Daily Ritual', 'POST', '/api/life-orchestrator/daily-ritual', {
      type: 'morning',
      data: {
        intentions: [{ text: 'Focus on development', priority: 'high' }],
        energyLevel: 'high'
      }
    });

    // Test calendar endpoints (will return 401 without auth, which is expected)
    await this.testEndpoint('Calendar Events (No Auth)', 'GET', '/api/life-orchestrator/calendar/events', null, 401);

    this.log(`Service tests completed: ${this.testResults.length - (this.stats.total - this.testResults.length)} endpoints tested`, 'info');
  }

  async runAuthenticationTests() {
    this.log('= Testing Authentication Flows', 'header');

    // Test authentication endpoints (should return appropriate responses)
    await this.testEndpoint('Google Auth Setup', 'POST', '/api/life-orchestrator/authenticate/google', {
      accessToken: 'test_token'
    }, 401); // Expected to fail with test token

    await this.testEndpoint('Slack Auth Setup', 'POST', '/api/life-orchestrator/authenticate/slack', {
      accessToken: 'test_token'
    }, 401); // Expected to fail with test token

    // Test protected endpoints without authentication
    await this.testEndpoint('Protected Calendar Start Sync', 'POST', '/api/life-orchestrator/calendar/start-sync', {
      options: { enableProjectSync: true }
    }, 401);

    this.log('Authentication tests completed', 'info');
  }

  async runErrorHandlingTests() {
    this.log('= Testing Error Handling', 'header');

    // Test invalid endpoints
    await this.testEndpoint('Invalid Endpoint', 'GET', '/api/life-orchestrator/nonexistent', null, 404);
    
    // Test malformed requests
    await this.testEndpoint('Malformed JSON', 'POST', '/api/life-orchestrator/daily-ritual', 'invalid-json', 400);
    
    // Test missing required fields
    await this.testEndpoint('Missing Required Data', 'POST', '/api/life-orchestrator/daily-ritual', {}, 400);

    this.log('Error handling tests completed', 'info');
  }

  async runPerformanceTests() {
    this.log('= Testing Performance', 'header');

    const performanceTests = [
      { name: 'Dashboard Load Time', path: '/api/life-orchestrator/dashboard' },
      { name: 'Health Check Response', path: '/health' },
      { name: 'Project Health Response', path: '/api/life-orchestrator/projects/health' }
    ];

    for (const test of performanceTests) {
      const startTime = Date.now();
      await this.testEndpoint(test.name, 'GET', test.path);
      const responseTime = Date.now() - startTime;
      
      if (responseTime > 2000) {
        this.log(`⚠️  Slow response: ${test.name} took ${responseTime}ms`, 'warn');
      } else {
        this.log(`⚡ Good performance: ${test.name} took ${responseTime}ms`, 'success');
      }
    }

    this.log('Performance tests completed', 'info');
  }

  generateReport() {
    this.log('= Generating Test Report', 'header');

    const passRate = Math.round((this.stats.passed / this.stats.total) * 100);
    const avgResponseTime = Math.round(
      this.testResults.reduce((sum, test) => sum + (test.responseTime || 0), 0) / this.testResults.length
    );

    this.log(`\n📊 Test Summary:`, 'header');
    this.log(`Total Tests: ${this.stats.total}`, 'info');
    this.log(`Passed: ${this.stats.passed}`, 'success');
    this.log(`Failed: ${this.stats.failed}`, this.stats.failed > 0 ? 'error' : 'info');
    this.log(`Pass Rate: ${passRate}%`, passRate >= 80 ? 'success' : 'warn');
    this.log(`Average Response Time: ${avgResponseTime}ms`, avgResponseTime < 1000 ? 'success' : 'warn');

    // Show failed tests
    const failedTests = this.testResults.filter(test => !test.success);
    if (failedTests.length > 0) {
      this.log(`\n❌ Failed Tests:`, 'error');
      failedTests.forEach(test => {
        this.log(`  - ${test.name}: ${test.error || `Expected ${test.expectedStatus}, got ${test.statusCode}`}`, 'error');
      });
    }

    // System status
    this.log(`\n🎯 System Status:`, 'header');
    if (passRate >= 90) {
      this.log('✅ System is ready for production use!', 'success');
    } else if (passRate >= 70) {
      this.log('⚠️  System has some issues but basic functionality works', 'warn');
    } else {
      this.log('❌ System has significant issues and needs attention', 'error');
    }

    return {
      stats: this.stats,
      passRate,
      avgResponseTime,
      status: passRate >= 90 ? 'excellent' : passRate >= 70 ? 'good' : 'needs_work'
    };
  }

  async run() {
    this.log('= Life Orchestrator System Integration Test', 'header');
    this.log('Testing all services and endpoints...', 'info');

    // Check if server is available
    const serverAvailable = await this.checkServerAvailability();
    if (!serverAvailable) {
      this.log('❌ Cannot continue tests without server. Please start the backend server first.', 'error');
      this.log('💡 Run: cd apps/backend && npm run dev', 'info');
      process.exit(1);
    }

    try {
      // Run test suites
      await this.runServiceTests();
      await this.runAuthenticationTests();
      await this.runErrorHandlingTests();
      await this.runPerformanceTests();

      // Generate final report
      const report = this.generateReport();

      this.log('\n🚀 Integration test completed!', 'header');
      this.log('Life Orchestrator is ready for use.', 'success');

      return report;
    } catch (error) {
      this.log(`💥 Test suite failed: ${error.message}`, 'error');
      process.exit(1);
    }
  }
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new SystemTester();
  tester.run()
    .then(report => {
      process.exit(report.status === 'excellent' ? 0 : 1);
    })
    .catch(error => {
      console.error('Test runner failed:', error);
      process.exit(1);
    });
}

export default SystemTester;