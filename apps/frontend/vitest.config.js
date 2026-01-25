/**
 * Vitest configuration for frontend testing
 */

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.js'],
    include: ['src/**/*.{test,spec}.{js,jsx,ts,tsx}'],
    exclude: ['node_modules/', 'dist/', '.vite/'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json', 'lcov'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.config.js',
        '**/*.d.ts',
        '**/types/**',
        'src/main.tsx',
        'src/vite-env.d.ts',
      ],
      include: ['src/**/*.{js,jsx,ts,tsx}'],
    },
    testTimeout: 10000,
    hookTimeout: 10000,
    deps: {
      inline: ['@testing-library/react'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
