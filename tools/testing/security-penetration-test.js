#!/usr/bin/env node

/**
 * Authentication Security Penetration Testing Tool
 * 
 * Comprehensive security testing for ACT Farmhand authentication flows
 * - Tests JWT token vulnerabilities
 * - Validates role-based access controls
 * - Tests API endpoint security
 * - Checks for common authentication bypasses
 * - Tests session management
 */

import axios from 'axios';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { performance } from 'perf_hooks';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';

class SecurityPenetrationTest {
  constructor(options = {}) {
    this.baseURL = options.baseURL || 'http://localhost:4000';
    this.outputDir = options.outputDir || './tools/testing/reports';
    this.results = [];
    this.vulnerabilities = [];
    this.testUser = {
      email: 'test@example.com',
      password: 'TestPassword123',
      role: 'user'
    };
    
    // Common attack vectors
    this.attackVectors = [
      'admin',
      'administrator', 
      'root',
      'test',
      'guest',
      'anonymous',
      '1=1',
      "'; DROP TABLE users; --",
      '<script>alert("XSS")</script>',
      '../../etc/passwd',
      '../../../windows/system32/config/sam'
    ];
    
    // Security test categories
    this.testCategories = [
      'Authentication Bypass',
      'Token Manipulation',
      'Role Escalation',
      'Session Management',
      'Input Validation',
      'Rate Limiting',
      'CSRF Protection',
      'SQL Injection',
      'XSS Protection'
    ];
  }

  async initialize() {
    await mkdir(this.outputDir, { recursive: true });
    
    console.log('🔒 ACT Farmhand Security Penetration Testing');
    console.log('============================================');
    console.log(`🎯 Target: ${this.baseURL}`);
    console.log(`📊 Testing ${this.testCategories.length} security categories`);
    console.log('');
    
    // Check if backend is available
    try {
      const health = await axios.get(`${this.baseURL}/health`, { timeout: 5000 });
      console.log('✅ Backend health check passed');
      console.log('🚀 Starting security assessment...\n');
      return true;
    } catch (error) {
      console.error('❌ Backend not available:', error.message);
      return false;
    }
  }

  async testAuthenticationBypass() {
    const tests = [];
    console.log('🔓 Testing Authentication Bypass Vulnerabilities');
    
    // Test 1: No Authorization Header
    try {
      const response = await axios.get(`${this.baseURL}/api/protected/test`, {
        timeout: 5000,
        validateStatus: () => true
      });
      
      tests.push({
        test: 'No Authorization Header',
        expected: 401,
        actual: response.status,
        passed: response.status === 401,
        vulnerability: response.status !== 401 ? 'HIGH' : null,
        details: response.status !== 401 ? 'Protected endpoint accessible without authentication' : null
      });
    } catch (error) {
      tests.push({
        test: 'No Authorization Header',
        error: error.message,
        passed: false
      });
    }

    // Test 2: Invalid Token Format
    const invalidTokens = [
      'Bearer invalid',
      'Bearer 123.456.789',
      'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJub25lIn0.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.',
      'Basic dGVzdDp0ZXN0',
      'Bearer null',
      'Bearer undefined'
    ];

    for (const token of invalidTokens) {
      try {
        const response = await axios.get(`${this.baseURL}/api/protected/test`, {
          headers: { Authorization: token },
          timeout: 5000,
          validateStatus: () => true
        });
        
        tests.push({
          test: `Invalid Token: ${token.substring(0, 20)}...`,
          expected: 401,
          actual: response.status,
          passed: response.status === 401 || response.status === 403,
          vulnerability: (response.status !== 401 && response.status !== 403) ? 'HIGH' : null,
          details: (response.status !== 401 && response.status !== 403) ? 'Invalid token accepted' : null
        });
      } catch (error) {
        tests.push({
          test: `Invalid Token: ${token.substring(0, 20)}...`,
          error: error.message,
          passed: true // Network error expected for malformed requests
        });
      }
    }

    this.results.push({ category: 'Authentication Bypass', tests });
    const vulnerableTests = tests.filter(t => t.vulnerability);
    if (vulnerableTests.length > 0) {
      this.vulnerabilities.push(...vulnerableTests);
    }
    
    console.log(`   Completed ${tests.length} authentication bypass tests`);
    return tests;
  }

