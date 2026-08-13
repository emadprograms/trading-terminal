import { test, expect } from '@playwright/test';

test.describe('Multi-Timeframe Marker Visibility', () => {
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

    // Mock an execution from August 6th 2026
    await page.route('**/history/activity*', route => {
      const activities = [
        {
          dealId: 'exec-aug-6',
          epic: 'SPY',
          type: 'POSITION',
          status: 'EXECUTED',
          dateUTC: '2026-08-06T12:00:00Z',
          details: { direction: 'BUY', size: 10, level: 200 }
        }
      ];

      return route.fulfill({
        status: 200,
        json: { activities }
      });
    });

    // Mock Chart Data (Prices) from August 10th 2026
    await page.route('**/prices/*', route => {
      return route.fulfill({
        status: 200, 
        json: {
          prices: Array.from({ length: 48 }).map((_, i) => {
            // Generate hourly candles for the last 48 hours starting from August 10th
            const time = new Date(new Date('2026-08-10T00:00:00Z').getTime() + i * 5 * 60 * 1000);
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
            charts: [{ id: 'chart-1', ticker: 'SPY', timeframe: '5min' }]
          }]
        },
        version: 0
      }));
      window.localStorage.setItem('trading-terminal-trade', JSON.stringify({
        state: {
          historyLookbackDays: 30
        },
        version: 0
      }));
      
      window.__MOCK_DRAW_CALLS = [];
      const spyFn = function(value: any) {
        if (typeof value === 'string' && (
            value.includes('007aff') || 
            value.includes('ff3b30') || 
            value.includes('2962ff') || 
            value.includes('f23645') ||
            value.includes('rgb(0, 122, 255)') ||
            value.includes('rgb(255, 59, 48)')
        )) {
          window.__MOCK_DRAW_CALLS.push(value);
        }
      };

      const originalFillStyle = Object.getOwnPropertyDescriptor(CanvasRenderingContext2D.prototype, 'fillStyle');
      if (originalFillStyle) {
        Object.defineProperty(CanvasRenderingContext2D.prototype, 'fillStyle', {
          set(value) {
            spyFn(value);
            originalFillStyle.set.call(this, value);
          },
          get() {
            return originalFillStyle.get.call(this);
          }
        });
      }

      const originalStrokeStyle = Object.getOwnPropertyDescriptor(CanvasRenderingContext2D.prototype, 'strokeStyle');
      if (originalStrokeStyle) {
        Object.defineProperty(CanvasRenderingContext2D.prototype, 'strokeStyle', {
          set(value) {
            spyFn(value);
            originalStrokeStyle.set.call(this, value);
          },
          get() {
            return originalStrokeStyle.get.call(this);
          }
        });
      }
    });
  });

  test('Markers outside of loaded chart data range get valid timestamp and draw', async ({ page }) => {
    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
    
    await page.goto('http://localhost:3001');

    await page.waitForSelector('.tv-lightweight-charts');
    await page.waitForTimeout(2000);

    const markers = await page.evaluate(() => (window as any).__TEST_MARKERS__ || []);
    expect(markers).toHaveLength(1);
    expect(markers[0].time).toBeDefined();
    expect(markers[0].time).toBeGreaterThan(0);
    expect(markers[0].time).toBe(new Date('2026-08-06T12:00:00Z').getTime() / 1000);

    // Verify it was drawn
    const drawCalls = await page.evaluate(() => (window as any).__MOCK_DRAW_CALLS || []);
    expect(drawCalls.length).toBeGreaterThan(0);
  });
});
