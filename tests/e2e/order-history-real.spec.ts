import { test, expect } from '@playwright/test';

test.describe('Order History & Netting Engine (Real Flow)', () => {
  test('should parse mapped executions into grouped trades and display them in sidebar', async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:3001');

    // Inject mocked executions directly into useTradeStore
    // This simulates the app fetching raw data and mapping it, then the netting engine picking it up
    await page.evaluate(() => {
      const now = Date.now();
      const mockExecutions = [
        {
          id: 'deal123_BUY_1',
          dealId: 'deal123',
          epic: 'AAPL',
          size: 10,
          price: 150,
          direction: 'BUY',
          timestamp: now - 100000,
          action: 'ENTRY'
        },
        // Partial close (5 size)
        {
          id: 'deal123_SELL_2',
          dealId: 'deal123',
          epic: 'AAPL',
          size: 5,
          price: 155, // closed at 155 (profit of $5 * 5 = $25)
          direction: 'SELL',
          timestamp: now - 50000,
          action: 'EXIT',
          openPrice: 150
        },
        // Final close (5 size)
        {
          id: 'deal123_SELL_3',
          dealId: 'deal123',
          epic: 'AAPL',
          size: 5,
          price: 145, // closed at 145 (loss of $5 * 5 = -$25)
          direction: 'SELL',
          timestamp: now,
          action: 'EXIT',
          openPrice: 150
        }
      ];
      
      (window as any).useTradeStore.setState({ executions: mockExecutions });
    });

    // The Order History panel might be open by default.
    // Let's ensure it's open.
    const h3 = page.locator('h3', { hasText: 'Order History' });
    if (!(await h3.isVisible())) {
      await page.locator('button[title="Order History"]').click();
    }
    
    await expect(h3).toBeVisible();

    // The netting engine should have combined the 3 executions into ONE trade
    // P&L should be 0 (+25 from first close, -25 from second close)
    // It should say AAPL, CLOSED, Size: 0 (or original 10, wait, it should probably show original total size 10)
    // Actually, if it subtracts size, totalSize becomes 0. Let's check what the component renders.
    // OrderHistory.tsx renders: {trade.totalSize} and trade.status
    
    // We expect 1 trade card for AAPL
    const tradeCards = page.locator('.order-history section > div').nth(1).locator('> div');
    await expect(tradeCards).toHaveCount(1);
    
    const tradeCard = tradeCards.first();
    await expect(tradeCard).toContainText('AAPL');
    await expect(tradeCard).toContainText('CLOSED');
    // Total size should be 0 because it subtracted it. Wait, UI should probably show the historical max size, but for now just check if it's there.
    
    // Check P&L is 0
    await expect(tradeCard).toContainText('$0');

    // Click the trade card to trigger chart navigation
    let navEventFired = false;
    await page.evaluate(() => {
      window.addEventListener('chart-navigate', (e: any) => {
        (window as any).__NAV_EVENT = e.detail;
      });
    });

    await tradeCard.click();

    // Verify the event was fired with open and close times
    const navDetail = await page.evaluate(() => (window as any).__NAV_EVENT);
    expect(navDetail).toBeTruthy();
    expect(navDetail.openTime).toBeDefined();
    expect(navDetail.closeTime).toBeDefined();
  });
});
