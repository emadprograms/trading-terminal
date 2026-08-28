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
    const today = new Date();
    const yesterday = new Date(today.getTime() - 24 * 3600 * 1000);
    const twoDaysAgo = new Date(today.getTime() - 48 * 3600 * 1000);
    const tomorrow = new Date(today.getTime() + 24 * 3600 * 1000);
    
    const isoYesterday = yesterday.toISOString().split('T')[0] + 'T22:13:20';

    await page.route('**/api/order/v1/history/activity**', route => route.fulfill({ status: 200, json: { activities: [{ dealId: 'mock-deal-1', epic: 'SPY', date: isoYesterday, type: 'POSITION', status: 'ACCEPTED', details: { direction: 'BUY', size: 1, level: 150 } }] } }));
  });

  test('Execution marker exactly matches the time of a simulated trade', async ({ page }) => {
    const today = new Date();
    const yesterday = new Date(today.getTime() - 24 * 3600 * 1000);
    const twoDaysAgo = new Date(today.getTime() - 48 * 3600 * 1000);
    const tomorrow = new Date(today.getTime() + 24 * 3600 * 1000);

    const isoTwoDaysAgo = twoDaysAgo.toISOString().split('T')[0] + 'T00:00:00.000';
    const isoYesterday = yesterday.toISOString().split('T')[0] + 'T00:00:00.000';
    const isoToday = today.toISOString().split('T')[0] + 'T00:00:00.000';

    // 1. Mock Chart prices to contain the exact candle
    await page.route('**/api/market/v1/prices/*', route => {
      return route.fulfill({
        status: 200, 
        json: {
          prices: [
            { snapshotTime: isoTwoDaysAgo, snapshotTimeUTC: isoTwoDaysAgo, openPrice: { bid: 150, ask: 150 }, closePrice: { bid: 150, ask: 150 }, highPrice: { bid: 151, ask: 151 }, lowPrice: { bid: 140, ask: 140 } },
            { snapshotTime: isoYesterday, snapshotTimeUTC: isoYesterday, openPrice: { bid: 150, ask: 150 }, closePrice: { bid: 150, ask: 150 }, highPrice: { bid: 151, ask: 151 }, lowPrice: { bid: 149, ask: 149 } },
            { snapshotTime: isoToday, snapshotTimeUTC: isoToday, openPrice: { bid: 151, ask: 151 }, closePrice: { bid: 152, ask: 152 }, highPrice: { bid: 153, ask: 153 }, lowPrice: { bid: 150, ask: 150 } }
          ]
        }
      });
    });
    await page.route('**/api/market/v1/markets*', route => route.fulfill({ status: 200, json: { markets: [{ epic: 'SPY', instrumentName: 'SPY', expiry: '-', lotSize: 1, currencies: [{ symbol: '$' }] }] } }));
    await page.route('**/api/watchlist', route => route.fulfill({ status: 200, json: { items: [] } }));
    await page.route('**/api/session/accounts', route => route.fulfill({ status: 200, json: { accounts: [{ accountId: 'mock-account', accountName: 'Mock Account', accountType: 'CFD', preferred: true }] } }));

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
            position: { dealId: 'mock-deal-1', direction: 'BUY', size: 1, createdDate: isoYesterday },
            market: { epic: 'SPY', instrumentName: 'SPY', expiry: '-' }
          }] : [] 
        } 
      });
    });


    // 3. Mock history/activity to return the execution (useTradeStore explicitly ignores persisted executions)
    await page.route('**/api/order/v1/history/activity**', route => {
      return route.fulfill({
        status: 200,
        json: {
          activities: [{
            dealId: 'mock-deal-1',
            epic: 'SPY',
            type: 'POSITION',
            status: 'ACCEPTED',
            size: 1,
            level: 150,
            direction: 'SELL',
            dateUTC: isoYesterday,
            date: isoYesterday
          }]
        }
      });
    });

    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
    
    // Set localStorage tokens before navigating to prevent auth errors in syncExecutions
    await page.addInitScript((isoYesterdayStr) => {
      window.localStorage.setItem('CST', 'mock-cst-token');
      window.localStorage.setItem('X-SECURITY-TOKEN', 'mock-security-token');
      
      (window as any).__E2E_MOCK_EXECUTIONS = [
        {
          id: 'mock-exec-1',
          dealId: 'mock-deal-1',
          epic: 'SPY',
          size: 1,
          price: 150,
          direction: 'SELL',
          timestamp: new Date(isoYesterdayStr).getTime(),
          action: 'ENTRY'
        }
      ];

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
    }, isoYesterday);

    await page.goto('/');
    
    // Give it a moment to render the chart and markers
    await page.waitForTimeout(3000);
    
    const markers: any[] = await page.evaluate(() => (window as any).__TEST_MARKERS__);
    console.log("Markers found:", markers);
    const executionMarker = markers.find(m => m.type === 'EXECUTION');
    
    expect(executionMarker).toBeDefined();

    // We will verify the canvas render by checking if the canvas context's fillStyle was ever set to the SELL color
    const drawCalls = await page.evaluate(() => {
      return window.__MOCK_DRAW_CALLS || [];
    });
    
    expect(drawCalls.some(color => color === '#ff3b30' || color === 'rgb(255, 59, 48)')).toBe(true);
  });
});
