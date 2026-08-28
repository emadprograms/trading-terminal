import { test, expect } from '@playwright/test';
import { setupLiveApiProxy } from './api-proxy';

test.describe.configure({ mode: 'serial' });

test.describe('Market Data Stitching & Lifecycle E2E', () => {
  test('Test 1: Seamless Data Stitching & Recovery via Delay', async ({ page }) => {
    let initialRequestDone = false;
    let backfillRequested = false;

    await setupLiveApiProxy(page);

    // Inject WebSocket ticks to guarantee buffer.length > 0, which is required
    // for syncCoordinator to throw DataStitchingError.
    await page.routeWebSocket('**/connect', ws => {
      const server = ws.connectToServer();
      ws.onMessage(m => server.send(m));
      server.onMessage(m => ws.send(m));
      
      setInterval(() => {
        try {
          ws.send(JSON.stringify({
            destination: 'quote',
            payload: {
              epic: 'BITCOIN',
              bid: 60000,
              ofr: 60010,
              timestamp: Date.now()
            }
          }));
        } catch (e) {
          // ignore
        }
      }, 500);
    });

    // Intercept to force a gap and trigger backfill, then force DataStitchingError
    await page.route('**/api/market/v1/prices/*', async (route, req) => {
      try {
        const url = new URL(req.url());
        const targetUrl = `https://demo-api-capital.backend-capital.com/api/v1/prices/${url.pathname.split('/').pop()}${url.search}`;
        
        const headers = { ...req.headers(), 'x-cap-api-key': process.env.CAPITAL_API_KEY! };
        delete headers['host'];
        
        if (!initialRequestDone) {
          initialRequestDone = true;
          
          await new Promise(r => setTimeout(r, 1500));
          
          const response = await page.request.fetch(targetUrl, { headers });
          const json = await response.json();
          
          if (json.prices && json.prices.length > 5) {
             json.prices = json.prices.slice(0, json.prices.length - 100);
          }
          
          await route.fulfill({ status: response.status(), headers: response.headers(), json });
        } else {
          backfillRequested = true;
          
          const response = await page.request.fetch(targetUrl, { headers });
          const json = await response.json();
          
          // Return absolutely nothing for the backfill, ensuring the gap persists
          json.prices = [];
          
          await route.fulfill({ status: response.status(), headers: response.headers(), json });
        }
      } catch (error) {
        // Ignore fetch errors that happen when the test ends and the browser closes
        await route.abort('failed').catch(() => {});
      }
    });

    page.on('console', msg => {
      if (msg.text().includes('DataStitchingError')) {
        console.log('Saw DataStitchingError in console logs!');
      }
    });

    await page.goto('/');

    await expect(page.locator('.trade-controls').first()).toBeVisible({ timeout: 25000 });

    // Open Watchlist Sidebar
    await page.getByTitle('Watchlist').click();

    const searchInput = page.getByPlaceholder('Search markets...').first();
    await searchInput.fill('BITCOIN');
    await page.keyboard.press('Enter');
    
    const btcItem = page.locator('.watchlist-item').filter({ hasText: 'BITCOIN' }).first();
    await expect(btcItem).toBeVisible({ timeout: 10000 });
    await btcItem.click();

    await expect.poll(() => backfillRequested, { timeout: 25000 }).toBeTruthy();
    
    // The banner should appear if we threw the error
    await expect(page.locator('.stitching-error-banner').first()).toBeVisible({ timeout: 25000 });

    await page.unrouteAll({ behavior: 'ignoreErrors' });
  });

  test('Test 4: Subscription Leak Prevention', async ({ page }) => {
    const messagesSent: string[] = [];
    
    await setupLiveApiProxy(page);

    const nonWatchlistSymbol1 = 'IBM';
    const nonWatchlistSymbol2 = 'CSCO';

    page.on('websocket', ws => {
      ws.on('framesent', payload => {
        const str = payload.payload.toString();
        messagesSent.push(str);
      });
    });

    await page.goto('/');
    
    await expect(page.locator('.trade-controls').first()).toBeVisible({ timeout: 25000 });

    // Click the chart to focus it and select it
    await page.locator('.chart-card').first().click();
    await expect(page.locator('.chart-card').first()).toHaveClass(/is-selected/);
    
    // Give React a tiny bit more time to attach the keyboard event listener
    await page.waitForTimeout(500);

    // Type first letter to trigger Keyboard Action Modal
    await page.keyboard.press('I');
    const input = page.locator('.chart-card').first().locator('input[type="text"]');
    await expect(input).toBeVisible({ timeout: 10000 });
    await input.fill(nonWatchlistSymbol1);
    await page.keyboard.press('Enter');
    
    await expect.poll(() => 
      messagesSent.some(m => m.includes('subscribe') && m.includes(nonWatchlistSymbol1)),
      { timeout: 15000 }
    ).toBeTruthy();

    await page.waitForTimeout(500);
    await page.keyboard.press('C');
    await expect(input).toBeVisible({ timeout: 10000 });
    await input.fill(nonWatchlistSymbol2);
    await page.keyboard.press('Enter');
    
    await expect.poll(() => {
      console.log('Test 4 messagesSent:', messagesSent);
      return messagesSent.some(m => m.includes('unsubscribe') && m.includes(nonWatchlistSymbol1));
    }, { timeout: 15000 }).toBeTruthy();

    await expect.poll(() => 
      messagesSent.some(m => m.includes('subscribe') && m.includes(nonWatchlistSymbol2)),
      { timeout: 15000 }
    ).toBeTruthy();
    
    await page.unrouteAll({ behavior: 'ignoreErrors' });
  });
});
