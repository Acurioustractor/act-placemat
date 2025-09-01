import { defineWorkspace } from 'vitest/config';

/**
 * Vitest Workspace Configuration for ACT Placemat
 * 
 * This configuration defines testing environments for different parts of the monorepo:
 * - Frontend (React/Vite apps)
 * - Backend (Node.js/NestJS apps)
 * - Packages (Shared libraries)
 * - Intelligence (AI/ML services)
 */

export default defineWorkspace([
  // Frontend applications with React/DOM testing
  {
    test: {
      name: 'frontend',
      include: ['apps/frontend/**/*.{test,spec}.{ts,tsx}'],
      environment: 'jsdom',
      globals: true,
      setupFiles: ['apps/frontend/src/tests/setup.ts'],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'html', 'json', 'lcov'],
        exclude: [
          'node_modules/',
          'src/tests/',
          'coverage/',
          '**/*.config.{ts,js}',
          '**/*.test.{ts,tsx}',
          'src/vite-env.d.ts',
          'src/main.tsx',
          'src/test-main.tsx',
        ],
        thresholds: {
          global: {
            branches: 75,
            functions: 75,
            lines: 75,
            statements: 75,
          },
        },
      },
      testTimeout: 15000,
      hookTimeout: 15000,
    },
    resolve: {
      alias: {
        '@': './apps/frontend/src',
        '@act/types': './packages/types/src',
        '@act/utils': './packages/utils/src',
        '@act/schemas': './packages/schemas/src',
      },
    },
  },

  // Backend Node.js applications
  {
    test: {
      name: 'backend',
      include: ['apps/backend/**/*.{test,spec}.{ts,js}'],
      environment: 'node',
      globals: true,
      setupFiles: ['apps/backend/tests/setup.js'],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'html', 'json', 'lcov'],
        exclude: [
          'node_modules/',
          'tests/',
          'coverage/',
          '**/*.config.js',
          '**/*.test.js',
          'server.js',
          'start-enhanced.js',
        ],
        thresholds: {
          global: {
            branches: 70,
            functions: 70,
            lines: 70,
            statements: 70,
          },
        },
      },
      testTimeout: 20000, // Longer for API tests
      hookTimeout: 20000,
    },
  },


  // Intelligence/AI services
  {
    test: {
      name: 'intelligence',
      include: ['apps/intelligence/**/*.{test,spec}.{ts,js}'],
      environment: 'node',
      globals: true,
      coverage: {
        provider: 'v8',
        reporter: ['text', 'html', 'json', 'lcov'],
        exclude: [
          'node_modules/',
          'coverage/',
          '**/*.config.js',
          '**/*.test.js',
          'src/demo.js',
          'src/live-demo.js',
        ],
        thresholds: {
          global: {
            branches: 65, // AI code can be harder to test
            functions: 65,
            lines: 65,
            statements: 65,
          },
        },
      },
      testTimeout: 30000, // AI operations can be slow
      hookTimeout: 30000,
    },
  },

  // Mobile applications (React Native with special handling)
  {
    test: {
      name: 'mobile',
      include: ['apps/mobile/**/*.{test,spec}.{ts,tsx}'],
      environment: 'node', // React Native testing in Node
      globals: true,
      setupFiles: ['apps/mobile/src/test-setup.ts'],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'html', 'json', 'lcov'],
        exclude: [
          'node_modules/',
          'src/test-setup.ts',
          'coverage/',
          '**/*.config.js',
          '**/*.test.{ts,tsx}',
          'index.js',
        ],
        thresholds: {
          global: {
            branches: 70,
            functions: 70,
            lines: 70,
            statements: 70,
          },
        },
      },
      testTimeout: 20000,
      hookTimeout: 20000,
    },
  },

  // Shared packages/libraries
  {
    test: {
      name: 'packages',
      include: ['packages/**/*.{test,spec}.{ts,tsx}'],
      environment: 'node', // Most packages are utility libraries
      globals: true,
      coverage: {
        provider: 'v8',
        reporter: ['text', 'html', 'json', 'lcov'],
        exclude: [
          'node_modules/',
          'coverage/',
          '**/*.config.{ts,js}',
          '**/*.test.{ts,tsx}',
          'src/index.ts', // Usually just exports
        ],
        thresholds: {
          global: {
            branches: 85, // Libraries should be well-tested
            functions: 85,
            lines: 85,
            statements: 85,
          },
        },
      },
      testTimeout: 10000,
      hookTimeout: 10000,
    },
  },

  // Worker applications
  {
    test: {
      name: 'workers',
      include: ['apps/worker-*/**/*.{test,spec}.{ts,js}'],
      environment: 'node',
      globals: true,
      coverage: {
        provider: 'v8',
        reporter: ['text', 'html', 'json', 'lcov'],
        exclude: [
          'node_modules/',
          'coverage/',
          '**/*.config.{ts,js}',
          '**/*.test.{ts,js}',
          'src/main.ts',
        ],
        thresholds: {
          global: {
            branches: 75,
            functions: 75,
            lines: 75,
            statements: 75,
          },
        },
      },
      testTimeout: 15000,
      hookTimeout: 15000,
    },
  },
]);