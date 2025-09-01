# Testing Harness Guide

## Overview

ACT Placemat uses a comprehensive testing harness that supports multiple testing frameworks and application types with Australian-specific configurations.

## Quick Start

```bash
# Run all unit tests
npm run test

# Run specific test types
npm run test:unit           # Unit tests only
npm run test:integration    # Integration tests
npm run test:e2e           # End-to-end tests
npm run test:mobile        # Mobile app tests
npm run test:api           # API tests

# Combined test runs
npm run test:all           # All test types
npm run test:coverage      # Unit + integration with coverage
npm run test:ci            # CI pipeline (sequential, bail on failure)

# Development
npm run test:watch         # Watch mode for development
```

## Testing Frameworks

### 1. Vitest (Frontend & Libraries)
- **Used for:** React apps, shared packages
- **Configuration:** `vitest.workspace.ts`
- **Features:** Hot module reloading, TypeScript support, fast execution

### 2. Jest (Backend & Node.js)
- **Used for:** Backend APIs, Node.js services
- **Configuration:** `jest.preset.cjs`
- **Features:** Comprehensive mocking, snapshot testing

### 3. Playwright (E2E Testing)
- **Used for:** Web application end-to-end tests
- **Configuration:** `playwright.config.ts`
- **Features:** Multi-browser testing, mobile viewport simulation

### 4. Detox (Mobile Testing)
- **Used for:** React Native mobile app testing
- **Configuration:** `apps/mobile/.detoxrc.js`
- **Features:** iOS/Android simulation, device interaction

## Test Structure

```
apps/
├── frontend/src/__tests__/        # Frontend unit tests
├── backend/src/__tests__/         # Backend unit tests
├── api/src/__tests__/             # API unit tests
├── mobile/__tests__/              # Mobile unit tests
└── intelligence/src/__tests__/    # AI service tests

packages/
├── types/src/__tests__/           # Type library tests
├── utils/src/__tests__/           # Utility function tests
├── schemas/src/__tests__/         # Schema validation tests
└── test-utils/src/                # Shared test utilities

tests/
├── integration/                   # Cross-application tests
├── e2e/                          # End-to-end scenarios
├── api/                          # API integration tests
└── mobile/                       # Mobile E2E tests

test-results/                      # Generated reports
├── coverage/                      # Coverage reports
├── reports/                       # Test reports
├── screenshots/                   # Test screenshots
└── videos/                        # Test recordings
```

## Australian-Specific Features

### Timezone & Locale
All tests run with Australian settings:
- **Timezone:** `Australia/Sydney`
- **Locale:** `en-AU`
- **Currency:** `AUD`

### Data Generators
The `@act/test-utils` package includes Australian data generators:

```typescript
import { 
  generateABN, 
  generateACN, 
  generateAustralianAddress,
  generateAustralianPhone 
} from '@act/test-utils';

// Generate valid Australian Business Number
const abn = generateABN(); // "12 345 678 901"

// Generate Australian address
const address = generateAustralianAddress(); 
// { street: "123 Collins Street", city: "Melbourne", state: "VIC", postcode: "3000" }

// Generate Australian phone number
const phone = generateAustralianPhone(); // "+61 3 1234 5678"
```

### Format Validators
Built-in validators for Australian formats:

```typescript
import { expectAustralianFormat } from '@act/test-utils';

// Validate Australian formats
expectAustralianFormat(user).toHaveAustralianPhone();
expectAustralianFormat(organisation).toHaveValidABN();
expectAustralianFormat(address).toHaveAustralianPostcode();
```

## Coverage Requirements

Different application types have different coverage thresholds:

| Application Type | Coverage Threshold |
|------------------|-------------------|
| Packages         | 85%               |
| Backend APIs     | 80%               |
| Frontend Apps    | 75%               |
| Mobile Apps      | 70%               |
| AI Services      | 65%               |

## Test Types

### Unit Tests
- **Pattern:** `**/*.{test,spec}.{ts,tsx,js,jsx}`
- **Focus:** Individual functions, components, services
- **Isolation:** Mocked dependencies

### Integration Tests
- **Pattern:** `**/*.integration.{test,spec}.{ts,tsx,js,jsx}`
- **Focus:** Multiple components working together
- **Database:** Test database connections

### E2E Tests
- **Pattern:** `**/*.e2e.{test,spec}.ts`
- **Focus:** Complete user workflows
- **Environment:** Full application stack

### API Tests
- **Pattern:** `**/*.api.{test,spec}.{ts,js}`
- **Focus:** API endpoints and data flow
- **Tools:** HTTP clients, database validation

### Mobile Tests
- **Pattern:** `**/*.detox.{test,spec}.{ts,js}`
- **Focus:** Mobile app user interactions
- **Devices:** iOS and Android simulators

## CI/CD Integration

### GitHub Actions
The testing harness integrates with GitHub Actions:

```yaml
# .github/workflows/test.yml
# Runs tests on multiple Node.js versions
# Uploads coverage reports to Codecov
# Generates test artifacts
```

### Test Commands for CI
```bash
# Sequential execution with fail-fast
npm run test:ci

# Individual test types for parallel CI jobs
npm run test:unit
npm run test:integration  
npm run test:e2e
npm run test:api
npm run test:mobile
```

## Development Workflow

### Watch Mode
```bash
# Start Vitest in watch mode for active development
npm run test:watch
```

### Test-Driven Development
1. Write failing test
2. Implement minimum code to pass
3. Refactor while maintaining green tests
4. Commit with test coverage

### Debugging Tests
```bash
# Verbose output for debugging
node scripts/test-runner.js --verbose --types unit

# Run specific applications
node scripts/test-runner.js --apps frontend,backend

# Run specific packages
node scripts/test-runner.js --packages utils,schemas
```

## Best Practices

### 1. Test Naming
```typescript
// Good: Descriptive test names
describe('Australian user registration', () => {
  it('should validate ABN format for business users', () => {
    // Test implementation
  });
});
```

### 2. Australian Context
```typescript
// Always use Australian timezone in tests
beforeEach(() => {
  jest.setSystemTime(new Date('2024-01-15T10:00:00+11:00')); // AEDT
});
```

### 3. Mock Data
```typescript
// Use Australian test data
const mockUser = {
  email: 'test@example.com.au',
  phone: '+61 2 1234 5678',
  timezone: 'Australia/Sydney',
  locale: 'en-AU'
};
```

### 4. Environment Variables
```typescript
// Set test environment with Australian defaults
process.env.TZ = 'Australia/Sydney';
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://localhost:5432/act_placemat_test';
```

## Troubleshooting

### Common Issues

1. **Test timeouts:** Increase timeout for integration/E2E tests
2. **Database connections:** Ensure test database is running
3. **Mobile simulator:** Check iOS/Android simulator status
4. **Coverage thresholds:** Review and adjust coverage requirements

### Debug Commands
```bash
# Check test framework availability
npx vitest --version
npx jest --version
npx playwright --version
npx detox --version

# Validate test runner configuration
node scripts/test-runner.js --help

# Check test file patterns
find . -name "*.test.*" -o -name "*.spec.*" | head -10
```

## Extending the Harness

### Adding New Test Types
1. Add configuration to `scripts/test-runner.js`
2. Update npm scripts in `package.json`
3. Configure reporting in `test-reports.config.js`
4. Add CI workflow in `.github/workflows/test.yml`

### Custom Test Utilities
Add utilities to `packages/test-utils/src/`:
- Australian data generators
- Mock factories
- Custom matchers
- Test helpers

This testing harness ensures robust, Australian-focused testing across all ACT Placemat applications and services.