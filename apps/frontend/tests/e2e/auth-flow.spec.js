/**
 * Authentication Flow E2E Tests
 *
 * Playwright tests for user authentication flows
 */
import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('displays login form', async ({ page }) => {
    await expect(page.locator('form')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toinput[type="passwordBeVisible();
  });

  test('validates email format', async ({ page }) => {
    await page.fill('input[type="email"]', 'invalid-email');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    await expect(page.locator('.error-message')).toContainText('Invalid email');
  });

  test('shows error on invalid credentials', async ({ page }) => {
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'wrong-password');
    await page.click('button[type="submit"]');

    await expect(page.locator('.error-message')).toBeVisible();
    await expect(page.locator('.error-message')).toContainText('Invalid credentials');
  });

  test('redirects to dashboard on successful login', async ({ page }) => {
    // Mock successful login response
    await page.route('/api/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: { id: '1', email: 'test@example.com' },
          token: 'mock-token',
        }),
      });
    });

    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'correct-password');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('shows loading state during login', async ({ page }) => {
    // Mock delayed login response
    await page.route('/api/auth/login', async (route) => {
      await page.waitForTimeout(1000);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: { id: '1', email: 'test@example.com' },
          token: 'mock-token',
        }),
      });
    });

    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'correct-password');
    await page.click('button[type="submit"]');

    expect(page.locator('button[type="submit"]')).toBeDisabled();
  });
});

test.describe('Logout', () => {
  test('logs out user and redirects to login', async ({ page }) => {
    // Set authenticated state
    await page.addInitScript(() => {
      localStorage.setItem('auth-token', 'mock-token');
    });

    await page.goto('/dashboard');

    // Click logout
    await page.click('button[aria-label="Logout"]');

    await expect(page).toHaveURL(/\/login/);
    expect(localStorage.getItem('auth-token')).toBeNull();
  });
});
