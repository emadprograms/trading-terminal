import { test, expect } from '@playwright/test';

test.describe('Stacked Execution Markers E2E', () => {
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
    await page.route('**/api/order/v1/history/activity**', route => route.fulfill({ status: 200, json: [] }));
  });

  test('Multiple execution markers on the same candle render as multiple stacked arrows', async ({ page }) => {
    // 1. Mock Chart prices
    await page.route('**/api/market/v1/prices/*', route => {
      return route.fulfill({
        status: 200, 
        json: {
          prices: [
            { snapshotTime: '2023-11-13T00:00:00.000', snapshotTimeUTC: '2023-11-13T00:00:00.000', openPrice: { bid: 150, ask: 150 }, closePrice: { bid: 150, ask: 150 }, highPrice: { bid: 151, ask: 151 }, lowPrice: { bid: 140, ask: 140 } },
            { snapshotTime: '2023-11-14T00:00:00.000', snapshotTimeUTC: '2023-11-14T00:00:00.000', openPrice: { bid: 150, ask: 150 }, closePrice: { bid: 150, ask: 150 }, highPrice: { bid: 151, ask: 151 }, lowPrice: { bid: 149, ask: 149 } },
            { snapshotTime: '2023-11-15T00:00:00.000', snapshotTimeUTC: '2023-11-15T00:00:00.000', openPrice: { bid: 151, ask: 151 }, closePrice: { bid: 152, ask: 152 }, highPrice: { bid: 153, ask: 153 }, lowPrice: { bid: 150, ask: 150 } }
          ]
        }
      });
    });
    
    await page.route('**/api/session/accounts', route => route.fulfill({ status: 200, json: { accounts: [{ accountId: 'mock-account', accountName: 'Mock Account', accountType: 'CFD', preferred: true }] } }));
    await page.route('**/api/order/v1/positions**', route => route.fulfill({ status: 200, json: { positions: [] } }));

    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
    
    await page.addInitScript(() => {
      window.localStorage.setItem('CST', 'mock-cst-token');
      window.localStorage.setItem('X-SECURITY-TOKEN', 'mock-security-token');
      
      // Inject the canvas spy
      window.__MOCK_DRAW_CALLS = [];
      const originalFillStyle = Object.getOwnPropertyDescriptor(CanvasRenderingContext2D.prototype, 'fillStyle');
      if (originalFillStyle) {
        Object.defineProperty(CanvasRenderingContext2D.prototype, 'fillStyle', {
          set(value) {
            if (value === '#007aff' || value === '#ff3b30' || value === 'rgb(0, 122, 255)' || value === 'rgb(255, 59, 48)') {
              window.__MOCK_DRAW_CALLS.push(value);
            }
            originalFillStyle.set.call(this, value);
          },
          get() {
            return originalFillStyle.get.call(this);
          }
        });
      }
      
      // Create TWO executions on the exact same timestamp
      localStorage.setItem('trade-storage', JSON.stringify({
        state: {
          executions: [
            {
              id: 'mock-exec-1',
              dealId: 'mock-deal-1',
              epic: 'SPY',
              size: 1,
              price: 150,
              direction: 'BUY',
              timestamp: new Date('2023-11-14T22:13:30Z').getTime(),
              action: 'ENTRY'
            },
            {
              id: 'mock-exec-2',
              dealId: 'mock-deal-2',
              epic: 'SPY',
              size: 2,
              price: 149.5,
              direction: 'BUY',
              timestamp: new Date('2023-11-14T22:13:30Z').getTime(), // exact same time
              action: 'ENTRY'
            },
            {
              id: 'mock-exec-3',
              dealId: 'mock-deal-3',
              epic: 'SPY',
              size: 1,
              price: 151,
              direction: 'SELL',
              timestamp: new Date('2023-11-14T22:13:30Z').getTime(), // exact same time, different direction
              action: 'EXIT'
            }
          ],
          positions: [],
          pendingOrders: {}
        },
        version: 0
      }));
    });

    await page.goto('/');
    
    // Give it a moment to render the chart and markers
    await page.waitForTimeout(3000);
    
    const markers: any[] = await page.evaluate(() => (window as any).__TEST_MARKERS__);
    console.log("Markers found:", markers);
    
    const executionMarkers = markers.filter(m => m.type === 'EXECUTION');
    expect(executionMarkers.length).toBe(3); // All 3 executions should be in the array

    // Verify canvas draw calls happen for all markers
    const drawCalls = await page.evaluate(() => window.__MOCK_DRAW_CALLS || []);
    
    // 2 BUY arrows, 1 SELL arrow
    const buyDraws = drawCalls.filter(color => color === '#007aff' || color === 'rgb(0, 122, 255)');
    const sellDraws = drawCalls.filter(color => color === '#ff3b30' || color === 'rgb(255, 59, 48)');
    
    expect(buyDraws.length).toBeGreaterThanOrEqual(2);
    expect(sellDraws.length).toBeGreaterThanOrEqual(1);
  });
});
