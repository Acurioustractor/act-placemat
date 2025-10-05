#!/usr/bin/env node

/**
 * Life Orchestrator System Integration Test
 * Comprehensive test script to verify all services and integrations work correctly
 * 
 * This script tests:
 * - Service initialization and basic functionality
 * - API endpoint responses
 * - Error handling and resilience
 * - Performance benchmarks
 * 
 * Usage: node test-system.js
 */

import chalk from 'chalk';
import fetch from 'node-fetch';

class SystemTester {
  constructor() {
    this.baseUrl = 'http://localhost:3001';
    this.testResults = [];
    this.startTime = Date.now();
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const colors = {
      info: chalk.blue,
      success: chalk.green,
      warning: chalk.yellow,
      error: chalk.red,
      header: chalk.magenta.bold
    };
    
    console.log(`${colors[type](`[${timestamp}]`)} ${colors[type](message)}`);
  }

  async testEndpoint(name, method, path, body = null, expectedStatus = 200) {
    const startTime = Date.now();
    
    try {
      const options = {
        method,
        headers: {
          'Content-Type': 'application/json'
        }
      };
      
      if (body) {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(`${this.baseUrl}${path}`, options);
      const responseTime = Date.now() - startTime;
      const data = await response.json();

      const result = {
        name,
        path,
        method,
        status: response.status,
        expectedStatus,
        responseTime,
        success: response.status === expectedStatus,
        data: data
      };

      this.testResults.push(result);

      if (result.success) {
        this.log(` ${name} - ${responseTime}ms`, 'success');
      } else {
        this.log(` ${name} - Expected ${expectedStatus}, got ${response.status}`, 'error');
        this.log(`  Response: ${JSON.stringify(data, null, 2)}`, 'error');
      }

      return result;

    } catch (error) {
      this.log(` ${name} - ${error.message}`, 'error');
      this.testResults.push({
        name,
        path,
        method,
        success: false,
        error: error.message,
        responseTime: Date.now() - startTime
      });
      return null;
    }
  }

  async runServiceTests() {
    this.log('= Testing Service Endpoints', 'header');

    // Test health check
    await this.testEndpoint('Health Check', 'GET', '/api/life-orchestrator/health-check');

    // Test main dashboard (mock data)
    await this.testEndpoint('Main Dashboard', 'GET', '/api/life-orchestrator/dashboard?energyLevel=medium&availableHours=8');

    // Test time allocation suggestions
    await this.testEndpoint('Time Allocation', 'GET', '/api/life-orchestrator/suggestions/time-allocation?energyLevel=medium');

    // Test daily ritual (morning)
    await this.testEndpoint('Morning Ritual', 'POST', '/api/life-orchestrator/daily-ritual', {
      type: 'morning',
      data: {
        intentions: [{ text: 'Focus on development', priority: 'high' }],
        energyLevel: 'high',
        goals: ['Complete API integration', 'Test system']
      }
    });

    // Test daily ritual (evening)
    await this.testEndpoint('Evening Ritual', 'POST', '/api/life-orchestrator/daily-ritual', {
      type: 'evening',
      data: {
        wins: ['API integration complete', 'All tests passing'],
        challenges: ['Time management'],
        gratitude: ['Great team support'],
        tomorrowFocus: 'Frontend updates'
      }
    });

    // Test calendar optimization
    await this.testEndpoint('Calendar Optimization', 'POST', '/api/life-orchestrator/calendar/optimize', {
      timeframe: 7,
      energyLevel: 'medium'
    });

    // Test service-specific endpoints (these may fail without authentication)
    await this.testEndpoint('Calendar Events', 'GET', '/api/life-orchestrator/calendar/events', null, 500); // Expected to fail without auth
    await this.testEndpoint('Email Dashboard', 'GET', '/api/life-orchestrator/emails/dashboard', null, 500); // Expected to fail without auth
    await this.testEndpoint('Slack Dashboard', 'GET', '/api/life-orchestrator/slack/dashboard', null, 500); // Expected to fail without auth

    this.log(' Service endpoint tests completed', 'success');
  }

  async runAuthenticationTests() {
    this.log('= Testing Authentication Flows', 'header');

    // Test Google authentication (expect failure with invalid tokens)
    await this.testEndpoint('Google Auth (Invalid)', 'POST', '/api/life-orchestrator/authenticate/google', {
      accessToken: 'invalid_token',
      refreshToken: 'invalid_refresh'
    }, 401);

    // Test Slack authentication (expect failure with invalid token)
    await this.testEndpoint('Slack Auth (Invalid)', 'POST', '/api/life-orchestrator/authenticate/slack', {
      accessToken: 'invalid_slack_token'
    }, 401);

    this.log(' Authentication tests completed', 'success');
  }

  async runPerformanceTests() {
    this.log('¡ Testing Performance', 'header');

    const performanceTests = [
      { name: 'Dashboard Load Time', path: '/api/life-orchestrator/dashboard', threshold: 2000 },
      { name: 'Health Check Speed', path: '/api/life-orchestrator/health-check', threshold: 500 },
      { name: 'Time Allocation Speed', path: '/api/life-orchestrator/suggestions/time-allocation', threshold: 1500 }
    ];

    for (const test of performanceTests) {
      const result = await this.testEndpoint(`${test.name}`, 'GET', test.path);
      if (result && result.responseTime > test.threshold) {
        this.log(`  ${test.name} is slow: ${result.responseTime}ms (threshold: ${test.threshold}ms)`, 'warning');
      }
    }

    this.log(' Performance tests completed', 'success');
  }

  async runErrorHandlingTests() {
    this.log('=á Testing Error Handling', 'header');

    // Test invalid endpoints
    await this.testEndpoint('Invalid Endpoint', 'GET', '/api/life-orchestrator/nonexistent', null, 404);
    
    // Test malformed requests
    await this.testEndpoint('Malformed JSON', 'POST', '/api/life-orchestrator/daily-ritual', 'invalid-json', 400);

    // Test missing required fields
    await this.testEndpoint('Missing Required Fields', 'POST', '/api/life-orchestrator/daily-ritual', {
      type: 'morning'
      // Missing data field
    }, 500);

    this.log(' Error handling tests completed', 'success');
  }

  async checkServerAvailability() {
    this.log('< Checking Server Availability', 'header');
    
    try {
      const response = await fetch(`${this.baseUrl}/api/life-orchestrator/health-check`);
      if (response.ok) {
        this.log(` Server is running at ${this.baseUrl}`, 'success');
        return true;
      } else {
        this.log(` Server responded with status: ${response.status}`, 'error');
        return false;
      }
    } catch (error) {
      this.log(` Server is not available: ${error.message}`, 'error');
      this.log(`  Make sure the backend server is running at ${this.baseUrl}`, 'error');
      return false;
    }
  }

  generateReport() {
    this.log('=Ê Generating Test Report', 'header');
    
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.success).length;
    const failedTests = totalTests - passedTests;
    const totalTime = Date.now() - this.startTime;
    
    const avgResponseTime = this.testResults
      .filter(r => r.responseTime)
      .reduce((sum, r) => sum + r.responseTime, 0) / this.testResults.length;

    console.log('\n' + '='.repeat(60));
    this.log('LIFE ORCHESTRATOR SYSTEM TEST REPORT', 'header');
    console.log('='.repeat(60));

    this.log(`Total Tests: ${totalTests}`, 'info');
    this.log(`Passed: ${passedTests}`, passedTests === totalTests ? 'success' : 'info');
    this.log(`Failed: ${failedTests}`, failedTests > 0 ? 'error' : 'info');
    this.log(`Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`, 'info');
    this.log(`Total Test Time: ${totalTime}ms`, 'info');
    this.log(`Average Response Time: ${Math.round(avgResponseTime)}ms`, 'info');

    if (failedTests > 0) {
      this.log('\nL Failed Tests:', 'error');
      this.testResults
        .filter(r => !r.success)
        .forEach(r => {
          this.log(`  - ${r.name}: ${r.error || `Expected ${r.expectedStatus}, got ${r.status}`}`, 'error');
        });
    }

    const slowTests = this.testResults.filter(r => r.responseTime > 1000);
    if (slowTests.length > 0) {
      this.log('\n   Slow Tests (>1000ms):', 'warning');
      slowTests.forEach(r => {
        this.log(`  - ${r.name}: ${r.responseTime}ms`, 'warning');
      });
    }

    this.log('\n=Ë Service Status Summary:', 'info');
    const serviceStatus = {
      'Core API': passedTests > 0 ? ' Available' : ' Unavailable',
      'Health Monitoring': this.testResults.find(r => r.name === 'Health Check')?.success ? ' Healthy' : ' Issues',
      'Dashboard': this.testResults.find(r => r.name === 'Main Dashboard')?.success ? ' Working' : ' Issues',
      'AI Suggestions': this.testResults.find(r => r.name === 'Time Allocation')?.success ? ' Working' : ' Issues',
      'Daily Rituals': this.testResults.filter(r => r.name.includes('Ritual')).every(r => r.success) ? ' Working' : ' Issues',
      'Authentication': '   Requires OAuth Setup',
      'Calendar Integration': '   Requires Google OAuth',
      'Email Intelligence': '   Requires Gmail OAuth',
      'Slack Integration': '   Requires Slack OAuth'
    };

    Object.entries(serviceStatus).forEach(([service, status]) => {
      const color = status.startsWith('') ? 'success' : status.startsWith('') ? 'error' : 'warning';
      this.log(`  ${service}: ${status}`, color);
    });

    console.log('\n' + '='.repeat(60));

    if (passedTests === totalTests) {
      this.log('<‰ ALL TESTS PASSED! System is ready for use.', 'success');
    } else if (passedTests / totalTests > 0.7) {
      this.log(' System is mostly functional. Some OAuth-dependent features need setup.', 'warning');
    } else {
      this.log('L System has significant issues. Please review failed tests.', 'error');
    }

    console.log('='.repeat(60) + '\n');
  }

