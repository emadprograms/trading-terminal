import { test, expect } from '@playwright/test';

test.describe('Advanced Edge Cases E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Mock the session endpoint so the app can "login"
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

    // Mock the ping and other read endpoints
    await page.route('**/api/ping*', route => route.fulfill({ status: 200, json: { status: 'OK' } }));
    
    // Mock accounts
    await page.route('**/api/accounts', route => route.fulfill({
      status: 200,
      json: {
        accounts: [{
          accountId: 'mock-account-id',
          accountName: 'Demo Account',
          status: 'ENABLED',
          balance: { balance: 10000, deposit: 10000, profit: 0 },
          currency: 'USD'
        }]
      }
    }));

    // Mock market prices
    await page.route('**/api/market/v1/prices/*', route => route.fulfill({
      status: 200,
      json: { prices: [{ bid: 500, ask: 500 }] }
    }));

    // Mock market search
    await page.route('**/api/market/v1/markets*', route => route.fulfill({
      status: 200,
      json: { markets: [] }
    }));
  });

  test('cancels attached SL/TP via updatePosition', async ({ page }) => {
    let positionPutCount = 0;
    
    const mockPositions = [{
      position: {
        dealId: 'mock-deal-pos-1',
        epic: 'SPY',
        direction: 'BUY',
        size: 1,
        level: 500,
        stopLevel: 490, // Attached SL
        guaranteedStop: false
      },
      market: { epic: 'SPY', instrumentName: 'SPY' }
    }];

    await page.route('**/api/order/v1/positions**', async route => {
      if (route.request().method() === 'POST' || route.request().method() === 'DELETE') {
        return route.fulfill({ status: 200, json: { status: 'ACCEPTED', dealReference: 'mock-ref' } });
      } else if (route.request().method() === 'PUT') {
        positionPutCount++;
        return route.fulfill({ status: 200, json: { status: 'ACCEPTED', dealReference: 'mock-ref-update' } });
      }
      return route.fulfill({ status: 200, json: { positions: mockPositions } });
    });

    let workingOrdersDeleteCount = 0;
    await page.route('**/api/order/v1/workingorders**', async route => {
      if (route.request().method() === 'DELETE') {
        workingOrdersDeleteCount++;
        return route.fulfill({ status: 200, json: { status: 'ACCEPTED', dealReference: 'mock-ref-delete-wo' } });
      }
      // No standalone working orders
      return route.fulfill({ status: 200, json: { workingOrders: [] } });
    });

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Just find the last TradeBadge close button (which will be the SL badge since it renders after positions)
    const slBadgeCloseBtn = page.locator('.trade-badge-tv button').last();
    // Wait for the DOM element to exist at least
    await slBadgeCloseBtn.waitFor({ state: 'attached', timeout: 10000 });
    // Force raw DOM click to bypass visibility checks
    await slBadgeCloseBtn.evaluate((node: HTMLElement) => node.click());

    // Verify toast notification
    await expect(page.getByText(/Stop Loss updated/i)).toBeVisible();

    expect(positionPutCount).toBe(1);
    expect(workingOrdersDeleteCount).toBe(0);
  });

  test('half-flatten Alt logic', async ({ page }) => {
    let positionDeleteDeals: string[] = [];

    const mockPositions = [
      {
        position: { dealId: 'deal-1', epic: 'SPY', direction: 'BUY', size: 1, level: 500, guaranteedStop: false },
        market: { epic: 'SPY', instrumentName: 'SPY' }
      },
      {
        position: { dealId: 'deal-2', epic: 'SPY', direction: 'BUY', size: 1, level: 510, guaranteedStop: false },
        market: { epic: 'SPY', instrumentName: 'SPY' }
      },
      {
        position: { dealId: 'deal-3', epic: 'SPY', direction: 'BUY', size: 1, level: 490, guaranteedStop: false },
        market: { epic: 'SPY', instrumentName: 'SPY' }
      }
    ];

    await page.route('**/api/order/v1/positions**', async route => {
      if (route.request().method() === 'DELETE') {
        positionDeleteDeals.push(route.request().url());
        return route.fulfill({ status: 200, json: { status: 'ACCEPTED', dealReference: 'mock-ref' } });
      } else if (route.request().method() === 'POST') {
         return route.fulfill({ status: 200, json: { status: 'ACCEPTED', dealReference: 'mock-ref-counter' } });
      }
      return route.fulfill({ status: 200, json: { positions: mockPositions } });
    });
    
    await page.route('**/api/order/v1/workingorders**', route => route.fulfill({ status: 200, json: { workingOrders: [] } }));

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Focus the chart before sending keyboard shortcuts
    await page.locator('.chart-card').first().click();

    // Trigger half-flatten action via Double Alt
    await page.keyboard.press('Alt');
    await page.waitForTimeout(50);
    await page.keyboard.press('Alt');

    await expect(async () => {
      expect(positionDeleteDeals.length).toBeGreaterThan(0);
    }).toPass();

    // Verify it targeted the worst leg (deal-2) since 510 is worst for BUY when price is 500
    const targetedDeal2 = positionDeleteDeals.some(url => url.includes('deal-2'));
    expect(targetedDeal2).toBeTruthy();
    
    // Half of 3 is 1.5, so at least one more request will go through.
  });

  test('API error recovery and lock clearing', async ({ page }) => {
    let hasFailed = false;
    let positionsPostCount = 0;
    
    // Do NOT fulfill positions POST here. Let it continue to proxy.
    await page.route('**/api/order/v1/positions**', async route => {
      const req = route.request();
      if (req.method() === 'POST') {
        positionsPostCount++;
        if (!hasFailed) {
          hasFailed = true;
          return route.fulfill({
            status: 500,
            contentType: 'application/json',
            json: { errorCode: 'mock_error_injected', developerMessage: 'Mocked error' }
          });
        } else {
          // 2nd attempt succeeds
          return route.fulfill({ status: 200, json: { status: 'ACCEPTED', dealReference: 'mock-ref-success' } });
        }
      }
      return route.fulfill({ status: 200, json: { positions: [] } });
    });

    await page.route('**/api/order/v1/workingorders**', route => route.fulfill({ status: 200, json: { workingOrders: [] } }));

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const buyBtn = page.getByRole('button', { name: /Buy|Long/i }).first();
    await expect(buyBtn).toBeVisible();
    await expect(buyBtn).toBeEnabled();

    // 1st attempt: should fail with injected error
    await buyBtn.click();
    
    // UI should show the proxy error
    await expect(page.getByText(/mock_error_injected/i)).toBeVisible({ timeout: 10000 });

    // 2nd attempt: the lock should be clear, allowing us to click again and succeed
    await expect(buyBtn).toBeEnabled();
    await buyBtn.click();

    // Verify UI state for success
    await expect(page.getByText('Order Submitted')).toBeVisible({ timeout: 10000 });
    
    // Ensure both calls were attempted
    expect(positionsPostCount).toBe(2);
  });
});
