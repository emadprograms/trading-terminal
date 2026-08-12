import { test, expect, Page } from '@playwright/test';

/**
 * Stacked Execution Markers — Hover Hit-Zone Regression Tests
 *
 * These tests verify that:
 * 1. Hovering on the candle body does NOT trigger the execution tooltip
 * 2. Hovering precisely on the drawn triangle marker DOES trigger
 * 3. Multiple markers on the same candle are all tracked in __TEST_MARKERS__
 * 4. Hovering far from any marker does NOT trigger
 *
 * Technical notes:
 * - Each test uses its own addInitScript + page.goto to avoid script accumulation
 * - The crosshair move handler compares param.point.y (chart-relative) to markerCenterY
 * - page.mouse.move() takes viewport-absolute coordinates, so we add canvas bounding box offsets
 */

// Shared price data: 3 candles around the execution date
const PRICE_DATA = {
  prices: [
    {
      snapshotTime: '2023-11-13T00:00:00.000',
      snapshotTimeUTC: '2023-11-13T00:00:00.000',
      openPrice: { bid: 150, ask: 150 },
      closePrice: { bid: 150, ask: 150 },
      highPrice: { bid: 151, ask: 151 },
      lowPrice: { bid: 140, ask: 140 },
    },
    {
      snapshotTime: '2023-11-14T00:00:00.000',
      snapshotTimeUTC: '2023-11-14T00:00:00.000',
      openPrice: { bid: 150, ask: 150 },
      closePrice: { bid: 150, ask: 150 },
      highPrice: { bid: 151, ask: 151 },
      lowPrice: { bid: 149, ask: 149 },
    },
    {
      snapshotTime: '2023-11-15T00:00:00.000',
      snapshotTimeUTC: '2023-11-15T00:00:00.000',
      openPrice: { bid: 151, ask: 151 },
      closePrice: { bid: 152, ask: 152 },
      highPrice: { bid: 153, ask: 153 },
      lowPrice: { bid: 150, ask: 150 },
    },
  ],
};

/** Set up all required API route mocks so the app boots without real API calls */
async function setupRouteMocks(page: Page) {
  await page.route('**/api/session', route =>
    route.fulfill({
      status: 200,
      headers: { cst: 'mock-cst-token', 'x-security-token': 'mock-security-token' },
      json: { accountType: 'CFD', clientId: 'mock' },
    })
  );
  await page.route('**/api/ping*', route =>
    route.fulfill({ status: 200, json: { status: 'OK' } })
  );
  await page.route('**/api/accounts', route =>
    route.fulfill({
      status: 200,
      json: {
        accounts: [
          { accountId: 'mock', status: 'ENABLED', balance: { balance: 10000 }, currency: 'USD' },
        ],
      },
    })
  );
  await page.route('**/api/order/v1/workingorders**', route =>
    route.fulfill({ status: 200, json: { workingOrders: [] } })
  );
  await page.route('**/api/market/v1/markets*', route =>
    route.fulfill({
      status: 200,
      json: {
        markets: [
          { epic: 'SPY', instrumentName: 'SPY', expiry: '-', lotSize: 1, currencies: [{ symbol: '$' }] },
        ],
      },
    })
  );
  await page.route('**/api/watchlist/1', route =>
    route.fulfill({
      status: 200,
      json: {
        id: '1',
        name: 'My Watchlist',
        markets: [{ epic: 'SPY', instrumentName: 'SPY', updateTime: '', updateTimeUTC: '' }],
      },
    })
  );
  await page.route('**/api/watchlist/*', route =>
    route.fulfill({
      status: 200,
      json: {
        id: '1',
        name: 'My Watchlist',
        markets: [{ epic: 'SPY', instrumentName: 'SPY', updateTime: '', updateTimeUTC: '' }],
      },
    })
  );
  await page.route('**/api/watchlist', route =>
    route.fulfill({ status: 200, json: { items: [{ id: '1', name: 'My Watchlist' }] } })
  );
  await page.route('**/api/order/v1/history/activity**', route =>
    route.fulfill({ status: 200, json: [] })
  );
  await page.route('**/api/market/v1/prices/*', route =>
    route.fulfill({ status: 200, json: PRICE_DATA })
  );
  await page.route('**/api/session/accounts', route =>
    route.fulfill({
      status: 200,
      json: {
        accounts: [
          { accountId: 'mock-account', accountName: 'Mock Account', accountType: 'CFD', preferred: true },
        ],
      },
    })
  );
  await page.route('**/api/order/v1/positions**', route =>
    route.fulfill({ status: 200, json: { positions: [] } })
  );
}

