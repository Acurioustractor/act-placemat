# Testing Guide for ACT Intelligence Platform

This document outlines the testing infrastructure, patterns, and best practices for the ACT Intelligence Platform.

## Table of Contents

1. [Overview](#overview)
2. [Test Directory Structure](#test-directory-structure)
3. [Running Tests](#running-tests)
4. [Writing Tests](#writing-tests)
5. [Test Utilities](#test-utilities)
6. [CI/CD Integration](#cicd-integration)
7. [Coverage Requirements](#coverage-requirements)

## Overview

The ACT Intelligence Platform uses a comprehensive testing strategy:

- **Unit Tests**: Test individual functions, services, and components in isolation
- **Integration Tests**: Test interactions between multiple services and database operations
- **E2E Tests**: Test complete user workflows using Playwright
- **Coverage Target**: 80% code coverage for all critical paths

### Technology Stack

| Layer | Technology |
|-------|------------|
| Test Runner | Vitest |
| Assertions | Vitest + Chai matchers |
| Frontend Testing | React Testing Library |
| E2E Testing | Playwright |
| Coverage | v8 Coverage |
| Mocking | Vitest mocks + Mock Service Worker |

## Test Directory Structure

```
apps/backend/core/tests/
├── setup.js                    # Global test setup
├── utils/
│   ├── test-helpers.js         # Database mock utilities
│   ├── api-client.js           # API testing utilities
│   └── mock-services.js        # Mock data generators
├── fixtures/
│   ├── contacts.json           # Contact test data
│   ├── projects.json           # Project test data
│   └── financial.json          # Financial test data
├── unit/
│   ├── services/
│   │   ├── notion/
│   │   │   └── notionService.test.js
│   │   ├── contacts/
│   │   │   └── contactService.test.js
│   │   ├── financial/
│   │   │   └── financialService.test.js
│   │   └── privacy/
│   │       └── privacyService.test.js
│   └── api/
│       ├── contacts.test.js
│       └── financial.test.js
├── integration/
│   ├── api/
│   │   └── contacts.test.js
│   ├── database/
│   │   └── database.test.js
│   └── services/
│       └── workflow.test.js
└── e2e/
    ├── auth-flow/
    │   └── login.spec.js
    ├── contact-management/
    │   └── contacts.spec.js
    └── project-workflow/
        └── projects.spec.js

apps/frontend/tests/
├── setup.js                    # Frontend test setup
├── utils/
│   └── test-utils.jsx          # React testing utilities
├── components/
│   ├── Dashboard.test.jsx
│   └── Button.test.jsx
└── e2e/
    ├── auth-flow.spec.js
    └── project-workflow.spec.js
```

## Running Tests

### Backend Tests

```bash
# Run all backend tests
cd apps/backend
npm test

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Run E2E tests only
npm run test:e2e

# Run with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch
```

### Frontend Tests

```bash
# Run all frontend tests
cd apps/frontend
npm test

# Run unit tests only
npm run test:unit

# Run E2E tests only
npm run test:e2e

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### All Tests (Root)

```bash
# Run all tests across both apps
npm test
```

## Writing Tests

### Backend Unit Test Example

```javascript
// tests/unit/services/contacts/contactService.test.js
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockSupabaseClient } from '../../../utils/test-helpers.js';
import { contactFixtures } from '../../../utils/mock-services.js';

describe('ContactService', () => {
  let ContactService;
  let contactService;
  let mockDb;

  beforeEach(async () => {
    vi.clearAllMocks();

    mockDb = createMockSupabaseClient({
      tables: ['linkedin_contacts'],
    });

    vi.doMock('../../../../src/lib/database.js', () => ({
      supabase: mockDb,
    }));

    const module = await import('../../../../src/services/contactService.js');
    ContactService = module.ContactService || module.default;
    contactService = new ContactService();
  });

  describe('getContacts', () => {
    it('fetches contacts with pagination', async () => {
      const mockContacts = contactFixtures.createMany(5);

      mockDb.from().select.mockReturnValue({
        range: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: mockContacts,
            count: 5,
            error: null,
          }),
        }),
      });

      const result = await contactService.getContacts({ limit: 10, offset: 0 });

      expect(result.contacts).toHaveLength(5);
      expect(result.pagination.total).toBe(5);
    });
  });
});
```

### API Route Test Example

```javascript
// tests/unit/api/contacts.test.js
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockRequest, createMockResponse, createMockNext } from '../../utils/api-client.js';

const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnValue({
      order: vi.fn().mockResolvedValue({
        data: [],
        count: 0,
        error: null,
      }),
    }),
  })),
};

vi.mock('../../../src/lib/database.js', () => ({
  supabase: mockSupabase,
}));

const routerModule = await import('../../../src/api/v1/contacts.js');
const router = routerModule.default;

describe('Contacts API v1', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    mockReq = createMockRequest();
    mockRes = createMockResponse();
    mockNext = createMockNext();
    vi.clearAllMocks();
  });

  it('returns paginated contacts', async () => {
    mockReq.query = { limit: '5', offset: '0' };

    const handler = router.stack.find(r => r.path === '/' && r.methods.get);
    await handler.handler(mockReq, mockRes, mockNext);

    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        contacts: expect.any(Array),
        pagination: expect.any(Object),
      })
    );
  });
});
```

### Frontend Component Test Example

```jsx
// tests/components/Dashboard.test.jsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Dashboard from '../../src/components/Dashboard';

