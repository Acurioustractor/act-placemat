const nxPreset = require('@nx/jest/preset').default;

/**
 * Enhanced Jest preset for ACT Placemat
 * Provides comprehensive testing configuration for Node.js and NestJS applications
 */
module.exports = {
  ...nxPreset,
  
  // Global test configuration
  testEnvironment: 'node',
  maxWorkers: '50%', // Use half available cores
  
  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.{ts,js}',
    '!src/**/*.spec.{ts,js}',
    '!src/**/*.test.{ts,js}',
    '!src/**/*.config.{ts,js}',
    '!src/**/index.{ts,js}',
    '!src/main.{ts,js}',
    '!src/test-setup.{ts,js}',
  ],
  
  coverageReporters: ['text', 'html', 'json', 'lcov', 'clover'],
  
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  
  // Test patterns
  testMatch: [
    '**/__tests__/**/*.(ts|js)',
    '**/*.(test|spec).(ts|js)',
  ],
  
  // Module resolution
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  // Transform configuration for TypeScript
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  
  // Test environment setup
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  
  // Australian timezone for consistent date testing
  globalSetup: '<rootDir>/jest.global-setup.js',
  
  // Module name mapping for absolute imports
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@act/types$': '<rootDir>/packages/types/src',
    '^@act/utils$': '<rootDir>/packages/utils/src',
    '^@act/schemas$': '<rootDir>/packages/schemas/src',
  },
  
  // Timeout settings
  testTimeout: 20000, // 20 seconds for integration tests
  
  // Verbose output for better debugging
  verbose: true,
  
  // Fail tests on console errors (helps catch unhandled promises)
  errorOnDeprecated: true,
  
  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,
  
  // Better error reporting
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: 'coverage',
        outputName: 'junit.xml',
        suiteName: 'ACT Placemat Tests',
      },
    ],
  ],
};
