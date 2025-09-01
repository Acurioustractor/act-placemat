/**
 * Test setup and configuration
 */

import { beforeAll, afterAll, beforeEach } from 'vitest';
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
process.env.ALLOWED_ORIGINS = 'http://localhost:3000,http://localhost:5173';
process.env.VALID_API_KEYS = 'test-api-key-1,test-api-key-2';
process.env.NOTION_PARTNERS_DATABASE_ID = 'test-notion-database-id';

// Global test setup
beforeAll(() => {
  console.log('🧪 Starting test suite...');
});

afterAll(() => {
  console.log('✅ Test suite completed');
});

beforeEach(() => {
  // Clear any test data or mocks before each test
});

// Mock global functions that might not be available in test environment
global.mcp__notion__query_notion_database = async () => ({
  results: [
    {
      id: 'test-page-1',
      properties: {
        Name: { title: [{ plain_text: 'Test Partner' }] },
        Type: { select: { name: 'Community' } },
        Status: { select: { name: 'Active' } },
        Featured: { checkbox: true }
      }
    }
  ]
});

global.mcp__notion__search_notion = async () => ({
  results: []
});

export default {};