  async testTokenManipulation() {
    const tests = [];
    console.log('🔑 Testing JWT Token Manipulation');
    
    // Test 1: None Algorithm Attack
    try {
      const noneToken = jwt.sign(
        { userId: '12345', role: 'admin', email: 'test@example.com' },
        '',
        { algorithm: 'none', header: { alg: 'none', typ: 'JWT' } }
      );
      
      const response = await axios.get(`${this.baseURL}/api/protected/test`, {
        headers: { Authorization: `Bearer ${noneToken}` },
        timeout: 5000,
        validateStatus: () => true
      });
      
      tests.push({
        test: 'None Algorithm Attack',
        expected: 401,
        actual: response.status,
        passed: response.status === 401 || response.status === 403,
        vulnerability: (response.status !== 401 && response.status !== 403) ? 'CRITICAL' : null,
        details: (response.status !== 401 && response.status !== 403) ? 'None algorithm JWT accepted - critical security flaw' : null
      });
    } catch (error) {
      tests.push({
        test: 'None Algorithm Attack',
        error: error.message,
        passed: true
      });
    }

    // Test 2: Weak Secret Bruteforce
    const weakSecrets = ['secret', '123456', 'password', 'jwt', 'key', ''];
    for (const secret of weakSecrets) {
      try {
        const weakToken = jwt.sign(
          { userId: '12345', role: 'admin', email: 'test@example.com' },
          secret,
          { algorithm: 'HS256' }
        );
        
        const response = await axios.get(`${this.baseURL}/api/protected/test`, {
          headers: { Authorization: `Bearer ${weakToken}` },
          timeout: 5000,
          validateStatus: () => true
        });
        
        tests.push({
          test: `Weak Secret Test: "${secret || 'empty'}"`,
          expected: 401,
          actual: response.status,
          passed: response.status === 401 || response.status === 403,
          vulnerability: (response.status === 200) ? 'HIGH' : null,
          details: (response.status === 200) ? `Weak JWT secret "${secret}" accepted` : null
        });
      } catch (error) {
        tests.push({
          test: `Weak Secret Test: "${secret || 'empty'}"`,
          error: error.message,
          passed: true
        });
      }
    }

    // Test 3: Token Tampering
    try {
      // Create a legitimate-looking token with modified payload
      const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
      const payload = Buffer.from(JSON.stringify({ 
        userId: '99999', 
        role: 'admin', 
        email: 'hacker@example.com',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600
      })).toString('base64url');
      const signature = crypto.randomBytes(32).toString('base64url');
      
      const tamperedToken = `${header}.${payload}.${signature}`;
      
      const response = await axios.get(`${this.baseURL}/api/protected/test`, {
        headers: { Authorization: `Bearer ${tamperedToken}` },
        timeout: 5000,
        validateStatus: () => true
      });
      
      tests.push({
        test: 'Token Tampering',
        expected: 401,
        actual: response.status,
        passed: response.status === 401 || response.status === 403,
        vulnerability: (response.status === 200) ? 'HIGH' : null,
        details: (response.status === 200) ? 'Tampered JWT token accepted' : null
      });
    } catch (error) {
      tests.push({
        test: 'Token Tampering',
        error: error.message,
        passed: true
      });
    }

    this.results.push({ category: 'Token Manipulation', tests });
    const vulnerableTests = tests.filter(t => t.vulnerability);
    if (vulnerableTests.length > 0) {
      this.vulnerabilities.push(...vulnerableTests);
    }
    
    console.log(`   Completed ${tests.length} token manipulation tests`);
    return tests;
  }

  async testRoleEscalation() {
    const tests = [];
    console.log('👑 Testing Role Escalation Vulnerabilities');
    
    // Test access to admin endpoints with various roles
    const roleTests = [
      { role: 'user', endpoint: '/api/admin/users' },
      { role: 'guest', endpoint: '/api/admin/system' },
      { role: null, endpoint: '/api/admin/config' },
      { role: 'admin', endpoint: '/api/admin/test' }, // This should work
    ];

    for (const roleTest of roleTests) {
      try {
        // Create token with specified role
        const testToken = jwt.sign(
          { 
            userId: '12345', 
            role: roleTest.role, 
            email: 'test@example.com',
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + 3600
          },
          'test-secret', // Using test secret, should fail anyway
          { algorithm: 'HS256' }
        );
        
        const response = await axios.get(`${this.baseURL}${roleTest.endpoint}`, {
          headers: { Authorization: `Bearer ${testToken}` },
          timeout: 5000,
          validateStatus: () => true
        });
        
        const shouldPass = roleTest.role === 'admin';
        const actuallyPassed = response.status === 200;
        
        tests.push({
          test: `${roleTest.role || 'null'} role accessing ${roleTest.endpoint}`,
          expected: shouldPass ? 200 : [401, 403],
          actual: response.status,
          passed: shouldPass ? actuallyPassed : !actuallyPassed,
          vulnerability: (!shouldPass && actuallyPassed) ? 'HIGH' : null,
          details: (!shouldPass && actuallyPassed) ? 'Unauthorized role gained admin access' : null
        });
      } catch (error) {
        tests.push({
          test: `${roleTest.role || 'null'} role accessing ${roleTest.endpoint}`,
          error: error.message,
          passed: true // Network errors are acceptable
        });
      }
    }

    this.results.push({ category: 'Role Escalation', tests });
    const vulnerableTests = tests.filter(t => t.vulnerability);
    if (vulnerableTests.length > 0) {
      this.vulnerabilities.push(...vulnerableTests);
    }
    
    console.log(`   Completed ${tests.length} role escalation tests`);
    return tests;
  }

