import { test, expect } from '@playwright/test';

test.describe('Watchlist Synchronization', () => {
  let initialSymbols: string[] = [];

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Capture initial state to restore later
    initialSymbols = await page.evaluate(async () => {
      try {
        const res = await fetch('/api/watchlist');
        if (res.ok) {
          const data = await res.json();
          return data.symbols || [];
        }
      } catch (e) {
        console.error('Failed to fetch initial watchlist', e);
      }
      return [];
    });
  });

  test.afterEach(async ({ page }) => {
    // Restore initial state to avoid polluting test account
    await page.evaluate(async (symbols) => {
      try {
        await fetch('/api/watchlist', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ symbols })
        });
      } catch (e) {
        console.error('Failed to restore watchlist', e);
      }
    }, initialSymbols);
  });

  test('happy path: adds a symbol and syncs successfully', async ({ page }) => {
    // Open Watchlist panel
    const watchlistBtn = page.getByTitle('Watchlist');
    await expect(watchlistBtn).toBeVisible();
    await watchlistBtn.click();

    // Add a test symbol
    const searchInput = page.getByPlaceholder('Search markets...');
    await searchInput.fill('AAPL');
    await searchInput.press('Enter');

    // Wait for it to appear
    await expect(page.getByText('AAPL').first()).toBeVisible();

    // Set up network wait
    const syncPromise = page.waitForResponse(response => 
      response.url().includes('/api/watchlist') && response.request().method() === 'PUT' && response.status() === 200
    );

    // Click Sync button and verify network request
    const syncBtn = page.getByTitle('Sync Watchlist');
    await syncBtn.click();
    await syncPromise;

    // Verify success toast appears
    await expect(page.getByText('Watchlist synced successfully')).toBeVisible();
  });

  test('failure scenario: shows error toast on 500 response', async ({ page }) => {
    const watchlistBtn = page.getByTitle('Watchlist');
    await expect(watchlistBtn).toBeVisible();
    await watchlistBtn.click();

    // Mock the network request to fail
    await page.route('**/api/watchlist', async route => {
      if (route.request().method() === 'PUT') {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal Server Error' })
        });
      } else {
        await route.continue();
      }
    });

    const syncBtn = page.getByTitle('Sync Watchlist');
    await syncBtn.click();

    // Verify error toast
    await expect(page.getByText(/Sync Failed|Internal Server Error/i).first()).toBeVisible();
  });
});

