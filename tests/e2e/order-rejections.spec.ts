import { test, expect } from '@playwright/test';

test.describe('Order Rejections E2E', () => {
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

    // Navigate to the app after setting up mocks
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('maps Capital.com INVALID_ORDER_QTY to user-friendly error', async ({ page }) => {
    // Mock positions to return deal reference initially
    await page.route('**/api/order/v1/positions**', route => {
      if (route.request().method() === 'POST') {
        return route.fulfill({ status: 200, json: { status: 'ACCEPTED', dealReference: 'mock-invalid-qty-deal' } });
      }
      return route.fulfill({ status: 200, json: { positions: [] } });
    });

    // Mock the confirmation endpoint to return the INVALID_ORDER_QTY rejection
    await page.route('**/api/order/v1/confirms/mock-invalid-qty-deal', route => {
      return route.fulfill({ 
        status: 200, 
        json: { 
          dealStatus: 'REJECTED', 
          rejectReason: 'INVALID_ORDER_QTY', 
          dealReference: 'mock-invalid-qty-deal',
          epic: 'AAPL'
        } 
      });
    });

    // Wait for app to be ready
    const buyBtn = page.getByRole('button', { name: /Buy|Long/i }).first();
    await expect(buyBtn).toBeVisible();

    // Trigger buy order
    await buyBtn.click();

    // Wait for the user-friendly error to be shown instead of the raw code
    await expect(page.getByText('Order Rejected: Invalid Quantity (instrument limits or fractional sizes not allowed on Demo)')).toBeVisible({ timeout: 10000 });
  });

  test('maps Capital.com RC_INSTRUMENT_CLIENT_MOP to user-friendly error', async ({ page }) => {
    // Mock positions to return deal reference initially
    await page.route('**/api/order/v1/positions**', route => {
      if (route.request().method() === 'POST') {
        return route.fulfill({ status: 200, json: { status: 'ACCEPTED', dealReference: 'mock-mop-deal' } });
      }
      return route.fulfill({ status: 200, json: { positions: [] } });
    });

    // Mock the confirmation endpoint to return the RC_INSTRUMENT_CLIENT_MOP rejection
    await page.route('**/api/order/v1/confirms/mock-mop-deal', route => {
      return route.fulfill({ 
        status: 200, 
        json: { 
          dealStatus: 'REJECTED', 
          reason: 'RC_INSTRUMENT_CLIENT_MOP', 
          dealReference: 'mock-mop-deal',
          epic: 'AAPL'
        } 
      });
    });

    // Wait for app to be ready
    const buyBtn = page.getByRole('button', { name: /Buy|Long/i }).first();
    await expect(buyBtn).toBeVisible();

    // Trigger buy order
    await buyBtn.click();

    // Wait for the user-friendly error to be shown instead of the raw code
    await expect(page.getByText('Order Rejected: Instrument restricted for this account type')).toBeVisible({ timeout: 10000 });
  });
});
