import { afterEach, beforeAll, vi } from 'vitest';

beforeAll(() => {
  process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
  process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'service-role-test-key';
  process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'anon-test-key';
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});