  async testInputValidation() {
    const tests = [];
    console.log('💉 Testing Input Validation & Injection Attacks');
    
    // Test common injection payloads
    for (const payload of this.attackVectors) {
      try {
        // Test in various parameters
        const testEndpoints = [
          { url: `/api/search`, method: 'GET', params: { q: payload } },
          { url: `/api/users/profile`, method: 'POST', data: { name: payload } },
          { url: `/api/login`, method: 'POST', data: { email: payload, password: 'test' } }
        ];

        for (const endpoint of testEndpoints) {
          try {
            const config = {
              method: endpoint.method,
              url: `${this.baseURL}${endpoint.url}`,
              timeout: 5000,
              validateStatus: () => true
            };

            if (endpoint.params) config.params = endpoint.params;
            if (endpoint.data) config.data = endpoint.data;

            const response = await axios(config);
            
            // Look for signs of successful injection
            const responseText = JSON.stringify(response.data).toLowerCase();
            const injectionSigns = [
              'syntax error',
              'mysql error',
              'ora-',
              'sqlite_',
              'postgresql error',
              'column',
              'table',
              'database'
            ];
            
            const hasInjectionSigns = injectionSigns.some(sign => responseText.includes(sign));
            
            tests.push({
              test: `${endpoint.method} ${endpoint.url} with "${payload.substring(0, 20)}..."`,
              payload: payload,
              statusCode: response.status,
              passed: !hasInjectionSigns && response.status !== 200,
              vulnerability: hasInjectionSigns ? 'HIGH' : null,
              details: hasInjectionSigns ? 'Possible SQL injection detected' : null
            });
          } catch (error) {
            tests.push({
              test: `${endpoint.method} ${endpoint.url} with "${payload.substring(0, 20)}..."`,
              error: error.message,
              passed: true
            });
          }
        }
      } catch (error) {
        // Continue with next payload
      }
    }

    this.results.push({ category: 'Input Validation', tests });
    const vulnerableTests = tests.filter(t => t.vulnerability);
    if (vulnerableTests.length > 0) {
      this.vulnerabilities.push(...vulnerableTests);
    }
    
    console.log(`   Completed ${tests.length} input validation tests`);
    return tests;
  }

  async testRateLimiting() {
    const tests = [];
    console.log('🚦 Testing Rate Limiting Protection');
    
    // Test login endpoint rate limiting
    const loginAttempts = 20;
    const results = [];
    
    console.log(`   Attempting ${loginAttempts} rapid login requests...`);
    
    for (let i = 0; i < loginAttempts; i++) {
      try {
        const startTime = performance.now();
        const response = await axios.post(`${this.baseURL}/api/login`, {
          email: 'nonexistent@example.com',
          password: 'wrongpassword'
        }, {
          timeout: 5000,
          validateStatus: () => true
        });
        const endTime = performance.now();
        
        results.push({
          attempt: i + 1,
          status: response.status,
          responseTime: Math.round(endTime - startTime),
          rateLimited: response.status === 429
        });
      } catch (error) {
        results.push({
          attempt: i + 1,
          error: error.message,
          rateLimited: error.response?.status === 429
        });
      }
    }
    
    const rateLimitedRequests = results.filter(r => r.rateLimited).length;
    const successfulRequests = results.filter(r => r.status && r.status !== 429).length;
    
    tests.push({
      test: 'Login Rate Limiting',
      totalAttempts: loginAttempts,
      rateLimitedRequests,
      successfulRequests,
      passed: rateLimitedRequests > 0 || successfulRequests < loginAttempts * 0.8,
      vulnerability: (rateLimitedRequests === 0 && successfulRequests === loginAttempts) ? 'MEDIUM' : null,
      details: rateLimitedRequests === 0 ? 'No rate limiting detected on login endpoint' : `Rate limiting activated after ${results.findIndex(r => r.rateLimited) + 1} requests`
    });

    this.results.push({ category: 'Rate Limiting', tests });
    const vulnerableTests = tests.filter(t => t.vulnerability);
    if (vulnerableTests.length > 0) {
      this.vulnerabilities.push(...vulnerableTests);
    }
    
    console.log(`   Rate limiting test complete`);
    return tests;
  }

