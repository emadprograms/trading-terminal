import { test, expect } from '@playwright/test';

test.describe('Order Marker Placement E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Mocks
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
    await page.route('**/api/ping*', route => route.fulfill({ status: 200, json: { status: 'OK' } }));
    await page.route('**/api/accounts', route => route.fulfill({ status: 200, json: { accounts: [{ accountId: 'mock', status: 'ENABLED', balance: { balance: 10000 }, currency: 'USD' }] } }));
    await page.route('**/api/order/v1/workingorders**', route => route.fulfill({ status: 200, json: { workingOrders: [] } }));
    await page.route('**/api/market/v1/markets*', route => route.fulfill({ status: 200, json: { markets: [{ epic: 'SPY', instrumentName: 'SPY', expiry: '-', lotSize: 1, currencies: [{ symbol: '$' }] }] } }));
    await page.route('**/api/watchlist/1', route => route.fulfill({ status: 200, json: { id: '1', name: 'My Watchlist', markets: [{ epic: 'SPY', instrumentName: 'SPY', updateTime: '', updateTimeUTC: '' }] } }));
  });

  test('Execution marker exactly matches the time of a simulated trade', async ({ page }) => {
    // 1. Mock Chart prices to contain the exact candle
    await page.route('**/api/market/v1/prices/*', route => {
      return route.fulfill({
        status: 200,
        json: {
          prices: [
            { snapshotTime: '2023-11-14T22:13:20', snapshotTimeUTC: '2023-11-14T22:13:20', openPrice: { bid: 150, ask: 151 }, closePrice: { bid: 150, ask: 151 }, highPrice: { bid: 151, ask: 152 }, lowPrice: { bid: 149, ask: 150 } }, 
            { snapshotTime: '2023-11-14T22:13:30', snapshotTimeUTC: '2023-11-14T22:13:30', openPrice: { bid: 150, ask: 151 }, closePrice: { bid: 150, ask: 151 }, highPrice: { bid: 151, ask: 152 }, lowPrice: { bid: 149, ask: 150 } }, 
          ]
        }
      });
    });

    // 2. Mock Positions API. GET returns the fake position. POST accepts the order.
    let positionsRequested = false;
    await page.route('**/api/order/v1/positions**', route => {
      if (route.request().method() === 'POST') {
        positionsRequested = true;
        return route.fulfill({ status: 200, json: { status: 'ACCEPTED', dealReference: 'mock-deal-1' } });
      }
      return route.fulfill({
        status: 200, 
        json: { 
          positions: positionsRequested ? [{
            position: { dealId: 'mock-deal-1', direction: 'BUY', size: 1, createdDate: '2023-11-14T22:13:32.000' },
            market: { epic: 'SPY', instrumentName: 'SPY', expiry: '-' }
          }] : [] 
        } 
      });
    });


    await page.goto('/');
    
    // Wait for the UI
    const buyBtn = page.getByRole('button', { name: /Buy|Long/i }).first();
    try {
      await expect(buyBtn).toBeVisible({ timeout: 5000 });
    } catch (e) {
      console.log('DOM at failure:');
      console.log(await page.content());
      throw e;
    }
    
    // Click Buy to trigger the position POST and subsequent GET sync
    await buyBtn.click();
    
    // Give it a moment to sync positions and update markers
    await page.waitForTimeout(5000);
    
    const markers: any[] = await page.evaluate(() => (window as any).__TEST_MARKERS__);
    const executionMarker = markers.find(m => m.type === 'EXECUTION');
    
    expect(executionMarker).toBeDefined();
    expect(executionMarker.time).not.toBeNaN();
    expect(executionMarker.time).toBe('2023-11-14 00:00:00');
  });
});
