/**
 * Jest Global Setup for ACT Placemat
 * Runs once before all tests start
 */

module.exports = async () => {
  // Set Australian timezone globally
  process.env.TZ = 'Australia/Sydney';
  
  // Ensure test environment
  process.env.NODE_ENV = 'test';
  
  // Set up test database URL if not provided
  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/act_placemat_test';
  }
  
  // Set up test-specific configuration
  process.env.LOG_LEVEL = 'error'; // Reduce log noise in tests
  process.env.ENABLE_ANALYTICS = 'false';
  process.env.ENABLE_EMAIL_NOTIFICATIONS = 'false';
  
  // Australian locale setup
  if (typeof Intl !== 'undefined') {
    // Ensure Australian locale is available for number/date formatting tests
    try {
      new Intl.NumberFormat('en-AU');
      new Intl.DateTimeFormat('en-AU');
    } catch (error) {
      console.warn('Australian locale (en-AU) not available in test environment');
    }
  }
  
  console.log('🧪 Jest global setup complete - Australian test environment configured');
};