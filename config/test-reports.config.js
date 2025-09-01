/**
 * Test Reporting Configuration for ACT Placemat
 * 
 * Centralizes test reporting and coverage configuration
 * across all testing frameworks (Jest, Vitest, Playwright, Detox)
 */

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Base directories
const ROOT_DIR = __dirname;
const REPORTS_DIR = path.join(ROOT_DIR, 'test-results');
const COVERAGE_DIR = path.join(ROOT_DIR, 'coverage');

// Test reporting configuration
const testReporting = {
  // Output directories
  directories: {
    reports: REPORTS_DIR,
    coverage: COVERAGE_DIR,
    artifacts: path.join(REPORTS_DIR, 'artifacts'),
    screenshots: path.join(REPORTS_DIR, 'screenshots'),
    videos: path.join(REPORTS_DIR, 'videos'),
    logs: path.join(REPORTS_DIR, 'logs'),
  },

  // Coverage thresholds by application type
  coverageThresholds: {
    // Shared packages should have high coverage
    packages: {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
    
    // Frontend applications
    frontend: {
      branches: 75,
      functions: 75,
      lines: 75,
      statements: 75,
    },
    
    // Backend APIs
    backend: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    
    // API services (NestJS)
    api: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    
    // Mobile applications
    mobile: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
    
    // Intelligence/AI services (can be harder to test)
    intelligence: {
      branches: 65,
      functions: 65,
      lines: 65,
      statements: 65,
    },
    
    // Worker applications
    workers: {
      branches: 75,
      functions: 75,
      lines: 75,
      statements: 75,
    },
  },

  // Reporter configurations
  reporters: {
    // Jest/Vitest HTML reporter
    html: {
      outputDir: path.join(COVERAGE_DIR, 'html'),
      subdir: '.',
      reportTitle: 'ACT Placemat Test Coverage',
    },
    
    // JUnit XML for CI/CD
    junit: {
      outputDirectory: REPORTS_DIR,
      outputName: 'junit.xml',
      suiteName: 'ACT Placemat Tests',
      classNameTemplate: '{classname}',
      titleTemplate: '{title}',
    },
    
    // LCOV for external tools
    lcov: {
      outputFile: path.join(COVERAGE_DIR, 'lcov.info'),
    },
    
    // JSON for programmatic access
    json: {
      outputFile: path.join(COVERAGE_DIR, 'coverage.json'),
    },
    
    // Text summary for console
    text: {
      skipFull: false,
    },
    
    // Clover XML for some CI systems
    clover: {
      outputFile: path.join(COVERAGE_DIR, 'clover.xml'),
    },
  },

  // Exclude patterns for coverage
  coverageExcludes: [
    // Node modules
    'node_modules/**',
    
    // Build outputs
    'dist/**',
    'build/**',
    'coverage/**',
    
    // Test files
    '**/*.test.*',
    '**/*.spec.*',
    '**/*.e2e.*',
    '**/*.detox.*',
    '**/tests/**',
    '**/test/**',
    '**/__tests__/**',
    
    // Configuration files
    '**/*.config.*',
    '**/.*rc.*',
    '**/.env*',
    
    // Entry points and setup files
    '**/main.*',
    '**/index.*',
    '**/setup.*',
    '**/test-setup.*',
    
    // Type definitions
    '**/*.d.ts',
    
    // Stories and examples
    '**/*.stories.*',
    '**/stories/**',
    '**/examples/**',
    
    // Generated files
    '**/generated/**',
    '**/.next/**',
    '**/.cache/**',
    
    // Logs and temporary files
    '**/logs/**',
    '**/tmp/**',
    '**/temp/**',
  ],

  // Performance budgets for tests
  performance: {
    // Maximum test execution times (in milliseconds)
    timeouts: {
      unit: 10000,        // 10 seconds for unit tests
      integration: 30000, // 30 seconds for integration tests
      e2e: 60000,         // 1 minute for E2E tests
      mobile: 120000,     // 2 minutes for mobile tests
    },
    
    // Maximum bundle sizes for different app types
    bundleSizes: {
      frontend: '5MB',
      mobile: '10MB',
      packages: '100KB',
    },
  },

  // Test result aggregation
  aggregation: {
    // Combine coverage from all test types
    combineCoverage: true,
    
    // Generate summary report
    generateSummary: true,
    
    // Upload to external services
    uploadToCodecov: process.env.CI === 'true',
    uploadToSonarQube: process.env.CI === 'true',
  },
};

// Export configurations for different frameworks
export {
  testReporting,
  
  // Jest configuration
  getJestReporters,
  getVitestReporters,
  getPlaywrightReporters,
  getCoverageConfig,
  ensureDirectories,
  cleanReports,
};

function getJestReporters() {
  return [
    'default',
    ['jest-html-reporter', {
      pageTitle: 'ACT Placemat Jest Test Report',
      outputPath: path.join(testReporting.directories.reports, 'jest-report.html'),
      includeFailureMsg: true,
      includeSuiteFailure: true,
    }],
    ['jest-junit', {
      ...testReporting.reporters.junit,
      outputName: 'jest-junit.xml',
    }],
  ];
  
}

function getVitestReporters() {
  return [
    'default',
    'html',
    'json',
    'junit',
  ];
  
}

function getPlaywrightReporters() {
  return [
    ['html', { 
      outputFolder: path.join(testReporting.directories.reports, 'playwright-report'),
      open: 'never'
    }],
    ['json', { 
      outputFile: path.join(testReporting.directories.reports, 'playwright-results.json')
    }],
    ['junit', { 
      outputFile: path.join(testReporting.directories.reports, 'playwright-junit.xml')
    }],
    process.env.CI ? ['github'] : ['list'],
  ];
  
}

function getCoverageConfig(tool = 'vitest') {
  return ({
    provider: 'v8',
    reporter: ['text', 'html', 'json', 'lcov', 'clover'],
    reportsDirectory: testReporting.directories.coverage,
    exclude: testReporting.coverageExcludes,
    thresholds: {
      global: testReporting.coverageThresholds.packages, // Default to strictest
    },
    cleanOnRerun: true,
    all: true,
  });
  
}

function ensureDirectories() {
  Object.values(testReporting.directories).forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

function cleanReports() {
  Object.values(testReporting.directories).forEach(dir => {
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
}