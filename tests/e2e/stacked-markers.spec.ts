import { test, expect } from '@playwright/test';

test.describe('Stacked Execution Markers E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/session', async route => {
      await route.fulfill({
        status: 200,
        headers: { 'cst': 'mock-cst-token', 'x-security-token': 'mock-security-token' },
        json: { accountType: 'CFD', clientId: 'mock' }
      });
    });
    await page.route('**/api/ping*', route => route.fulfill({ status: 200, json: { status: 'OK' } }));
    await page.route('**/api/accounts', route => route.fulfill({ status: 200, json: { accounts: [{ accountId: 'mock', status: 'ENABLED', balance: { balance: 10000 }, currency: 'USD' }] } }));
    await page.route('**/api/order/v1/workingorders**', route => route.fulfill({ status: 200, json: { workingOrders: [] } }));
    await page.route('**/api/market/v1/markets*', route => route.fulfill({ status: 200, json: { markets: [{ epic: 'SPY', instrumentName: 'SPY', expiry: '-', lotSize: 1, currencies: [{ symbol: '$' }] }] } }));
    // Mock BOTH the /1 and generic watchlist routes to prevent 401 logout
    await page.route('**/api/watchlist/1', route => route.fulfill({ status: 200, json: { id: '1', name: 'My Watchlist', markets: [{ epic: 'SPY', instrumentName: 'SPY', updateTime: '', updateTimeUTC: '' }] } }));
    await page.route('**/api/watchlist/*', route => route.fulfill({ status: 200, json: { id: '1', name: 'My Watchlist', markets: [{ epic: 'SPY', instrumentName: 'SPY', updateTime: '', updateTimeUTC: '' }] } }));
    await page.route('**/api/watchlist', route => route.fulfill({ status: 200, json: { items: [{ id: '1', name: 'My Watchlist' }] } }));
    await page.route('**/api/order/v1/history/activity**', route => route.fulfill({ status: 200, json: [] }));
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
  });

  const setupTest = async (page: any, executions: any[]) => {
    await page.addInitScript((execs: any[]) => {
      window.localStorage.setItem('CST', 'mock-cst-token');
      window.localStorage.setItem('X-SECURITY-TOKEN', 'mock-security-token');
      localStorage.setItem('trade-storage', JSON.stringify({
        state: { executions: execs, positions: [], pendingOrders: {} },
        version: 0
      }));
    }, executions);
    await page.goto('/');
    // Wait for chart to be initialized and markers to render
    await page.waitForTimeout(4000);
  };

  /**
   * Returns chart-relative pixel coordinates for a given price + time using
   * the lightweight-charts API exposed on window.__TEST_CHART_API__.
   */
  const getCoordinates = async (page: any, price: number, timeStr: string, direction = 'BUY', stackIndex = 0) => {
    return page.evaluate(({ p, t, dir, idx }) => {
      const timeMs = new Date(t).getTime() / 1000;
      const chart = (window as any).__TEST_CHART_API__;
      const series = (window as any).__TEST_PRICE_SERIES__;
      
      const canvas = document.querySelector('canvas');
      const box = canvas ? canvas.getBoundingClientRect() : { left: 0, top: 0 };
      
      if (!chart || !series) return { x: 0, y: 0, scale: 1, markerCenterY: 0, renderYRaw: 0 };

      // Lightweight charts can use string, number, or object for time
      const dateStr = t.split('T')[0];
      const date = new Date(t);
      const bizDay = { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() };
      
      let cx = chart.timeScale().timeToCoordinate(dateStr);
      if (cx === null) cx = chart.timeScale().timeToCoordinate(timeMs);
      if (cx === null || cx === 0) {
          throw new Error('Failed to calculate cx! Chart may not have this time: ' + dateStr);
      }
      
      const exactPriceY = series.priceToCoordinate(p);
      
      let scale = 1;
      const logicalRange = chart.timeScale().getVisibleLogicalRange();
      if (logicalRange) {
        const width = chart.timeScale().width();
        const barsVisible = logicalRange.to - logicalRange.from;
        const barSpacing = width / barsVisible;
        if (barSpacing < 8) scale = Math.max(0.3, barSpacing / 8);
      }
      
      const candleLow = 149;
      const candleHigh = 151;
      
      let arrowY = exactPriceY;
      if (dir === 'BUY') {
         arrowY = series.priceToCoordinate(candleLow) ?? exactPriceY;
      } else if (dir === 'SELL') {
         arrowY = series.priceToCoordinate(candleHigh) ?? exactPriceY;
      }
      
      const stackOffset = idx * 8 * scale;
      if (dir === 'BUY') {
         arrowY += stackOffset;
      } else {
         arrowY -= stackOffset;
      }
      
      const offset = 6 * scale;
      const h = 8 * scale;
      let markerCenterY = arrowY;
      if (dir === 'BUY') {
         markerCenterY += offset + h / 2;
      } else {
         markerCenterY -= offset + h / 2;
      }

      return { 
        x: box.left + cx, 
        y: box.top + exactPriceY, 
        markerCenterY: box.top + markerCenterY,
        renderYRaw: markerCenterY,
        scale 
      };
    }, { p: price, t: timeStr, dir: direction, idx: stackIndex });
  };

  test('Test 1: Hovering over the candle body should NOT trigger hover', async ({ page }) => {
    await setupTest(page, [
      { id: 'mock-exec-1', dealId: 'deal-1', epic: 'SPY', size: 1, price: 150, direction: 'BUY', timestamp: new Date('2023-11-14T22:13:30Z').getTime(), action: 'ENTRY' }
    ]);
    const coords = await getCoordinates(page, 150, '2023-11-14T00:00:00Z', 'BUY', 0);
    
    // Move to EXACT price coordinate
    await page.mouse.move(coords.x, coords.y);
    await page.waitForTimeout(300);
    
    const hovered = await page.evaluate(() => (window as any).__TEST_HOVERED_EXECUTIONS__ ?? []);
    expect(hovered.length).toBe(0);
  });

  test('Test 2: Hovering directly over the marker SHOULD trigger', async ({ page }) => {
    await setupTest(page, [
      { id: 'mock-exec-1', dealId: 'deal-1', epic: 'SPY', size: 1, price: 150, direction: 'BUY', timestamp: new Date('2023-11-14T22:13:30Z').getTime(), action: 'ENTRY' },
      { id: 'mock-exec-2', dealId: 'deal-2', epic: 'SPY', size: 2, price: 149.5, direction: 'BUY', timestamp: new Date('2023-11-14T22:13:30Z').getTime(), action: 'ENTRY' }
    ]);
    // stackIndex 0 is mock-exec-1
    const coords = await getCoordinates(page, 150, '2023-11-14T00:00:00Z', 'BUY', 0);
    
    // Move directly to the exact pixel center of the marker
    await page.mouse.move(coords.x, coords.markerCenterY);
    await page.waitForTimeout(200); // Wait for lightweight-charts event to fire and React to update
    const finalHovered = await page.evaluate(() => (window as any).__TEST_HOVERED_EXECUTIONS__ ?? []);
    
    expect(finalHovered.length).toBeGreaterThan(0);
    expect(finalHovered[0].price).toBe(150);
  });

  test('Test 3: The sideways tooltip rendering coordinate is correct', async ({ page }) => {
    await setupTest(page, [
      { id: 'mock-exec-1', dealId: 'deal-1', epic: 'SPY', size: 1, price: 150, direction: 'BUY', timestamp: new Date('2023-11-14T22:13:30Z').getTime(), action: 'ENTRY' }
    ]);
    const coords = await getCoordinates(page, 150, '2023-11-14T00:00:00Z', 'BUY', 0);
    
    let finalHovered = [];
    for (let dy = -30; dy <= 30; dy += 2) {
        await page.mouse.move(coords.x, coords.markerCenterY + dy);
        await page.waitForTimeout(20);
        const hovered = await page.evaluate(() => (window as any).__TEST_HOVERED_EXECUTIONS__ ?? []);
        if (hovered.length > 0) {
            finalHovered = hovered;
            break;
        }
    }
    
    expect(finalHovered.length).toBeGreaterThan(0);
    
    // The renderY of the tooltip MUST exactly match the center of the marker we hovered!
    expect(Math.abs(finalHovered[0].renderY - coords.renderYRaw)).toBeLessThan(1);
  });
});
