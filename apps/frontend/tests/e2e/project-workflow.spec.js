/**
 * Project Workflow E2E Tests
 *
 * Playwright tests for project management workflows
 */
import { test, expect } from '@playwright/test';

test.describe('Project Management', () => {
  test.beforeEach(async ({ page }) => {
    // Mock project data
    await page.route('/api/projects', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          projects: [
            { id: '1', name: 'Project A', status: 'active', progress: 50 },
            { id: '2', name: 'Project B', status: 'completed', progress: 100 },
          ],
          total: 2,
        }),
      });
    });

    await page.goto('/projects');
  });

  test('displays projects list', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Projects');
    await expect(page.locator('[data-testid="project-card"]')).toHaveCount(2);
  });

  test('filters projects by status', async ({ page }) => {
    // Mock filtered results
    await page.route('/api/projects?status=active', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          projects: [
            { id: '1', name: 'Project A', status: 'active', progress: 50 },
          ],
          total: 1,
        }),
      });
    });

    await page.selectOption('[data-testid="status-filter"]', 'active');

    await expect(page.locator('[data-testid="project-card"]')).toHaveCount(1);
  });

  test('creates new project', async ({ page }) => {
    // Mock create project response
    await page.route('/api/projects', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: '3',
            name: 'New Project',
            status: 'planning',
            progress: 0,
          }),
        });
      }
    });

    await page.click('[data-testid="create-project-button"]');
    await page.fill('[data-testid="project-name-input"]', 'New Project');
    await page.click('[data-testid="submit-project"]');

    await expect(page.locator('[data-testid="project-card"]:last-child')).toContainText('New Project');
  });

  test('updates project status', async ({ page }) => {
    // Mock update response
    await page.route('/api/projects/1', async (route) => {
      if (route.request().method() === 'PATCH') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: '1',
            name: 'Project A',
            status: 'completed',
            progress: 100,
          }),
        });
      }
    });

    await page.click('[data-testid="project-card"]:first-child');
    await page.selectOption('[data-testid="status-select"]', 'completed');
    await page.click('[data-testid="save-status"]');

    await expect(page.locator('[data-testid="project-card"]:first-child')).toContainText('completed');
  });
});

test.describe('Project Details', () => {
  test('displays project details', async ({ page }) => {
    await page.route('/api/projects/1', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: '1',
          name: 'Project A',
          description: 'Test description',
          status: 'active',
          progress: 50,
          owner: 'John Doe',
          startDate: '2024-01-01',
          endDate: '2024-12-31',
        }),
      });
    });

    await page.goto('/projects/1');

    await expect(page.locator('h1')).toContainText('Project A');
    await expect(page.locator('[data-testid="project-description"]')).toContainText('Test description');
    await expect(page.locator('[data-testid="project-owner"]')).toContainText('John Doe');
  });
});