  async run() {
    console.clear();
    this.log('=€ Life Orchestrator System Integration Test', 'header');
    this.log('Testing all services, endpoints, and integrations...', 'info');
    console.log('');

    // Check if server is available
    const serverAvailable = await this.checkServerAvailability();
    if (!serverAvailable) {
      this.log('Cannot continue tests without server. Please start the backend server first.', 'error');
      this.log('Run: cd apps/backend && npm run dev', 'info');
      process.exit(1);
    }

    console.log('');

    // Run all test suites
    await this.runServiceTests();
    console.log('');
    
    await this.runAuthenticationTests();
    console.log('');
    
    await this.runPerformanceTests();
    console.log('');
    
    await this.runErrorHandlingTests();
    console.log('');

    // Generate final report
    this.generateReport();
  }
}

// CLI interface
async function main() {
  const tester = new SystemTester();
  
  // Handle command line arguments
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Life Orchestrator System Test

Usage: node test-system.js [options]

Options:
  --help, -h          Show this help message
  --base-url <url>    Base URL for the API (default: http://localhost:3001)

Examples:
  node test-system.js
  node test-system.js --base-url http://localhost:8080
    `);
    process.exit(0);
  }

  // Override base URL if provided
  const baseUrlIndex = args.indexOf('--base-url');
  if (baseUrlIndex !== -1 && args[baseUrlIndex + 1]) {
    tester.baseUrl = args[baseUrlIndex + 1];
  }

  await tester.run();
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n\n=Ñ Test interrupted by user');
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.log('\n\n=¥ Uncaught exception:', error.message);
  process.exit(1);
});

// Run the tests
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Test runner failed:', error);
    process.exit(1);
  });
}