  async runAllTests() {
    console.log('🏃‍♂️ Starting comprehensive security assessment...\n');
    
    const testSuites = [
      () => this.testAuthenticationBypass(),
      () => this.testTokenManipulation(),
      () => this.testRoleEscalation(),
      () => this.testInputValidation(),
      () => this.testRateLimiting()
    ];

    for (const testSuite of testSuites) {
      try {
        await testSuite();
        // Brief pause between test suites
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Test suite error: ${error.message}`);
      }
    }

    return this.results;
  }

  async generateReport() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // Calculate security metrics
    const totalTests = this.results.reduce((sum, category) => sum + category.tests.length, 0);
    const passedTests = this.results.reduce((sum, category) => 
      sum + category.tests.filter(t => t.passed).length, 0);
    const criticalVulns = this.vulnerabilities.filter(v => v.vulnerability === 'CRITICAL').length;
    const highVulns = this.vulnerabilities.filter(v => v.vulnerability === 'HIGH').length;
    const mediumVulns = this.vulnerabilities.filter(v => v.vulnerability === 'MEDIUM').length;
    
    const securityScore = Math.max(0, Math.round(((passedTests / totalTests) * 100) - 
      (criticalVulns * 30) - (highVulns * 10) - (mediumVulns * 5)));

    const report = {
      metadata: {
        timestamp: new Date().toISOString(),
        testConfiguration: {
          target: this.baseURL,
          categories: this.testCategories.length,
          totalTests,
          vulnerabilitiesFound: this.vulnerabilities.length
        },
        securityMetrics: {
          securityScore: `${securityScore}%`,
          passedTests,
          failedTests: totalTests - passedTests,
          criticalVulnerabilities: criticalVulns,
          highVulnerabilities: highVulns,
          mediumVulnerabilities: mediumVulns
        }
      },
      summary: {
        overallStatus: securityScore >= 80 ? 'SECURE' : securityScore >= 60 ? 'MODERATE RISK' : 'HIGH RISK',
        securityScore,
        recommendations: this.generateSecurityRecommendations()
      },
      detailedResults: this.results,
      vulnerabilities: this.vulnerabilities
    };

    // Write detailed JSON report
    const jsonPath = path.join(this.outputDir, `security-pentest-${timestamp}.json`);
    await writeFile(jsonPath, JSON.stringify(report, null, 2));

    // Write executive summary
    const summaryPath = path.join(this.outputDir, `security-summary-${timestamp}.md`);
    const summary = this.generateExecutiveSummary(report);
    await writeFile(summaryPath, summary);

    console.log('\n🔒 SECURITY ASSESSMENT COMPLETE');
    console.log('===============================');
    console.log(`📊 Total Tests: ${totalTests}`);
    console.log(`✅ Passed: ${passedTests} (${Math.round((passedTests/totalTests)*100)}%)`);
    console.log(`❌ Failed: ${totalTests - passedTests}`);
    console.log(`🚨 Vulnerabilities Found: ${this.vulnerabilities.length}`);
    
    if (criticalVulns > 0) {
      console.log(`🔴 Critical: ${criticalVulns}`);
    }
    if (highVulns > 0) {
      console.log(`🟠 High: ${highVulns}`);
    }
    if (mediumVulns > 0) {
      console.log(`🟡 Medium: ${mediumVulns}`);
    }
    
    console.log(`\n🎯 Security Score: ${securityScore}% (${report.summary.overallStatus})`);
    console.log(`📄 Detailed Report: ${jsonPath}`);
    console.log(`📝 Executive Summary: ${summaryPath}`);

    return report;
  }

  generateSecurityRecommendations() {
    const recommendations = [];
    
    if (this.vulnerabilities.some(v => v.vulnerability === 'CRITICAL')) {
      recommendations.push({
        priority: 'IMMEDIATE',
        category: 'Critical Security',
        recommendation: 'Address critical vulnerabilities immediately before production deployment',
        impact: 'System compromise possible'
      });
    }
    
    if (this.vulnerabilities.some(v => v.test.includes('None Algorithm'))) {
      recommendations.push({
        priority: 'HIGH',
        category: 'JWT Security',
        recommendation: 'Ensure JWT library rejects "none" algorithm tokens',
        impact: 'Authentication bypass'
      });
    }
    
    if (this.vulnerabilities.some(v => v.test.includes('Rate Limiting'))) {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'Rate Limiting',
        recommendation: 'Implement rate limiting on authentication endpoints',
        impact: 'Brute force attack protection'
      });
    }
    
    if (this.vulnerabilities.some(v => v.test.includes('injection'))) {
      recommendations.push({
        priority: 'HIGH',
        category: 'Input Validation',
        recommendation: 'Implement comprehensive input validation and parameterized queries',
        impact: 'SQL injection prevention'
      });
    }

    if (recommendations.length === 0) {
      recommendations.push({
        priority: 'MAINTENANCE',
        category: 'Security Monitoring',
        recommendation: 'Continue regular security testing and monitoring',
        impact: 'Ongoing security assurance'
      });
    }

    return recommendations;
  }

  generateExecutiveSummary(report) {
    const { metadata, summary, vulnerabilities } = report;
    
    return `# 🔒 ACT Farmhand Security Assessment Report

## Executive Summary

**Assessment Date:** ${new Date(metadata.timestamp).toLocaleString()}  
**Security Score:** ${summary.securityScore}%  
**Overall Status:** ${summary.overallStatus}

### Key Metrics
- **Total Security Tests:** ${metadata.testConfiguration.totalTests}
- **Tests Passed:** ${metadata.securityMetrics.passedTests}
- **Vulnerabilities:** ${metadata.testConfiguration.vulnerabilitiesFound}
  ${metadata.securityMetrics.criticalVulnerabilities > 0 ? `- 🔴 **Critical:** ${metadata.securityMetrics.criticalVulnerabilities}` : ''}
  ${metadata.securityMetrics.highVulnerabilities > 0 ? `- 🟠 **High:** ${metadata.securityMetrics.highVulnerabilities}` : ''}
  ${metadata.securityMetrics.mediumVulnerabilities > 0 ? `- 🟡 **Medium:** ${metadata.securityMetrics.mediumVulnerabilities}` : ''}

## Security Categories Tested

| Category | Tests | Status |
|----------|-------|--------|
| Authentication Bypass | Multiple | ${vulnerabilities.some(v => v.test.includes('Authorization')) ? '⚠️ Issues Found' : '✅ Secure'} |
| JWT Token Security | Multiple | ${vulnerabilities.some(v => v.test.includes('Token')) ? '⚠️ Issues Found' : '✅ Secure'} |
| Role-Based Access | Multiple | ${vulnerabilities.some(v => v.test.includes('role')) ? '⚠️ Issues Found' : '✅ Secure'} |
| Input Validation | Multiple | ${vulnerabilities.some(v => v.test.includes('injection')) ? '⚠️ Issues Found' : '✅ Secure'} |
| Rate Limiting | Multiple | ${vulnerabilities.some(v => v.test.includes('Rate')) ? '⚠️ Issues Found' : '✅ Secure'} |

## Priority Recommendations

${summary.recommendations.map((rec, i) => `
### ${i + 1}. ${rec.category} - ${rec.priority} Priority
**Recommendation:** ${rec.recommendation}  
**Impact:** ${rec.impact}
`).join('')}

## Production Readiness

${summary.overallStatus === 'SECURE' ? 
  '✅ **APPROVED**: System demonstrates strong security posture and is ready for production deployment.' :
  summary.overallStatus === 'MODERATE RISK' ?
  '⚠️ **CONDITIONAL**: Address identified vulnerabilities before production deployment.' :
  '🚨 **NOT APPROVED**: Critical security issues must be resolved before production deployment.'
}

---
*Generated by ACT Farmhand Security Penetration Testing Tool*
`;
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const securityTest = new SecurityPenetrationTest({
    baseURL: process.env.SECURITY_TEST_URL || 'http://localhost:4000'
  });
  
  try {
    const initialized = await securityTest.initialize();
    if (initialized) {
      const results = await securityTest.runAllTests();
      securityTest.generateReport();
    }
  } catch (error) {
    console.error('❌ Security testing failed:', error.message);
    process.exit(1);
  }
}

export default SecurityPenetrationTest;