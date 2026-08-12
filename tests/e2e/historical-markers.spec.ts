import { test, expect } from '@playwright/test';

test.describe('Historical Markers E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Basic mocks to allow the app to load
    page.on("console", msg => console.log("BROWSER:", msg.text()));
    await page.route('**/api/session', async route => {
      await route.fulfill({
        status: 200,
        headers: { 'cst': 'mock-cst-token', 'x-security-token': 'mock-security-token' },
        json: { accountType: 'CFD', clientId: 'mock' }
      });
    });
    page.on("console", msg => console.log("BROWSER:", msg.text()));
    await page.route('**/api/ping*', route => route.fulfill({ status: 200, json: { status: 'OK' } }));
    page.on("console", msg => console.log("BROWSER:", msg.text()));
    await page.route('**/api/accounts', route => route.fulfill({ status: 200, json: { accounts: [{ accountId: 'mock', status: 'ENABLED', balance: { balance: 10000 }, currency: 'USD' }] } }));
    page.on("console", msg => console.log("BROWSER:", msg.text()));
    await page.route('**/api/order/v1/workingorders**', route => route.fulfill({ status: 200, json: { workingOrders: [] } }));
    page.on("console", msg => console.log("BROWSER:", msg.text()));
    await page.route('**/api/watchlist/*', route => route.fulfill({ status: 200, json: { id: '1', name: 'My Watchlist', items: [] } }));
    page.on("console", msg => console.log("BROWSER:", msg.text()));
    await page.route('**/api/watchlist', route => route.fulfill({ status: 200, json: { items: [] } }));
    page.on("console", msg => console.log("BROWSER:", msg.text()));
    await page.route('**/api/session/accounts', route => route.fulfill({ status: 200, json: { accounts: [{ accountId: 'mock-account', accountName: 'Mock Account', accountType: 'CFD', preferred: true }] } }));
    page.on("console", msg => console.log("BROWSER:", msg.text()));
    await page.route('**/api/order/v1/positions**', route => route.fulfill({ status: 200, json: { positions: [] } }));
  });

  test('Older execution markers are placed on the chart and time is correctly parsed', async ({ page }) => {
    // Mock the chart data to cover the past 5 hours
    const now = Date.now();
    const prices = [];
    
    // We'll use absolute fixed timestamps to avoid issues.
    // Let's use 2024-01-01T12:00:00Z as "now" (the latest candle).
    // The execution is 4 hours ago: 2024-01-01T08:00:00Z.
    
    // Create candles from 06:00 to 12:00 (1-hour candles)
    const startHour = 6;
    for (let i = startHour; i <= 12; i++) {
      const timeStr = `2024-01-02T${i.toString().padStart(2, '0')}:00:00.000Z`;
      prices.push({
        snapshotTime: timeStr,
        snapshotTimeUTC: timeStr,
        openPrice: { bid: 150, ask: 150 }, closePrice: { bid: 150, ask: 150 }, highPrice: { bid: 151, ask: 151 }, lowPrice: { bid: 149, ask: 149 }
      });
    }

    page.on("console", msg => console.log("BROWSER:", msg.text()));
    await page.route('**/api/market/v1/prices/*', route => {
      return route.fulfill({ status: 200, json: { prices } });
    });
    page.on("console", msg => console.log("BROWSER:", msg.text()));
    await page.route('**/api/market/v1/markets*', route => route.fulfill({ status: 200, json: { markets: [{ epic: 'SPY', instrumentName: 'SPY', expiry: '-', lotSize: 1, currencies: [{ symbol: '$' }] }] } }));

    // Mock the activity history API
    // We provide dateUTC without a 'Z' to reproduce Capital.com's API behavior.
    // The execution should be at 08:00:00.
    page.on("console", msg => console.log("BROWSER:", msg.text()));
    await page.route('**/api/order/v1/history/activity**', route => route.fulfill({ 
      status: 200, 
      json: {
        activities: [{ 
          dealId: 'mock-old-deal', 
          epic: 'SPY', 
          dateUTC: '2024-01-02T08:00:00', // Missing Z
          type: 'POSITION', 
          status: 'ACCEPTED', 
          details: { direction: 'SELL', size: 1, level: 150, openPrice: 150 } 
        }]
      } 
    }));

    // Start with empty local storage so syncExecutions runs
    await page.addInitScript(() => {
      window.localStorage.setItem('CST', 'mock-cst-token');
      window.localStorage.setItem('X-SECURITY-TOKEN', 'mock-security-token');
      localStorage.setItem('trade-storage', JSON.stringify({
        state: { executions: [], positions: [], pendingOrders: {} },
        version: 0
      }));
      
      // Canvas spy
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
          get() { return originalFillStyle.get.call(this); }
        });
      }
    });

    await page.goto('/');
    await page.waitForTimeout(3000);
    
    const markers: any[] = await page.evaluate(() => (window as any).__TEST_MARKERS__);
    console.log("Markers found:", markers);
    
    // There should be one marker
    const executionMarker = markers.find(m => m.type === 'EXECUTION');
    expect(executionMarker).toBeDefined();
    
    // The time of the marker should correspond to the 1D candle it snapped to.
    // The execution is 2024-01-02T08:00:00Z, but on a 1D chart it snaps to 2024-01-02 00:00:00.
    // 2024-01-02T00:00:00Z is 1704153600
    expect(executionMarker.time).toBe(1704153600);

    const drawCalls = await page.evaluate(() => window.__MOCK_DRAW_CALLS || []);
    expect(drawCalls.some(color => color === '#ff3b30' || color === 'rgb(255, 59, 48)')).toBe(true);
  });
});
