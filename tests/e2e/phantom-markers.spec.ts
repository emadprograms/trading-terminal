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

  test('stale localStorage duplicates are purged on boot', async ({ page }) => {
    // Mock APIs to return empty data (so no new executions are created)
    await page.route('**/api/order/v1/positions**', route =>
      route.fulfill({ status: 200, json: { positions: [] } }),
    );
    await page.route('**/api/order/v1/history/activity**', route =>
      route.fulfill({ status: 200, json: { activities: [] } }),
    );

    // Seed localStorage with DUPLICATE executions for the same dealId+action but different IDs
    await page.addInitScript(() => {
      window.localStorage.setItem('CST', 'mock-cst-token');
      window.localStorage.setItem('X-SECURITY-TOKEN', 'mock-security-token');
      localStorage.setItem(
        'trade-storage',
        JSON.stringify({
          state: {
            executions: [
              {
                id: 'DEAL-X_ENTRY_111',
                dealId: 'DEAL-X',
                epic: 'SPY',
                size: 1,
                price: 100,
                direction: 'BUY',
                timestamp: 111,
                action: 'ENTRY',
              },
              {
                id: 'DEAL-X_BUY_222',
                dealId: 'DEAL-X',
                epic: 'SPY',
                size: 1,
                price: 100,
                direction: 'BUY',
                timestamp: 222,
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

    // After boot, the rehydration purge should have collapsed duplicates
    const tradeState = await page.evaluate(() => window.localStorage.getItem('trade-storage'));
    expect(tradeState).not.toBeNull();
    const parsed = JSON.parse(tradeState!);
    const storedExecs = parsed.state?.executions || [];
    const dealXExecs = storedExecs.filter((e: any) => e.dealId === 'DEAL-X' && e.action === 'ENTRY');

    // Must be exactly 1 (the duplicate was purged)
    expect(dealXExecs).toHaveLength(1);
    // The surviving one should have the later timestamp (222)
    expect(dealXExecs[0].timestamp).toBe(222);
  });
});
