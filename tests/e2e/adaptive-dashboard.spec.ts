/**
 * Adaptive Dashboard End-to-End Tests
 * Comprehensive testing for adaptive dashboard functionality, user preferences, and role-based layouts
 */

import { test, expect, Page } from '@playwright/test';

// Test data and helpers
const TEST_USER = {
  email: 'test@actplacemat.org',
  password: 'testpassword123',
  role: 'project-manager'
};

const DASHBOARD_SELECTORS = {
  dashboard: '[data-testid="adaptive-dashboard"]',
  widget: '[data-widget-id]',
  widgetContainer: '.dashboard-widget',
  dragHandle: '.drag-handle',
  settingsButton: '[data-testid="dashboard-settings"]',
  layoutToggle: '[data-testid="layout-toggle"]',
  themeToggle: '[data-testid="theme-toggle"]',
  densitySelector: '[data-testid="density-selector"]',
  widgetLibrary: '[data-testid="widget-library"]',
  addWidgetButton: '[data-testid="add-widget"]',
  saveButton: '[data-testid="save-dashboard"]',
  resetButton: '[data-testid="reset-dashboard"]',
  recommendations: '[data-testid="recommendations"]',
  accessibilityMenu: '[data-testid="accessibility-menu"]'
};

const WIDGET_TYPES = [
  'overview',
  'projects', 
  'opportunities',
  'activity',
  'analytics',
  'tasks',
  'calendar',
  'notifications'
];

class DashboardPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/dashboard');
    await this.page.waitForSelector(DASHBOARD_SELECTORS.dashboard);
  }

  async waitForDashboardLoad() {
    await this.page.waitForSelector(DASHBOARD_SELECTORS.dashboard);
    await this.page.waitForLoadState('networkidle');
    // Wait for any loading animations to complete
    await this.page.waitForTimeout(1000);
  }

  async getVisibleWidgets() {
    return await this.page.locator(DASHBOARD_SELECTORS.widget).all();
  }

  async getWidgetById(widgetId: string) {
    return this.page.locator(`[data-widget-id="${widgetId}"]`);
  }

  async openSettings() {
    await this.page.click(DASHBOARD_SELECTORS.settingsButton);
    await this.page.waitForSelector('[data-testid="dashboard-settings-panel"]');
  }

  async changeLayout(layout: 'grid' | 'masonry' | 'list') {
    await this.openSettings();
    await this.page.selectOption('[data-testid="layout-selector"]', layout);
    await this.page.click(DASHBOARD_SELECTORS.saveButton);
  }

  async toggleTheme() {
    await this.page.click(DASHBOARD_SELECTORS.themeToggle);
  }

  async changeDensity(density: 'compact' | 'comfortable' | 'spacious') {
    await this.page.selectOption(DASHBOARD_SELECTORS.densitySelector, density);
  }

  async addWidget(widgetType: string) {
    await this.page.click(DASHBOARD_SELECTORS.addWidgetButton);
    await this.page.waitForSelector(DASHBOARD_SELECTORS.widgetLibrary);
    await this.page.click(`[data-widget-type="${widgetType}"]`);
    await this.page.click('[data-testid="confirm-add-widget"]');
  }

  async removeWidget(widgetId: string) {
    const widget = await this.getWidgetById(widgetId);
    await widget.hover();
    await widget.locator('.widget-remove-button').click();
    await this.page.click('[data-testid="confirm-remove-widget"]');
  }

  async dragWidget(sourceWidgetId: string, targetPosition: { x: number; y: number }) {
    const sourceWidget = await this.getWidgetById(sourceWidgetId);
    const dragHandle = sourceWidget.locator(DASHBOARD_SELECTORS.dragHandle);
    
    await dragHandle.dragTo(this.page.locator(DASHBOARD_SELECTORS.dashboard), {
      targetPosition
    });
  }

  async saveConfiguration() {
    await this.page.click(DASHBOARD_SELECTORS.saveButton);
    await this.page.waitForSelector('.toast-success');
  }

  async resetToDefaults() {
    await this.openSettings();
    await this.page.click(DASHBOARD_SELECTORS.resetButton);
    await this.page.click('[data-testid="confirm-reset"]');
  }

  async getRecommendations() {
    const recommendations = await this.page.locator(DASHBOARD_SELECTORS.recommendations);
    if (await recommendations.isVisible()) {
      return await recommendations.locator('.recommendation-item').all();
    }
    return [];
  }

  async applyRecommendation(index: number) {
    const recommendations = await this.getRecommendations();
    if (recommendations[index]) {
      await recommendations[index].locator('.apply-button').click();
    }
  }
}

