import { test, expect } from '@playwright/test';

test.describe('Working Order Deduplication', () => {
  test('should ignore WORKING_ORDER and only render the POSITION to prevent duplicate histories', async ({ page }) => {
    
    // Setup standard mocks
    await page.route('**/session', async route => {
      await route.fulfill({
        status: 200,
        headers: { 'cst': 'mock-cst-token', 'x-security-token': 'mock-security-token' },
        json: { accountType: 'CFD', clientId: 'mock' }
      });
    });
    await page.route('**/ping*', route => route.fulfill({ status: 200, json: { status: 'OK' } }));
    await page.route('**/session/accounts', route => route.fulfill({ status: 200, json: { accounts: [{ accountId: 'mock' }] } }));
    await page.route('**/accounts', route => route.fulfill({ status: 200, json: { accounts: [{ accountId: 'mock', status: 'ENABLED', balance: { balance: 10000 }, currency: 'USD' }] } }));
    await page.route('**/workingorders**', route => route.fulfill({ status: 200, json: { workingOrders: [] } }));
    await page.route('**/positions**', route => route.fulfill({ status: 200, json: { positions: [] } }));
    await page.route('**/markets*', route => route.fulfill({ status: 200, json: { markets: [{ epic: 'ADBE', instrumentName: 'ADBE' }] } }));
    await page.route('**/watchlist*', route => route.fulfill({ status: 200, json: { id: '1', name: 'My Watchlist', markets: [] } }));
    await page.route('**/prices/*', route => route.fulfill({ status: 200, json: { prices: [] } }));

    // Inject the exact bug scenario: Capital.com returns a WORKING_ORDER filled and the resulting POSITION opened
    await page.route('**/history/activity*', route => {
      const activities = [
        {
          dealId: 'WO_12345',
          epic: 'ADBE',
          type: 'WORKING_ORDER',
          status: 'FILLED',
          dateUTC: '2026-08-14T10:00:00Z',
          details: { direction: 'BUY', size: 30, level: 500 }
        },
        {
          dealId: 'POS_12345',
          epic: 'ADBE',
          type: 'POSITION',
          status: 'ACCEPTED', // Capital.com sends ACCEPTED immediately before OPENED
          dateUTC: '2026-08-14T10:00:01Z',
          details: { direction: 'BUY', size: 30, level: 500 }
        },
        {
          dealId: 'POS_12345',
          epic: 'ADBE',
          type: 'POSITION',
          status: 'OPENED',
          dateUTC: '2026-08-14T10:00:02Z',
          details: { direction: 'BUY', size: 30, level: 500 }
        },
        {
          dealId: 'POS_12345',
          epic: 'ADBE',
          type: 'POSITION',
          status: 'OPENED', // Overlapping chunk duplication
          dateUTC: '2026-08-14T10:00:02Z',
          details: { direction: 'BUY', size: 30, level: 500 }
        }
      ];
      return route.fulfill({ status: 200, json: { activities } });
    });

    await page.goto('http://localhost:3001');

    // Wait for history to load
    await page.waitForTimeout(1000);

    const h3 = page.locator('h3', { hasText: 'Order History' });
    if (!(await h3.isVisible())) {
      await page.locator('button[title="Order History"]').click();
    }
    
    await expect(h3).toBeVisible();

    // The order history should contain EXACTLY ONE card for ADBE
    // If it contains TWO, then the WORKING_ORDER bug is present!
    const tradeCards = page.locator('.order-history section > div').nth(1).locator('> div');
    
    // Expect exactly 1 trade card
    await expect(tradeCards).toHaveCount(1);
    
    const tradeCard = tradeCards.first();
    await expect(tradeCard).toContainText('ADBE');
    await expect(tradeCard).toContainText('30');
    // The trade should be OPEN, not prematurely CLOSED by a duplicate execution
    await expect(tradeCard).toContainText('OPEN');
  });
});
