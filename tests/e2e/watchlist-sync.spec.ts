import { test, expect } from '@playwright/test';

test.describe('Watchlist Synchronization', () => {
  let initialSymbols: string[] = [];

  test.beforeEach(async ({ page }) => {
    // Inject fake session so it doesn't get stuck on login
    await page.route('**/api/session', async route => {
      await route.fulfill({
        status: 200,
        headers: {
          'cst': 'mock-cst-token',
          'x-security-token': 'mock-security-token',
        },
        json: { accountType: 'CFD', clientId: 'mock' }
      });
    });

    // Mock watchlist endpoints to prevent 401s
    await page.route(/\/api\/watchlist/, async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ watchlists: [
            { id: 'mock-123', name: 'Main List', epics: ['SPY', 'QQQ'] },
            { id: 'mock-456', name: 'Tech List', epics: ['AAPL', 'MSFT'] }
          ] })
        });
      } else if (route.request().method() === 'PUT' || route.request().method() === 'DELETE') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true })
        });
      } else {
        await route.continue();
      }
    });

    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
    page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Capture initial state to restore later
    initialSymbols = await page.evaluate(async () => {
      try {
        const res = await fetch('/api/watchlist');
        if (res.ok) {
          const data = await res.json();
          if (data.watchlists && data.watchlists.length > 0) {
            return data.watchlists[0].epics || [];
          }
          return data.epics || [];
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
        // Just send dummy requests for the mock, since we're using page.route anyway
        // In a real live test, we'd delete all and add all, but this test is mocked.
        for (const epic of symbols) {
          await fetch(`/api/watchlist/mock-123`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ epic })
          });
        }
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

    // Select the second watchlist
    const select = page.getByTitle('Select Watchlist');
    await select.selectOption('mock-456');

    // Wait for symbols to update
    await expect(page.getByText('AAPL').first()).toBeVisible();

    // Add a test symbol
    const searchInput = page.getByPlaceholder('Search markets...');
    await searchInput.fill('GOOGL');
    await searchInput.press('Enter');

    // Wait for it to appear
    await expect(page.getByText('GOOGL').first()).toBeVisible();

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
    await page.route(/\/api\/watchlist/, async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' })
      });
    });

    const syncBtn = page.getByTitle('Sync Watchlist');
    await syncBtn.click();

    // Verify error toast
    await expect(page.getByText(/Failed|Error/i).first()).toBeVisible();
  });
});

