/**
 * Vitest configuration for E2E tests
 */

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.js'],
    include: ['tests/e2e/**/*.test.{js,ts}'],
    exclude: ['node_modules/', 'dist/', 'coverage/', '**/*.config.js'],
    testTimeout: 60000, // Longer timeout for E2E tests
    hookTimeout: 30000,
    pool: 'forks',
    poolOptions: {
      forks: {
        minForks: 1,
        maxForks: 2,
      },
    },
  },
});
