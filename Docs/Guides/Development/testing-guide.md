# Testing Guide for ACT Placemat

## Overview

ACT Placemat employs a comprehensive testing strategy to ensure reliability, performance, and user experience across our community platform. This guide covers all testing approaches and best practices for our Australian-focused development environment.

## Testing Philosophy

Our testing approach follows the **Testing Pyramid**:

```
    /\
   /  \     E2E Tests (Few, High-level)
  /____\    
 /      \   Integration Tests (Some, API-focused)
/__________\ Unit Tests (Many, Component-focused)
```

- **Unit Tests**: Fast, isolated testing of individual functions and components
- **Integration Tests**: Testing API endpoints and service interactions
- **End-to-End Tests**: Full user workflows across the entire platform

## Testing Stack

### Frontend Testing
- **Vitest**: Fast unit testing framework
- **React Testing Library**: Component testing utilities
- **MSW (Mock Service Worker)**: API mocking
- **Playwright**: End-to-end testing

### Backend Testing
- **Vitest**: API and service testing
- **Supertest**: HTTP endpoint testing
- **Test Containers**: Database testing with real PostgreSQL

### Shared Testing
- **Faker.js**: Test data generation
- **Test Database**: Isolated test environment
- **Coverage Reports**: Istanbul/c8 coverage analysis

## Project Structure

```
tests/
├── e2e/                    # End-to-end tests
│   ├── platform-workflow.test.js
│   └── contact-management.test.js
├── integration/            # API integration tests
│   ├── api-integration.test.js
│   └── database-integration.test.js
├── fixtures/               # Test data and fixtures
│   ├── contacts.json
│   └── projects.json
├── helpers/                # Test utilities
│   ├── test-context.js
│   └── mock-data.js
└── setup/                  # Test configuration
    ├── vitest.config.ts
    ├── playwright.config.ts
    └── test-db-setup.js

apps/frontend/src/tests/
├── components/             # Component tests
├── hooks/                  # Custom hook tests
├── services/               # Service layer tests
├── utils/                  # Utility function tests
└── __mocks__/             # Mock implementations

apps/backend/tests/
├── trpc/                   # tRPC router tests
├── services/               # Business logic tests
├── utils/                  # Backend utility tests
└── fixtures/               # Backend test data
```

## Unit Testing

### Frontend Component Testing

```typescript
// apps/frontend/src/tests/components/ContactCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { ContactCard } from '../../components/ContactCard';
import { createTestContact } from '../helpers/test-data';

describe('ContactCard', () => {
  const mockContact = createTestContact({
    id: 1,
    first_name: 'John',
    last_name: 'Doe',
    current_company: 'Tech Corp',
    strategic_value: 'high'
  });

  it('renders contact information correctly', () => {
    render(<ContactCard contact={mockContact} />);
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Tech Corp')).toBeInTheDocument();
    expect(screen.getByText('High')).toBeInTheDocument();
  });

  it('handles click events', () => {
    const onClickMock = vi.fn();
    render(<ContactCard contact={mockContact} onClick={onClickMock} />);
    
    fireEvent.click(screen.getByRole('button'));
    expect(onClickMock).toHaveBeenCalledWith(mockContact);
  });

  it('shows strategic value with correct styling', () => {
    render(<ContactCard contact={mockContact} />);
    
    const valueElement = screen.getByText('High');
    expect(valueElement).toHaveClass('text-red-600', 'bg-red-50');
  });

  it('handles missing contact information gracefully', () => {
    const incompleteContact = createTestContact({
      first_name: 'Jane',
      current_company: null
    });
    
    render(<ContactCard contact={incompleteContact} />);
    
    expect(screen.getByText('Jane')).toBeInTheDocument();
    expect(screen.queryByText('null')).not.toBeInTheDocument();
  });
});
```

### Custom Hook Testing

