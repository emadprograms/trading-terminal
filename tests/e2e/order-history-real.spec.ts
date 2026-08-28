import { test, expect } from '@playwright/test';

test.describe('Order History & Netting Engine (Real Flow)', () => {
  test('should parse mapped executions into grouped trades and display them in sidebar', async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:3001');

    // Intercept API calls to prevent the app from fetching real historical data
    // and overwriting our injected mocked executions.
    await page.route('**/api/history/activity*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ activities: [] })
      });
    });

    // Wait for the app to initialize its stores
    await page.waitForFunction(() => !!(window as any).__sessionStore);

    // Force authentication so ChartWorkspace doesn't get unmounted by login spinner
    await page.evaluate(() => {
      (window as any).__E2E_MOCK_EXECUTIONS = true;
      (window as any).__sessionStore.setState({ isAuthenticated: true, cst: 'mock', securityToken: 'mock' });
    });
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
          price: 145.1234, // closed at 145.1234 (loss of $4.8766 * 5 = -$24.383)
          direction: 'SELL',
          timestamp: now,
          action: 'EXIT',
          openPrice: 150
        },
        // OPEN trade
        {
          id: 'deal999_BUY_1',
          dealId: 'deal999',
          epic: 'MSFT',
          size: 20,
          price: 300,
          direction: 'BUY',
          timestamp: now - 200000,
          action: 'ENTRY'
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
    
    // We expect 1 trade card for AAPL and 1 for MSFT
    const tradeCards = page.locator('.order-history section > div').nth(1).locator('> div');
    await expect(tradeCards).toHaveCount(2);
    
    const tradeCard = tradeCards.filter({ hasText: 'AAPL' }).first();
    await expect(tradeCard).toContainText('AAPL');
    await expect(tradeCard).toContainText('CLOSED');
    
    // The UI must display the max size of the trade, NOT 0 (which happens when you subtract everything)
    // The user opened 10 size, so it must say 10.
    await expect(tradeCard).toContainText('10');
    
    // Check P&L is +$0.62 (rounded to 2 decimals)
    await expect(tradeCard).toContainText('$0.62');

    // Currently the user is NOT on AAPL (the app defaults to whatever). 
    // We want to assert that clicking the history actually changes the active market to AAPL!
    await page.evaluate(() => {
      (window as any).useTradeStore.setState({ currentMarket: { epic: 'TSLA' } });
      
      // Mock the chart visible range to simulate the user's current zoom level
      // Let's say the user is looking at a 1000 second window
      (window as any).__MOCK_CURRENT_ZOOM_WIDTH = 1000;
      
      // We will ask the fix agent to expose the final range applied by the chart
      (window as any).__CHART_NAVIGATED_RANGE = null;
    });

    await tradeCard.click();

    const currentEpic = await page.evaluate(() => {
      const state = (window as any).useTradeStore.getState();
      return state.currentMarket?.epic;
    });
    
    expect(currentEpic).toBe('AAPL');

    // Node-side polling to avoid browser-side freezing
    let navRange = null;
    for (let i = 0; i < 20; i++) { // wait up to 2 seconds
      navRange = await page.evaluate(() => (window as any).__CHART_NAVIGATED_RANGE);
      if (navRange !== null) break;
      await page.waitForTimeout(100);
    }
    
    if (navRange === null) {
      throw new Error('Timed out waiting for __CHART_NAVIGATED_RANGE');
    }
    const finalRange = navRange;
    expect(finalRange).toBeTruthy();
    // The duration between openTime and closeTime of the mocked trade is 100 seconds (now-100k vs now)
    // open = now - 100000, close = now
    // target center = (open + close) / 2 = now - 50000
    // the target center in seconds should be Math.floor((now - 50000) / 1000)
    const expectedCenter = await page.evaluate(() => Math.floor((Date.now() - 50000) / 1000));
    
    // The applied center should perfectly match expectedCenter
    const appliedCenter = (finalRange.from + finalRange.to) / 2;
    expect(appliedCenter).toBeCloseTo(expectedCenter, -1);
    
    // It must explicitly pass the epic string in the navigation payload so the chart 
    // knows to wait for the correct ticker data before scrolling
    expect(finalRange.epic).toBe('AAPL');
    
    // The fix agent MUST preserve the 1000 second width.
    const appliedWidth = finalRange.to - finalRange.from;
    expect(appliedWidth).toBeCloseTo(1000, -1); // Should be exactly 1000
    
    // --- TEST OPEN ORDER NAVIGATION ---
    // The user had an issue where OPEN orders jumped to a random location (1970 math bug)
    await page.evaluate(() => {
      (window as any).__CHART_NAVIGATED_RANGE = null;
    });
    
    const msftCard = page.locator('.order-history section > div').nth(1).locator('> div').filter({ hasText: 'MSFT' }).first();
    await msftCard.click();
    
    navRange = null;
    for (let i = 0; i < 20; i++) {
      navRange = await page.evaluate(() => (window as any).__CHART_NAVIGATED_RANGE);
      if (navRange !== null) break;
      await page.waitForTimeout(100);
    }
    if (navRange === null) {
      throw new Error('Timed out waiting for MSFT __CHART_NAVIGATED_RANGE');
    }
    const msftRange = await page.evaluate(() => (window as any).__CHART_NAVIGATED_RANGE);
    
    expect(msftRange.epic).toBe('MSFT');
    
    // For an open order, targetCenter should just be the openTime itself
    // openTime was now - 200000
    const expectedMsftCenter = await page.evaluate(() => Math.floor((Date.now() - 200000) / 1000));
    const appliedMsftCenter = (msftRange.from + msftRange.to) / 2;
    expect(appliedMsftCenter).toBeCloseTo(expectedMsftCenter, -1);
  });
});
