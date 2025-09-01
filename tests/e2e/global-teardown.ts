import { FullConfig } from '@playwright/test';
import { promises as fs } from 'fs';

/**
 * Playwright Global Teardown for ACT Placemat
 * 
 * Runs once after all E2E tests complete to clean up the test environment
 */

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting E2E test environment cleanup...');
  
  try {
    // Clean up authentication state files
    console.log('🗑️  Cleaning up authentication state...');
    try {
      await fs.unlink('tests/e2e/auth.json');
    } catch (error) {
      // File might not exist, that's okay
    }
    
    // Clean up test data if needed
    console.log('📊 Cleaning up test data...');
    
    // This is where you'd typically:
    // 1. Remove test users
    // 2. Clean up test database records
    // 3. Reset any test state
    
    // Example: Clean up test files
    try {
      await fs.unlink('tests/e2e/test-uploads/*').catch(() => {});
    } catch (error) {
      // Directory might not exist, that's okay
    }
    
    // Log test results summary
    console.log('📈 E2E test session summary:');
    console.log(`   Configuration: ${config.projects.length} projects`);
    console.log(`   Workers: ${config.workers || 'auto'}`);
    console.log(`   Base URL: ${config.projects[0]?.use?.baseURL || 'not set'}`);
    
    console.log('✅ E2E test environment cleanup complete');
    
  } catch (error) {
    console.error('❌ E2E teardown failed:', error);
    // Don't throw error as it might mask test failures
  }
}

export default globalTeardown;