```typescript
// apps/frontend/src/tests/hooks/useContacts.test.tsx
import { renderHook, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useContacts } from '../../hooks/useContacts';
import { trpc } from '../../lib/trpc';

// Mock tRPC
vi.mock('../../lib/trpc', () => ({
  trpc: {
    contacts: {
      list: {
        useQuery: vi.fn()
      }
    }
  }
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useContacts Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch contacts with default parameters', () => {
    const mockUseQuery = vi.fn().mockReturnValue({
      data: null,
      isLoading: false,
      error: null
    });
    
    vi.mocked(trpc.contacts.list.useQuery).mockImplementation(mockUseQuery);

    renderHook(() => useContacts(), { wrapper: createWrapper() });

    expect(mockUseQuery).toHaveBeenCalledWith(
      {
        limit: 50,
        offset: 0
      },
      expect.objectContaining({
        staleTime: 2 * 60 * 1000,
        refetchOnWindowFocus: false
      })
    );
  });

  it('should apply filters correctly', () => {
    const mockUseQuery = vi.fn().mockReturnValue({
      data: null,
      isLoading: false,
      error: null
    });
    
    vi.mocked(trpc.contacts.list.useQuery).mockImplementation(mockUseQuery);

    const filters = {
      strategic_value: 'high' as const,
      search: 'john'
    };

    renderHook(() => useContacts(filters), { wrapper: createWrapper() });

    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining(filters),
      expect.any(Object)
    );
  });

  it('should handle loading state', () => {
    vi.mocked(trpc.contacts.list.useQuery).mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
      isSuccess: false,
      isError: false
    });

    const { result } = renderHook(() => useContacts(), { 
      wrapper: createWrapper() 
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBe(null);
  });

  it('should handle error state', () => {
    const error = new Error('Network error');
    
    vi.mocked(trpc.contacts.list.useQuery).mockReturnValue({
      data: null,
      isLoading: false,
      error,
      refetch: vi.fn(),
      isSuccess: false,
      isError: true
    });

    const { result } = renderHook(() => useContacts(), { 
      wrapper: createWrapper() 
    });

    expect(result.current.error).toBe(error);
    expect(result.current.isLoading).toBe(false);
  });
});
```

### Service Layer Testing

```typescript
// apps/frontend/src/tests/services/contactsApiService.test.ts
import { vi } from 'vitest';
import { contactsApiService } from '../../services/contactsApiService';
import { trpc } from '../../lib/trpc';

vi.mock('../../lib/trpc');

describe('contactsApiService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getContacts', () => {
    it('should call tRPC with correct parameters', async () => {
      const mockQuery = vi.fn().mockResolvedValue({
        data: [],
        count: 0,
        hasMore: false
      });
      
      vi.mocked(trpc.contacts.list.query).mockImplementation(mockQuery);

      const filters = {
        strategic_value: 'high' as const,
        limit: 25
      };

      await contactsApiService.getContacts(filters);

      expect(mockQuery).toHaveBeenCalledWith(filters);
    });

    it('should handle API errors gracefully', async () => {
      const error = new Error('API Error');
      vi.mocked(trpc.contacts.list.query).mockRejectedValue(error);

      await expect(contactsApiService.getContacts({}))
        .rejects.toThrow('API Error');
    });
  });

  describe('formatContactForDisplay', () => {
    it('should format contact data correctly', () => {
      const contact = {
        id: 1,
        first_name: 'John',
        last_name: 'Doe',
        current_company: 'Tech Corp',
        relationship_score: 0.85
      };

      const formatted = contactsApiService.formatContactForDisplay(contact);

      expect(formatted).toEqual({
        id: 1,
        displayName: 'John Doe',
        company: 'Tech Corp',
        scorePercentage: '85%'
      });
    });

    it('should handle missing names', () => {
      const contact = {
        id: 1,
        first_name: '',
        last_name: 'Doe'
      };

      const formatted = contactsApiService.formatContactForDisplay(contact);

      expect(formatted.displayName).toBe('Doe');
    });
  });
});
```

## Integration Testing

### API Integration Tests