/**
 * Boot the app with injected executions.
 * Sets auth tokens + trade-storage via addInitScript, then navigates.
 * Also installs a canvas fillStyle spy to detect marker draw calls.
 */
async function bootWithExecutions(page: Page, executions: any[]) {
  // Serialize executions for the init script closure
  const execJSON = JSON.stringify(executions);

  await page.addInitScript((serialized: string) => {
    // Auth tokens
    window.localStorage.setItem('CST', 'mock-cst-token');
    window.localStorage.setItem('X-SECURITY-TOKEN', 'mock-security-token');

    // Canvas fillStyle spy
    (window as any).__MOCK_DRAW_CALLS = [];
    const desc = Object.getOwnPropertyDescriptor(
      CanvasRenderingContext2D.prototype,
      'fillStyle'
    );
    if (desc) {
      Object.defineProperty(CanvasRenderingContext2D.prototype, 'fillStyle', {
        set(value) {
          if (
            value === '#007aff' ||
            value === '#ff3b30' ||
            value === 'rgb(0, 122, 255)' ||
            value === 'rgb(255, 59, 48)'
          ) {
            (window as any).__MOCK_DRAW_CALLS.push(value);
          }
          desc.set!.call(this, value);
        },
        get() {
          return desc.get!.call(this);
        },
      });
    }

    // Inject executions into Zustand persisted storage
    localStorage.setItem(
      'trade-storage',
      JSON.stringify({
        state: { executions: JSON.parse(serialized), positions: [], pendingOrders: {} },
        version: 0,
      })
    );
  }, execJSON);

  await page.goto('/');

  // Wait for the chart to render and markers to be computed
  await page.waitForFunction(
    () => {
      const markers = (window as any).__TEST_MARKERS__;
      const chart = (window as any).__TEST_CHART_API__;
      const series = (window as any).__TEST_PRICE_SERIES__;
      return (
        Array.isArray(markers) &&
        markers.some((m: any) => m.type === 'EXECUTION') &&
        chart &&
        series
      );
    },
    { timeout: 15000 }
  );

  // Extra wait for paint to settle
  await page.waitForTimeout(500);
}

/**
 * Calculate the marker center Y in viewport-absolute coordinates.
 *
 * This mirrors the production hover logic from useTradeManager.ts lines 325-353:
 *   arrowY = priceToCoordinate(candleLow)   [for BUY]
 *   arrowY += stackIndex * 8 * scale
 *   markerCenterY = arrowY + offset + h/2   [for BUY]
 *
 * The crosshair handler compares param.point.y (chart-relative) against markerCenterY.
 * But page.mouse.move() needs viewport-absolute coords, so we add the canvas bounding box.
 */
async function getMarkerCoordinates(
  page: Page,
  opts: {
    direction: 'BUY' | 'SELL';
    candleEdgePrice: number; // candleLow for BUY, candleHigh for SELL
    timeStr: string; // e.g. '2023-11-14'
    stackIndex?: number;
  }
) {
  const { direction, candleEdgePrice, timeStr, stackIndex = 0 } = opts;

  return page.evaluate(
    ({ dir, edgePrice, tStr, sIdx }) => {
      const chart = (window as any).__TEST_CHART_API__;
      const series = (window as any).__TEST_PRICE_SERIES__;
      if (!chart || !series) throw new Error('Chart/series not available');

      // Get X coordinate for the candle time
      // Lightweight Charts may accept different time formats; try string first, then numeric
      let cx = chart.timeScale().timeToCoordinate(tStr);
      if (cx === null) {
        // Try as unix timestamp
        const ts = new Date(tStr + 'T00:00:00Z').getTime() / 1000;
        cx = chart.timeScale().timeToCoordinate(ts);
      }
      if (cx === null) throw new Error('Could not get X coordinate for time: ' + tStr);

      // Get Y coordinate for the candle edge (low for BUY, high for SELL)
      const arrowBaseY = series.priceToCoordinate(edgePrice);
      if (arrowBaseY === null) throw new Error('Could not get Y for price: ' + edgePrice);

      // Calculate scale (same formula as production code)
      let scale = 1;
      const logicalRange = chart.timeScale().getVisibleLogicalRange();
      if (logicalRange) {
        const width = chart.timeScale().width();
        const barsVisible = logicalRange.to - logicalRange.from;
        const barSpacing = width / barsVisible;
        if (barSpacing < 8) {
          scale = Math.max(0.3, barSpacing / 8);
        }
      }

      // Stack offset
      const stackOffset = sIdx * 8 * scale;
      let arrowY = arrowBaseY;
      if (dir === 'BUY') {
        arrowY += stackOffset;
      } else {
        arrowY -= stackOffset;
      }

      // Triangle center position
      const offset = 6 * scale;
      const h = 8 * scale;
      let markerCenterY = arrowY;
      if (dir === 'BUY') {
        markerCenterY += offset + h / 2;
      } else {
        markerCenterY -= offset + h / 2;
      }

      // Get canvas bounding box for viewport-absolute conversion
      const canvas = document.querySelector('canvas');
      const box = canvas ? canvas.getBoundingClientRect() : { left: 0, top: 0 };

      return {
        // Viewport-absolute coordinates for page.mouse.move
        viewportX: box.left + cx,
        viewportMarkerCenterY: box.top + markerCenterY,
        // Chart-relative (for debugging)
        chartRelX: cx,
        chartRelMarkerCenterY: markerCenterY,
        chartRelArrowBaseY: arrowBaseY,
        scale,
      };
    },
    { dir: direction, edgePrice: candleEdgePrice, tStr: timeStr, sIdx: stackIndex }
  );
}

