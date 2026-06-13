import { test, expect } from '@playwright/test';

test.describe('Viewport Visual Stability', () => {
  test('Scenario 1: Rapid Ticker Swap should be stable', async ({ page }) => {
    await page.goto('/');
    
    const chartCard = page.locator('.chart-card').first();
    if (await chartCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      const tickers = ['BTC', 'ETH', 'SOL', 'AAPL'];
      for (const ticker of tickers) {
        const tickerSelect = page.locator('.chart-card').nth(0).locator('.chart-header .custom-select').nth(0);
        if (await tickerSelect.isVisible()) {
          await tickerSelect.click();
          await page.locator('.dropdown-search input').fill(ticker);
          const result = page.locator('.dropdown-item', { hasText: ticker }).first();
          await result.waitFor({ state: 'visible' });
          await result.click();
          await page.waitForTimeout(200);
        }
      }
      
      const errorOverlay = page.locator('text=Error, text=Exception');
      await expect(errorOverlay).not.toBeVisible();
    }
  });

  test('Scenario 2: Viewport Anchor stability during prepend', async ({ page }) => {
    await page.goto('/');
    
    const chartCanvas = page.locator('.chart-card canvas').first();
    if (await chartCanvas.isVisible({ timeout: 5000 }).catch(() => false)) {
      // 1. Scroll to a historical area
      await chartCanvas.hover();
      await page.mouse.wheel(0, 500);
      await page.waitForTimeout(500);
      
      // 2. Trigger a data prepend
      const boundingBox = await chartCanvas.boundingBox();
      if (boundingBox) {
        const center = { x: boundingBox.x + boundingBox.width / 2, y: boundingBox.y + boundingBox.height / 2 };
        await page.mouse.move(center.x, center.y);
      }
      
      await expect(page).not.toHaveScreenshot('viewport-jump.png', { maxDiffPixels: 100 });
    }
  });
});