test.describe('Adaptive Dashboard', () => {
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ page }) => {
    dashboardPage = new DashboardPage(page);
    
    // Mock authentication
    await page.route('/api/auth/login', (route) => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          user: TEST_USER,
          token: 'mock-jwt-token'
        })
      });
    });

    // Mock dashboard configuration API
    await page.route('/api/adaptive-dashboard/config', (route) => {
      if (route.request().method() === 'GET') {
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
                { id: 'projects', type: 'projects', position: { x: 0, y: 4, w: 6, h: 6 }, enabled: true },
                { id: 'opportunities', type: 'opportunities', position: { x: 6, y: 4, w: 6, h: 6 }, enabled: true }
              ]
            }
          })
        });
      } else {
        route.fulfill({ status: 200, body: JSON.stringify({ success: true }) });
      }
    });

    await dashboardPage.goto();
    await dashboardPage.waitForDashboardLoad();
  });

  test('should load dashboard with default configuration', async ({ page }) => {
    // Verify dashboard container is visible
    await expect(page.locator(DASHBOARD_SELECTORS.dashboard)).toBeVisible();
    
    // Verify default widgets are present
    const widgets = await dashboardPage.getVisibleWidgets();
    expect(widgets.length).toBeGreaterThan(0);
    
    // Verify specific default widgets
    await expect(dashboardPage.getWidgetById('overview')).toBeVisible();
    await expect(dashboardPage.getWidgetById('projects')).toBeVisible();
    await expect(dashboardPage.getWidgetById('opportunities')).toBeVisible();
  });

  test('should allow layout customization', async ({ page }) => {
    // Test grid layout (default)
    await expect(page.locator(DASHBOARD_SELECTORS.dashboard)).toHaveClass(/grid-layout/);
    
    // Change to masonry layout
    await dashboardPage.changeLayout('masonry');
    await expect(page.locator(DASHBOARD_SELECTORS.dashboard)).toHaveClass(/masonry-layout/);
    
    // Change to list layout
    await dashboardPage.changeLayout('list');
    await expect(page.locator(DASHBOARD_SELECTORS.dashboard)).toHaveClass(/list-layout/);
  });

  test('should support theme switching', async ({ page }) => {
    // Verify default light theme
    await expect(page.locator('html')).not.toHaveClass(/dark/);
    
    // Toggle to dark theme
    await dashboardPage.toggleTheme();
    await expect(page.locator('html')).toHaveClass(/dark/);
    
    // Toggle back to light theme
    await dashboardPage.toggleTheme();
    await expect(page.locator('html')).not.toHaveClass(/dark/);
  });

  test('should allow density adjustments', async ({ page }) => {
    // Test comfortable density (default)
    await expect(page.locator(DASHBOARD_SELECTORS.dashboard)).toHaveClass(/density-comfortable/);
    
    // Change to compact density
    await dashboardPage.changeDensity('compact');
    await expect(page.locator(DASHBOARD_SELECTORS.dashboard)).toHaveClass(/density-compact/);
    
    // Change to spacious density
    await dashboardPage.changeDensity('spacious');
    await expect(page.locator(DASHBOARD_SELECTORS.dashboard)).toHaveClass(/density-spacious/);
  });

  test('should support adding and removing widgets', async ({ page }) => {
    const initialWidgets = await dashboardPage.getVisibleWidgets();
    const initialCount = initialWidgets.length;
    
    // Add a new widget
    await dashboardPage.addWidget('analytics');
    
    // Verify widget was added
    const newWidgets = await dashboardPage.getVisibleWidgets();
    expect(newWidgets.length).toBe(initialCount + 1);
    await expect(dashboardPage.getWidgetById('analytics')).toBeVisible();
    
    // Remove the widget
    await dashboardPage.removeWidget('analytics');
    
    // Verify widget was removed
    const finalWidgets = await dashboardPage.getVisibleWidgets();
    expect(finalWidgets.length).toBe(initialCount);
    await expect(dashboardPage.getWidgetById('analytics')).not.toBeVisible();
  });

  test('should support drag and drop widget repositioning', async ({ page }) => {
    const overviewWidget = dashboardPage.getWidgetById('overview');
    const projectsWidget = dashboardPage.getWidgetById('projects');
    
    // Get initial positions
    const initialOverviewBox = await overviewWidget.boundingBox();
    const initialProjectsBox = await projectsWidget.boundingBox();
    
    expect(initialOverviewBox).toBeTruthy();
    expect(initialProjectsBox).toBeTruthy();
    
    // Drag overview widget to a new position
    await dashboardPage.dragWidget('overview', { x: 100, y: 200 });
    
    // Wait for position update
    await page.waitForTimeout(1000);
    
    // Verify position changed
    const newOverviewBox = await overviewWidget.boundingBox();
    expect(newOverviewBox?.x).not.toBe(initialOverviewBox?.x);
  });

  test('should persist configuration changes', async ({ page }) => {
    // Make configuration changes
    await dashboardPage.changeDensity('compact');
    await dashboardPage.addWidget('tasks');
    await dashboardPage.saveConfiguration();
    
    // Reload the page
    await page.reload();
    await dashboardPage.waitForDashboardLoad();
    
    // Verify changes persisted
    await expect(page.locator(DASHBOARD_SELECTORS.dashboard)).toHaveClass(/density-compact/);
    await expect(dashboardPage.getWidgetById('tasks')).toBeVisible();
  });

  test('should show AI recommendations', async ({ page }) => {
    // Mock recommendations API
    await page.route('/api/adaptive-dashboard/recommendations', (route) => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          recommendations: [
            {
              id: 'rec-1',
              type: 'widget',
              title: 'Add Analytics Widget',
              description: 'Based on your usage, analytics would be helpful',
              confidence: 0.85,
              action: 'add-widget',
              data: { widgetType: 'analytics' }
            }
          ]
        })
      });
    });
    
    // Trigger recommendations load
    await page.reload();
    await dashboardPage.waitForDashboardLoad();
    
    // Check if recommendations are shown
    const recommendations = await dashboardPage.getRecommendations();
    expect(recommendations.length).toBeGreaterThan(0);
    
    // Apply a recommendation
    await dashboardPage.applyRecommendation(0);
    
    // Verify the recommended widget was added
    await expect(dashboardPage.getWidgetById('analytics')).toBeVisible();
  });

  test('should handle role-based widget permissions', async ({ page }) => {
    // Mock role-based configuration
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
            ],
            roleBasedFeatures: {
              canManageProjects: true,
              canViewFinancials: false,
              canAccessAnalytics: true,
              canManageUsers: false
            }
          }
        })
      });
    });
    
    await page.reload();
    await dashboardPage.waitForDashboardLoad();
    
    // Verify role-based widgets are shown/hidden appropriately
    await expect(dashboardPage.getWidgetById('projects')).toBeVisible();
    
    // Financial widgets should not be available for this role
    await dashboardPage.openSettings();
    const widgetLibrary = page.locator(DASHBOARD_SELECTORS.widgetLibrary);
    if (await widgetLibrary.isVisible()) {
      await expect(widgetLibrary.locator('[data-widget-type="financial"]')).not.toBeVisible();
    }
  });

  test('should reset to default configuration', async ({ page }) => {
    // Make some changes
    await dashboardPage.changeDensity('compact');
    await dashboardPage.addWidget('calendar');
    
    // Reset to defaults
    await dashboardPage.resetToDefaults();
    
    // Verify reset worked
    await expect(page.locator(DASHBOARD_SELECTORS.dashboard)).toHaveClass(/density-comfortable/);
    await expect(dashboardPage.getWidgetById('calendar')).not.toBeVisible();
    
    // Verify default widgets are present
    await expect(dashboardPage.getWidgetById('overview')).toBeVisible();
    await expect(dashboardPage.getWidgetById('projects')).toBeVisible();
  });

  test('should track user interactions for learning', async ({ page }) => {
    let analyticsData: any[] = [];
    
    // Mock analytics tracking
    await page.route('/api/adaptive-dashboard/analytics/track', (route) => {
      const data = route.request().postDataJSON();
      analyticsData.push(data);
      route.fulfill({ status: 200, body: JSON.stringify({ success: true }) });
    });
    
    // Perform various interactions
    await dashboardPage.getWidgetById('projects').click();
    await dashboardPage.changeDensity('compact');
    await dashboardPage.addWidget('tasks');
    
    // Wait for analytics to be sent
    await page.waitForTimeout(2000);
    
    // Verify analytics were tracked
    expect(analyticsData.length).toBeGreaterThan(0);
    
    // Verify different event types were tracked
    const eventTypes = analyticsData.map(d => d.event);
    expect(eventTypes).toContain('widget-interaction');
    expect(eventTypes).toContain('density-changed');
    expect(eventTypes).toContain('widget-added');
  });

  test('should handle responsive design on mobile', async ({ page }) => {
    // Change to mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.reload();
    await dashboardPage.waitForDashboardLoad();
    
    // Verify mobile layout
    await expect(page.locator(DASHBOARD_SELECTORS.dashboard)).toHaveClass(/mobile-layout/);
    
    // Verify widgets stack vertically on mobile
    const widgets = await dashboardPage.getVisibleWidgets();
    for (let i = 0; i < widgets.length - 1; i++) {
      const currentWidget = widgets[i];
      const nextWidget = widgets[i + 1];
      
      const currentBox = await currentWidget.boundingBox();
      const nextBox = await nextWidget.boundingBox();
      
      // Next widget should be below current widget
      expect(nextBox?.y).toBeGreaterThan(currentBox?.y + currentBox?.height - 10);
    }
  });

  test('should load widgets lazily for performance', async ({ page }) => {
    // Monitor network requests
    const resourceRequests: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/static/js/')) {
        resourceRequests.push(request.url());
      }
    });
    
    await page.reload();
    await dashboardPage.waitForDashboardLoad();
    
    // Add a widget that should trigger lazy loading
    await dashboardPage.addWidget('analytics');
    
    // Wait for lazy loading
    await page.waitForTimeout(2000);
    
    // Verify that JavaScript chunks were loaded for the new widget
    const analyticsChunks = resourceRequests.filter(url => 
      url.includes('analytics') || url.includes('chunk')
    );
    expect(analyticsChunks.length).toBeGreaterThan(0);
  });
});

