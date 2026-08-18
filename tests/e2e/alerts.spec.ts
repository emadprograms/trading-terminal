import { test, expect } from '@playwright/test';

test.describe('Real-Time Alerting System', () => {
  test('should allow setting an alert and trigger it when price is met', async ({ page }) => {
    // Intercept API calls to prevent the app from fetching real historical data
    await page.route('**/api/history/activity*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ activities: [] })
      });
    });

    // 1. Navigate to the app
    await page.goto('http://localhost:3001');

    // Wait for the app to initialize its stores
    await page.waitForFunction(() => !!(window as any).__sessionStore);

    // 2. Bypass authentication and initialize stores
    await page.evaluate(() => {
      (window as any).__E2E_MOCK_EXECUTIONS = true;
      (window as any).__sessionStore.setState({ 
        isAuthenticated: true, 
        cst: 'mock', 
        securityToken: 'mock',
        client: {
          clientAccountId: 'mock-account-123'
        }
      });
    });

    // 3. Click the "Set Alert" button (which doesn't exist yet)
    // Wait for a button that we expect to be there eventually, this is what fails first.
    const alertButton = page.locator('button', { hasText: 'Set Alert' });
    await alertButton.click({ timeout: 5000 });

    // 4. Fill out the alert form (which doesn't exist yet)
    await page.fill('input[name="alertPrice"]', '150.00');
    await page.click('button:has-text("Create Alert")');

    // 5. Verify the alert appears in the active alerts list
    await expect(page.locator('.active-alerts-list')).toContainText('Alert: 150.00');

    // 6. Mock a price update that hits the target price
    await page.evaluate(() => {
      // @ts-ignore
      if (window.__E2E_PUSH_PRICE_TICK) {
        // @ts-ignore
        window.__E2E_PUSH_PRICE_TICK(150.05); // Price crosses the threshold
      }
    });

    // 7. Verify the alert triggered visually (e.g., a toast notification)
    const toast = page.locator('.alert-toast');
    await expect(toast).toContainText('Alert triggered at 150.05');
  });
});
