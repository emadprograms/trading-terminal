import { test, expect } from '@playwright/test';
import { setupLiveApiProxy } from './api-proxy';

test.describe.configure({ mode: 'serial' });

test.describe('Market Data Resilience E2E', () => {
  test('Test 2: Client-side Connection Drop & Auto-Reconnect Backfill', async ({ page }) => {
    let reconnectAttempts = 0;
    let hasDropped = false;
    let backfillRequested = false;

    await setupLiveApiProxy(page);

    await page.route('**/api/market/v1/prices/*', async (route, req) => {
      try {
        if (hasDropped) {
          backfillRequested = true;
        }
        
        const url = new URL(req.url());
        const targetUrl = `https://demo-api-capital.backend-capital.com/api/v1/prices/${url.pathname.split('/').pop()}${url.search}`;
        
        const headers = { ...req.headers(), 'x-cap-api-key': process.env.CAPITAL_API_KEY! };
        delete headers['host'];
        
        const response = await page.request.fetch(targetUrl, { headers });
        const json = await response.json();
        
        await route.fulfill({ status: response.status(), headers: response.headers(), json });
      } catch (error) {
        await route.abort('failed').catch(() => {});
      }
    });

    // Intercept WebSocket to simulate client drop
    await page.routeWebSocket('**/connect', ws => {
      const server = ws.connectToServer();
      ws.onMessage(m => server.send(m));
      server.onMessage(m => ws.send(m));

      // We'll close it forcefully to trigger reconnect after 3 seconds
      if (reconnectAttempts === 0) {
        reconnectAttempts++;
        setTimeout(() => {
          hasDropped = true;
          try {
            ws.close();
          } catch (e) {
            // ignore
          }
        }, 3000);
      }
    });

    await page.goto('/');

    await expect(page.locator('.trade-controls').first()).toBeVisible({ timeout: 25000 });

    // Open Watchlist Sidebar
    await page.getByTitle('Watchlist').click();

    // Use BITCOIN as it trades 24/7
    const searchInput = page.getByPlaceholder('Search markets...').first();
    await searchInput.fill('BITCOIN');
    await page.keyboard.press('Enter');
    
    // Ensure BITCOIN is in watchlist and select it
    const item = page.locator('.watchlist-item').filter({ hasText: 'BITCOIN' }).first();
    await expect(item).toBeVisible({ timeout: 10000 });
    await item.click();

    // Wait for the reconnect logic to kick in and then request backfill
    await expect.poll(() => backfillRequested, { timeout: 25000 }).toBeTruthy();

    await page.unrouteAll({ behavior: 'ignoreErrors' });
  });

  test('Test 3: Environment Switching Sync', async ({ page }) => {
    let wsConnectionsToDemo = 0;
    let wsConnectionsToLive = 0;

    await setupLiveApiProxy(page);

    // Track websocket connections
    page.on('websocket', ws => {
      if (ws.url().includes('demo')) wsConnectionsToDemo++;
      if (ws.url().includes('api-streaming-capital')) wsConnectionsToLive++;
    });

    await page.goto('/');

    await expect(page.locator('.trade-controls').first()).toBeVisible({ timeout: 25000 });

    // Click Environment toggle
    const envToggle = page.getByRole('button', { name: /Environment|Demo|Live/i }).first();
    if (await envToggle.isVisible()) {
      await envToggle.click({ force: true });
      await page.waitForTimeout(2000);
      
      // Verify a new connection was made after the switch
      expect(wsConnectionsToDemo + wsConnectionsToLive).toBeGreaterThan(1);
    }
  });
});
