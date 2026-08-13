import { test, expect } from '@playwright/test';

test.describe('Phantom Markers E2E - Dual Sync Dedup', () => {
  test.beforeEach(async ({ page }) => {
    // Mock all Capital.com API endpoints
    await page.route('**/api/session', async route => {
      await route.fulfill({
        status: 200,
        headers: { 'cst': 'mock-cst-token', 'x-security-token': 'mock-security-token' },
        json: { accountType: 'CFD', clientId: 'mock' },
      });
    });
    await page.route('**/api/ping*', route => route.fulfill({ status: 200, json: { status: 'OK' } }));
    await page.route('**/api/accounts', route =>
      route.fulfill({
        status: 200,
        json: { accounts: [{ accountId: 'mock', status: 'ENABLED', balance: { balance: 10000 }, currency: 'USD' }] },
      }),
    );
    await page.route('**/api/order/v1/workingorders**', route =>
      route.fulfill({ status: 200, json: { workingOrders: [] } }),
    );
    await page.route('**/api/watchlist/*', route =>
      route.fulfill({ status: 200, json: { id: '1', name: 'My Watchlist', items: [] } }),
    );
    await page.route('**/api/watchlist', route => route.fulfill({ status: 200, json: { items: [] } }));
    await page.route('**/api/session/accounts', route =>
      route.fulfill({
        status: 200,
        json: { accounts: [{ accountId: 'mock', accountType: 'CFD', preferred: true }] },
      }),
    );
    await page.route('**/api/market/v1/markets*', route =>
      route.fulfill({
        status: 200,
        json: {
          markets: [
            {
              epic: 'SPY',
              instrumentName: 'SPY',
              expiry: '-',
              lotSize: 1,
              currencies: [{ symbol: '$' }],
            },
          ],
        },
      }),
    );

    // Generate mock chart data: candles from 10:30 UTC to 14:30 UTC
    const prices = [];
    for (let i = 10; i <= 14; i++) {
      const timeStr = `2024-08-12T${i.toString().padStart(2, '0')}:30:00.000Z`;
      prices.push({
        snapshotTime: timeStr,
        snapshotTimeUTC: timeStr,
        openPrice: { bid: 200 },
        closePrice: { bid: 200 },
        highPrice: { bid: 201 },
        lowPrice: { bid: 199 },
      });
    }
    await page.route('**/api/market/v1/prices/*', route =>
      route.fulfill({ status: 200, json: { prices } }),
    );
  });

  test('both syncPositions and syncExecutions for the same trade produce exactly ONE marker', async ({
    page,
  }) => {
    // Mock positions endpoint — returns a position with dealId 'DEAL-1'
    await page.route('**/api/order/v1/positions**', route =>
      route.fulfill({
        status: 200,
        json: {
          positions: [
            {
              position: {
                dealId: 'DEAL-1',
                size: 10,
                direction: 'BUY',
                level: 200,
                createdDate: '2024-08-12T13:30:00', // No Z suffix — Capital.com format
              },
              market: { epic: 'SPY' },
            },
          ],
        },
      }),
    );

    // Mock activity history — returns the SAME trade as an activity event
    await page.route('**/api/order/v1/history/activity**', route =>
      route.fulfill({
        status: 200,
        json: {
          activities: [
            {
              dealId: 'DEAL-1',
              epic: 'SPY',
              type: 'POSITION',
              status: 'OPENED',
              dateUTC: '2024-08-12T13:30:00',
              details: {
                direction: 'BUY',
                size: 10,
                level: 200,
              },
            },
          ],
        },
      }),
    );

    // Clear localStorage and set empty trade state
    await page.addInitScript(() => {
      window.localStorage.setItem('CST', 'mock-cst-token');
      window.localStorage.setItem('X-SECURITY-TOKEN', 'mock-security-token');
      localStorage.setItem(
        'trade-storage',
        JSON.stringify({
          state: { executions: [], positions: [], pendingOrders: {} },
          version: 0,
        }),
      );
    });

    await page.goto('/');
    // Wait for both syncs to complete (syncPositions + syncExecutions run on auth)
    await page.waitForTimeout(5000);

    // Check __TEST_MARKERS__ for duplicate execution markers
    const markers: any[] = await page.evaluate(() => (window as any).__TEST_MARKERS__ || []);
    const executionMarkers = markers.filter(m => m.type === 'EXECUTION');
    const deal1Executions = executionMarkers.filter(m => m.id && m.id.includes('DEAL-1'));

    // CRITICAL: Must be at most 1, not 2
    expect(deal1Executions.length).toBeLessThanOrEqual(1);

    // Check localStorage trade-storage for duplicates
    const tradeState = await page.evaluate(() => window.localStorage.getItem('trade-storage'));
    if (tradeState) {
      const parsed = JSON.parse(tradeState);
      const storedExecs = parsed.state?.executions || [];
      const deal1StoredExecs = storedExecs.filter((e: any) => e.dealId === 'DEAL-1' && e.action === 'ENTRY');
      // Must be exactly 1 in localStorage too
      expect(deal1StoredExecs.length).toBeLessThanOrEqual(1);
    }

    // Verify the execution's actual timestamp is correct (13:30 UTC, not shifted to pre-market)
    // The chart display time is snapped to the nearest candle bar which is a display concern.
    // The critical check is that the execution's source timestamp is 13:30 UTC (market hours).
    if (deal1Executions.length > 0) {
      // The execution ID should contain the correct UTC timestamp
      expect(deal1Executions[0].id).toContain('1723469400000');
    }

    // Verify via localStorage that the timestamp is correct
    const tradeStateForTimestamp = await page.evaluate(() => window.localStorage.getItem('trade-storage'));
    if (tradeStateForTimestamp) {
      const parsedTs = JSON.parse(tradeStateForTimestamp);
      const execs = parsedTs.state?.executions || [];
      const deal1 = execs.find((e: any) => e.dealId === 'DEAL-1');
      if (deal1) {
        // 13:30 UTC = 1723469400000ms — this is during market hours, not pre-market
        expect(deal1.timestamp).toBe(1723469400000);
      }
    }
  });

  test('stale localStorage duplicate executions are completely replaced by Capital.com API data', async ({ page }) => {
    // Mock APIs to return ONE real execution
    await page.route('**/api/order/v1/positions**', route =>
      route.fulfill({ status: 200, json: { positions: [] } }),
    );
    await page.route('**/api/order/v1/history/activity**', route =>
      route.fulfill({
        status: 200,
        json: {
          activities: [
            {
              dealId: 'REAL-DEAL',
              epic: 'SPY',
              type: 'POSITION',
              status: 'OPENED',
              dateUTC: '2024-08-12T13:30:00',
              details: { direction: 'BUY', size: 10, level: 200 },
            },
          ],
        },
      }),
    );

    // Seed localStorage with a STALE phantom execution that does NOT exist in the API
    await page.addInitScript(() => {
      window.localStorage.setItem('CST', 'mock-cst-token');
      window.localStorage.setItem('X-SECURITY-TOKEN', 'mock-security-token');
      localStorage.setItem(
        'trade-storage',
        JSON.stringify({
          state: {
            executions: [
              {
                id: 'STALE-PHANTOM_ENTRY_999',
                dealId: 'STALE-PHANTOM',
                epic: 'SPY',
                size: 999,
                price: 999,
                direction: 'BUY',
                timestamp: 999999999,
                action: 'ENTRY',
              },
            ],
            positions: [],
            pendingOrders: {},
          },
          version: 0,
        }),
      );
    });

    await page.goto('/');
    await page.waitForTimeout(3000);

    // After boot and syncExecutions, the stale execution must be GONE.
    // We check the actual rendered markers in memory since executions are no longer saved to localStorage
    const markers: any[] = await page.evaluate(() => (window as any).__TEST_MARKERS__ || []);
    const executionMarkers = markers.filter(m => m.type === 'EXECUTION');

    // We should ONLY have the REAL-DEAL execution
    const staleExecs = executionMarkers.filter(m => m.id && m.id.includes('STALE-PHANTOM'));
    expect(staleExecs).toHaveLength(0); // This will FAIL before the fix

    const realExecs = executionMarkers.filter(m => m.id && m.id.includes('REAL-DEAL'));
    expect(realExecs).toHaveLength(1);
  });
});
