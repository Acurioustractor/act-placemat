/**
 * Vitest Test Setup
 *
 * Global configuration and mocks for all backend tests
 */

import { afterEach, beforeAll, vi } from 'vitest';

// Set test environment variables
beforeAll(() => {
  // Supabase configuration
  process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
  process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'service-role-test-key';
  process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'anon-test-key';

  // Redis configuration
  process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

  // Notion configuration
  process.env.NOTION_TOKEN = process.env.NOTION_TOKEN || 'test-notion-token';
  process.env.NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID || 'test-database-id';

  // Xero configuration
  process.env.XERO_CLIENT_ID = process.env.XERO_CLIENT_ID || 'test-client-id';
  process.env.XERO_CLIENT_SECRET = process.env.XERO_CLIENT_SECRET || 'test-client-secret';

  // Email configuration
  process.env.SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || 'test-sendgrid-key';
  process.env.EMAIL_FROM = process.env.EMAIL_FROM || 'test@example.com';

  // Twilio configuration
  process.env.TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || 'test-sid';
  process.env.TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || 'test-token';

  // Feature flags for testing
  process.env.ENABLE_MOCK_SERVICES = 'true';
  process.env.NODE_ENV = 'test';
});

// Reset all mocks after each test
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});
