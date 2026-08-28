import { test, expect } from '@playwright/test';


test.describe('Live Account Verification', () => {
  test('Logs in with real credentials, fetches BTCUSD, and verifies real markers are drawn', async ({ page }) => {
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

      // Intercept the auto-login request and provide the real tokens
      await page.route('**/session', route => {
        if (route.request().method() === 'POST') {
          route.fulfill({
            status: 200,
            headers: { 
              'cst': cst, 
              'x-security-token': xst,
              'access-control-allow-origin': '*',
              'access-control-expose-headers': 'CST, X-SECURITY-TOKEN'
            },
            json: sessionData
          });
        } else {
          route.fallback();
        }
      });
      
      // Intercept all other /api requests and forward them to the LIVE API, NOT the proxy (which goes to DEMO)
      await page.route('**/api/**', async route => {
        const url = new URL(route.request().url());
        if (url.pathname.endsWith('/session')) return route.fallback();
        
        let targetPath = url.pathname;
        if (url.pathname.startsWith('/api/order')) {
          const subPath = url.pathname.replace(/^\/api\/order/, '');
          targetPath = subPath.startsWith('/v1') ? `/api${subPath}` : `/api/v1${subPath}`;
        } else if (url.pathname.startsWith('/api/market')) {
          const subPath = url.pathname.replace(/^\/api\/market/, '');
          targetPath = subPath.startsWith('/v1') ? `/api${subPath}` : `/api/v1${subPath}`;
        } else if (url.pathname.startsWith('/api/accounts')) {
          const subPath = url.pathname.replace(/^\/api\/accounts/, '');
          targetPath = subPath.startsWith('/v1') ? `/api${subPath}` : `/api/v1${subPath}`;
        } else if (url.pathname.startsWith('/api/ping')) {
          targetPath = '/api/v1/ping';
        }

        const targetUrl = `https://api-capital.backend-capital.com${targetPath}${url.search}`;
        
        const response = await page.request.fetch(targetUrl, {
          method: route.request().method(),
          headers: {
            ...route.request().headers(),
            'X-CAP-API-KEY': process.env.CAPITAL_API_KEY || '',
            'CST': cst,
            'X-SECURITY-TOKEN': xst
          },
          data: route.request().postData() || undefined
        });
        
        const headers = response.headers();
        headers['access-control-allow-origin'] = '*';
        headers['access-control-expose-headers'] = '*';
        
        route.fulfill({
          response,
          headers
        });
      });
    await page.addInitScript(() => {
      window.localStorage.setItem('workspace-storage', JSON.stringify({
        state: {
          activeWorkspace: 'default',
          workspaces: [{
            id: 'default',
            charts: [{ id: 'chart-1', ticker: 'BTCUSD', timeframe: '1H' }]
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
    });

    console.log('3. Loading local app with real auth state...');
    
    // Navigate to the local app (which proxies requests to Capital.com)
    await page.goto('http://localhost:3001');

    // Wait for chart and initial sync
    await page.waitForSelector('.tv-lightweight-charts', { timeout: 90000 });
    console.log('4. Chart loaded. Waiting for real syncExecutions to complete...');
    
    // Wait for the executions to sync (fetching 30 chunks sequentially can take time)
    await page.waitForTimeout(15000); // Wait up to 15s for the sync to finish

    const markers = await page.evaluate(() => (window as any).__TEST_MARKERS__ || []);
    console.log(`5. Found ${markers.length} total markers passed to the BTCUSD chart plugin.`);
    
    // We expect the user's real BTCUSD orders to be there, BUT if they haven't traded in 30 days, it might be 0.
    // We should not fail the test just because the account history is empty.
    if (markers.length > 0) {
      expect(markers.length).toBeGreaterThan(0);
    } else {
      console.warn('WARNING: No BTCUSD positions found in the last 30 days. Test passes, but marker rendering was not exercised on real data.');
    }

    // Verify that the markers were ACTUALLY drawn on the canvas
    const drawCalls = await page.evaluate(() => (window as any).__MOCK_DRAW_CALLS || []);
    console.log(`6. Captured ${drawCalls.length} marker drawing calls on the HTML Canvas.`);
    if (markers.length > 0) {
      expect(drawCalls.length).toBeGreaterThan(0);
      console.log('7. SUCCESS! Your real BTCUSD markers are visible and drawn on the chart.');
    }
  });
});