```typescript
// tests/integration/contacts-api.test.js
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import request from 'supertest';
import { createTestApp } from '../helpers/test-app';
import { seedTestData, cleanupTestData } from '../helpers/test-data';

describe('Contacts API Integration', () => {
  let app;
  let supabase;

  beforeAll(async () => {
    // Set up test environment
    app = await createTestApp();
    supabase = createClient(
      process.env.TEST_SUPABASE_URL,
      process.env.TEST_SUPABASE_SERVICE_KEY
    );
  });

  afterAll(async () => {
    await cleanupTestData(supabase);
  });

  beforeEach(async () => {
    await cleanupTestData(supabase);
    await seedTestData(supabase);
  });

  describe('GET /api/trpc/contacts.list', () => {
    it('should return paginated contacts', async () => {
      const response = await request(app)
        .post('/api/trpc/contacts.list')
        .send({
          json: {
            limit: 10,
            offset: 0
          }
        })
        .expect(200);

      expect(response.body.result.data).toMatchObject({
        data: expect.any(Array),
        count: expect.any(Number),
        limit: 10,
        offset: 0,
        hasMore: expect.any(Boolean)
      });

      expect(response.body.result.data.data.length).toBeLessThanOrEqual(10);
    });

    it('should filter by strategic value', async () => {
      const response = await request(app)
        .post('/api/trpc/contacts.list')
        .send({
          json: {
            strategic_value: 'high',
            limit: 5
          }
        })
        .expect(200);

      const contacts = response.body.result.data.data;
      
      contacts.forEach(contact => {
        expect(contact.strategic_value).toBe('high');
      });
    });

    it('should search contacts by name', async () => {
      const response = await request(app)
        .post('/api/trpc/contacts.list')
        .send({
          json: {
            search: 'john',
            limit: 10
          }
        })
        .expect(200);

      const contacts = response.body.result.data.data;
      
      contacts.forEach(contact => {
        const fullName = `${contact.first_name} ${contact.last_name}`.toLowerCase();
        expect(fullName).toContain('john');
      });
    });

    it('should validate limit parameter', async () => {
      await request(app)
        .post('/api/trpc/contacts.list')
        .send({
          json: {
            limit: 101 // Exceeds maximum
          }
        })
        .expect(400);
    });
  });

  describe('GET /api/trpc/contacts.byId', () => {
    it('should return contact when found', async () => {
      // Get a contact ID from the seeded data
      const listResponse = await request(app)
        .post('/api/trpc/contacts.list')
        .send({ json: { limit: 1 } });
      
      const contactId = listResponse.body.result.data.data[0].id;

      const response = await request(app)
        .post('/api/trpc/contacts.byId')
        .send({
          json: { id: contactId }
        })
        .expect(200);

      expect(response.body.result.data).toMatchObject({
        id: contactId,
        first_name: expect.any(String),
        last_name: expect.any(String)
      });
    });

    it('should return 404 for non-existent contact', async () => {
      await request(app)
        .post('/api/trpc/contacts.byId')
        .send({
          json: { id: 999999 }
        })
        .expect(404);
    });
  });

  describe('POST /api/trpc/contacts.update', () => {
    it('should update contact successfully', async () => {
      // Get a contact to update
      const listResponse = await request(app)
        .post('/api/trpc/contacts.list')
        .send({ json: { limit: 1 } });
      
      const contact = listResponse.body.result.data.data[0];
      const updateData = {
        relationship_score: 0.9,
        strategic_value: 'high',
        notes: 'Updated in test'
      };

      const response = await request(app)
        .post('/api/trpc/contacts.update')
        .send({
          json: {
            id: contact.id,
            data: updateData
          }
        })
        .expect(200);

      expect(response.body.result.data).toMatchObject({
        id: contact.id,
        ...updateData
      });

      // Verify the update persisted
      const verifyResponse = await request(app)
        .post('/api/trpc/contacts.byId')
        .send({ json: { id: contact.id } });

      expect(verifyResponse.body.result.data).toMatchObject(updateData);
    });

    it('should validate update data', async () => {
      await request(app)
        .post('/api/trpc/contacts.update')
        .send({
          json: {
            id: 1,
            data: {
              relationship_score: 1.5 // Invalid score > 1
            }
          }
        })
        .expect(400);
    });
  });

  describe('GET /api/trpc/contacts.stats', () => {
    it('should return contact statistics', async () => {
      const response = await request(app)
        .get('/api/trpc/contacts.stats')
        .expect(200);

      expect(response.body.result.data).toMatchObject({
        total: expect.any(Number),
        by_strategic_value: expect.any(Object),
        by_data_source: expect.any(Object),
        average_score: expect.any(Number)
      });

      expect(response.body.result.data.total).toBeGreaterThanOrEqual(0);
      expect(response.body.result.data.average_score).toBeGreaterThanOrEqual(0);
      expect(response.body.result.data.average_score).toBeLessThanOrEqual(1);
    });
  });
});
```

