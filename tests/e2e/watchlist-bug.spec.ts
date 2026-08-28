import { test, expect } from '@playwright/test';

test.describe('Watchlist Sync Bug', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/session', route => route.fulfill({ status: 200, headers: { cst: 'mock', 'x-security-token': 'mock' }, json: { accountType: 'CFD' } }));
    await page.route('**/api/ping*', route => route.fulfill({ status: 200, json: { status: 'OK' } }));
    await page.route('**/api/accounts', route => route.fulfill({ status: 200, json: { accounts: [{ accountId: 'mock', status: 'ENABLED', balance: { balance: 10000 }, currency: 'USD' }] } }));
    await page.route('**/api/order/v1/workingorders**', route => route.fulfill({ status: 200, json: { workingOrders: [] } }));
    await page.route('**/api/order/v1/positions**', route => route.fulfill({ status: 200, json: { positions: [] } }));
    await page.route('**/api/order/v1/history/activity**', route => route.fulfill({ status: 200, json: { activities: [] } }));
    await page.route('**/api/market/v1/markets*', route => route.fulfill({ status: 200, json: { markets: [{ epic: 'SPY', instrumentName: 'SPY', expiry: '-', lotSize: 1, currencies: [{ symbol: '$' }] }] } }));
    await page.route('**/api/watchlist*', route => route.fulfill({ status: 200, json: { id: '1', name: 'My Watchlist', markets: [{ epic: 'SPY', instrumentName: 'SPY' }] } }));
    await page.route('**/api/market/v1/prices/*', route => route.fulfill({ status: 200, json: { prices: [] } }));

    await page.addInitScript(() => {
      window.localStorage.setItem('auth-storage', JSON.stringify({
        state: { isAuthenticated: true, selectedAccountId: 'mock', cst: 'mock', securityToken: 'mock', environment: 'DEMO' },
        version: 0
      }));
    });
  });

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
