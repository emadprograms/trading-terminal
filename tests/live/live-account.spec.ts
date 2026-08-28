import { test, expect } from '@playwright/test';


test.describe('Live Account Verification', () => {
  test('Logs in with real credentials, fetches TSLA, and verifies real markers are drawn', async ({ page }) => {
    test.setTimeout(120000); // 2 minutes

    console.log('1. Authenticating with real Capital.com account...');
    
    // Log into Capital.com to get real tokens
    const loginResponse = await page.request.post('https://api-capital.backend-capital.com/api/v1/session', {
      headers: {
        'X-CAP-API-KEY': process.env.CAPITAL_API_KEY || '',
        'Content-Type': 'application/json'
      },
      data: {
        identifier: process.env.VITE_CAPITAL_USER,
        password: process.env.VITE_CAPITAL_PASSWORD
      }
    });

    expect(loginResponse.ok()).toBeTruthy();
    const cst = loginResponse.headers()['cst'];
    const xst = loginResponse.headers()['x-security-token'];
    const sessionData = await loginResponse.json();

    console.log('2. Successfully authenticated. Tokens acquired.');

    // Launch app and inject real auth state
    await page.addInitScript(({ cst, xst, accountId }) => {
      window.localStorage.setItem('auth-storage', JSON.stringify({
        state: {
          isAuthenticated: true,
          selectedAccountId: accountId,
          cst: cst,
          securityToken: xst,
          environment: 'DEMO'
        },
        version: 0
      }));
      window.localStorage.setItem('workspace-storage', JSON.stringify({
        state: {
          activeWorkspace: 'default',
          workspaces: [{
            id: 'default',
            charts: [{ id: 'chart-1', ticker: 'TSLA', timeframe: '1H' }]
          }]
        },
        version: 0
      }));
      
      // Spy on canvas to verify markers
      window.__MOCK_DRAW_CALLS = [];
      const originalFillStyle = Object.getOwnPropertyDescriptor(CanvasRenderingContext2D.prototype, 'fillStyle');
      if (originalFillStyle) {
        Object.defineProperty(CanvasRenderingContext2D.prototype, 'fillStyle', {
          set(value) {
            if (value === '#007aff' || value === '#ff3b30' || value === 'rgb(0, 122, 255)' || value === 'rgb(255, 59, 48)') {
              window.__MOCK_DRAW_CALLS.push(value);
            }
            originalFillStyle.set.call(this, value);
          },
          get() {
            return originalFillStyle.get.call(this);
          }
        });
      }
    }, { cst, xst, accountId: sessionData.accountId });

    console.log('3. Loading local app with real auth state...');
    
    // Navigate to the local app (which proxies requests to Capital.com)
    await page.goto('http://localhost:3001');

    // Wait for chart and initial sync
    await page.waitForSelector('.tv-lightweight-charts', { timeout: 30000 });
    console.log('4. Chart loaded. Waiting for real syncExecutions to complete...');
    
    // Wait for the executions to sync (give it 10 seconds to fetch and render)
    await page.waitForTimeout(10000);

    // Verify executions in the app state
    const markers = await page.evaluate(() => (window as any).__TEST_MARKERS__ || []);
    console.log(`5. Found ${markers.length} total markers passed to the TSLA chart plugin.`);
    
    // We expect the user's real TSLA orders from yesterday to be there!
    expect(markers.length).toBeGreaterThan(0);

    // Verify that the markers were ACTUALLY drawn on the canvas
    const drawCalls = await page.evaluate(() => (window as any).__MOCK_DRAW_CALLS || []);
    console.log(`6. Captured ${drawCalls.length} marker drawing calls on the HTML Canvas.`);
    expect(drawCalls.length).toBeGreaterThan(0);
    
    console.log('7. SUCCESS! Your real TSLA markers are visible and drawn on the chart.');
  });
});
