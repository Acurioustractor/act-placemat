/**
 * Jest Setup for ACT Placemat
 * Configures global test environment and utilities
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.TZ = 'Australia/Sydney';

// Increase test timeout for integration tests
jest.setTimeout(30000);

// Mock console methods in tests (can be overridden per test)
global.console = {
  ...console,
  // Uncomment to suppress logs in tests
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(),
};

// Global test utilities
global.testUtils = {
  // Helper to wait for async operations
  wait: (ms = 100) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Helper to create mock functions with Australian-specific data
  createMockUser: () => ({
    id: '1',
    email: 'test@example.com.au',
    name: 'Test User',
    timezone: 'Australia/Sydney',
    locale: 'en-AU',
    currency: 'AUD',
    createdAt: new Date('2024-01-01T00:00:00+11:00'),
    updatedAt: new Date('2024-01-01T00:00:00+11:00'),
  }),
  
  // Helper for Australian address data
  createMockAddress: () => ({
    street: '123 Test Street',
    suburb: 'Test Suburb',
    state: 'NSW',
    postcode: '2000',
    country: 'Australia',
  }),
  
  // Helper for Australian phone numbers
  createMockPhone: () => '+61 2 1234 5678',
  
  // Helper for Australian business numbers
  createMockABN: () => '12 345 678 901',
  
  // Helper to format Australian currency
  formatAUD: (amount) => new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
  }).format(amount),
};

// Global mocks for external services
jest.mock('node-fetch', () => jest.fn());

// Mock environment variables that should always be present in tests
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/act_placemat_test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.ENCRYPTION_KEY = 'test-encryption-key-for-testing-only-32';

// Suppress specific warnings in tests
const originalWarn = console.warn;
console.warn = (...args) => {
  // Suppress specific warnings that clutter test output
  const warningsToSuppress = [
    'punycode',
    'DeprecationWarning',
  ];
  
  const message = args.join(' ');
  if (warningsToSuppress.some(warning => message.includes(warning))) {
    return;
  }
  
  originalWarn.apply(console, args);
};

// Handle unhandled promise rejections in tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Fail the test if there are unhandled rejections
  process.exit(1);
});

// Clean up after tests
afterAll(async () => {
  // Close any open connections, clean up resources
  // This will be customized per application
});

// Global test data generators
global.testData = {
  // Australian states and territories
  states: ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'],
  
  // Australian postcodes by state
  postcodes: {
    NSW: ['2000', '2001', '2010', '2040', '2100'],
    VIC: ['3000', '3001', '3010', '3040', '3100'],
    QLD: ['4000', '4001', '4010', '4040', '4100'],
    WA: ['6000', '6001', '6010', '6040', '6100'],
    SA: ['5000', '5001', '5010', '5040', '5100'],
    TAS: ['7000', '7001', '7010', '7040', '7100'],
    ACT: ['2600', '2601', '2610', '2640', '2700'],
    NT: ['0800', '0801', '0810', '0840', '0900'],
  },
  
  // Common Australian business types
  businessTypes: [
    'Proprietary Limited',
    'Public Company',
    'Partnership',
    'Sole Trader',
    'Trust',
    'Cooperative',
    'Association',
  ],
};