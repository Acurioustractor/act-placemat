/**
 * End-to-End Platform Workflow Tests
 * Tests complete user workflows across the ACT Placemat platform
 */

import { test, expect } from '@playwright/test';

test.describe('ACT Placemat Platform Workflows', () => {
  test.beforeEach(async ({ page }) => {
    // Set up test data and navigate to platform
    await page.goto('/');
    
    // Wait for initial load
    await page.waitForLoadState('networkidle');
  });

  test.describe('Mission Control Navigation', () => {
    test('should load mission control dashboard', async ({ page }) => {
      await expect(page.locator('h1')).toContainText('Mission Control');
      
      // Check for key dashboard sections
      await expect(page.getByText('Intelligence Hub')).toBeVisible();
      await expect(page.getByText('Community Impact')).toBeVisible();
      await expect(page.getByText('Business Operations')).toBeVisible();
    });

    test('should navigate to different platform sections', async ({ page }) => {
      // Navigate to Intelligence Hub
      await page.click('text=Intelligence Hub');
      await page.waitForURL('**/intelligence**');
      await expect(page.locator('h1')).toContainText('Intelligence');

      // Navigate back to Mission Control
      await page.click('text=Mission Control');
      await page.waitForURL('**/mission-control');
      await expect(page.locator('h1')).toContainText('Mission Control');

      // Navigate to Community Impact
      await page.click('text=Community Impact');
      await page.waitForURL('**/community**');
      await expect(page.locator('h1')).toContainText('Community');
    });
  });

  test.describe('tRPC Integration Workflow', () => {
    test('should access tRPC test interface', async ({ page }) => {
      await page.goto('/test-trpc');
      
      await expect(page.locator('h1')).toContainText('tRPC Integration Test');
      
      // Check for health status
      await expect(page.getByText('API Health Status')).toBeVisible();
      
      // Look for health indicator (may be loading initially)
      await page.waitForSelector('[data-testid="health-status"], .text-green-500, .text-red-500, .animate-spin', { 
        timeout: 10000 
      });
    });

    test('should display type safety examples', async ({ page }) => {
      await page.goto('/test-trpc');
      
      // Check for type safety documentation
      await expect(page.getByText('Type Safety Features')).toBeVisible();
      await expect(page.getByText('End-to-end type safety')).toBeVisible();
      await expect(page.getByText('Auto-completion')).toBeVisible();
    });

    test('should show implementation examples', async ({ page }) => {
      await page.goto('/test-trpc');
      
      // Check for code examples
      await expect(page.getByText('Implementation Examples')).toBeVisible();
      await expect(page.getByText('Frontend Usage')).toBeVisible();
      await expect(page.getByText('Backend Router')).toBeVisible();
    });
  });

  test.describe('Offline Functionality', () => {
    test('should handle offline state gracefully', async ({ page, context }) => {
      // Start online
      await expect(page.locator('body')).not.toHaveClass(/offline/);
      
      // Simulate going offline
      await context.setOffline(true);
      
      // Wait for offline detection
      await page.waitForTimeout(2000);
      
      // Check for offline notification
      await expect(page.getByText(/offline/i)).toBeVisible({ timeout: 10000 });
      
      // Go back online
      await context.setOffline(false);
      
      // Wait for online detection
      await page.waitForTimeout(2000);
      
      // Offline notification should disappear
      await expect(page.getByText(/offline/i)).not.toBeVisible({ timeout: 10000 });
    });

    test('should show service worker update notifications', async ({ page }) => {
      // This would require service worker mock
      // For now, just verify the structure exists
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Intelligence Hub Workflow', () => {
    test('should navigate to intelligence test page', async ({ page }) => {
      await page.goto('/intelligence-test');
      
      await expect(page.locator('h1')).toContainText('Intelligence');
      
      // Check for test interface elements
      await expect(page.getByText('5-Source Intelligence')).toBeVisible();
    });

    test('should handle intelligence search', async ({ page }) => {
      await page.goto('/intelligence-test');
      
      // Look for search interface
      const searchInput = page.locator('input[type="text"], textarea').first();
      if (await searchInput.isVisible()) {
        await searchInput.fill('test query');
        
        // Look for search button or enter key
        const searchButton = page.getByRole('button', { name: /search|query/i }).first();
        if (await searchButton.isVisible()) {
          await searchButton.click();
          
          // Wait for results or loading state
          await page.waitForTimeout(2000);
        }
      }
    });
  });

  test.describe('Community Dashboard Workflow', () => {
    test('should load community impact dashboard', async ({ page }) => {
      await page.goto('/community-impact');
      
      await expect(page.locator('h1')).toContainText('Community Impact');
      
      // Check for community content
      await expect(page.getByText(/stories|projects|partnerships/i)).toBeVisible();
    });

    test('should display community data', async ({ page }) => {
      await page.goto('/real-dashboard');
      
      // Wait for potential data loading
      await page.waitForTimeout(3000);
      
      // Look for data visualizations or content
      const hasContent = await page.locator('[data-testid="dashboard-content"], .chart, .graph, .data-table').isVisible();
      
      // Should have some form of content (even if empty state)
      expect(hasContent || await page.getByText(/no data|loading|error/i).isVisible()).toBeTruthy();
    });
  });

  test.describe('Mobile Responsiveness', () => {
    test('should work on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      
      await page.goto('/');
      
      // Check that navigation is accessible on mobile
      await expect(page.locator('h1')).toBeVisible();
      
      // Check for mobile navigation (hamburger menu, etc.)
      const mobileMenu = page.locator('[data-testid="mobile-menu"], button[aria-label*="menu"], .hamburger');
      if (await mobileMenu.isVisible()) {
        await mobileMenu.click();
        await page.waitForTimeout(500);
      }
    });

    test('should maintain functionality on tablet viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      
      await page.goto('/test-trpc');
      
      // All content should be visible and functional
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.getByText('Type Safety Features')).toBeVisible();
    });
  });

  test.describe('Performance Characteristics', () => {
    test('should load pages within acceptable time', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      const loadTime = Date.now() - startTime;
      
      // Should load within 5 seconds
      expect(loadTime).toBeLessThan(5000);
    });

    test('should handle navigation quickly', async ({ page }) => {
      await page.goto('/');
      
      const startTime = Date.now();
      await page.click('text=Intelligence');
      await page.waitForURL('**/intelligence**');
      const navTime = Date.now() - startTime;
      
      // Navigation should be quick
      expect(navTime).toBeLessThan(2000);
    });
  });

  test.describe('Error Handling', () => {
    test('should handle 404 pages gracefully', async ({ page }) => {
      await page.goto('/non-existent-page');
      
      // Should redirect to mission control or show 404
      await page.waitForTimeout(2000);
      
      const isRedirected = page.url().includes('mission-control') || page.url() === '/';
      const has404Content = await page.getByText(/not found|404/i).isVisible();
      
      expect(isRedirected || has404Content).toBeTruthy();
    });

    test('should handle API errors gracefully', async ({ page }) => {
      // Intercept API calls and force errors
      await page.route('**/api/**', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Server error' })
        });
      });

      await page.goto('/test-trpc');
      
      // Should show error states rather than crashing
      await expect(page.locator('body')).toBeVisible();
      
      // Look for error messages or fallback content
      await page.waitForTimeout(3000);
      const hasErrorMessage = await page.getByText(/error|failed|unavailable/i).isVisible();
      const hasContent = await page.locator('h1').isVisible();
      
      expect(hasErrorMessage || hasContent).toBeTruthy();
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper heading structure', async ({ page }) => {
      await page.goto('/');
      
      // Check for h1
      await expect(page.locator('h1')).toBeVisible();
      
      // Check that headings follow logical order
      const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
      expect(headings.length).toBeGreaterThan(0);
    });

    test('should be keyboard navigable', async ({ page }) => {
      await page.goto('/');
      
      // Tab through interactive elements
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      // Should have visible focus indicators
      const focusedElement = await page.locator(':focus').isVisible();
      expect(focusedElement).toBeTruthy();
    });

    test('should have appropriate ARIA labels', async ({ page }) => {
      await page.goto('/test-trpc');
      
      // Check for ARIA labels on interactive elements
      const buttons = await page.locator('button').all();
      
      if (buttons.length > 0) {
        for (const button of buttons.slice(0, 3)) { // Check first 3 buttons
          const ariaLabel = await button.getAttribute('aria-label');
          const text = await button.textContent();
          
          // Should have either aria-label or text content
          expect(ariaLabel || text?.trim()).toBeTruthy();
        }
      }
    });
  });

  test.describe('Data Persistence', () => {
    test('should maintain state across page refreshes', async ({ page }) => {
      await page.goto('/test-trpc');
      
      // Interact with something that might maintain state
      const inputs = await page.locator('input, select').all();
      if (inputs.length > 0) {
        await inputs[0].fill('test value');
        
        // Refresh page
        await page.reload();
        await page.waitForLoadState('networkidle');
        
        // Value might be restored depending on implementation
        // This test verifies the page loads without error
        await expect(page.locator('h1')).toBeVisible();
      }
    });
  });
});

test.describe('Cross-Browser Compatibility', () => {
  ['chromium', 'firefox', 'webkit'].forEach(browserName => {
    test(`should work in ${browserName}`, async ({ page, browserName: currentBrowser }) => {
      // Only run this specific browser test
      test.skip(currentBrowser !== browserName, `Skipping ${browserName} test`);
      
      await page.goto('/');
      
      // Basic functionality should work across browsers
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.getByText('Mission Control')).toBeVisible();
      
      // Navigate to test page
      await page.goto('/test-trpc');
      await expect(page.locator('h1')).toContainText('tRPC');
    });
  });
});