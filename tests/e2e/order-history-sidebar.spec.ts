import { test, expect } from '@playwright/test';

test.describe('Order History Sidebar (TDD)', () => {
  test('should render a closed trade and adjust chart range on click', async ({ page }) => {
    // Navigate to the app
    await page.goto('/');

    // We will inject a mock trade into the Zustand store via the window object
    // For TDD, we expect this to fail initially since the UI and store aren't implemented
    await page.evaluate(() => {
      // @ts-ignore
      if (window.useNettingStore) {
        // @ts-ignore
        window.useNettingStore.setState({
          trades: [
            {
              id: 'mock-trade-1',
              epic: 'BTCUSD',
              direction: 'BUY',
              totalSize: 1.5,
              openTime: '2024-01-01T10:00:00.000Z',
              closeTime: '2024-01-01T11:00:00.000Z',
              status: 'CLOSED',
              realizedPnL: 500
            }
          ]
        });
      }
    });

    // 1. Verify the trade is rendered in the sidebar
    // We expect a sidebar item with text 'BTCUSD' and '+$500'
    const tradeItem = page.locator('text=BTCUSD').locator('..');
    await expect(tradeItem).toBeVisible({ timeout: 2000 });
    await expect(page.locator('text=+$500')).toBeVisible({ timeout: 2000 });

    // 2. Setup interception or mock for chart range adjustment
    // Since we're using lightweight-charts, we might mock setVisibleLogicalRange
    // For this E2E test, we'll verify clicking it dispatches a window event or store update
    let chartNavigated = false;
    await page.exposeFunction('onChartNavigate', () => {
      chartNavigated = true;
    });
    
    await page.evaluate(() => {
      window.addEventListener('chart-navigate', () => {
        // @ts-ignore
        window.onChartNavigate();
      });
    });

    // Click the trade
    await tradeItem.click();

    // Verify chart adjustment event was triggered
    expect(chartNavigated).toBe(true);
  });
});
