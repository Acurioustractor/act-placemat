import { chromium, FullConfig } from '@playwright/test';

/**
 * Playwright Global Setup for ACT Placemat
 * 
 * Runs once before all E2E tests to prepare the test environment
 */

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting E2E test environment setup...');
  
  const { baseURL } = config.projects[0].use;
  
  try {
    // Launch browser for setup tasks
    const browser = await chromium.launch();
    const context = await browser.newContext({
      locale: 'en-AU',
      timezoneId: 'Australia/Sydney',
    });
    const page = await context.newPage();
    
    // Wait for application to be ready
    console.log(`⏳ Waiting for application at ${baseURL}...`);
    
    let retries = 0;
    const maxRetries = 30; // 30 seconds
    
    while (retries < maxRetries) {
      try {
        const response = await page.goto(baseURL || 'http://localhost:5173', {
          waitUntil: 'networkidle',
          timeout: 5000,
        });
        
        if (response?.ok()) {
          console.log('✅ Application is ready');
          break;
        }
      } catch (error) {
        retries++;
        if (retries === maxRetries) {
          throw new Error(`❌ Application not ready after ${maxRetries} attempts: ${error}`);
        }
        console.log(`⏳ Attempt ${retries}/${maxRetries} - waiting for application...`);
        await page.waitForTimeout(1000);
      }
    }
    
    // Set up test data if needed
    console.log('📊 Setting up test data...');
    
    // Check if we need to create test users, data, etc.
    // This is where you'd typically:
    // 1. Create test users
    // 2. Seed test data
    // 3. Set up authentication states
    
    // Example: Create test user session
    try {
      // Navigate to login/setup if needed
      await page.goto(`${baseURL}/auth/setup`, { 
        waitUntil: 'networkidle',
        timeout: 10000 
      });
      
      // Check if we need to set up test authentication
      const needsSetup = await page.locator('[data-testid="setup-required"]').isVisible().catch(() => false);
      
      if (needsSetup) {
        console.log('🔧 Setting up test authentication...');
        // Perform any necessary setup
      }
      
    } catch (error) {
      // Setup page might not exist, that's okay
      console.log('ℹ️  No setup page found, continuing...');
    }
    
    // Save authentication state for later tests
    console.log('💾 Saving authentication state...');
    await context.storageState({ path: 'tests/e2e/auth.json' });
    
    await browser.close();
    
    console.log('✅ E2E test environment setup complete');
    
  } catch (error) {
    console.error('❌ E2E setup failed:', error);
    throw error;
  }
}

export default globalSetup;