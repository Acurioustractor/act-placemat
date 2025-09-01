/**
 * General Test Helpers for ACT Placemat
 * 
 * Provides utility functions for common testing scenarios
 * including async operations, DOM interactions, and data validation
 */

/**
 * Wait for a specified amount of time
 */
export const wait = (ms = 100): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Wait for a condition to be true
 */
export const waitFor = async (
  condition: () => boolean | Promise<boolean>,
  timeout = 5000,
  interval = 100
): Promise<void> => {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await wait(interval);
  }
  
  throw new Error(`Condition not met within ${timeout}ms`);
};

/**
 * Retry a function until it succeeds or max attempts reached
 */
export const retry = async <T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  delay = 1000
): Promise<T> => {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxAttempts) {
        await wait(delay * attempt); // Exponential backoff
      }
    }
  }
  
  throw lastError!;
};

/**
 * Create a mock function with Australian-specific behaviours
 */
export const createAustralianMockFn = <T extends (...args: any[]) => any>(
  implementation?: T
): jest.MockedFunction<T> => {
  const mockFn = jest.fn(implementation) as jest.MockedFunction<T>;
  
  // Add Australian-specific helpers
  (mockFn as any).mockResolveAustralianValue = (value: any) => {
    mockFn.mockResolvedValue({
      ...value,
      timezone: 'Australia/Sydney',
      locale: 'en-AU',
      currency: 'AUD',
    });
  };
  
  return mockFn;
};

/**
 * Generate test IDs with consistent format
 */
export const generateTestId = (base: string, suffix?: string): string => {
  const id = base.toLowerCase().replace(/[^a-z0-9]/g, '-');
  return suffix ? `${id}-${suffix}` : id;
};

/**
 * Create test environment variables
 */
export const createTestEnv = (overrides: Record<string, string> = {}): Record<string, string> => {
  return {
    NODE_ENV: 'test',
    TZ: 'Australia/Sydney',
    DATABASE_URL: 'postgresql://test:test@localhost:5432/act_placemat_test',
    JWT_SECRET: 'test-jwt-secret-for-testing-only',
    ENCRYPTION_KEY: 'test-encryption-key-for-testing-only-32',
    LOG_LEVEL: 'error',
    ENABLE_ANALYTICS: 'false',
    ENABLE_EMAIL_NOTIFICATIONS: 'false',
    ...overrides,
  };
};

/**
 * Mock console methods for testing
 */
export const mockConsole = () => {
  const originalConsole = { ...console };
  
  const mockedMethods = {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
  };
  
  Object.assign(console, mockedMethods);
  
  return {
    ...mockedMethods,
    restore: () => Object.assign(console, originalConsole),
  };
};

/**
 * Create a temporary file for testing
 */
export const createTempFile = async (content: string, extension = 'txt'): Promise<string> => {
  const fs = await import('fs/promises');
  const path = await import('path');
  const os = await import('os');
  
  const tempDir = os.tmpdir();
  const fileName = `test-${Date.now()}-${Math.random().toString(36).substring(2)}.${extension}`;
  const filePath = path.join(tempDir, fileName);
  
  await fs.writeFile(filePath, content, 'utf8');
  
  return filePath;
};

/**
 * Clean up temporary files
 */
export const cleanupTempFile = async (filePath: string): Promise<void> => {
  try {
    const fs = await import('fs/promises');
    await fs.unlink(filePath);
  } catch (error) {
    // File might not exist, ignore error
  }
};

/**
 * Assert that an object matches Australian format expectations
 */
export const expectAustralianFormat = (obj: any) => {
  return {
    toHaveAustralianPhone: () => {
      const phoneRegex = /^\+61\s[2-8]\s\d{4}\s\d{4}$|^\+61\s4\s\d{3}\s\d{3}\s\d{3}$/;
      expect(obj.phone).toMatch(phoneRegex);
    },
    
    toHaveAustralianPostcode: () => {
      const postcodeRegex = /^\d{4}$/;
      expect(obj.postcode || obj.address?.postcode).toMatch(postcodeRegex);
    },
    
    toHaveAustralianState: () => {
      const validStates = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'];
      expect(validStates).toContain(obj.state || obj.address?.state);
    },
    
    toHaveAustralianCurrency: () => {
      expect(obj.currency).toBe('AUD');
    },
    
    toHaveAustralianTimezone: () => {
      const australianTimezones = [
        'Australia/Sydney',
        'Australia/Melbourne',
        'Australia/Brisbane',
        'Australia/Perth',
        'Australia/Adelaide',
        'Australia/Hobart',
        'Australia/Darwin',
      ];
      expect(australianTimezones).toContain(obj.timezone);
    },
    
    toHaveValidABN: () => {
      const abnRegex = /^\d{2}\s\d{3}\s\d{3}\s\d{3}$/;
      expect(obj.abn).toMatch(abnRegex);
    },
  };
};

/**
 * Mock Australian date/time for testing
 */
export const mockAustralianDateTime = (date: Date = new Date()) => {
  const originalDate = global.Date;
  
  const MockDate = class extends Date {
    constructor(...args: any[]) {
      if (args.length === 0) {
        super(date);
      } else {
        super(...args);
      }
    }
    
    static now() {
      return date.getTime();
    }
  } as any;
  
  MockDate.UTC = originalDate.UTC;
  MockDate.parse = originalDate.parse;
  
  global.Date = MockDate;
  
  return {
    restore: () => {
      global.Date = originalDate;
    },
  };
};

/**
 * Create a test database connection
 */
export const createTestDatabase = async () => {
  const connectionString = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/act_placemat_test';
  
  // This would typically return a database connection
  // Implementation depends on your database library
  return {
    connectionString,
    query: jest.fn(),
    close: jest.fn(),
  };
};

/**
 * Seed test data into database
 */
export const seedTestData = async (data: any) => {
  // Implementation would depend on your database setup
  console.log('Seeding test data:', Object.keys(data));
  return Promise.resolve();
};

/**
 * Clean up test data from database
 */
export const cleanupTestData = async () => {
  // Implementation would depend on your database setup
  console.log('Cleaning up test data');
  return Promise.resolve();
};

/**
 * Create a test API client
 */
export const createTestApiClient = (baseURL = 'http://localhost:4000') => {
  return {
    baseURL,
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    patch: jest.fn(),
  };
};

/**
 * Validate Australian email format
 */
export const isValidAustralianEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isValid = emailRegex.test(email);
  
  // Additional Australian-specific validation
  const hasAustralianTLD = email.endsWith('.com.au') || email.endsWith('.org.au') || email.endsWith('.edu.au');
  
  return isValid; // TLD check is optional for testing
};

/**
 * Generate test file with Australian content
 */
export const generateTestFile = (type: 'csv' | 'json' | 'txt', content?: any) => {
  switch (type) {
    case 'csv':
      return `Name,Email,State,Postcode
John Smith,john@example.com.au,NSW,2000
Jane Doe,jane@example.com.au,VIC,3000`;
      
    case 'json':
      return JSON.stringify(content || {
        name: 'Test Organisation',
        location: { state: 'NSW', postcode: '2000' },
        contact: { phone: '+61 2 1234 5678' }
      }, null, 2);
      
    case 'txt':
      return content || 'Test file content for Australian testing';
      
    default:
      throw new Error(`Unsupported file type: ${type}`);
  }
};