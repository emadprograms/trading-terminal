import { test, expect } from '@playwright/test';
import { cleanupTestState } from './api-cleanup';

test.describe('Order Lifecycle E2E', () => {
  test.beforeEach(async ({ page, request }) => {
    // Capture session tokens from any outgoing request that carries them
    let capturedCst = '';
    let capturedSecurityToken = '';
    page.on('request', req => {
      const headers = req.headers();
      if (headers['cst']) capturedCst = headers['cst'];
      if (headers['x-security-token']) capturedSecurityToken = headers['x-security-token'];
    });

    await page.goto('/');
    
    // Wait for the app to load and the initial sync requests to fire
    await expect.poll(() => capturedCst !== '' && capturedSecurityToken !== '', { 
      message: 'Waiting for authentication tokens to be attached to a request',
      timeout: 15000 
    }).toBeTruthy();
    
    // Inject into localStorage for the cleanup utility to pick up
    await page.evaluate(({ cst, sec }) => {
      localStorage.setItem('CST', cst);
      localStorage.setItem('X-SECURITY-TOKEN', sec);
    }, { cst: capturedCst, sec: capturedSecurityToken });

    await cleanupTestState(page, request);
    
    // Give a brief moment for the UI to reflect empty state after cleanup
    await page.waitForTimeout(1000);
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

    // Switch to Orders tab if necessary
    const ordersTab = page.getByRole('button', { name: /Orders|Working/i }).first();
    if (await ordersTab.isVisible()) {
      await ordersTab.click();
    }

    // 2. Cancel the order
    // Wait for the cancel button to appear
    const cancelBtn = page.locator('button[title="Cancel Order"]').first();
    await expect(cancelBtn).toBeVisible({ timeout: 10000 });
    await cancelBtn.click();

    // Verify UI state
    await expect(page.getByText(/Cancel Request Submitted/i)).toBeVisible();
    await expect(cancelBtn).toHaveCount(0, { timeout: 10000 }); // Should be removed from the UI

    // Verify network
    expect(workingOrdersDeleteCount).toBe(1);
  });
});
