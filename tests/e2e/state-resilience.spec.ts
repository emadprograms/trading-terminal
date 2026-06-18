import { test, expect } from '@playwright/test';

test.describe('State Resilience & Self-Healing', () => {
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

    // We also need to mock ping
    await page.route('**/api/ping*', route => route.fulfill({ status: 200, json: { status: 'OK' } }));
  });

  test('ignores legacy selectedDate in localStorage and loads current live data', async ({ page }) => {
    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
    page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));

    // 1. Navigate to the page to establish origin, but don't wait for full load yet
    await page.goto('/');

    // 2. Inject corrupted/legacy state into localStorage
    await page.evaluate(() => {
      localStorage.setItem('lastUsedDate', '2020-01-01');
      // Also inject a legacy ticker just to be thorough
      localStorage.setItem('lastUsedTicker', 'BTCUSD');
    });

    // 3. Reload the page so it boots up WITH the corrupted local storage
    await page.reload();

    // 4. Wait for the main UI to load
    await page.waitForLoadState('domcontentloaded');

    // 5. Assert that the legacy state did NOT cause a stitching error
    // The chart should ignore the 2020 date and fetch the current date, perfectly stitching to the WS.
    await expect(page.getByText('Data Stitching Error')).toHaveCount(0, { timeout: 10000 });

    // 6. Let the WebSocket stream for a moment to ensure no delayed crashes
    await page.waitForTimeout(2000);
    await expect(page.getByText('Data Stitching Error')).toHaveCount(0);
    
    // 7. Verify the terminal is functional by checking if the UI is loaded and we aren't showing an infinite spinner
    const buyBtn = page.getByRole('button', { name: /Buy|Long/i }).first();
    await expect(buyBtn).toBeVisible({ timeout: 30000 });
  });
});