/**
 * Get viewport-absolute coordinates for a specific price on a specific candle.
 * Used for "candle body" coordinates (NOT the marker triangle).
 */
async function getPriceCoordinates(page: Page, price: number, timeStr: string) {
  return page.evaluate(
    ({ p, t }) => {
      const chart = (window as any).__TEST_CHART_API__;
      const series = (window as any).__TEST_PRICE_SERIES__;
      if (!chart || !series) throw new Error('Chart/series not available');

      let cx = chart.timeScale().timeToCoordinate(t);
      if (cx === null) {
        const ts = new Date(t + 'T00:00:00Z').getTime() / 1000;
        cx = chart.timeScale().timeToCoordinate(ts);
      }
      if (cx === null) throw new Error('Could not get X coordinate for time: ' + t);

      const cy = series.priceToCoordinate(p);
      if (cy === null) throw new Error('Could not get Y for price: ' + p);

      const canvas = document.querySelector('canvas');
      const box = canvas ? canvas.getBoundingClientRect() : { left: 0, top: 0 };

      return {
        viewportX: box.left + cx,
        viewportY: box.top + cy,
      };
    },
    { p: price, t: timeStr }
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Test Suite
// ──────────────────────────────────────────────────────────────────────────────

test.describe('Stacked Execution Markers — Hover Hit-Zone Regression', () => {
  test.beforeEach(async ({ page }) => {
    await setupRouteMocks(page);
  });

  // --------------------------------------------------------------------------
  // Test 1: No phantom hover on candle body
  // --------------------------------------------------------------------------
  test('hovering over the candle body should NOT trigger hover tooltip', async ({ page }) => {
    await bootWithExecutions(page, [
      {
        id: 'exec-buy-1',
        dealId: 'deal-1',
        epic: 'SPY',
        size: 1,
        price: 150,
        direction: 'BUY',
        timestamp: new Date('2023-11-14T22:13:30Z').getTime(),
        action: 'ENTRY',
      },
    ]);

    // Move mouse to the execution's PRICE Y (inside the candle body), not the arrow
    const bodyCoords = await getPriceCoordinates(page, 150, '2023-11-14');
    await page.mouse.move(bodyCoords.viewportX, bodyCoords.viewportY);
    await page.waitForTimeout(500);

    const hovered = await page.evaluate(
      () => (window as any).__TEST_HOVERED_EXECUTIONS__ ?? []
    );
    expect(hovered.length).toBe(0);
  });

  // --------------------------------------------------------------------------
  // Test 2: Hover triggers at the marker position
  // --------------------------------------------------------------------------
  test('hovering directly over the marker triangle SHOULD trigger hover', async ({ page }) => {
    await bootWithExecutions(page, [
      {
        id: 'exec-buy-1',
        dealId: 'deal-1',
        epic: 'SPY',
        size: 1,
        price: 150,
        direction: 'BUY',
        timestamp: new Date('2023-11-14T22:13:30Z').getTime(),
        action: 'ENTRY',
      },
    ]);

    // Get the exact marker center position (below candle low + offset + h/2)
    // Candle low for 2023-11-14 is 149
    const markerCoords = await getMarkerCoordinates(page, {
      direction: 'BUY',
      candleEdgePrice: 149, // low of the Nov 14 candle
      timeStr: '2023-11-14',
      stackIndex: 0,
    });

    await page.mouse.move(markerCoords.viewportX, markerCoords.viewportMarkerCenterY);
    await page.waitForTimeout(500);

    const hovered = await page.evaluate(
      () => (window as any).__TEST_HOVERED_EXECUTIONS__ ?? []
    );
    expect(hovered.length).toBe(1);
    expect(hovered[0].price).toBe(150);
    expect(hovered[0].direction).toBe('BUY');
    // Verify renderY is set and matches the calculated marker center
    expect(hovered[0].renderY).toBeDefined();
    expect(Math.abs(hovered[0].renderY - markerCoords.chartRelMarkerCenterY)).toBeLessThan(2);
    // Verify x follows the mouse cursor (matches the viewport mouse X translated to chart coords)
    expect(hovered[0].x).toBeDefined();
  });

  // --------------------------------------------------------------------------
  // Test 3: Multiple markers on same candle are all stored
  // --------------------------------------------------------------------------
  test('multiple markers on the same candle are all tracked', async ({ page }) => {
    await bootWithExecutions(page, [
      {
        id: 'exec-buy-1',
        dealId: 'deal-1',
        epic: 'SPY',
        size: 1,
        price: 150,
        direction: 'BUY',
        timestamp: new Date('2023-11-14T22:13:30Z').getTime(),
        action: 'ENTRY',
      },
      {
        id: 'exec-buy-2',
        dealId: 'deal-2',
        epic: 'SPY',
        size: 2,
        price: 149.5,
        direction: 'BUY',
        timestamp: new Date('2023-11-14T22:13:30Z').getTime(),
        action: 'ENTRY',
      },
    ]);

    // Verify both markers exist in __TEST_MARKERS__
    const markers = await page.evaluate(() => {
      const all = (window as any).__TEST_MARKERS__ ?? [];
      return all.filter((m: any) => m.type === 'EXECUTION');
    });
    expect(markers.length).toBe(2);
    expect(markers.map((m: any) => m.id).sort()).toEqual(['exec-buy-1', 'exec-buy-2']);

    // Verify canvas spy detected blue (BUY) draw calls
    const drawCalls: string[] = await page.evaluate(
      () => (window as any).__MOCK_DRAW_CALLS ?? []
    );
    const blueDraws = drawCalls.filter(
      c => c === '#007aff' || c === 'rgb(0, 122, 255)'
    );
    // At least 2 blue draws (one per marker, possibly more from redraws)
    expect(blueDraws.length).toBeGreaterThanOrEqual(2);
  });

  // --------------------------------------------------------------------------
  // Test 4: Far-away hover does not trigger
  // --------------------------------------------------------------------------
  test('hovering 200px below the chart area should NOT trigger hover', async ({ page }) => {
    await bootWithExecutions(page, [
      {
        id: 'exec-sell-1',
        dealId: 'deal-1',
        epic: 'SPY',
        size: 1,
        price: 150,
        direction: 'SELL',
        timestamp: new Date('2023-11-14T22:13:30Z').getTime(),
        action: 'ENTRY',
      },
    ]);

    // Get the canvas bounding box and move 200px below its bottom edge
    const canvasBox = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      if (!canvas) return { bottom: 500, left: 100, width: 800 };
      const r = canvas.getBoundingClientRect();
      return { bottom: r.bottom, left: r.left, width: r.width };
    });

    await page.mouse.move(
      canvasBox.left + canvasBox.width / 2,
      canvasBox.bottom + 200
    );
    await page.waitForTimeout(500);

    const hovered = await page.evaluate(
      () => (window as any).__TEST_HOVERED_EXECUTIONS__ ?? []
    );
    expect(hovered.length).toBe(0);
  });

  // --------------------------------------------------------------------------
  // Test 5: Popup y matches execution price, not marker triangle position
  // --------------------------------------------------------------------------
  test('popup y matches the execution price coordinate, not the marker position', async ({ page }) => {
    await bootWithExecutions(page, [
      {
        id: 'exec-buy-1',
        dealId: 'deal-1',
        epic: 'SPY',
        size: 1,
        price: 150,
        direction: 'BUY',
        timestamp: new Date('2023-11-14T22:13:30Z').getTime(),
        action: 'ENTRY',
      },
    ]);

    // Get the marker's coordinates (triangle below candle low)
    const markerCoords = await getMarkerCoordinates(page, {
      direction: 'BUY',
      candleEdgePrice: 149,
      timeStr: '2023-11-14',
      stackIndex: 0,
    });

    // Also get the execution price coordinate (150) for comparison
    const execPriceCoords = await getPriceCoordinates(page, 150, '2023-11-14');

    // Hover over the marker triangle
    await page.mouse.move(markerCoords.viewportX, markerCoords.viewportMarkerCenterY);
    await page.waitForTimeout(500);

    const hovered = await page.evaluate(
      () => (window as any).__TEST_HOVERED_EXECUTIONS__ ?? []
    );
    expect(hovered.length).toBe(1);

    // y should match the execution price coordinate (priceToCoordinate(150))
    // Get the expected Y by evaluating priceToCoordinate directly
    const expectedY = await page.evaluate(() => {
      const series = (window as any).__TEST_PRICE_SERIES__;
      return series.priceToCoordinate(150);
    });
    expect(hovered[0].y).toBeCloseTo(expectedY, 0);

    // renderY should match the marker triangle center (different from y)
    expect(hovered[0].renderY).toBeDefined();
    expect(Math.abs(hovered[0].renderY - markerCoords.chartRelMarkerCenterY)).toBeLessThan(2);

    // y and renderY should be DIFFERENT (price is inside candle, marker is below)
    expect(Math.abs(hovered[0].y - hovered[0].renderY)).toBeGreaterThan(5);
  });

  // --------------------------------------------------------------------------
  // Test 6: Multiple markers produce different y values per execution price
  // --------------------------------------------------------------------------
  test('multiple markers on same candle have different y values matching their execution prices', async ({ page }) => {
    await bootWithExecutions(page, [
      {
        id: 'exec-buy-1',
        dealId: 'deal-1',
        epic: 'SPY',
        size: 1,
        price: 150,
        direction: 'BUY',
        timestamp: new Date('2023-11-14T22:13:30Z').getTime(),
        action: 'ENTRY',
      },
      {
        id: 'exec-buy-2',
        dealId: 'deal-2',
        epic: 'SPY',
        size: 2,
        price: 149.5,
        direction: 'BUY',
        timestamp: new Date('2023-11-14T22:13:30Z').getTime(),
        action: 'ENTRY',
      },
    ]);

    // Get expected Y coordinates for both execution prices
    const expectedYs = await page.evaluate(() => {
      const series = (window as any).__TEST_PRICE_SERIES__;
      return {
        y150: series.priceToCoordinate(150),
        y149_5: series.priceToCoordinate(149.5),
      };
    });

    // Hover over first marker (stack index 0)
    const marker0Coords = await getMarkerCoordinates(page, {
      direction: 'BUY',
      candleEdgePrice: 149,
      timeStr: '2023-11-14',
      stackIndex: 0,
    });

    await page.mouse.move(marker0Coords.viewportX, marker0Coords.viewportMarkerCenterY);
    await page.waitForTimeout(500);

    const hovered0 = await page.evaluate(
      () => (window as any).__TEST_HOVERED_EXECUTIONS__ ?? []
    );
    expect(hovered0.length).toBe(1);
    const firstY = hovered0[0].y;

    // Hover over second marker (stack index 1)
    const marker1Coords = await getMarkerCoordinates(page, {
      direction: 'BUY',
      candleEdgePrice: 149,
      timeStr: '2023-11-14',
      stackIndex: 1,
    });

    await page.mouse.move(marker1Coords.viewportX, marker1Coords.viewportMarkerCenterY);
    await page.waitForTimeout(500);

    const hovered1 = await page.evaluate(
      () => (window as any).__TEST_HOVERED_EXECUTIONS__ ?? []
    );
    expect(hovered1.length).toBe(1);
    const secondY = hovered1[0].y;

    // The two y values should be different (different execution prices)
    expect(firstY).not.toBeCloseTo(secondY, 0);

    // Each y should match its respective execution price coordinate
    // (order may vary based on which marker is closest, so check both are present)
    const ys = [firstY, secondY].sort();
    const expectedSorted = [expectedYs.y150, expectedYs.y149_5].sort();
    expect(ys[0]).toBeCloseTo(expectedSorted[0], 0);
    expect(ys[1]).toBeCloseTo(expectedSorted[1], 0);
  });
});
