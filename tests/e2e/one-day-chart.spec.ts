import { test, expect } from '@playwright/test';
import { setupLiveApiProxy } from './api-proxy';

test.describe('1-Day Chart stitching', () => {
  test('stitches 30-minute data into 1-Day chart correctly', async ({ page }) => {
    page.on('console', msg => console.log(`BROWSER: ${msg.text()}`));
    
    // Clear localStorage to ensure clean state
    await page.addInitScript(() => window.localStorage.clear());
    await setupLiveApiProxy(page);

    await page.route('**/api/market/v1/prices/*', async (route) => {
      const url = new URL(route.request().url());
      const resolution = url.searchParams.get('resolution');

      if (resolution === 'DAY') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            prices: [
              { snapshotTime: '2024-08-01T00:00:00', openPrice: { bid: 100, ask: 100 }, highPrice: { bid: 110, ask: 110 }, lowPrice: { bid: 90, ask: 90 }, closePrice: { bid: 105, ask: 105 }, lastTradedVolume: 1000 },
              { snapshotTime: '2024-08-02T00:00:00', openPrice: { bid: 105, ask: 105 }, highPrice: { bid: 115, ask: 115 }, lowPrice: { bid: 100, ask: 100 }, closePrice: { bid: 110, ask: 110 }, lastTradedVolume: 1000 },
            ]
          })
        });
      }

      if (resolution === 'MINUTE_30') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            prices: [
              // RTH hours for AAPL is approx 13:30 to 20:00 UTC, using 16:00 to be perfectly safe
              { snapshotTime: '2024-08-02T16:00:00', openPrice: { bid: 200, ask: 200 }, highPrice: { bid: 210, ask: 210 }, lowPrice: { bid: 190, ask: 190 }, closePrice: { bid: 205, ask: 205 }, lastTradedVolume: 500 },
              { snapshotTime: '2024-08-02T16:30:00', openPrice: { bid: 205, ask: 205 }, highPrice: { bid: 250, ask: 250 }, lowPrice: { bid: 200, ask: 200 }, closePrice: { bid: 245, ask: 245 }, lastTradedVolume: 500 },
            ]
          })
        });
      }

      return route.continue();
    });

    await page.goto('/');
    await expect(page.locator('.trade-controls').first()).toBeVisible({ timeout: 25000 });

    // Focus the first chart and select symbol AAPL
    await page.locator('.chart-card').first().click();
    await page.waitForTimeout(500);

    await page.keyboard.press('A');
    const input = page.locator('.chart-card').first().locator('input[type="text"]');
    await expect(input).toBeVisible();
    await input.fill('AAPL');
    await page.keyboard.press('Enter');

    // Wait a moment for AAPL to load
    await page.waitForTimeout(2000);

    // Switch to 1-day timeframe
    const chartHeader = page.locator('.chart-header').first();
    await chartHeader.locator('.lucide-clock').click();
    await page.locator('.dropdown-item').filter({ hasText: /^1D$/ }).first().click();

    // The UI should show the 1-day chart. 
    // We should wait enough time for the 30-minute fetch to complete and UI to update.
    await page.waitForTimeout(3000);

    // Read exposed chart data
    const chartData: any[] = await page.evaluate(() => {
      const allData = (window as any).__TEST_CHART_DATA__ || {};
      return allData['AAPL'] || [];
    });
    
    expect(chartData.length).toBeGreaterThan(0);
    console.log("CHART DATA:", JSON.stringify(chartData, null, 2));
    
    const aug2Candle = chartData.find(c => c.time.startsWith('2024-08-02'));
    expect(aug2Candle).toBeDefined();
    expect(aug2Candle.high).toBe(250); 
    expect(aug2Candle.low).toBe(190);
    expect(aug2Candle.close).toBe(245);
  });
});