### Database Integration Tests

```typescript
// tests/integration/database.test.js
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { runMigrations, rollbackMigrations } from '../helpers/migration-runner';

describe('Database Integration', () => {
  let supabase;

  beforeAll(async () => {
    supabase = createClient(
      process.env.TEST_SUPABASE_URL,
      process.env.TEST_SUPABASE_SERVICE_KEY
    );
    
    // Ensure clean database state
    await rollbackMigrations();
    await runMigrations();
  });

  afterAll(async () => {
    await rollbackMigrations();
  });

  describe('LinkedIn Contacts Table', () => {
    it('should create and query contacts', async () => {
      const testContact = {
        first_name: 'Test',
        last_name: 'User',
        email_address: 'test@example.com',
        linkedin_url: 'https://linkedin.com/in/testuser',
        connection_source: 'test',
        relationship_score: 0.8,
        strategic_value: 'medium'
      };

      // Insert contact
      const { data: insertedContact, error: insertError } = await supabase
        .from('linkedin_contacts')
        .insert(testContact)
        .select()
        .single();

      expect(insertError).toBeNull();
      expect(insertedContact).toMatchObject(testContact);

      // Query contact
      const { data: queriedContact, error: queryError } = await supabase
        .from('linkedin_contacts')
        .select('*')
        .eq('id', insertedContact.id)
        .single();

      expect(queryError).toBeNull();
      expect(queriedContact).toMatchObject(testContact);

      // Update contact
      const updateData = { strategic_value: 'high' };
      const { data: updatedContact, error: updateError } = await supabase
        .from('linkedin_contacts')
        .update(updateData)
        .eq('id', insertedContact.id)
        .select()
        .single();

      expect(updateError).toBeNull();
      expect(updatedContact.strategic_value).toBe('high');

      // Delete contact
      const { error: deleteError } = await supabase
        .from('linkedin_contacts')
        .delete()
        .eq('id', insertedContact.id);

      expect(deleteError).toBeNull();
    });

    it('should enforce constraints', async () => {
      // Test email uniqueness constraint
      const contactData = {
        first_name: 'Test',
        last_name: 'User',
        email_address: 'duplicate@example.com'
      };

      // Insert first contact
      await supabase
        .from('linkedin_contacts')
        .insert(contactData);

      // Try to insert duplicate email
      const { error } = await supabase
        .from('linkedin_contacts')
        .insert(contactData);

      expect(error).toBeTruthy();
      expect(error.code).toBe('23505'); // Unique constraint violation
    });

    it('should validate strategic_value enum', async () => {
      const { error } = await supabase
        .from('linkedin_contacts')
        .insert({
          first_name: 'Test',
          last_name: 'User',
          strategic_value: 'invalid_value'
        });

      expect(error).toBeTruthy();
      expect(error.code).toBe('23514'); // Check constraint violation
    });
  });

  describe('Full-text Search', () => {
    beforeEach(async () => {
      // Insert test data for search
      await supabase
        .from('linkedin_contacts')
        .insert([
          {
            first_name: 'John',
            last_name: 'Smith',
            current_company: 'Tech Corp',
            current_position: 'Software Engineer'
          },
          {
            first_name: 'Jane',
            last_name: 'Doe',
            current_company: 'Innovation Labs',
            current_position: 'Product Manager'
          }
        ]);
    });

    it('should search by name', async () => {
      const { data, error } = await supabase
        .from('linkedin_contacts')
        .select('*')
        .or('first_name.ilike.%john%,last_name.ilike.%john%');

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
      expect(data[0].first_name).toBe('John');
    });

    it('should search by company', async () => {
      const { data, error } = await supabase
        .from('linkedin_contacts')
        .select('*')
        .ilike('current_company', '%tech%');

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
      expect(data[0].current_company).toBe('Tech Corp');
    });
  });

  describe('Performance Tests', () => {
    it('should handle large dataset queries efficiently', async () => {
      // Generate test data
      const testContacts = Array.from({ length: 1000 }, (_, i) => ({
        first_name: `User${i}`,
        last_name: `Test${i}`,
        email_address: `user${i}@example.com`,
        strategic_value: ['high', 'medium', 'low'][i % 3]
      }));

      // Insert test data
      await supabase
        .from('linkedin_contacts')
        .insert(testContacts);

      // Test query performance
      const startTime = Date.now();
      
      const { data, error } = await supabase
        .from('linkedin_contacts')
        .select('*')
        .eq('strategic_value', 'high')
        .limit(100);

      const queryTime = Date.now() - startTime;

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(queryTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });
});
```

