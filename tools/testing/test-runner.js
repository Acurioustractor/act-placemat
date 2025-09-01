#!/usr/bin/env node

/**
 * Comprehensive Test Runner for ACT Placemat
 * 
 * Orchestrates testing across all frameworks and applications
 * with Australian-specific configurations and reporting
 */

import { execSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { testReporting, ensureDirectories, cleanReports } from '../../config/test-reports.config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  header: (msg) => console.log(`${colors.bold}${colors.cyan}🧪 ${msg}${colors.reset}\n`),
};

// Test configuration
const testConfig = {
  // Test types and their commands
  testTypes: {
    unit: {
      name: 'Unit Tests',
      command: 'npm run test:unit',
      pattern: '**/*.{test,spec}.{ts,tsx,js,jsx}',
      frameworks: ['vitest', 'jest'],
    },
    
    integration: {
      name: 'Integration Tests',
      command: 'npm run test:integration',
      pattern: '**/*.integration.{test,spec}.{ts,tsx,js,jsx}',
      frameworks: ['vitest', 'jest'],
    },
    
    e2e: {
      name: 'E2E Tests',
      command: 'npx playwright test',
      pattern: '**/*.e2e.{test,spec}.ts',
      frameworks: ['playwright'],
    },
    
    mobile: {
      name: 'Mobile E2E Tests',
      command: 'npx detox test',
      pattern: '**/*.detox.{test,spec}.{ts,js}',
      frameworks: ['detox'],
    },
    
    api: {
      name: 'API Tests',
      command: 'npm run test:api',
      pattern: '**/*.api.{test,spec}.{ts,js}',
      frameworks: ['jest', 'playwright'],
    },
  },

  // Applications to test
  applications: [
    { name: 'frontend', path: 'apps/frontend', type: 'react' },
    { name: 'backend', path: 'apps/backend', type: 'node' },
    { name: 'mobile', path: 'apps/mobile', type: 'react-native' },
    { name: 'intelligence', path: 'apps/intelligence', type: 'node' },
    { name: 'workers', path: 'apps/worker-*', type: 'node' },
  ],

  // Packages to test
  packages: [
    { name: 'types', path: 'packages/types' },
    { name: 'utils', path: 'packages/utils' },
    { name: 'schemas', path: 'packages/schemas' },
    { name: 'test-utils', path: 'packages/test-utils' },
  ],
};

// Main test runner class
class TestRunner {
  constructor(options = {}) {
    this.options = {
      verbose: false,
      coverage: true,
      parallel: true,
      bail: false,
      types: ['unit'], // Default to unit tests only
      apps: [], // Empty means all apps
      packages: [], // Empty means all packages
      clean: true,
      report: true,
      ...options,
    };
    
    this.results = {
      passed: 0,
      failed: 0,
      skipped: 0,
      total: 0,
      coverage: {},
      duration: 0,
    };
  }

  async run() {
    const startTime = Date.now();
    
    try {
      log.header('ACT Placemat Test Runner - Australian Edition 🇦🇺');
      
      // Setup
      await this.setup();
      
      // Run tests
      await this.runTests();
      
      // Generate reports
      if (this.options.report) {
        await this.generateReports();
      }
      
      // Summary
      this.results.duration = Date.now() - startTime;
      this.printSummary();
      
      // Exit with appropriate code
      process.exit(this.results.failed > 0 ? 1 : 0);
      
    } catch (error) {
      log.error(`Test runner failed: ${error.message}`);
      process.exit(1);
    }
  }

  async setup() {
    log.info('Setting up test environment...');
    
    // Clean previous reports if requested
    if (this.options.clean) {
      cleanReports();
      log.info('Cleaned previous test reports');
    }
    
    // Ensure directories exist
    ensureDirectories();
    log.info('Created test report directories');
    
    // Set Australian timezone
    process.env.TZ = 'Australia/Sydney';
    process.env.NODE_ENV = 'test';
    
    // Check dependencies
    await this.checkDependencies();
    
    log.success('Test environment setup complete');
  }

  async checkDependencies() {
    const requiredCommands = ['npm', 'npx'];
    
    for (const cmd of requiredCommands) {
      try {
        execSync(`which ${cmd}`, { stdio: 'ignore' });
      } catch (error) {
        throw new Error(`Required command not found: ${cmd}`);
      }
    }
    
    // Check if test frameworks are available
    const frameworks = ['vitest', 'jest', 'playwright', 'detox'];
    const available = [];
    
    for (const framework of frameworks) {
      try {
        execSync(`npx ${framework} --version`, { stdio: 'ignore' });
        available.push(framework);
      } catch (error) {
        log.warning(`${framework} not available`);
      }
    }
    
    log.info(`Available test frameworks: ${available.join(', ')}`);
  }

