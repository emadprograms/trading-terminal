import { test, expect } from '@playwright/test';
import { cleanupTestState } from './api-cleanup';

test.describe('Concurrency and Locks E2E', () => {
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
      json: { prices: [] }
    }));

    // Mock market search
    await page.route('**/api/market/v1/markets*', route => route.fulfill({
      status: 200,
      json: { markets: [] }
    }));

    // Mock positions with latency to simulate network and test locks
    await page.route('**/api/order/v1/positions**', async route => {
      if (route.request().method() === 'POST' || route.request().method() === 'DELETE') {
        // Add artificial latency of 500ms to allow spamming to hit the lock
        await new Promise(resolve => setTimeout(resolve, 500));
        return route.fulfill({ status: 200, json: { status: 'ACCEPTED', dealReference: 'mock-deal-pos' } });
      }
      return route.fulfill({ status: 200, json: { positions: [
        { dealId: 'mock-pos-1', epic: 'SPY', direction: 'BUY', size: 1, level: 500 },
        { dealId: 'mock-pos-2', epic: 'QQQ', direction: 'BUY', size: 1, level: 500 },
        { dealId: 'mock-pos-3', epic: 'AAPL', direction: 'BUY', size: 1, level: 500 },
        { dealId: 'mock-pos-4', epic: 'MSFT', direction: 'BUY', size: 1, level: 500 },
      ] } });
    });

    // Inject the mock session into localStorage BEFORE the app boots
    await page.addInitScript(() => {
      window.localStorage.setItem('CST', 'mock-cst-token');
      window.localStorage.setItem('X-SECURITY-TOKEN', 'mock-security-token');
    });

    // Navigate to the app
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('realistic speed - human delays', async ({ page }) => {
    // Track requests
    let positionsPostCount = 0;
    page.on('request', req => {
      if (req.url().includes('/api/order/v1/positions') && req.method() === 'POST') {
        positionsPostCount++;
      }
    });

    // Wait for the app to be ready and UI controls to appear
    await expect(page.getByRole('button', { name: /Buy|Long/i }).first()).toBeVisible({ timeout: 10000 });

    // Simulate human interaction: click, wait, click
    const buyBtn = page.getByRole('button', { name: /Buy|Long/i }).first();
    
    // First action
    await buyBtn.click();
    await page.waitForTimeout(1000); // Wait 1 second (human speed)
    
    // Second action
    await buyBtn.click();
    await page.waitForTimeout(1000); // Wait 1 second

    // We expect exactly 2 requests because the lock was released between clicks
    expect(positionsPostCount).toBe(2);
  });

  test('impossible speed - spamming inputs', async ({ page }) => {
    // Skip if not using mocks (we don't want to spam the live API)
    test.skip(process.env.USE_MOCKS !== 'true', 'Requires USE_MOCKS=true');

    // Track requests
    let positionsPostCount = 0;
    page.on('request', req => {
      if (req.url().includes('/api/order/v1/positions') && req.method() === 'POST') {
        positionsPostCount++;
      }
    });

    // Wait for the app to be ready
    await expect(page.locator('.trade-controls').first()).toBeVisible({ timeout: 10000 });

    // Focus the page so keyboard shortcuts work
    await page.locator('body').click();
    await page.waitForTimeout(500); // Let focus settle

    // Spam Alt+Q 10 times with zero delay (impossible speed)
    // The lock should prevent more than 1 request from firing simultaneously
    const spamPromises = [];
    for (let i = 0; i < 10; i++) {
      spamPromises.push(page.keyboard.press('Alt+Q'));
    }
    await Promise.all(spamPromises);

    // Wait for the first (and only) request to finish processing (500ms latency)
    await page.waitForTimeout(1500);

    // Verify exactly ONE request went through due to locking mechanism
    expect(positionsPostCount).toBe(1);

    // Verify UI state didn't spawn multiple ghost orders or error toasts
    // "Order Submitted" toast should only appear once, but multiple toasts might just stack.
    // The main verification is the network count.
  });

  test('impossible speed - spamming double alt (flatten symbol)', async ({ page }) => {
    // Skip if not using mocks
    test.skip(process.env.USE_MOCKS !== 'true', 'Requires USE_MOCKS=true');

    // Track requests for deleting positions (flattening)
    let positionsDeleteCount = 0;
    page.on('request', req => {
      if (req.url().includes('/api/order/v1/positions') && req.method() === 'DELETE') {
        positionsDeleteCount++;
      }
    });

    await expect(page.locator('.trade-controls').first()).toBeVisible({ timeout: 10000 });

    await page.locator('body').click();
    await page.waitForTimeout(500);

    // Spam Ctrl (double ctrl flattens full symbol)
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Control');
      await page.waitForTimeout(50); // Tiny delay to ensure browser registers separate events within 400ms window
    }

    await page.waitForTimeout(1500);

    // Verify exactly ONE request went through due to locking mechanism
    expect(positionsDeleteCount).toBe(1);
  });
});