## End-to-End Testing

### Platform Workflow Tests

```typescript
// tests/e2e/contact-management.test.ts
import { test, expect } from '@playwright/test';

test.describe('Contact Management Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to contacts page
    await page.goto('/contacts');
    await page.waitForLoadState('networkidle');
  });

  test('should display contacts list', async ({ page }) => {
    // Check page loads correctly
    await expect(page.locator('h1')).toContainText('Contacts');
    
    // Check contacts are displayed
    await expect(page.locator('[data-testid="contact-card"]')).toHaveCount({ min: 1 });
    
    // Check contact information is visible
    const firstContact = page.locator('[data-testid="contact-card"]').first();
    await expect(firstContact.locator('[data-testid="contact-name"]')).toBeVisible();
    await expect(firstContact.locator('[data-testid="contact-company"]')).toBeVisible();
  });

  test('should filter contacts by strategic value', async ({ page }) => {
    // Open filter dropdown
    await page.click('[data-testid="strategic-value-filter"]');
    
    // Select 'High' value
    await page.click('text=High');
    
    // Wait for results to update
    await page.waitForLoadState('networkidle');
    
    // Verify all visible contacts have 'High' strategic value
    const contactCards = page.locator('[data-testid="contact-card"]');
    const count = await contactCards.count();
    
    for (let i = 0; i < count; i++) {
      const strategicValue = contactCards.nth(i).locator('[data-testid="strategic-value"]');
      await expect(strategicValue).toContainText('High');
    }
  });

  test('should search contacts by name', async ({ page }) => {
    // Enter search term
    await page.fill('[data-testid="search-input"]', 'john');
    
    // Wait for search results
    await page.waitForTimeout(500); // Debounced search
    await page.waitForLoadState('networkidle');
    
    // Verify search results contain search term
    const contactNames = page.locator('[data-testid="contact-name"]');
    const count = await contactNames.count();
    
    expect(count).toBeGreaterThan(0);
    
    for (let i = 0; i < count; i++) {
      const name = await contactNames.nth(i).textContent();
      expect(name?.toLowerCase()).toContain('john');
    }
  });

  test('should open contact details modal', async ({ page }) => {
    // Click on first contact
    await page.click('[data-testid="contact-card"]');
    
    // Verify modal opens
    await expect(page.locator('[data-testid="contact-modal"]')).toBeVisible();
    
    // Check modal content
    await expect(page.locator('[data-testid="modal-title"]')).toBeVisible();
    await expect(page.locator('[data-testid="relationship-score"]')).toBeVisible();
    await expect(page.locator('[data-testid="strategic-value"]')).toBeVisible();
    
    // Close modal
    await page.click('[data-testid="close-modal"]');
    await expect(page.locator('[data-testid="contact-modal"]')).not.toBeVisible();
  });

  test('should update contact information', async ({ page }) => {
    // Open contact modal
    await page.click('[data-testid="contact-card"]');
    
    // Click edit button
    await page.click('[data-testid="edit-contact"]');
    
    // Update relationship score
    await page.fill('[data-testid="relationship-score-input"]', '0.9');
    
    // Update strategic value
    await page.selectOption('[data-testid="strategic-value-select"]', 'high');
    
    // Add notes
    await page.fill('[data-testid="notes-textarea"]', 'Great potential for collaboration on sustainability projects.');
    
    // Save changes
    await page.click('[data-testid="save-contact"]');
    
    // Verify success message
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    
    // Verify changes are reflected
    await expect(page.locator('[data-testid="relationship-score"]')).toContainText('90%');
    await expect(page.locator('[data-testid="strategic-value"]')).toContainText('High');
  });

  test('should handle pagination', async ({ page }) => {
    // Check initial page
    const initialContacts = await page.locator('[data-testid="contact-card"]').count();
    expect(initialContacts).toBeGreaterThan(0);
    
    // Check if next page button exists
    const nextButton = page.locator('[data-testid="next-page"]');
    
    if (await nextButton.isVisible()) {
      // Go to next page
      await nextButton.click();
      await page.waitForLoadState('networkidle');
      
      // Verify different contacts are shown
      const newContacts = await page.locator('[data-testid="contact-card"]').count();
      expect(newContacts).toBeGreaterThan(0);
      
      // Go back to previous page
      await page.click('[data-testid="prev-page"]');
      await page.waitForLoadState('networkidle');
      
      // Verify we're back to original page
      const backContacts = await page.locator('[data-testid="contact-card"]').count();
      expect(backContacts).toBe(initialContacts);
    }
  });

  test('should handle offline functionality', async ({ page, context }) => {
    // Go offline
    await context.setOffline(true);
    
    // Verify offline notification appears
    await expect(page.locator('[data-testid="offline-banner"]')).toBeVisible();
    
    // Try to perform an action (should be queued)
    await page.click('[data-testid="contact-card"]');
    await page.click('[data-testid="edit-contact"]');
    await page.fill('[data-testid="notes-textarea"]', 'Offline note');
    await page.click('[data-testid="save-contact"]');
    
    // Verify action is queued
    await expect(page.locator('[data-testid="queued-message"]')).toBeVisible();
    
    // Go back online
    await context.setOffline(false);
    
    // Wait for sync
    await page.waitForTimeout(2000);
    
    // Verify offline banner disappears
    await expect(page.locator('[data-testid="offline-banner"]')).not.toBeVisible();
    
    // Verify queued action was synced
    await expect(page.locator('[data-testid="sync-success"]')).toBeVisible();
  });
});
```

