#!/usr/bin/env node

/**
 * ACT Platform Activation Testing Script
 * Comprehensive testing of all systems after real data integration
 */

import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const BACKEND_URL = `http://localhost:${process.env.PORT || 4000}`;
const API_KEY = 'dev-frontend-key';

class PlatformTester {
  constructor() {
    this.supabase = null;
    this.testResults = [];
  }

  async runTest(testName, testFunction) {
    console.log(`\n🧪 Testing: ${testName}`);
    try {
      const startTime = Date.now();
      await testFunction();
      const duration = Date.now() - startTime;
      console.log(`✅ ${testName} - PASSED (${duration}ms)`);
      this.testResults.push({ test: testName, status: 'PASSED', duration });
    } catch (error) {
      console.log(`❌ ${testName} - FAILED: ${error.message}`);
      this.testResults.push({ test: testName, status: 'FAILED', error: error.message });
    }
  }

  async testSupabaseConnection() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!url || url.includes('placeholder')) {
      throw new Error('Supabase URL not configured (still using placeholder)');
    }
    
    if (!key || key.includes('placeholder')) {
      throw new Error('Supabase service key not configured (still using placeholder)');
    }
    
    this.supabase = createClient(url, key);
    
    // Test basic connection
    const { data, error } = await this.supabase
      .rpc('now'); // Simple function that should exist
    
    if (error) {
      throw new Error(`Supabase connection failed: ${error.message}`);
    }
    
    console.log(`   📊 Connected to: ${url}`);
  }

  async testBackendHealth() {
    const response = await fetch(`${BACKEND_URL}/health`);
    if (!response.ok) {
      throw new Error(`Health check failed with status ${response.status}`);
    }
    
    const health = await response.json();
    if (health.status !== 'healthy') {
      throw new Error(`Backend not healthy: ${JSON.stringify(health)}`);
    }
    
    console.log(`   🏥 Backend status: ${health.status}`);
    console.log(`   📊 Database: ${health.database}`);
  }

  async testSecurityHealth() {
    const response = await fetch(`${BACKEND_URL}/security-health`);
    if (!response.ok) {
      throw new Error(`Security health check failed with status ${response.status}`);
    }
    
    const security = await response.json();
    if (security.status !== 'healthy') {
      throw new Error(`Security not healthy: ${JSON.stringify(security)}`);
    }
    
    console.log(`   🔒 Security status: ${security.status}`);
    console.log(`   🌍 Environment: ${security.environment}`);
    
    if (security.warnings && security.warnings.length > 0) {
      console.log(`   ⚠️  Warnings: ${security.warnings.length}`);
      security.warnings.forEach(w => console.log(`      - ${w.type}: ${w.message}`));
    }
  }

  async testCORSSecurity() {
    // Test legitimate origin
    const legitimateResponse = await fetch(`${BACKEND_URL}/api/homepage`, {
      headers: { 'Origin': 'http://localhost:5176' }
    });
    
    if (!legitimateResponse.ok) {
      throw new Error(`Legitimate CORS request failed: ${legitimateResponse.status}`);
    }
    
    console.log(`   ✅ Legitimate origin allowed`);
    
    // Test malicious origin (should fail gracefully, not throw)
    try {
      const maliciousResponse = await fetch(`${BACKEND_URL}/api/homepage`, {
        headers: { 'Origin': 'http://malicious-site.com' }
      });
      
      // If it succeeds, that's a problem
      if (maliciousResponse.ok) {
        throw new Error('Malicious origin was allowed - security vulnerability!');
      }
      
      console.log(`   🚫 Malicious origin properly blocked`);
    } catch (error) {
      if (error.message.includes('security vulnerability')) {
        throw error;
      }
      // Expected - CORS should block this
      console.log(`   🚫 Malicious origin properly blocked by CORS`);
    }
  }

  async testAPIAuthentication() {
    // Test without API key
    const noKeyResponse = await fetch(`${BACKEND_URL}/api/v1/intelligence/status`);
    if (noKeyResponse.ok) {
      throw new Error('Protected endpoint allowed access without API key');
    }
    
    // Test with valid API key
    const validKeyResponse = await fetch(`${BACKEND_URL}/api/v1/intelligence/status`, {
      headers: { 'X-API-Key': API_KEY }
    });
    
    if (!validKeyResponse.ok) {
      throw new Error(`Valid API key rejected: ${validKeyResponse.status}`);
    }
    
    const data = await validKeyResponse.json();
    console.log(`   🔑 API key authentication working`);
    console.log(`   📊 Intelligence status: ${data.status || 'active'}`);
  }

  async testDatabaseTables() {
    if (!this.supabase) {
      throw new Error('Supabase not initialized');
    }
    
    // Test core tables exist
    const tables = ['stories', 'storytellers', 'themes', 'organizations'];
    const tableResults = {};
    
    for (const table of tables) {
      try {
        const { data, error, count } = await this.supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        if (error && !error.message.includes('does not exist')) {
          throw error;
        }
        
        tableResults[table] = error ? 'missing' : count || 0;
      } catch (err) {
        tableResults[table] = 'error';
      }
    }
    
    Object.entries(tableResults).forEach(([table, result]) => {
      if (result === 'missing') {
        console.log(`   📋 Table '${table}': MISSING (needs migration)`);
      } else if (result === 'error') {
        console.log(`   📋 Table '${table}': ERROR`);
      } else {
        console.log(`   📋 Table '${table}': ${result} records`);
      }
    });
    
    // Ensure at least some core tables exist
    const existingTables = Object.entries(tableResults)
      .filter(([_, result]) => typeof result === 'number').length;
    
    if (existingTables === 0) {
      throw new Error('No database tables found - migrations needed');
    }
  }

  async testHomepageAPI() {
    const response = await fetch(`${BACKEND_URL}/api/homepage`);
    if (!response.ok) {
      throw new Error(`Homepage API failed: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Validate data structure
    if (!data.featured_stories || !data.key_metrics) {
      throw new Error('Homepage API missing required fields');
    }
    
    console.log(`   📖 Featured stories: ${data.featured_stories.length}`);
    console.log(`   📊 Key metrics: ${data.key_metrics.length}`);
  }

  async testIntelligenceAPI() {
    const response = await fetch(`${BACKEND_URL}/api/v1/intelligence/status`, {
      headers: { 'X-API-Key': API_KEY }
    });
    
    if (!response.ok) {
      throw new Error(`Intelligence API failed: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`   🧠 Intelligence system: ${data.status || 'active'}`);
    
    if (data.providers) {
      Object.entries(data.providers).forEach(([provider, status]) => {
        console.log(`   🔌 ${provider}: ${status}`);
      });
    }
  }

  async testPerformanceMetrics() {
    const response = await fetch(`${BACKEND_URL}/api/sla-monitoring/status`);
    if (!response.ok) {
      throw new Error(`Performance monitoring failed: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`   📊 SLA monitoring: ${data.status || 'active'}`);
    
    if (data.metrics) {
      console.log(`   ⚡ API response time: ${data.metrics.averageResponseTime || 'N/A'}`);
      console.log(`   🎯 Uptime: ${data.metrics.uptime || 'N/A'}`);
    }
  }

  async runAllTests() {
    console.log(`
🚀 ACT Platform Activation Testing
==================================
Testing backend: ${BACKEND_URL}
API key: ${API_KEY}
`);

    // Core infrastructure tests
    await this.runTest('Supabase Connection', () => this.testSupabaseConnection());
    await this.runTest('Backend Health Check', () => this.testBackendHealth());
    await this.runTest('Security Health Check', () => this.testSecurityHealth());
    
    // Security tests
    await this.runTest('CORS Security', () => this.testCORSSecurity());
    await this.runTest('API Authentication', () => this.testAPIAuthentication());
    
    // Database tests
    await this.runTest('Database Tables', () => this.testDatabaseTables());
    
    // API functionality tests
    await this.runTest('Homepage API', () => this.testHomepageAPI());
    await this.runTest('Intelligence API', () => this.testIntelligenceAPI());
    await this.runTest('Performance Metrics', () => this.testPerformanceMetrics());

    // Summary
    this.printSummary();
  }

  printSummary() {
    console.log(`
📊 Test Results Summary
=======================`);
    
    const passed = this.testResults.filter(r => r.status === 'PASSED').length;
    const failed = this.testResults.filter(r => r.status === 'FAILED').length;
    const total = this.testResults.length;
    
    console.log(`✅ Passed: ${passed}/${total}`);
    console.log(`❌ Failed: ${failed}/${total}`);
    
    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.testResults
        .filter(r => r.status === 'FAILED')
        .forEach(r => console.log(`   - ${r.test}: ${r.error}`));
    }
    
    console.log(`
🎯 Platform Status: ${failed === 0 ? '🟢 READY FOR PRODUCTION' : '🟡 NEEDS ATTENTION'}
    
Next Steps:
${failed === 0 ? 
  '✅ All tests passed! Your platform is ready for deployment.' :
  '🔧 Fix failed tests, then re-run: node test-platform-activation.js'
}
`);
  }
}

// Run tests
const tester = new PlatformTester();
tester.runAllTests().catch(error => {
  console.error('❌ Testing failed:', error.message);
  process.exit(1);
});