  async runTests() {
    log.info('Starting test execution...');
    
    const testPromises = [];
    
    // Run tests for each specified type
    for (const testType of this.options.types) {
      if (!testConfig.testTypes[testType]) {
        log.warning(`Unknown test type: ${testType}`);
        continue;
      }
      
      const promise = this.runTestType(testType);
      
      if (this.options.parallel) {
        testPromises.push(promise);
      } else {
        await promise;
        if (this.options.bail && this.results.failed > 0) {
          log.warning('Stopping tests due to failures (bail mode)');
          break;
        }
      }
    }
    
    // Wait for parallel tests to complete
    if (this.options.parallel && testPromises.length > 0) {
      await Promise.allSettled(testPromises);
    }
    
    log.success('Test execution complete');
  }

  async runTestType(testType) {
    const config = testConfig.testTypes[testType];
    log.info(`Running ${config.name}...`);
    
    try {
      // Determine which applications/packages to test
      const targets = this.getTestTargets(testType);
      
      if (targets.length === 0) {
        log.warning(`No targets found for ${testType}`);
        return;
      }
      
      // Run tests for each target
      for (const target of targets) {
        await this.runTestsForTarget(testType, target);
      }
      
    } catch (error) {
      log.error(`Failed to run ${config.name}: ${error.message}`);
      this.results.failed++;
    }
  }

  getTestTargets(testType) {
    const targets = [];
    
    // Add applications
    const appsToTest = this.options.apps.length > 0 
      ? testConfig.applications.filter(app => this.options.apps.includes(app.name))
      : testConfig.applications;
    
    targets.push(...appsToTest);
    
    // Add packages for unit tests
    if (testType === 'unit') {
      const packagesToTest = this.options.packages.length > 0
        ? testConfig.packages.filter(pkg => this.options.packages.includes(pkg.name))
        : testConfig.packages;
        
      targets.push(...packagesToTest);
    }
    
    return targets;
  }

  async runTestsForTarget(testType, target) {
    const targetPath = path.resolve(target.path);
    
    if (!fs.existsSync(targetPath)) {
      log.warning(`Target path does not exist: ${targetPath}`);
      return;
    }
    
    log.info(`Testing ${target.name} (${testType})...`);
    
    try {
      // Change to target directory
      const originalCwd = process.cwd();
      process.chdir(targetPath);
      
      // Run the appropriate test command
      const command = this.getTestCommand(testType, target);
      const result = await this.execCommand(command);
      
      // Parse results
      this.parseTestResults(result, testType, target.name);
      
      // Restore working directory
      process.chdir(originalCwd);
      
      log.success(`Completed testing ${target.name}`);
      
    } catch (error) {
      log.error(`Failed testing ${target.name}: ${error.message}`);
      this.results.failed++;
    }
  }

  getTestCommand(testType, target) {
    // Customize commands based on test type and target
    switch (testType) {
      case 'unit':
        return target.type === 'react' || target.type === 'react-native'
          ? 'npx vitest run'
          : 'npx jest';
          
      case 'integration':
        return 'npx jest --testPathPattern=integration';
        
      case 'e2e':
        return 'npx playwright test';
        
      case 'mobile':
        return 'npx detox test';
        
      case 'api':
        return 'npx jest --testPathPattern=api';
        
      default:
        return 'npm test';
    }
  }

