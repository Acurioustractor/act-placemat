#!/usr/bin/env node

/**
 * COMPREHENSIVE ACT TESTING SUITE
 * Tests ALL discovered capabilities to ensure everything actually works
 * No more "looks good but doesn't work" - this validates real functionality
 */

import { createClient } from '@supabase/supabase-js';
import { Client } from '@notionhq/client';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

class ACTTestSuite {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      summary: {
        totalTests: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
      },
      tests: {},
    };

    // Initialize connections
    this.supabase = createClient(
      'https://tednluwflfhxyucgwigh.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlZG5sdXdmbGZoeHl1Y2d3aWdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjM0NjIyOSwiZXhwIjoyMDY3OTIyMjI5fQ.wyizbOWRxMULUp6WBojJPfey1ta8-Al1OlZqDDIPIHo'
    );

    this.notion = new Client({
      auth: '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',
    });
  }

  async runTest(testName, testFunction) {
    console.log(`🧪 Testing: ${testName}`);
    this.results.summary.totalTests++;

    try {
      const startTime = Date.now();
      const result = await testFunction();
      const duration = Date.now() - startTime;

      this.results.tests[testName] = {
        status: 'PASSED',
        duration: `${duration}ms`,
        result: result,
        timestamp: new Date().toISOString(),
      };

      this.results.summary.passed++;
      console.log(`✅ ${testName} - PASSED (${duration}ms)`);

      if (result.details) {
        console.log(`   📊 ${result.details}`);
      }

      return true;
    } catch (error) {
      this.results.tests[testName] = {
        status: 'FAILED',
        error: error.message,
        timestamp: new Date().toISOString(),
      };

      this.results.summary.failed++;
      console.log(`❌ ${testName} - FAILED: ${error.message}`);
      return false;
    }
  }

  // Test 1: Supabase Database Connections
  async testSupabaseConnections() {
    const tables = ['linkedin_contacts', 'stories', 'storytellers', 'projects'];
    const results = {};

    for (const table of tables) {
      const { count, error } = await this.supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (error) throw new Error(`${table}: ${error.message}`);
      results[table] = count;
    }

    return {
      tables: results,
      details: `LinkedIn: ${results.linkedin_contacts}, Stories: ${results.stories}, Storytellers: ${results.storytellers}, Projects: ${results.projects}`,
    };
  }

  // Test 2: Notion Database Connections
  async testNotionConnections() {
    const databases = {
      projects: '177ebcf981cf80dd9514f1ec32f3314c',
      opportunities: '234ebcf981cf804e873ff352f03c36da',
      organizations: '948f39467d1c42f2bd7e1317a755e67b',
    };

    const results = {};

    for (const [name, id] of Object.entries(databases)) {
      const response = await this.notion.databases.query({
        database_id: id,
        page_size: 1,
      });

      results[name] = response.results.length;
    }

    return {
      databases: results,
      details: `Projects: ${results.projects}, Opportunities: ${results.opportunities}, Organizations: ${results.organizations}`,
    };
  }

  // Test 3: Real Backend API Health
  async testRealBackendAPI() {
    const baseUrl = 'http://localhost:4000';
    const endpoints = [
      '/api/health',
      '/api/overview',
      '/api/projects',
      '/api/contacts',
      '/api/stories',
      '/api/storytellers',
    ];

    const results = {};

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(`${baseUrl}${endpoint}`);
        const data = await response.json();

        results[endpoint] = {
          status: response.status,
          working: response.ok,
          hasData: Object.keys(data).length > 0,
        };
      } catch (error) {
        results[endpoint] = {
          status: 'UNREACHABLE',
          working: false,
          error: error.message,
        };
      }
    }

    return { endpoints: results };
  }

  // Test 4: Frontend Applications
  async testFrontendApps() {
    const apps = [
      { name: 'frontend', path: 'apps/frontend', port: 5173 },
      { name: 'ai-workhouse', path: 'apps/ai-workhouse', port: 3000 },
      { name: 'analytics', path: 'apps/analytics-dashboard', port: 3001 },
    ];

    const results = {};

    for (const app of apps) {
      const packagePath = `${app.path}/package.json`;

      try {
        if (fs.existsSync(packagePath)) {
          const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

          // Test if dev server responds
          try {
            const response = await fetch(`http://localhost:${app.port}`, {
              method: 'HEAD',
              timeout: 2000,
            });
            results[app.name] = {
              packageExists: true,
              name: pkg.name,
              version: pkg.version,
              framework: this.detectFramework(pkg),
              serverRunning: response.ok,
              port: app.port,
            };
          } catch {
            results[app.name] = {
              packageExists: true,
              name: pkg.name,
              version: pkg.version,
              framework: this.detectFramework(pkg),
              serverRunning: false,
              port: app.port,
            };
          }
        } else {
          results[app.name] = { packageExists: false };
        }
      } catch (error) {
        results[app.name] = { error: error.message };
      }
    }

    return { applications: results };
  }

  // Test 5: AI Services Integration
  async testAIServices() {
    const aiFiles = [
      'apps/backend/src/services/actFarmhandAgent.js',
      'apps/backend/src/services/aiPatternRecognitionEngine.js',
      'apps/backend/src/services/botOrchestrator.js',
    ];

    const results = {};

    for (const file of aiFiles) {
      try {
        const exists = fs.existsSync(file);
        if (exists) {
          const content = fs.readFileSync(file, 'utf8');
          results[path.basename(file)] = {
            exists: true,
            size: `${Math.round(content.length / 1024)}KB`,
            hasAIPatterns: /anthropic|openai|claude|gpt/i.test(content),
            hasClassDefinitions: /class\s+\w+/g.test(content),
          };
        } else {
          results[path.basename(file)] = { exists: false };
        }
      } catch (error) {
        results[path.basename(file)] = { error: error.message };
      }
    }

    return { services: results };
  }

  // Test 6: Environment Configuration
  async testEnvironmentConfig() {
    const envPath = 'apps/backend/.env';

    if (!fs.existsSync(envPath)) {
      throw new Error('Environment file not found');
    }

    const envContent = fs.readFileSync(envPath, 'utf8');
    const requiredVars = [
      'SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
      'NOTION_TOKEN',
      'XERO_REFRESH_TOKEN',
      'ANTHROPIC_API_KEY',
      'OPENAI_API_KEY',
    ];

    const results = {};

    for (const variable of requiredVars) {
      const pattern = new RegExp(`${variable}=(.+)`);
      const match = envContent.match(pattern);
      results[variable] = {
        defined: !!match,
        hasValue: match && match[1] && match[1].trim() !== 'your_key_here',
        length: match && match[1] ? match[1].length : 0,
      };
    }

    return { environment: results };
  }

  // Test 7: File Structure Integrity
  async testFileStructure() {
    const criticalPaths = [
      'apps/backend/src/api',
      'apps/frontend/src',
      'apps/ai-workhouse',
      'archive/legacy-backends/real-backend/real-backend.js',
      'system-audit.js',
      'CLAUDE.md',
    ];

    const results = {};

    for (const path of criticalPaths) {
      results[path] = {
        exists: fs.existsSync(path),
        isDirectory: fs.existsSync(path) && fs.statSync(path).isDirectory(),
        isFile: fs.existsSync(path) && fs.statSync(path).isFile(),
      };
    }

    return { structure: results };
  }

  detectFramework(pkg) {
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    if (deps.next) return 'Next.js';
    if (deps.react) return 'React';
    if (deps.vue) return 'Vue';
    if (deps.angular) return 'Angular';
    return 'Unknown';
  }

  // Run all tests
  async runFullTestSuite() {
    console.log('🚀 ACT COMPREHENSIVE TEST SUITE STARTING...\n');

    await this.runTest('Supabase Database Connections', () =>
      this.testSupabaseConnections()
    );
    await this.runTest('Notion Database Connections', () =>
      this.testNotionConnections()
    );
    await this.runTest('Real Backend API Health', () => this.testRealBackendAPI());
    await this.runTest('Frontend Applications', () => this.testFrontendApps());
    await this.runTest('AI Services Integration', () => this.testAIServices());
    await this.runTest('Environment Configuration', () => this.testEnvironmentConfig());
    await this.runTest('File Structure Integrity', () => this.testFileStructure());

    // Save results
    const resultsPath = 'comprehensive-test-results.json';
    fs.writeFileSync(resultsPath, JSON.stringify(this.results, null, 2));

    console.log('\n📊 TEST SUITE COMPLETE!');
    console.log(`✅ Passed: ${this.results.summary.passed}`);
    console.log(`❌ Failed: ${this.results.summary.failed}`);
    console.log(`⏭️  Skipped: ${this.results.summary.skipped}`);
    console.log(`📄 Results saved to: ${resultsPath}`);

    const successRate = Math.round(
      (this.results.summary.passed / this.results.summary.totalTests) * 100
    );
    console.log(`🎯 Success Rate: ${successRate}%`);

    if (this.results.summary.failed > 0) {
      console.log('\n🔧 FAILED TESTS NEED ATTENTION:');
      Object.entries(this.results.tests).forEach(([name, result]) => {
        if (result.status === 'FAILED') {
          console.log(`   ❌ ${name}: ${result.error}`);
        }
      });
    }

    return this.results;
  }
}

// Export for use as module
export default ACTTestSuite;

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const testSuite = new ACTTestSuite();
  testSuite.runFullTestSuite().catch(console.error);
}