### Cross-Browser Testing

```typescript
// tests/e2e/cross-browser.test.ts
import { test, expect, devices } from '@playwright/test';

const browsers = ['chromium', 'firefox', 'webkit'];
const viewports = [
  { name: 'desktop', ...devices['Desktop Chrome'] },
  { name: 'tablet', ...devices['iPad'] },
  { name: 'mobile', ...devices['iPhone 12'] }
];

browsers.forEach(browserName => {
  test.describe(`${browserName} Browser Tests`, () => {
    test.use({ browserName });

    viewports.forEach(viewport => {
      test(`should work on ${viewport.name} (${browserName})`, async ({ page }) => {
        await page.setViewportSize(viewport.viewport);
        
        await page.goto('/');
        
        // Basic functionality should work
        await expect(page.locator('h1')).toBeVisible();
        
        // Navigation should work
        await page.click('text=Contacts');
        await expect(page.locator('[data-testid="contacts-page"]')).toBeVisible();
        
        // Search should work
        await page.fill('[data-testid="search-input"]', 'test');
        await page.waitForTimeout(500);
        
        // Mobile-specific checks
        if (viewport.name === 'mobile') {
          // Check mobile navigation works
          const mobileMenu = page.locator('[data-testid="mobile-menu"]');
          if (await mobileMenu.isVisible()) {
            await mobileMenu.click();
            await expect(page.locator('[data-testid="mobile-nav"]')).toBeVisible();
          }
        }
      });
    });
  });
});
```

## Test Data Management

### Test Data Factories

```typescript
// tests/helpers/test-data.ts
import { faker } from '@faker-js/faker';

export const createTestContact = (overrides: Partial<Contact> = {}): Contact => {
  return {
    id: faker.number.int({ min: 1, max: 10000 }),
    first_name: faker.person.firstName(),
    last_name: faker.person.lastName(),
    full_name: null,
    email_address: faker.internet.email(),
    linkedin_url: `https://linkedin.com/in/${faker.internet.userName()}`,
    current_company: faker.company.name(),
    current_position: faker.person.jobTitle(),
    connection_source: faker.helpers.arrayElement(['ben', 'nic']),
    relationship_score: faker.number.float({ min: 0, max: 1, precision: 0.01 }),
    strategic_value: faker.helpers.arrayElement(['high', 'medium', 'low', 'unknown']),
    alignment_tags: faker.helpers.arrayElements([
      'sustainability', 'technology', 'healthcare', 'education', 'finance'
    ], { min: 0, max: 3 }),
    raw_import_ids: [],
    created_at: faker.date.past().toISOString(),
    updated_at: faker.date.recent().toISOString(),
    ...overrides
  };
};

