import { test, expect } from '@playwright/test';

test.describe('Chart Alerts E2E', () => {
  test('should show plus button on y-axis hover and open alert creation flow', async ({ page }) => {
    // Intercept API calls to prevent the app from fetching real historical data
    await page.route('**/api/history/activity*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ activities: [] })
      });
    });

    // Mock Chart prices
    await page.route('**/api/market/v1/prices/*', route => {
      return route.fulfill({
        status: 200, 
        json: {
          prices: [
            { snapshotTime: '2023-11-13T00:00:00.000', snapshotTimeUTC: '2023-11-13T00:00:00.000', openPrice: { bid: 150, ask: 150 }, closePrice: { bid: 150, ask: 150 }, highPrice: { bid: 151, ask: 151 }, lowPrice: { bid: 140, ask: 140 } }
          ]
        }
      });
    });

    await page.route('**/api/market/v1/markets*', route => route.fulfill({ status: 200, json: { markets: [{ epic: 'MOCK_EPIC', instrumentName: 'MOCK', expiry: '-', lotSize: 1, currencies: [{ symbol: '$' }] }] } }));
    
    // Set up app state
    await page.goto('/');

    await page.waitForFunction(() => !!(window as any).__sessionStore);

    // Bypass authentication and initialize stores
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

    // Wait for canvas to be visible
    const canvas = page.getByTestId('chart-container').locator('canvas').first();
    await expect(canvas).toBeVisible({ timeout: 10000 });

    // Hover over the canvas to trigger the crosshair and y-axis button
    const box = await canvas.boundingBox();
    if (!box) throw new Error('Canvas bounding box not found');
    
    // Simulate hover on the Y-axis (right side of the chart)
    const Y_AXIS_WIDTH = 60;
    const hoverX = box.x + box.width - (Y_AXIS_WIDTH / 2);
    await page.mouse.move(hoverX, box.y + box.height / 2);

    // Wait for the plus button to appear in the DOM
    const plusButton = page.getByTestId('crosshair-alert-btn').first();
    await expect(plusButton).toBeVisible({ timeout: 5000 });

    // Click the plus button
    await plusButton.click();

    // Verify the alert creation flow opens with pre-filled price
    const alertModal = page.locator('.alerts-panel');
    await expect(alertModal).toBeVisible();

    // Check if the price input is pre-filled with a value
    const priceInput = page.locator('input[name="alertPrice"]');
    const priceValue = await priceInput.inputValue();
    expect(priceValue).toBeTruthy();

    // Fill out the alert form
    await page.click('button:has-text("Create Alert")');

    // Verify the alert appears in the active alerts list
    await expect(page.locator('.active-alerts-list')).toContainText('Alert:');
  });
});