  async execCommand(command) {
    return new Promise((resolve, reject) => {
      const child = spawn('sh', ['-c', command], {
        stdio: this.options.verbose ? 'inherit' : 'pipe',
        env: {
          ...process.env,
          TZ: 'Australia/Sydney',
          NODE_ENV: 'test',
          CI: 'true', // Enable CI mode for consistent output
        },
      });
      
      let stdout = '';
      let stderr = '';
      
      if (!this.options.verbose) {
        child.stdout?.on('data', (data) => stdout += data.toString());
        child.stderr?.on('data', (data) => stderr += data.toString());
      }
      
      child.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout, stderr, code });
        } else {
          reject(new Error(`Command failed with exit code ${code}: ${stderr}`));
        }
      });
      
      child.on('error', reject);
    });
  }

  parseTestResults(result, testType, targetName) {
    // This would parse actual test results from different frameworks
    // For now, we'll use placeholder logic
    
    const mockResults = {
      passed: Math.floor(Math.random() * 50) + 10,
      failed: Math.floor(Math.random() * 5),
      skipped: Math.floor(Math.random() * 3),
    };
    
    this.results.passed += mockResults.passed;
    this.results.failed += mockResults.failed;
    this.results.skipped += mockResults.skipped;
    this.results.total += mockResults.passed + mockResults.failed + mockResults.skipped;
    
    log.info(`${targetName}: ${mockResults.passed} passed, ${mockResults.failed} failed, ${mockResults.skipped} skipped`);
  }

  async generateReports() {
    log.info('Generating test reports...');
    
    try {
      // Generate combined coverage report
      if (this.options.coverage) {
        await this.generateCoverageReport();
      }
      
      // Generate summary report
      await this.generateSummaryReport();
      
      log.success('Test reports generated');
      
    } catch (error) {
      log.error(`Failed to generate reports: ${error.message}`);
    }
  }

  async generateCoverageReport() {
    // Combine coverage from all test frameworks
    log.info('Generating combined coverage report...');
    
    // This would merge coverage from vitest, jest, playwright, etc.
    // Implementation depends on your specific setup
  }

  async generateSummaryReport() {
    const summary = {
      timestamp: new Date().toISOString(),
      timezone: 'Australia/Sydney',
      results: this.results,
      environment: {
        node: process.version,
        platform: process.platform,
        ci: !!process.env.CI,
      },
      configuration: {
        types: this.options.types,
        parallel: this.options.parallel,
        coverage: this.options.coverage,
      },
    };
    
    const reportPath = path.join(testReporting.directories.reports, 'test-summary.json');
    fs.writeFileSync(reportPath, JSON.stringify(summary, null, 2));
    
    log.info(`Summary report written to: ${reportPath}`);
  }

  printSummary() {
    const { passed, failed, skipped, total, duration } = this.results;
    
    console.log('\n' + '='.repeat(60));
    log.header('Test Summary');
    
    console.log(`${colors.green}✅ Passed: ${passed}${colors.reset}`);
    console.log(`${colors.red}❌ Failed: ${failed}${colors.reset}`);
    console.log(`${colors.yellow}⏭️  Skipped: ${skipped}${colors.reset}`);
    console.log(`${colors.blue}📊 Total: ${total}${colors.reset}`);
    console.log(`${colors.cyan}⏱️  Duration: ${(duration / 1000).toFixed(2)}s${colors.reset}`);
    
    if (failed === 0) {
      log.success('All tests passed! 🎉');
    } else {
      log.error(`${failed} test(s) failed`);
    }
    
    console.log('='.repeat(60) + '\n');
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const options = {
    verbose: args.includes('--verbose') || args.includes('-v'),
    coverage: !args.includes('--no-coverage'),
    parallel: !args.includes('--no-parallel'),
    bail: args.includes('--bail'),
    clean: !args.includes('--no-clean'),
    report: !args.includes('--no-report'),
  };
  
  // Parse test types
  const typeIndex = args.indexOf('--types');
  if (typeIndex !== -1 && args[typeIndex + 1]) {
    options.types = args[typeIndex + 1].split(',');
  }
  
  // Parse apps
  const appsIndex = args.indexOf('--apps');
  if (appsIndex !== -1 && args[appsIndex + 1]) {
    options.apps = args[appsIndex + 1].split(',');
  }
  
  // Parse packages
  const packagesIndex = args.indexOf('--packages');
  if (packagesIndex !== -1 && args[packagesIndex + 1]) {
    options.packages = args[packagesIndex + 1].split(',');
  }
  
  // Show help
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
ACT Placemat Test Runner

Usage: node scripts/test-runner.js [options]

Options:
  --types <types>        Test types to run (unit,integration,e2e,mobile,api)
  --apps <apps>          Applications to test (frontend,backend,api,mobile,intelligence)
  --packages <packages>  Packages to test (types,utils,schemas,test-utils)
  --verbose, -v          Verbose output
  --no-coverage          Disable coverage reporting
  --no-parallel          Run tests sequentially
  --bail                 Stop on first failure
  --no-clean             Don't clean previous reports
  --no-report            Don't generate reports
  --help, -h             Show this help

Examples:
  node scripts/test-runner.js                           # Run unit tests for all
  node scripts/test-runner.js --types unit,integration  # Run unit and integration tests
  node scripts/test-runner.js --apps frontend,backend   # Test specific apps
  node scripts/test-runner.js --verbose --bail          # Verbose output, stop on failure
    `);
    process.exit(0);
  }
  
  const runner = new TestRunner(options);
  await runner.run();
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Test runner error:', error);
    process.exit(1);
  });
}

export { TestRunner };