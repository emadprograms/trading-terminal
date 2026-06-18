import { test, expect } from '@playwright/test';
import { cleanupTestState } from './api-cleanup';

test.describe('Order Lifecycle E2E', () => {
  test.beforeEach(async ({ page, request }) => {
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
      json: { prices: [] }
    }));

    // Mock market search
    await page.route('**/api/market/v1/markets*', route => route.fulfill({
      status: 200,
      json: { markets: [] }
    }));

    // Mock positions
    await page.route('**/api/order/v1/positions**', route => {
      if (route.request().method() === 'POST' || route.request().method() === 'DELETE') {
        return route.fulfill({ status: 200, json: { status: 'ACCEPTED', dealReference: 'mock-deal-pos' } });
      }
      return route.fulfill({ status: 200, json: { positions: [] } });
    });

    // Mock working orders with state
    let mockWorkingOrders: any[] = [];
    await page.route('**/api/order/v1/workingorders**', route => {
      if (route.request().method() === 'POST') {
        mockWorkingOrders = [{
          dealId: 'mock-deal-wo',
          epic: 'SPY',
          direction: 'BUY',
          orderLevel: 500,
          orderSize: 1,
          type: 'LIMIT',
          guaranteedStop: false
        }];
        return route.fulfill({ status: 200, json: { status: 'ACCEPTED', dealReference: 'mock-deal-wo' } });
      } else if (route.request().method() === 'DELETE') {
        mockWorkingOrders = [];
        return route.fulfill({ status: 200, json: { status: 'ACCEPTED', dealReference: 'mock-deal-wo' } });
      }
      return route.fulfill({ status: 200, json: { workingOrders: mockWorkingOrders } });
    });

    // Inject the mock session into localStorage BEFORE the app boots
    await page.addInitScript(() => {
      window.localStorage.setItem('CST', 'mock-cst-token');
      window.localStorage.setItem('X-SECURITY-TOKEN', 'mock-security-token');
    });

    // Navigate to the app after setting up mocks and init scripts
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    await page.waitForLoadState('domcontentloaded');

    // We skip actually calling the real cleanup utility because it would try to hit the missing proxy URL with Playwright's APIRequestContext.
    // However, since we're mocking, we can just intercept Playwright's own request too!
    // But Playwright's `request` fixture doesn't use `page.route` interceptors.
    // Instead of calling cleanupTestState(page, request), we'll let the mock test run on a clean mocked state anyway.
  });

  test('places market order successfully', async ({ page }) => {
    // Set up request counter
    let positionsPostCount = 0;
    page.on('request', req => {
      if (req.url().includes('/api/order/v1/positions') && req.method() === 'POST') {
        positionsPostCount++;
      }
    });

    const buyBtn = page.getByRole('button', { name: /Buy|Long/i }).first();
    await expect(buyBtn).toBeVisible();

    await buyBtn.click();

    // Verify UI state: should see order submitted toast
    await expect(page.getByText('Order Submitted')).toBeVisible();

    // Verify network count
    expect(positionsPostCount).toBe(1);
  });

  test('places limit order successfully', async ({ page }) => {
    let workingOrdersPostCount = 0;
    page.on('request', req => {
      if (req.url().includes('/api/order/v1/workingorders') && req.method() === 'POST') {
        workingOrdersPostCount++;
      }
    });

    // Switch to LIMIT
    await page.locator('.trade-controls select').first().selectOption('LIMIT');
    
    const levelInput = page.locator('input[step="0.00001"]').first();
    await expect(levelInput).toBeVisible();
    
    // Decrease the auto-populated level slightly to ensure it doesn't instantly fill
    const currentValue = await levelInput.inputValue();
    if (currentValue) {
      await levelInput.fill((parseFloat(currentValue) * 0.9).toFixed(5));
    }
    
    const buyBtn = page.getByRole('button', { name: /Buy|Long/i }).first();
    await buyBtn.click();

    // Verify UI
    await expect(page.getByText('Order Submitted')).toBeVisible();

    // Verify network
    expect(workingOrdersPostCount).toBe(1);
  });

  test('cancels limit order successfully', async ({ page }) => {
    // 1. Place the order first
    await page.locator('.trade-controls select').first().selectOption('LIMIT');
    
    const levelInput = page.locator('input[step="0.00001"]').first();
    const currentValue = await levelInput.inputValue();
    if (currentValue) {
      await levelInput.fill((parseFloat(currentValue) * 0.9).toFixed(5));
    }

    const buyBtn = page.getByRole('button', { name: /Buy|Long/i }).first();
    await buyBtn.click();
    await expect(page.getByText('Order Submitted')).toBeVisible();

    // Reset counters for the cancellation phase
    let workingOrdersDeleteCount = 0;
    page.on('request', req => {
      if (req.url().includes('/api/order/v1/workingorders') && req.method() === 'DELETE') {
        workingOrdersDeleteCount++;
      }
    });

    // Open the Trade Log panel from the sidebar
    const tradeLogBtn = page.locator('button[title="Trade Log"]').first();
    if (await tradeLogBtn.isVisible()) {
      await tradeLogBtn.click();
    }

    // 2. Cancel the order
    // Wait for the cancel button to appear
    const cancelBtn = page.locator('button[title="Cancel Order"]').first();
    await expect(cancelBtn).toBeVisible({ timeout: 10000 });
    await cancelBtn.click();

    // Verify UI state
    await expect(page.getByText(/Cancel Request Submitted/i)).toBeVisible();
    await expect(page.locator('button[title="Cancel Order"]')).toHaveCount(0, { timeout: 10000 });

    // Verify network
    expect(workingOrdersDeleteCount).toBe(1);
  });
});