export const createTestProject = (overrides: Partial<Project> = {}): Project => {
  return {
    id: faker.number.int({ min: 1, max: 10000 }),
    title: faker.company.catchPhrase(),
    description: faker.lorem.paragraph(),
    status: faker.helpers.arrayElement(['planning', 'active', 'completed', 'paused']),
    priority: faker.helpers.arrayElement(['high', 'medium', 'low']),
    tags: faker.helpers.arrayElements([
      'community', 'environment', 'technology', 'education', 'health'
    ], { min: 1, max: 3 }),
    expected_start: faker.date.future().toISOString().split('T')[0],
    expected_end: faker.date.future().toISOString().split('T')[0],
    created_at: faker.date.past().toISOString(),
    updated_at: faker.date.recent().toISOString(),
    ...overrides
  };
};

export const createContactsList = (count: number = 10): Contact[] => {
  return Array.from({ length: count }, () => createTestContact());
};

export const createAustralianTestContact = (overrides: Partial<Contact> = {}): Contact => {
  faker.setLocale('en_AU');
  
  const contact = createTestContact({
    email_address: faker.internet.email('', '', 'example.com.au'),
    current_company: faker.helpers.arrayElement([
      'Commonwealth Bank', 'Telstra', 'BHP Billiton', 'Woolworths',
      'ANZ Bank', 'Westpac', 'Qantas', 'CSIRO'
    ]),
    ...overrides
  });
  
  faker.setLocale('en');
  return contact;
};
```

### Database Seeding

```typescript
// tests/helpers/seed-data.ts
import { createClient } from '@supabase/supabase-js';
import { createContactsList, createTestProject } from './test-data';

export const seedTestData = async (supabase: any) => {
  // Clean existing data
  await cleanupTestData(supabase);
  
  // Seed contacts
  const testContacts = createContactsList(100);
  const { error: contactsError } = await supabase
    .from('linkedin_contacts')
    .insert(testContacts);
  
  if (contactsError) {
    throw new Error(`Failed to seed contacts: ${contactsError.message}`);
  }
  
  // Seed projects
  const testProjects = Array.from({ length: 20 }, () => createTestProject());
  const { error: projectsError } = await supabase
    .from('projects')
    .insert(testProjects);
  
  if (projectsError) {
    throw new Error(`Failed to seed projects: ${projectsError.message}`);
  }
  
  console.log('Test data seeded successfully');
};

export const cleanupTestData = async (supabase: any) => {
  // Clean up in reverse order of dependencies
  await supabase.from('project_contacts').delete().neq('id', 0);
  await supabase.from('projects').delete().neq('id', 0);
  await supabase.from('linkedin_contacts').delete().neq('id', 0);
  
  console.log('Test data cleaned up');
};

export const seedSpecificScenario = async (
  supabase: any, 
  scenario: 'high-value-contacts' | 'mixed-data' | 'search-test'
) => {
  await cleanupTestData(supabase);
  
  switch (scenario) {
    case 'high-value-contacts':
      const highValueContacts = createContactsList(20).map(contact => ({
        ...contact,
        strategic_value: 'high',
        relationship_score: 0.8 + Math.random() * 0.2
      }));
      
      await supabase.from('linkedin_contacts').insert(highValueContacts);
      break;
      
    case 'search-test':
      const searchableContacts = [
        createTestContact({ first_name: 'John', last_name: 'Smith' }),
        createTestContact({ first_name: 'Jane', last_name: 'Johnson' }),
        createTestContact({ first_name: 'Bob', last_name: 'Jones' }),
        createTestContact({ first_name: 'Alice', last_name: 'Anderson' }),
      ];
      
      await supabase.from('linkedin_contacts').insert(searchableContacts);
      break;
      
    case 'mixed-data':
    default:
      await seedTestData(supabase);
      break;
  }
};
```

## Test Configuration

### Vitest Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup/vitest-setup.ts'],
    coverage: {
      provider: 'c8',
      reporter: ['text', 'html', 'json'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.test.{ts,tsx,js,jsx}',
        '**/*.config.{ts,js}',
        'dist/',
        'build/'
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    },
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false
      }
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@tests': resolve(__dirname, './tests')
    }
  }
});
```

