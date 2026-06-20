import { test, expect } from '@playwright/test';
import { setupLiveApiProxy } from './api-proxy';

test.describe.configure({ mode: 'serial' });

test.describe('Market Data Stitching & Lifecycle E2E', () => {
  test('Test 4: Subscription Leak Prevention', async ({ page }) => {
    const messagesSent: string[] = [];
    
    await setupLiveApiProxy(page);

    const nonWatchlistSymbol1 = 'ROKU';
    const nonWatchlistSymbol2 = 'SNOW';

    page.on('websocket', ws => {
      ws.on('framesent', payload => {
        const str = payload.payload.toString();
        messagesSent.push(str);
        console.log('[Test WS Sent]', str);
      });
    });

    await page.goto('/');
    
    await expect(page.locator('.trade-controls').first()).toBeVisible({ timeout: 25000 });

    await page.getByTitle('Watchlist').click();

    const searchInput = page.getByPlaceholder('Search markets...').first();
    
    await searchInput.fill(nonWatchlistSymbol1);
    await page.keyboard.press('Enter');
    const item1 = page.locator('.watchlist-item').filter({ hasText: nonWatchlistSymbol1 }).first();
    await expect(item1).toBeVisible({ timeout: 10000 });
    await item1.click();
    
    await expect.poll(() => 
      messagesSent.some(m => m.includes('subscribe') && m.includes(nonWatchlistSymbol1)),
      { timeout: 15000 }
    ).toBeTruthy();

    await searchInput.fill(nonWatchlistSymbol2);
    await page.keyboard.press('Enter');
    const item2 = page.locator('.watchlist-item').filter({ hasText: nonWatchlistSymbol2 }).first();
    await expect(item2).toBeVisible({ timeout: 10000 });
    await item2.click();
    
    // Debug logging
    console.log('--- Before final assertion ---');
    console.log('Messages total:', messagesSent.length);
    console.log('Contains unsubscribe ROKU:', messagesSent.some(m => m.includes('unsubscribe') && m.includes(nonWatchlistSymbol1)));
    
    await expect.poll(() => 
      messagesSent.some(m => m.includes('unsubscribe') && m.includes(nonWatchlistSymbol1)),
      { timeout: 15000 }
    ).toBeTruthy();

    await expect.poll(() => 
      messagesSent.some(m => m.includes('subscribe') && m.includes(nonWatchlistSymbol2)),
      { timeout: 15000 }
    ).toBeTruthy();
    
    await page.unrouteAll({ behavior: 'ignoreErrors' });
  });
});
