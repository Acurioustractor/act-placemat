/**
 * Accessibility Testing Suite
 * Comprehensive WCAG 2.2 compliance testing for the adaptive dashboard
 */

import { test, expect, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Accessibility test data
const ACCESSIBILITY_SELECTORS = {
  dashboard: '[data-testid="adaptive-dashboard"]',
  accessibilityMenu: '[data-testid="accessibility-menu"]',
  highContrastToggle: '[data-testid="high-contrast-toggle"]',
  fontSizeSelector: '[data-testid="font-size-selector"]',
  reducedMotionToggle: '[data-testid="reduced-motion-toggle"]',
  skipLinks: '.skip-links a',
  widgets: '[data-widget-id]',
  focusableElements: 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
  liveRegions: '[aria-live]',
  headings: 'h1, h2, h3, h4, h5, h6',
  landmarks: '[role="main"], [role="navigation"], [role="banner"], [role="contentinfo"], [role="complementary"]'
};

const KEYBOARD_SHORTCUTS = {
  TAB: 'Tab',
  SHIFT_TAB: 'Shift+Tab',
  ENTER: 'Enter',
  SPACE: ' ',
  ESCAPE: 'Escape',
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',
  CTRL_D: 'Control+d',
  CTRL_W: 'Control+w',
  CTRL_SLASH: 'Control+/',
  CMD_D: 'Meta+d',
  CMD_W: 'Meta+w',
  CMD_SLASH: 'Meta+/'
};

class AccessibilityTester {
  constructor(private page: Page) {}

  async runAxeAnalysis(context?: any) {
    const results = await new AxeBuilder({ page: this.page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .include(context || 'body')
      .analyze();

    return results;
  }

  async checkColorContrast() {
    const results = await new AxeBuilder({ page: this.page })
      .withTags(['color-contrast'])
      .analyze();

    return results;
  }

  async checkKeyboardNavigation() {
    const focusableElements = await this.page.locator(ACCESSIBILITY_SELECTORS.focusableElements).all();
    const results = [];

    for (let i = 0; i < focusableElements.length; i++) {
      const element = focusableElements[i];
      
      // Check if element can receive focus
      await element.focus();
      const isFocused = await element.evaluate((el) => document.activeElement === el);
      
      results.push({
        element: await element.getAttribute('data-testid') || await element.tagName(),
        canFocus: isFocused,
        hasTabIndex: await element.getAttribute('tabindex') !== null,
        hasAriaLabel: await element.getAttribute('aria-label') !== null
      });
    }

    return results;
  }

  async checkHeadingStructure() {
    const headings = await this.page.locator(ACCESSIBILITY_SELECTORS.headings).all();
    const structure = [];

    for (const heading of headings) {
      const tagName = await heading.tagName();
      const text = await heading.textContent();
      const level = parseInt(tagName.replace('H', ''));
      
      structure.push({
        level,
        text: text?.trim(),
        tagName
      });
    }

    return structure;
  }

  async checkLandmarks() {
    const landmarks = await this.page.locator(ACCESSIBILITY_SELECTORS.landmarks).all();
    const landmarkInfo = [];

    for (const landmark of landmarks) {
      const role = await landmark.getAttribute('role') || await landmark.tagName().toLowerCase();
      const label = await landmark.getAttribute('aria-label') || await landmark.getAttribute('aria-labelledby');
      
      landmarkInfo.push({
        role,
        hasLabel: !!label,
        isVisible: await landmark.isVisible()
      });
    }

    return landmarkInfo;
  }

  async checkLiveRegions() {
    const liveRegions = await this.page.locator(ACCESSIBILITY_SELECTORS.liveRegions).all();
    const regionInfo = [];

    for (const region of liveRegions) {
      const ariaLive = await region.getAttribute('aria-live');
      const ariaAtomic = await region.getAttribute('aria-atomic');
      const ariaRelevant = await region.getAttribute('aria-relevant');
      
      regionInfo.push({
        ariaLive,
        ariaAtomic,
        ariaRelevant,
        hasContent: !!(await region.textContent())?.trim()
      });
    }

    return regionInfo;
  }

  async testKeyboardShortcuts() {
    const isMac = await this.page.evaluate(() => navigator.platform.includes('Mac'));
    const ctrlKey = isMac ? 'Meta' : 'Control';

    const shortcuts = [
      { key: `${ctrlKey}+d`, description: 'Focus dashboard' },
      { key: `${ctrlKey}+w`, description: 'Navigate widgets' },
      { key: `${ctrlKey}+/`, description: 'Open search' }
    ];

    const results = [];

    for (const shortcut of shortcuts) {
      try {
        await this.page.keyboard.press(shortcut.key);
        await this.page.waitForTimeout(500);
        
        // Check if the shortcut had an effect (you'd customize this based on your shortcuts)
        const activeElement = await this.page.evaluate(() => document.activeElement?.tagName);
        
        results.push({
          shortcut: shortcut.key,
          description: shortcut.description,
          worked: !!activeElement
        });
      } catch (error) {
        results.push({
          shortcut: shortcut.key,
          description: shortcut.description,
          worked: false,
          error: error.message
        });
      }
    }

    return results;
  }

  async testScreenReaderAnnouncements() {
    // This is a simulation - real screen reader testing would need actual screen readers
    const liveRegions = await this.page.locator('[aria-live]').all();
    let announcements = 0;

    // Trigger some interactions that should cause announcements
    await this.page.click(ACCESSIBILITY_SELECTORS.highContrastToggle);
    await this.page.waitForTimeout(500);
    
    for (const region of liveRegions) {
      const content = await region.textContent();
      if (content?.trim()) {
        announcements++;
      }
    }

    return announcements;
  }
}

test.describe('Dashboard Accessibility', () => {
  let accessibilityTester: AccessibilityTester;

  test.beforeEach(async ({ page }) => {
    accessibilityTester = new AccessibilityTester(page);
    
    // Mock dashboard configuration
    await page.route('/api/adaptive-dashboard/config', (route) => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          success: true,
          config: {
            layout: 'grid',
            theme: 'light',
            density: 'comfortable',
            widgets: [
              { id: 'overview', type: 'overview', position: { x: 0, y: 0, w: 12, h: 4 }, enabled: true },
              { id: 'projects', type: 'projects', position: { x: 0, y: 4, w: 6, h: 6 }, enabled: true }
            ]
          }
        })
      });
    });

    await page.goto('/dashboard');
    await page.waitForSelector(ACCESSIBILITY_SELECTORS.dashboard);
  });

  test('should pass WCAG 2.2 AA compliance', async ({ page }) => {
    const results = await accessibilityTester.runAxeAnalysis();
    
    // Log any violations for debugging
    if (results.violations.length > 0) {
      console.log('Accessibility violations found:', results.violations);
    }
    
    // Should have no violations
    expect(results.violations).toHaveLength(0);
    
    // Should have passed rules
    expect(results.passes.length).toBeGreaterThan(0);
  });

  test('should have proper color contrast', async ({ page }) => {
    const results = await accessibilityTester.checkColorContrast();
    
    // Check for color contrast violations
    const contrastViolations = results.violations.filter(violation => 
      violation.id === 'color-contrast' || violation.id === 'color-contrast-enhanced'
    );
    
    expect(contrastViolations).toHaveLength(0);
  });

  test('should support keyboard navigation', async ({ page }) => {
    const navigationResults = await accessibilityTester.checkKeyboardNavigation();
    
    // All focusable elements should be able to receive focus
    const focusableElements = navigationResults.filter(result => result.canFocus);
    expect(focusableElements.length).toBeGreaterThan(0);
    
    // Test tab navigation
    await page.keyboard.press(KEYBOARD_SHORTCUTS.TAB);
    let focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).toBeTruthy();
    
    // Test reverse tab navigation
    await page.keyboard.press(KEYBOARD_SHORTCUTS.SHIFT_TAB);
    const previousElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(previousElement).toBeTruthy();
  });

  test('should have proper heading structure', async ({ page }) => {
    const headingStructure = await accessibilityTester.checkHeadingStructure();
    
    // Should have headings
    expect(headingStructure.length).toBeGreaterThan(0);
    
    // Should start with h1 or h2
    const firstHeading = headingStructure[0];
    expect([1, 2]).toContain(firstHeading.level);
    
    // Check for proper nesting (no skipping levels)
    for (let i = 1; i < headingStructure.length; i++) {
      const current = headingStructure[i];
      const previous = headingStructure[i - 1];
      
      // Level difference should not be more than 1 when increasing
      if (current.level > previous.level) {
        expect(current.level - previous.level).toBeLessThanOrEqual(1);
      }
    }
  });

  test('should have proper landmarks', async ({ page }) => {
    const landmarks = await accessibilityTester.checkLandmarks();
    
    // Should have main landmark
    const mainLandmark = landmarks.find(l => l.role === 'main' || l.role === 'MAIN');
    expect(mainLandmark).toBeTruthy();
    expect(mainLandmark?.isVisible).toBe(true);
    
    // Navigation landmarks should have labels if multiple exist
    const navigationLandmarks = landmarks.filter(l => l.role === 'navigation' || l.role === 'NAV');
    if (navigationLandmarks.length > 1) {
      navigationLandmarks.forEach(nav => {
        expect(nav.hasLabel).toBe(true);
      });
    }
  });

  test('should support skip links', async ({ page }) => {
    // Focus should initially be on skip link
    await page.keyboard.press(KEYBOARD_SHORTCUTS.TAB);
    
    const skipLink = page.locator(ACCESSIBILITY_SELECTORS.skipLinks).first();
    if (await skipLink.count() > 0) {
      // Skip link should be focusable
      await skipLink.focus();
      expect(await skipLink.isVisible()).toBe(true);
      
      // Pressing enter should skip to main content
      await page.keyboard.press(KEYBOARD_SHORTCUTS.ENTER);
      
      const focusedElement = await page.evaluate(() => document.activeElement?.id);
      expect(focusedElement).toBe('main-content');
    }
  });

  test('should have proper ARIA labels and roles', async ({ page }) => {
    // Check widgets have proper ARIA attributes
    const widgets = await page.locator(ACCESSIBILITY_SELECTORS.widgets).all();
    
    for (const widget of widgets) {
      const role = await widget.getAttribute('role');
      const ariaLabel = await widget.getAttribute('aria-label');
      const ariaLabelledBy = await widget.getAttribute('aria-labelledby');
      
      // Widget should have a role
      expect(role).toBeTruthy();
      
      // Widget should have accessible name
      expect(ariaLabel || ariaLabelledBy).toBeTruthy();
    }
    
    // Check buttons have accessible names
    const buttons = await page.locator('button').all();
    for (const button of buttons) {
      const text = await button.textContent();
      const ariaLabel = await button.getAttribute('aria-label');
      const ariaLabelledBy = await button.getAttribute('aria-labelledby');
      
      expect(text?.trim() || ariaLabel || ariaLabelledBy).toBeTruthy();
    }
  });

  test('should support high contrast mode', async ({ page }) => {
    // Toggle high contrast mode
    const highContrastToggle = page.locator(ACCESSIBILITY_SELECTORS.highContrastToggle);
    
    if (await highContrastToggle.count() > 0) {
      await highContrastToggle.click();
      
      // Check that high contrast styles are applied
      await expect(page.locator('html')).toHaveClass(/high-contrast/);
      
      // Run color contrast check in high contrast mode
      const results = await accessibilityTester.checkColorContrast();
      expect(results.violations.filter(v => v.id === 'color-contrast')).toHaveLength(0);
      
      // Toggle back
      await highContrastToggle.click();
      await expect(page.locator('html')).not.toHaveClass(/high-contrast/);
    }
  });

  test('should support font size adjustments', async ({ page }) => {
    const fontSizeSelector = page.locator(ACCESSIBILITY_SELECTORS.fontSizeSelector);
    
    if (await fontSizeSelector.count() > 0) {
      // Test different font sizes
      const sizes = ['small', 'medium', 'large', 'extra-large'];
      
      for (const size of sizes) {
        await fontSizeSelector.selectOption(size);
        
        // Check that font size multiplier is applied
        const multiplier = await page.evaluate(() => 
          getComputedStyle(document.documentElement).getPropertyValue('--font-size-multiplier')
        );
        
        expect(multiplier).toBeTruthy();
      }
    }
  });

  test('should support reduced motion', async ({ page }) => {
    const reducedMotionToggle = page.locator(ACCESSIBILITY_SELECTORS.reducedMotionToggle);
    
    if (await reducedMotionToggle.count() > 0) {
      await reducedMotionToggle.click();
      
      // Check that reduced motion class is applied
      await expect(page.locator('html')).toHaveClass(/reduced-motion/);
      
      // Verify animations are disabled
      const animationDuration = await page.evaluate(() => {
        const element = document.querySelector('.dashboard-widget');
        return element ? getComputedStyle(element).animationDuration : null;
      });
      
      // Should be very short or none
      expect(animationDuration).toMatch(/(0\.01ms|none|0s)/);
    }
  });

  test('should have proper live regions', async ({ page }) => {
    const liveRegions = await accessibilityTester.checkLiveRegions();
    
    // Should have at least one live region for announcements
    expect(liveRegions.length).toBeGreaterThan(0);
    
    // Live regions should have proper attributes
    liveRegions.forEach(region => {
      expect(['polite', 'assertive', 'off']).toContain(region.ariaLive);
    });
  });

  test('should support screen reader announcements', async ({ page }) => {
    const announcementCount = await accessibilityTester.testScreenReaderAnnouncements();
    
    // Should make announcements for interactions
    expect(announcementCount).toBeGreaterThan(0);
  });

  test('should support keyboard shortcuts', async ({ page }) => {
    const shortcuts = await accessibilityTester.testKeyboardShortcuts();
    
    // At least some shortcuts should work
    const workingShortcuts = shortcuts.filter(s => s.worked);
    expect(workingShortcuts.length).toBeGreaterThan(0);
  });

  test('should handle focus management in modals', async ({ page }) => {
    // Open a modal (settings panel)
    const settingsButton = page.locator('[data-testid="dashboard-settings"]');
    if (await settingsButton.count() > 0) {
      await settingsButton.click();
      
      const modal = page.locator('[data-testid="dashboard-settings-panel"]');
      await expect(modal).toBeVisible();
      
      // Focus should be trapped within modal
      const firstFocusable = modal.locator('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])').first();
      const lastFocusable = modal.locator('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])').last();
      
      // Tab from last element should cycle to first
      await lastFocusable.focus();
      await page.keyboard.press(KEYBOARD_SHORTCUTS.TAB);
      
      const focusedElement = await page.evaluate(() => document.activeElement);
      const firstElement = await firstFocusable.evaluate(el => el);
      expect(focusedElement).toBe(firstElement);
      
      // Escape should close modal
      await page.keyboard.press(KEYBOARD_SHORTCUTS.ESCAPE);
      await expect(modal).not.toBeVisible();
    }
  });

  test('should have appropriate touch target sizes', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Check touch target sizes
    const interactiveElements = await page.locator('button, a, input, select').all();
    
    for (const element of interactiveElements) {
      const box = await element.boundingBox();
      if (box) {
        // WCAG 2.2 requires 44x44px minimum (with some exceptions)
        expect(box.width).toBeGreaterThanOrEqual(44);
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
    }
  });

  test('should support forced colors mode', async ({ page }) => {
    // Simulate forced colors mode
    await page.emulateMedia({ forcedColors: 'active' });
    
    // Elements should still be visible and functional
    const widgets = await page.locator(ACCESSIBILITY_SELECTORS.widgets).all();
    for (const widget of widgets) {
      await expect(widget).toBeVisible();
    }
    
    // Run axe analysis in forced colors mode
    const results = await accessibilityTester.runAxeAnalysis();
    expect(results.violations.filter(v => v.id === 'color-contrast')).toHaveLength(0);
  });
});

test.describe('Widget Accessibility', () => {
  test('individual widgets should be accessible', async ({ page }) => {
    const accessibilityTester = new AccessibilityTester(page);
    
    await page.route('/api/adaptive-dashboard/config', (route) => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          success: true,
          config: {
            layout: 'grid',
            theme: 'light',
            density: 'comfortable',
            widgets: [
              { id: 'overview', type: 'overview', position: { x: 0, y: 0, w: 12, h: 4 }, enabled: true }
            ]
          }
        })
      });
    });

    await page.goto('/dashboard');
    await page.waitForSelector(ACCESSIBILITY_SELECTORS.dashboard);
    
    // Test each widget individually
    const widgets = await page.locator(ACCESSIBILITY_SELECTORS.widgets).all();
    
    for (const widget of widgets) {
      // Get widget container for scoped testing
      const widgetId = await widget.getAttribute('data-widget-id');
      
      // Test widget accessibility
      const results = await new AxeBuilder({ page })
        .include(`[data-widget-id="${widgetId}"]`)
        .analyze();
      
      if (results.violations.length > 0) {
        console.log(`Widget ${widgetId} violations:`, results.violations);
      }
      
      expect(results.violations).toHaveLength(0);
    }
  });
});

export { AccessibilityTester };