test.describe('Dashboard Error Handling', () => {
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ page }) => {
    dashboardPage = new DashboardPage(page);
  });

  test('should handle API failures gracefully', async ({ page }) => {
    // Mock API failure
    await page.route('/api/adaptive-dashboard/config', (route) => {
      route.fulfill({ status: 500, body: 'Internal Server Error' });
    });

    await dashboardPage.goto();
    
    // Should show error state but still be functional
    await expect(page.locator('[data-testid="dashboard-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
    
    // Retry should work when API is restored
    await page.route('/api/adaptive-dashboard/config', (route) => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          success: true,
          config: { layout: 'grid', theme: 'light', density: 'comfortable', widgets: [] }
        })
      });
    });
    
    await page.click('[data-testid="retry-button"]');
    await expect(page.locator(DASHBOARD_SELECTORS.dashboard)).toBeVisible();
  });

  test('should handle widget loading failures', async ({ page }) => {
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
              { id: 'broken-widget', type: 'broken', position: { x: 0, y: 0, w: 6, h: 4 }, enabled: true }
            ]
          }
        })
      });
    });

    await dashboardPage.goto();
    await dashboardPage.waitForDashboardLoad();
    
    // Should show error state for failed widget
    await expect(page.locator('[data-widget-id="broken-widget"] .widget-error')).toBeVisible();
    await expect(page.locator('[data-widget-id="broken-widget"] .retry-widget-button')).toBeVisible();
  });

  test('should handle network connectivity issues', async ({ page }) => {
    await dashboardPage.goto();
    await dashboardPage.waitForDashboardLoad();
    
    // Simulate network failure
    await page.context().setOffline(true);
    
    // Try to save configuration
    await dashboardPage.changeDensity('compact');
    await page.click(DASHBOARD_SELECTORS.saveButton);
    
    // Should show offline message
    await expect(page.locator('[data-testid="offline-message"]')).toBeVisible();
    
    // Restore connectivity
    await page.context().setOffline(false);
    
    // Should automatically retry and succeed
    await expect(page.locator('[data-testid="offline-message"]')).not.toBeVisible();
  });
});

export default DashboardPage;