const mockApi = {
  getDashboardData: vi.fn(),
};

vi.mock('../../src/services/api', () => ({
  default: mockApi,
}));

describe('Dashboard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi.getDashboardData.mockResolvedValue({
      metrics: { totalProjects: 12 },
      recentActivity: [],
    });
  });

  it('renders dashboard title', () => {
    render(<Dashboard />);
    expect(screen.getByText(/Dashboard/i)).toBeInTheDocument();
  });

  it('displays metrics', async () => {
    render(<Dashboard />);
    await waitFor(() => {
      expect(screen.getByText(/12/i)).toBeInTheDocument();
    });
  });
});
```

### E2E Test Example

```javascript
// tests/e2e/auth-flow.spec.js
import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('validates email format', async ({ page }) => {
    await page.fill('input[type="email"]', 'invalid-email');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    await expect(page.locator('.error-message')).toContainText('Invalid email');
  });

  test('redirects to dashboard on successful login', async ({ page }) => {
    await page.route('/api/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ user: { id: '1' }, token: 'mock-token' }),
      });
    });

    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'correct-password');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/dashboard/);
  });
});
```

## Test Utilities

### Database Mock Helper

```javascript
// utils/test-helpers.js
import { createMockSupabaseClient, createMockPaginatedResponse } from '../utils/test-helpers.js';

// Create mock database
const mockDb = createMockSupabaseClient({
  tables: ['contacts', 'projects'],
  data: [{ id: '1', name: 'Test' }],
});

// Use in tests
mockDb.from().select.mockReturnValue({
  range: vi.fn().mockResolvedValue({
    data: [],
    count: 0,
    error: null,
  }),
});
```

### API Test Client

```javascript
// utils/api-client.js
import { createMockRequest, createMockResponse, createMockNext } from '../utils/api-client.js';

// Create mock route context
const { req, res, next } = createMockRouteContext({
  method: 'GET',
  path: '/contacts',
  params: {},
  query: { limit: '10' },
  body: {},
});
```

### Mock Data Generators

```javascript
// utils/mock-services.js
import { contactFixtures, personFixtures, projectFixtures, financialFixtures } from '../utils/mock-services.js';

// Generate test data
const contact = contactFixtures.create({ full_name: 'Custom Name' });
const contacts = contactFixtures.createMany(5);
const project = projectFixtures.create();
const transaction = financialFixtures.createTransaction();
```

### Frontend Test Utilities

```javascript
// utils/test-utils.jsx
import { renderWithProviders, simulateInteraction, waitForAsync } from '../utils/test-utils.jsx';

// Custom render with providers
renderWithProviders(<Component />, { queryClient });

// Simulate user interaction
simulateInteraction(button, 'click');

// Wait for async operations
await waitForAsync(() => expect(element).toBeVisible());
```

## CI/CD Integration

### GitHub Actions Workflow

The project includes a comprehensive CI workflow at `.github/workflows/tests.yml` that:

1. **Runs backend unit tests** with coverage reporting
2. **Runs backend integration tests** with PostgreSQL and Redis services
3. **Runs frontend tests** with type checking
4. **Runs E2E tests** on pull requests
5. **Runs linting** on all code
6. **Validates coverage thresholds** (80% minimum)

### Coverage Thresholds

| Metric | Minimum |
|--------|---------|
| Lines | 80% |
| Functions | 80% |
| Branches | 80% |
| Statements | 80% |

## Best Practices

### 1. Test Isolation

- Each test should be independent
- Use `beforeEach` to reset mocks and state
- Avoid shared mutable state between tests

### 2. Descriptive Test Names

```javascript
// Good
it('returns paginated contacts with correct metadata', async () => {...});

// Bad
it('gets contacts', async () => {...});
```

### 3. Test Behavior, Not Implementation

```javascript
// Good - test the outcome
expect(result.contacts).toHaveLength(5);

// Avoid - testing internal implementation
expect(mockDb.from).toHaveBeenCalledWith('contacts');
```

### 4. Use Realistic Test Data

```javascript
// Use fixtures for consistency
const contact = contactFixtures.create({
  full_name: 'John Doe',
  email: 'john@example.com',
});
```

### 5. Mock External Services

```javascript
// Mock API calls
mockFetch.mockResolvedValueOnce({
  ok: true,
  json: async () => mockResponse,
});

// Mock environment variables
vi.stubEnv('NOTION_TOKEN', 'test-token');
```

### 6. Test Edge Cases

```javascript
it('handles empty results', async () => {...});
it('handles API errors gracefully', async () => {...});
it('handles rate limiting', async () => {...});
```

## Troubleshooting

### Common Issues

1. **Tests timing out**: Increase `testTimeout` for integration tests
2. **Mock not working**: Ensure mocks are set up in `beforeEach`
3. **Coverage not generated**: Check exclude patterns in config
4. **E2E tests failing**: Ensure server is running before tests

### Debug Mode

```bash
# Run with verbose output
npm run test:unit -- --reporter=verbose

# Debug specific test
npm run test:unit -- --testNamePattern="specific test"
```

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Trophy](https://kentcdodds.com/blog/the-testing-trophy-and-testing-classifications)
