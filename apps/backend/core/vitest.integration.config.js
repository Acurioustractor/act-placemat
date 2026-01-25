/**
 * Vitest configuration for integration tests
 */

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.js'],
    include: ['tests/integration/**/*.test.{js,ts}'],
    exclude: ['node_modules/', 'dist/', 'coverage/', '**/*.config.js'],
    testTimeout: 30000, // Longer timeout for integration tests
    hookTimeout: 15000,
    pool: 'threads',
    poolOptions: {
      threads: {
        minThreads: 2,
        maxThreads: 4,
      },
    },
  },
});
