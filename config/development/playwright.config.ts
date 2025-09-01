import { defineConfig, devices } from '@playwright/test';
import type { PlaywrightTestConfig } from '@playwright/test';

/**
 * Comprehensive Playwright Configuration for ACT Placemat
 * 
 * Provides E2E testing across multiple browsers, devices, and environments
 * with Australian-specific configurations and accessibility testing
 */

// Read environment variables
const baseURL = process.env.BASE_URL || 'http://localhost:5173';
const headless = process.env.CI === 'true' || process.env.HEADLESS === 'true';
const workers = process.env.CI ? 1 : undefined; // Single worker in CI

const config: PlaywrightTestConfig = defineConfig({
  testDir: './tests/e2e',
  
  // Test file patterns
  testMatch: [
    '**/*.spec.ts',
    '**/*.test.ts',
    '**/*.e2e.ts',
  ],
  
  // Global test timeout
  timeout: 60000, // 1 minute per test
  expect: {
    timeout: 10000, // 10 seconds for assertions
  },
  
  // Parallel execution
  fullyParallel: true,
  workers,
  
  // Retry configuration
  retries: process.env.CI ? 2 : 0,
  
  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'test-results/playwright-report' }],
    ['json', { outputFile: 'test-results/playwright-results.json' }],
    ['junit', { outputFile: 'test-results/playwright-junit.xml' }],
    process.env.CI ? ['github'] : ['list'],
  ],
  
  // Global test configuration
  use: {
    // Base URL for all tests
    baseURL,
    
    // Browser configuration
    headless,
    
    // Viewport (Australian standard desktop)
    viewport: { width: 1366, height: 768 },
    
    // Australian locale and timezone
    locale: 'en-AU',
    timezoneId: 'Australia/Sydney',
    
    // Tracing and debugging
    trace: process.env.CI ? 'retain-on-failure' : 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    
    // Network and performance
    actionTimeout: 15000,
    navigationTimeout: 30000,
    
    // Accessibility testing
    extraHTTPHeaders: {
      'Accept-Language': 'en-AU,en;q=0.9',
    },
  },
  
  // Test projects for different browsers and scenarios
  projects: [
    // Setup project for authentication
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
      teardown: 'cleanup',
    },
    
    // Cleanup project
    {
      name: 'cleanup',
      testMatch: /.*\.cleanup\.ts/,
    },
    
    // === Desktop Browsers ===
    {
      name: 'desktop-chromium',
      use: { 
        ...devices['Desktop Chrome'],
        locale: 'en-AU',
        timezoneId: 'Australia/Sydney',
      },
      dependencies: ['setup'],
    },
    
    {
      name: 'desktop-firefox',
      use: { 
        ...devices['Desktop Firefox'],
        locale: 'en-AU',
        timezoneId: 'Australia/Sydney',
      },
      dependencies: ['setup'],
    },
    
    {
      name: 'desktop-webkit',
      use: { 
        ...devices['Desktop Safari'],
        locale: 'en-AU',
        timezoneId: 'Australia/Sydney',
      },
      dependencies: ['setup'],
    },
    
    // === Mobile Devices (Australian popular devices) ===
    {
      name: 'mobile-chrome',
      use: { 
        ...devices['Pixel 5'],
        locale: 'en-AU',
        timezoneId: 'Australia/Sydney',
      },
      dependencies: ['setup'],
    },
    
    {
      name: 'mobile-safari',
      use: { 
        ...devices['iPhone 12'],
        locale: 'en-AU',
        timezoneId: 'Australia/Sydney',
      },
      dependencies: ['setup'],
    },
    
    // === Accessibility Testing ===
    {
      name: 'accessibility',
      use: {
        ...devices['Desktop Chrome'],
        locale: 'en-AU',
        timezoneId: 'Australia/Sydney',
        // Force prefers-reduced-motion for accessibility testing
        extraHTTPHeaders: {
          'Accept-Language': 'en-AU,en;q=0.9',
        },
      },
      testMatch: /.*\.a11y\.(spec|test)\.ts/,
      dependencies: ['setup'],
    },
    
    // === Performance Testing ===
    {
      name: 'performance',
      use: {
        ...devices['Desktop Chrome'],
        locale: 'en-AU',
        timezoneId: 'Australia/Sydney',
        // Throttle network for performance testing
        launchOptions: {
          args: ['--disable-dev-shm-usage'],
        },
      },
      testMatch: /.*\.perf\.(spec|test)\.ts/,
      dependencies: ['setup'],
    },
    
    // === API Testing ===
    {
      name: 'api',
      use: {
        baseURL: process.env.API_BASE_URL || 'http://localhost:4000',
        extraHTTPHeaders: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      },
      testMatch: /.*\.api\.(spec|test)\.ts/,
    },
  ],
  
  // Web server configuration for local development
  webServer: [
    // Frontend server
    {
      command: 'npm run dev:frontend',
      port: 5173,
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
      env: {
        NODE_ENV: 'test',
        VITE_API_URL: 'http://localhost:4000',
      },
    },
    
    // Backend server
    {
      command: 'npm run dev:backend',
      port: 4000,
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
      env: {
        NODE_ENV: 'test',
        PORT: '4000',
        DATABASE_URL: 'postgresql://test:test@localhost:5432/act_placemat_test',
      },
    },
  ],
  
  // Output directories
  outputDir: 'test-results/playwright-artifacts',
  
  // Global setup and teardown
  globalSetup: require.resolve('./tests/e2e/global-setup.ts'),
  globalTeardown: require.resolve('./tests/e2e/global-teardown.ts'),
});

export default config;