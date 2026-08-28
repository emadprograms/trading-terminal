import { test, expect } from '@playwright/test';
import { setupLiveApiProxy } from './api-proxy';

test.describe('1-min timeframe missing data investigation', () => {
  const symbols = ['BTCUSD', 'ETHUSD', 'AAPL']; // Testing multiple symbols

  for (const symbol of symbols) {
    test(`Test 1-min chart for ${symbol}`, async ({ page }) => {
      // Collect errors or warnings from console
      const consoleMessages: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error' || msg.text().includes('missing')) {
          consoleMessages.push(msg.text());
        }
      });

      // Collect network failures
      const failedRequests: string[] = [];
      page.on('requestfailed', request => {
        failedRequests.push(request.url() + ' ' + request.failure()?.errorText);
      });

      // Setup API Proxy for live data
      await setupLiveApiProxy(page);

      await page.goto('/');
      await expect(page.locator('.trade-controls').first()).toBeVisible({ timeout: 25000 });

      // Focus the first chart and select symbol
      await page.locator('.chart-card').first().click();
      await expect(page.locator('.chart-card').first()).toHaveClass(/is-selected/);
      
      await page.waitForTimeout(500);

      // Type first letter to trigger Keyboard Action Modal
      await page.keyboard.press(symbol[0]);
      const input = page.locator('.chart-card').first().locator('input[type="text"]');
      await expect(input).toBeVisible({ timeout: 10000 });
      await input.fill(symbol);
      await page.keyboard.press('Enter');

      // Wait a moment for chart to load with default timeframe
      await page.waitForTimeout(2000);

      // Switch to 1-minute timeframe
      const chartHeader = page.locator('.chart-header').first();
      await chartHeader.locator('.lucide-clock').click();
      await page.getByText('1m', { exact: true }).click();

      // Wait to see if error banner or console error appears
      await page.waitForTimeout(5000);

      // Check if there's any error banner showing "Data missing" or similar
      // The exact text depends on the UI, but we can look for .stitching-error-banner or similar class
      const errorBanner = page.locator('.stitching-error-banner, .error-banner, :text("data missing")').first();
      
      const hasErrorBanner = await errorBanner.isVisible().catch(() => false);
      const text = hasErrorBanner ? await errorBanner.textContent() : null;

      console.log(`Results for ${symbol}:`);
      console.log(`Has error banner: ${hasErrorBanner}`, text ? `(Text: ${text})` : '');
      console.log(`Console errors: ${consoleMessages.join('\\n')}`);
      console.log(`Failed requests: ${failedRequests.join('\\n')}`);

      // We expect the banner NOT to be visible, but we are investigating if it is
      // We will soft expect so the test continues and outputs the logs
      expect.soft(hasErrorBanner, 'Error banner should not be visible').toBeFalsy();
    });
  }
});
