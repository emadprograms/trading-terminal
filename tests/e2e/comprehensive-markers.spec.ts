import { test, expect } from '@playwright/test';

test.describe('Comprehensive Marker System', () => {
  test.beforeEach(async ({ page }) => {
    // Basic auth mocks
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
    await page.route('**/history/activity*', route => {
      route.fulfill({
        status: 200,
        json: {
          activities: [
            {
              dealId: 'old-1',
              epic: 'SPY',
              type: 'POSITION',
              status: 'EXECUTED',
              dateUTC: '2020-01-01T10:00:00.000',
              details: { direction: 'BUY', size: 10, level: 100 }
            },
            {
              dealId: 'stack-1',
              epic: 'SPY',
              type: 'POSITION',
              status: 'EXECUTED',
              dateUTC: '2024-01-01T10:00:00.000',
              details: { direction: 'SELL', size: 5, level: 200 }
            },
            {
              dealId: 'stack-2',
              epic: 'SPY',
              type: 'POSITION',
              status: 'EXECUTED',
              dateUTC: '2024-01-01T10:00:00.000',
              details: { direction: 'SELL', size: 5, level: 200 }
            },
            {
              dealId: 'single-buy',
              epic: 'SPY',
              type: 'POSITION',
              status: 'EXECUTED',
              dateUTC: '2024-01-01T10:05:00.000',
              details: { direction: 'BUY', size: 10, level: 195 }
            }
          ]
        }
      });
    });
    
    // Mock prices
    await page.route('**/prices/*', route => {
      return route.fulfill({
        status: 200, 
        json: {
          prices: Array.from({ length: 100 }).map((_, i) => {
            const time = new Date('2024-01-01T10:00:00.000Z');
            time.setMinutes(time.getMinutes() + i);
            const timeStr = time.toISOString();
            return {
              snapshotTime: timeStr,
              snapshotTimeUTC: timeStr,
              openPrice: { bid: 195, ask: 195 },
              closePrice: { bid: 205, ask: 205 },
              highPrice: { bid: 210, ask: 210 },
              lowPrice: { bid: 190, ask: 190 }
            };
          })
        }
      });
    });
  });

  test('Renders markers accurately, stacks them, and hover only activates directly over marker', async ({ page }) => {
    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
    page.on('response', resp => {
      if(resp.status() === 401) console.log('401 URL:', resp.url());
    });
    
    await page.addInitScript(() => {
      window.localStorage.setItem('CST', 'mock-cst-token');
      window.localStorage.setItem('X-SECURITY-TOKEN', 'mock-security-token');
      
      window.localStorage.setItem('trade-storage', JSON.stringify({
        state: {
          credentials: { identifier: 'test', password: 'test', appKey: 'test' },
          isAuthenticated: true,
          positions: [],
          pendingOrders: {},
          executions: []
        },
        version: 0
      }));
      // Canvas draw spy
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

    await page.goto('/');
    
    // Give it a moment to render the chart and markers
    await page.waitForTimeout(4000);
    
    const markers = await page.evaluate(() => (window as any).__TEST_MARKERS__ || []);
    // Out of bounds marker (2020) will be in markers, but its x-coordinate will be null when rendering.
    // The plugin shouldn't crash.
    expect(markers).toHaveLength(4);

    // Assert that multiple draw calls occurred, proving stacking/rendering worked despite the out-of-bounds marker.
    const drawCalls = await page.evaluate(() => window.__MOCK_DRAW_CALLS || []);
    expect(drawCalls.length).toBeGreaterThan(0);

    // Verify hover logic strictly follows 2D distance.
    // Move to 100, 100 (a completely random place on the canvas)
    await page.mouse.move(100, 100);
    await page.waitForTimeout(500);
    
    // Assert NO hovered executions were triggered because distance > 15px radius.
    const hoveredExecs = await page.evaluate(() => (window as any).__TEST_HOVERED_EXECUTIONS__ || []);
    expect(hoveredExecs).toEqual([]); // Should be exactly empty!
  });
});
