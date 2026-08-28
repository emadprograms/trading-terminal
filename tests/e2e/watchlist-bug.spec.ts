import { test, expect } from '@playwright/test';

test.describe('Watchlist Sync Bug', () => {
  test('sidebar and chart bar should show same watchlist symbols', async ({ page }) => {
    // Navigate to the app
    await page.goto('/');

    // Wait for the app to load
    await page.waitForSelector('.sidebar');

    // Open the watchlist in sidebar
    const watchlistBtn = page.locator('button[title="Watchlist"]');
    await watchlistBtn.click();

    // Open the dropdown in chart bar
    const chartHeaderSearch = page.locator('.custom-select').filter({ has: page.locator('.lucide-search') }).first();
    await chartHeaderSearch.click();

    // Verify initial dropdown state in chart bar
    await expect(page.locator('.dropdown-item').filter({ hasText: 'SPY' }).first()).toBeVisible();

    // Add a new symbol in sidebar
    const addInput = page.locator('input[placeholder="Search markets..."]');
    await addInput.fill('IBM');
    await addInput.press('Enter');

    // Check if IBM is added to the sidebar
    await expect(page.locator('.watchlist-item').filter({ hasText: 'IBM' })).toBeVisible();

    // Close and reopen the dropdown to refresh
    await chartHeaderSearch.click(); // Close
    await chartHeaderSearch.click(); // Reopen

    // Should find IBM in the dropdown
    await expect(page.locator('.dropdown-item').filter({ hasText: 'IBM' }).first()).toBeVisible();
  });
});