### Playwright Configuration

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/results.xml' }]
  ],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] }
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] }
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] }
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] }
    }
  ],
  webServer: [
    {
      command: 'npm run dev:backend',
      port: 3001,
      reuseExistingServer: !process.env.CI
    },
    {
      command: 'npm run dev:frontend',
      port: 3000,
      reuseExistingServer: !process.env.CI
    }
  ]
});
```

## Running Tests

### Command Line Interface

```bash
# Run all tests
npm run test

# Run specific test types
npm run test:unit           # Unit tests only
npm run test:integration    # Integration tests only
npm run test:e2e           # End-to-end tests only

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run tests for specific files
npm run test contact       # Tests matching "contact"
npm run test:unit src/components/ContactCard.test.tsx

# Run E2E tests
npm run test:e2e
npm run test:e2e:headed    # With browser UI
npm run test:e2e:debug     # Debug mode

# Generate reports
npm run test:report
npm run test:coverage:open  # Open coverage report
```

### Test Runner Scripts

```bash
# Use the comprehensive test runner
node tools/testing/test-runner.js

# Run specific combinations
node tools/testing/test-runner.js --types unit,integration
node tools/testing/test-runner.js --apps frontend,backend
node tools/testing/test-runner.js --verbose --bail

# Performance testing
node tools/testing/test-runner.js --with-performance
```

## Best Practices

### 1. Test Structure

```typescript
// Follow AAA pattern: Arrange, Act, Assert
describe('ContactCard Component', () => {
  it('should display contact information', () => {
    // Arrange
    const contact = createTestContact({
      first_name: 'John',
      last_name: 'Doe'
    });
    
    // Act
    render(<ContactCard contact={contact} />);
    
    // Assert
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });
});
```

### 2. Mock Management

```typescript
// Use consistent mocking patterns
vi.mock('../../lib/trpc', () => ({
  trpc: {
    contacts: {
      list: {
        useQuery: vi.fn()
      }
    }
  }
}));

// Clear mocks between tests
beforeEach(() => {
  vi.clearAllMocks();
});
```

### 3. Test Data

```typescript
// Use factories for consistent test data
const contact = createTestContact({
  strategic_value: 'high' // Only override what's needed for the test
});

// Use descriptive test data
const contact = createTestContact({
  first_name: 'TestUser',
  email_address: 'testuser@example.com'
});
```

### 4. Error Testing

```typescript
// Test both success and error paths
it('should handle API errors gracefully', async () => {
  vi.mocked(trpc.contacts.list.useQuery).mockReturnValue({
    data: null,
    isLoading: false,
    error: new Error('Network error')
  });

  render(<ContactsList />);
  
  expect(screen.getByText(/error/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
});
```

### 5. Accessibility Testing

```typescript
// Include accessibility checks
it('should be accessible', async () => {
  const { container } = render(<ContactCard contact={testContact} />);
  
  // Check for proper ARIA labels
  expect(screen.getByRole('button')).toHaveAttribute('aria-label');
  
  // Check keyboard navigation
  const button = screen.getByRole('button');
  button.focus();
  expect(document.activeElement).toBe(button);
});
```

### 6. Performance Testing

```typescript
// Test performance characteristics
it('should render large lists efficiently', async () => {
  const contacts = createContactsList(1000);
  
  const startTime = Date.now();
  render(<ContactsList contacts={contacts} />);
  const renderTime = Date.now() - startTime;
  
  expect(renderTime).toBeLessThan(1000); // Should render within 1 second
});
```

## Continuous Integration

### GitHub Actions

```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - run: npm ci
      - run: npm run test:unit -- --coverage
      
      - uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json

  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - run: npm ci
      - run: npm run test:integration
        env:
          TEST_DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
      
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

This comprehensive testing guide ensures the ACT Placemat platform maintains high quality, reliability, and user experience while supporting our community-focused mission across Australia.