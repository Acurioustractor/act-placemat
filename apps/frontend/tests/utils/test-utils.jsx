/**
 * Frontend Test Utilities
 *
 * Helper functions and custom renders for React component testing
 */
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';

/**
 * Creates a test QueryClient
 * @param {Object} options - QueryClient options
 * @returns {QueryClient} Test client
 */
export function createTestQueryClient(options = {}) {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
        ...options.queries,
      },
      mutations: {
        retry: false,
        ...options.mutations,
      },
    },
    ...options,
  });
}

/**
 * Test wrapper with providers
 * @param {Object} props - Component props
 */
export function TestWrapper({ children, queryClient, router }) {
  return (
    <QueryClientProvider client={queryClient || createTestQueryClient()}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
}

/**
 * Custom render with providers
 * @param {React.Component} component - Component to render
 * @param {Object} options - Render options
 * @returns {Object} Testing Library render result
 */
export function renderWithProviders(component, options = {}) {
  const { queryClient, ...renderOptions } = options;

  return render(component, {
    wrapper: ({ children }) => (
      <TestWrapper queryClient={queryClient}>{children}</TestWrapper>
    ),
    ...renderOptions,
  });
}

/**
 * Simulates user interaction
 * @param {Element} element - Element to interact with
 * @param {string} eventType - Event type
 * @param {Object} eventData - Event data
 */
export function simulateInteraction(element, eventType = 'click', eventData = {}) {
  switch (eventType) {
    case 'click':
      fireEvent.click(element, eventData);
      break;
    case 'change':
      fireEvent.change(element, eventData);
      break;
    case 'submit':
      fireEvent.submit(element, eventData);
      break;
    case 'hover':
      fireEvent.mouseEnter(element);
      break;
    case 'focus':
      fireEvent.focus(element);
      break;
    default:
      fireEvent(element, new Event(eventType, eventData));
  }
}

/**
 * Wait for async operations
 * @param {Function} callback - Callback to execute
 */
export async function waitForAsync(callback) {
  return waitFor(() => callback(), { timeout: 1000 });
}

/**
 * Mock API response
 * @param {Object} response - Response data
 * @param {number} delay - Delay in ms
 */
export function mockApiResponse(response, delay = 0) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(response), delay);
  });
}

/**
 * Mock API error
 * @param {string} message - Error message
 * @param {number} status - HTTP status code
 */
export function mockApiError(message = 'Request failed', status = 500) {
  const error = new Error(message);
  error.status = status;
  error.response = { data: { message } };
  return error;
}

/**
 * Creates mock props for UI components
 * @param {Object} baseProps - Base props
 * @param {Object} overrides - Props to override
 * @returns {Object} Merged props
 */
export function createMockProps(baseProps = {}, overrides = {}) {
  return { ...baseProps, ...overrides };
}

/**
 * Generates test IDs for components
 * @param {string} componentName - Component name
 * @param {string} elementName - Element name
 * @returns {string} Test ID
 */
export function generateTestId(componentName, elementName) {
  return `test-${componentName}-${elementName}`.toLowerCase();
}

/**
 * Finds element by test ID
 * @param {string} testId - Test ID
 * @returns {Element} Found element
 */
export function findByTestId(testId) {
  return screen.getByTestId(testId);
}

/**
 * Finds element by role and text
 * @param {string} role - ARIA role
 * @param {string} text - Element text
 * @returns {Element} Found element
 */
export function findByRoleText(role, text) {
  return screen.getByRole(role, { name: text });
}
