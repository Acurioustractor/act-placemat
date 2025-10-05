import { test, expect } from '@playwright/test'

test.describe('ACT Community Control Studio', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173')
  })

  test('renders dashboard landing summary', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('ACT Community Control Studio')
    await expect(page.getByText('Today’s dashboard')).toBeVisible()
    await expect(page.getByText('Integration health')).toBeVisible()
    await expect(page.getByText('Revenue snapshot')).toBeVisible()
  })

  test('navigates between primary panels', async ({ page }) => {
    await page.getByRole('button', { name: 'Community Projects' }).click()
    await expect(page.getByText('Project Engine')).toBeVisible()

    await page.getByRole('button', { name: 'Community Network' }).click()
    await expect(page.getByText('Relationship Intelligence')).toBeVisible()

    await page.getByRole('button', { name: 'Revenue Transparency' }).click()
    await expect(page.getByText('Financial Sovereignty')).toBeVisible()

    await page.getByRole('button', { name: 'Story Studio' }).click()
    await expect(page.getByText('Consent dashboard')).toBeVisible()

    await page.getByRole('button', { name: 'Data Sovereignty' }).click()
    await expect(page.getByText('Community independence score')).toBeVisible()
  })

  test('exposes network filter controls', async ({ page }) => {
    await page.getByRole('button', { name: 'Community Network' }).click()

    const searchInput = page.getByLabel('Search')
    await expect(searchInput).toBeVisible()
    await searchInput.fill('climate')

    const strategicSelect = page.getByLabel('Strategic value')
    await strategicSelect.selectOption('high')

    const slider = page.getByLabel('Minimum relationship score').locator('input[type="range"]')
    await slider.fill('0.8')

    await page.getByRole('button', { name: 'Reset' }).click()
    await expect(searchInput).toHaveValue('')
  })

  test('renders story studio consent context', async ({ page }) => {
    await page.getByRole('button', { name: 'Story Studio' }).click()
    await expect(page.getByText('Consent dashboard')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Share your story' })).toBeVisible()
  })

  test('shows integration health on data sovereignty', async ({ page }) => {
    await page.getByRole('button', { name: 'Data Sovereignty' }).click()
    await expect(page.getByText('Integration health', { exact: true })).toBeVisible()
  })
})

