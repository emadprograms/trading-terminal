import { test, expect } from '@playwright/test';

test.describe('Missing ACCEPTED Order Bug', () => {
  test('should render a POSITION if it only has an ACCEPTED status without an OPENED status', async ({ page }) => {
    
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
    await page.route('**/markets*', route => route.fulfill({ status: 200, json: { markets: [{ epic: 'NVDA', instrumentName: 'NVDA' }] } }));
    await page.route('**/watchlist*', route => route.fulfill({ status: 200, json: { id: '1', name: 'My Watchlist', markets: [] } }));
    await page.route('**/prices/*', route => route.fulfill({ status: 200, json: { prices: [] } }));

    // Inject the exact bug scenario: Capital.com returns a POSITION but ONLY with status ACCEPTED
    await page.route('**/history/activity*', route => {
      const activities = [
        {
          dealId: 'POS_NVDA_999',
          epic: 'NVDA',
          type: 'POSITION',
          status: 'ACCEPTED', // The ONLY event for this deal!
          dateUTC: '2026-08-14T12:00:00Z',
          details: { direction: 'BUY', size: 10, level: 100 }
        }
      ];
      return route.fulfill({ status: 200, json: { activities } });
    });

    // Navigate to the app
    await page.goto('http://localhost:3001');

    // The Order History panel might be open by default.
    // Let's ensure it's open.
    const h3 = page.locator('h3', { hasText: 'Order History' });
    if (!(await h3.isVisible())) {
      await page.locator('button[title="Order History"]').click();
    }
    await expect(h3).toBeVisible();

    // The order should NOT be missing. It must appear in the history!
    const tradeCards = page.locator('.order-history section > div').nth(1).locator('> div');
    
    // We expect exactly 1 trade card for NVDA
    await expect(tradeCards).toHaveCount(1);
    
    const tradeCard = tradeCards.first();
    await expect(tradeCard).toContainText('NVDA');
    await expect(tradeCard).toContainText('10');
    await expect(tradeCard).toContainText('OPEN');
  });
});
