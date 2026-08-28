import { test, expect } from '@playwright/test';

test.describe('Historical Marker System', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/session', async route => {
      await route.fulfill({
        status: 200,
        headers: { 'cst': 'mock-cst-token', 'x-security-token': 'mock-security-token' },
        json: { accountType: 'CFD', clientId: 'mock' }
      });
    });
    await page.route('**/ping*', route => route.fulfill({ status: 200, json: { status: 'OK' } }));
    await page.route('**/session/accounts', route => route.fulfill({ status: 200, json: { accounts: [{ accountId: 'mock', accountName: 'Mock', accountType: 'CFD', preferred: true }] } }));
    await page.route('**/accounts', route => route.fulfill({ status: 200, json: { accounts: [{ accountId: 'mock', status: 'ENABLED', balance: { balance: 10000 }, currency: 'USD' }] } }));
    await page.route('**/workingorders**', route => route.fulfill({ status: 200, json: { workingOrders: [] } }));
    await page.route('**/positions**', route => route.fulfill({ status: 200, json: { positions: [] } }));
    await page.route('**/markets*', route => route.fulfill({ status: 200, json: { markets: [{ epic: 'SPY', instrumentName: 'SPY', expiry: '-', lotSize: 1, currencies: [{ symbol: '$' }] }] } }));
    await page.route('**/watchlist*', route => route.fulfill({ status: 200, json: { id: '1', name: 'My Watchlist', markets: [{ epic: 'SPY', instrumentName: 'SPY', updateTime: '', updateTimeUTC: '' }] } }));

    // 2. Mock 2 executions: one from 5 hours ago, one from 30 hours ago.
    // This proves that `syncExecutions` fetches > 24 hours of data.
    await page.route('**/history/activity*', route => {
      const url = route.request().url();
      // Ensure the request is asking for at least 30 hours (108000 seconds)
      const lastPeriodMatch = url.match(/lastPeriod=(\d+)/);
      const requestedSeconds = lastPeriodMatch ? parseInt(lastPeriodMatch[1]) : 0;
      
      const now = Date.now();
      const fiveHoursAgo = new Date(now - 5 * 3600 * 1000).toISOString();
      const thirtyHoursAgo = new Date(now - 30 * 3600 * 1000).toISOString();
      
      const activities = [];
      
      // If the app requested enough history, return both
      if (requestedSeconds >= 30 * 3600) {
        activities.push(
          {
            dealId: 'exec-5h',
            epic: 'SPY',
            type: 'POSITION',
            status: 'EXECUTED',
            dateUTC: fiveHoursAgo,
            details: { direction: 'BUY', size: 10, level: 200 }
          },
          {
            dealId: 'exec-30h',
            epic: 'SPY',
            type: 'POSITION',
            status: 'EXECUTED',
            dateUTC: thirtyHoursAgo,
            details: { direction: 'SELL', size: 5, level: 210 }
          }
        );
      } else {
         activities.push(
          {
            dealId: 'exec-5h',
            epic: 'SPY',
            type: 'POSITION',
            status: 'EXECUTED',
            dateUTC: fiveHoursAgo,
            details: { direction: 'BUY', size: 10, level: 200 }
          }
        );
      }

      return route.fulfill({
        status: 200,
        json: { activities }
      });
    });

    // 3. Mock Chart Data (Prices)
    await page.route('**/prices/*', route => {
      return route.fulfill({
        status: 200, 
        json: {
          prices: Array.from({ length: 48 }).map((_, i) => {
            // Generate hourly candles for the last 48 hours
            const time = new Date(Date.now() - (48 - i) * 3600 * 1000);
            return {
              snapshotTime: time.toISOString(),
              snapshotTimeUTC: time.toISOString(),
              openPrice: { bid: 195, ask: 195 },
              closePrice: { bid: 205, ask: 205 },
              highPrice: { bid: 215, ask: 215 },
              lowPrice: { bid: 190, ask: 190 }
            };
          })
        }
      });
    });

    // 4. Inject LocalStorage Auth State
    await page.addInitScript(() => {
      window.localStorage.setItem('auth-storage', JSON.stringify({
        state: {
          isAuthenticated: true,
          activeAccountId: 'test-account',
          tokens: { CST: 'mock-cst', XST: 'mock-xst' }
        },
        version: 0
      }));
      window.localStorage.setItem('workspace-storage', JSON.stringify({
        state: {
          activeWorkspace: 'default',
          workspaces: [{
            id: 'default',
            charts: [{ id: 'chart-1', ticker: 'SPY', timeframe: '1H' }]
          }]
        },
        version: 0
      }));
      
      // Spy on canvas draw calls to verify markers are visually rendered
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
    });
  });

  test('Fetches orders from 30 hours ago and renders them on the chart', async ({ page }) => {
    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
    
    // We launch the app, which will trigger syncExecutions()
    await page.goto('http://localhost:3001');

    // Wait for the chart to load
    await page.waitForSelector('.tv-lightweight-charts');
    await page.waitForTimeout(2000); // Wait for sync Executions to complete

    // Assert that both markers were passed to the chart plugin
    const markers = await page.evaluate(() => (window as any).__TEST_MARKERS__ || []);
    expect(markers).toHaveLength(2);

    // Verify that the markers were ACTUALLY drawn on the canvas (proving timeToCoordinate worked)
    const drawCalls = await page.evaluate(() => (window as any).__MOCK_DRAW_CALLS || []);
    expect(drawCalls.length).toBeGreaterThan(0);
  });
});
