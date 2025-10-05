/**
 * Vitest configuration for backend testing
 */

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      exclude: [
        'node_modules/',
        'tests/',
        'coverage/',
        '**/*.config.js',
        '**/*.test.js'
      ]
    },
    testTimeout: 10000, // 10 seconds for API tests
    hookTimeout: 10000
  }
});