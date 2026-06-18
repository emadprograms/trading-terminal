import { test, expect } from '@playwright/test';

test.describe('Live API E2E Validation', () => {
  test.setTimeout(60000);

  test.afterEach(async ({ page, request }) => {
    console.log("Running afterEach cleanup to flatten positions...");
    try {
      const apiKey = process.env.CAPITAL_API_KEY;
      
      const localTokens = await page.evaluate(() => {
        const store = (window as any).__sessionStore?.getState();
        return {
          cst: store?.cst || null,
          securityToken: store?.securityToken || null
        };
      });

      if (!localTokens.cst || !localTokens.securityToken) {
        console.warn('Missing authentication tokens for cleanup');
        return;
      }

      const headers = {
        'CST': localTokens.cst,
        'X-SECURITY-TOKEN': localTokens.securityToken,
        'X-CAP-API-KEY': apiKey || '',
      };

      const baseUrl = 'https://demo-api-capital.backend-capital.com/api/v1';

      // 1. Get all positions
      const getPosRes = await request.get(`${baseUrl}/positions`, { headers });
      if (getPosRes.ok()) {
        const data = await getPosRes.json();
        const positions = data.positions || [];
        for (const pos of positions) {
          const dealId = pos.position.dealId;
          console.log(`Closing position ${dealId}...`);
          await request.delete(`${baseUrl}/positions/${dealId}`, { headers });
        }
      }

      // 2. Get all working orders
      const getWoRes = await request.get(`${baseUrl}/workingorders`, { headers });
      if (getWoRes.ok()) {
        const data = await getWoRes.json();
        const orders = data.workingOrders || [];
        for (const order of orders) {
          const dealId = order.workingOrderData.dealId;
          console.log(`Closing working order ${dealId}...`);
          await request.delete(`${baseUrl}/workingorders/${dealId}`, { headers });
        }
      }

      console.log("Cleanup successful.");
    } catch (e) {
      console.error("Cleanup failed:", e);
    }
  });

  test('Places a real micro-order and verifies live WebSocket confirmation', async ({ page }) => {
    const identifier = process.env.CAPITAL_USER;
    const password = process.env.CAPITAL_PASSWORD;
    const apiKey = process.env.CAPITAL_API_KEY;

    if (!identifier || !password || !apiKey) {
      test.skip(true, 'Missing Capital.com live credentials in .env.local');
    }

    // Since Vite (npm run dev) doesn't run the Vercel serverless proxy locally,
    // we use a transparent Playwright proxy to forward `/api` to the real Capital.com demo API.
    await page.route('**/api/**', async (route, req) => {
      const url = new URL(req.url());
      const urlPath = url.pathname;
      
      if (!urlPath.startsWith('/api/') || urlPath.includes('connect')) {
        return route.continue();
      }

      let targetPath = urlPath;
      if (urlPath.startsWith('/api/order')) {
        const subPath = urlPath.replace(/^\/api\/order/, '');
        targetPath = subPath.startsWith('/v1') ? `/api${subPath}` : `/api/v1${subPath}`;
      } else if (urlPath.startsWith('/api/session')) {
        const subPath = urlPath.replace(/^\/api\/session/, '');
        targetPath = subPath.startsWith('/v1') ? `/api${subPath}` : `/api/v1/session${subPath}`;
      } else if (urlPath.startsWith('/api/market')) {
        const subPath = urlPath.replace(/^\/api\/market/, '');
        targetPath = subPath.startsWith('/v1') ? `/api${subPath}` : `/api/v1${subPath}`;
      } else if (urlPath.startsWith('/api/accounts')) {
        const subPath = urlPath.replace(/^\/api\/accounts/, '');
        targetPath = subPath.startsWith('/v1') ? `/api${subPath}` : `/api/v1${subPath}`;
      } else if (urlPath.startsWith('/api/ping')) {
        targetPath = '/api/v1/ping';
      }

      const targetUrl = `https://demo-api-capital.backend-capital.com${targetPath}${url.search}`;
      
      const headers = { ...req.headers(), 'x-cap-api-key': apiKey! };
      delete headers['host'];
      delete headers['origin'];
      delete headers['referer'];
      delete headers['content-length']; // Let fetch recalculate
      headers['x-bypass-mocks'] = 'true';
      
      let postData = req.postDataBuffer();
      
      // Inject credentials for session login
      if (req.method() === 'POST' && url.pathname.includes('/session')) {
        try {
          const parsed = postData ? JSON.parse(postData.toString()) : {};
          parsed.identifier = identifier;
          parsed.password = password;
          postData = Buffer.from(JSON.stringify(parsed));
        } catch(e) {}
      }

      if (req.method() === 'POST' && url.pathname.includes('positions')) {
        console.log(`[Proxy] POST positions Headers:`, headers);
        console.log(`[Proxy] POST positions Payload:`, postData ? postData.toString() : '[NULL]');
      }

      try {
        const response = await page.request.fetch(targetUrl, {
          method: req.method(),
          headers,
          data: postData,
          ignoreHTTPSErrors: true,
        });

        const status = response.status();
        const responseHeaders = response.headers();
        
        let responseBody;
        if (responseHeaders['content-type']?.includes('application/json')) {
          responseBody = await response.json();
          console.log(`[Proxy] ${req.method()} ${url.pathname} -> ${status}`);
          if (status >= 400) {
            console.log(`[Proxy Error]`, JSON.stringify(responseBody));
          }
        } else {
          responseBody = await response.body();
          console.log(`[Proxy] ${req.method()} ${url.pathname} -> ${status} (binary/text)`);
        }
        
        const allowedHeaders: Record<string, string> = {};
        const safeHeaders = ['cst', 'x-security-token', 'content-type'];
        for (const key of Object.keys(responseHeaders)) {
           if (safeHeaders.includes(key.toLowerCase()) || key.toLowerCase().startsWith('access-control-')) {
               allowedHeaders[key] = responseHeaders[key];
           }
        }

        if (responseHeaders['content-type']?.includes('application/json')) {
            await route.fulfill({ status, headers: allowedHeaders, json: responseBody });
        } else {
            await route.fulfill({ status, headers: allowedHeaders, body: responseBody });
        }
      } catch (error: any) {
        console.error(`[Proxy] Fetch failed for ${targetUrl}:`, error.message);
        route.abort();
      }
    });

    page.on('console', msg => console.log(`[Browser] ${msg.text()}`));

    // 1. Navigate. The app will auto-login by hitting our proxy above.
    await page.goto('/');

    console.log("Waiting for auto-login and trade controls...");
    try {
      await expect(page.locator('.trade-controls').first()).toBeVisible({ timeout: 25000 });
    } catch (e) {
      console.log("TIMED OUT! Dumping body HTML...");
      const html = await page.evaluate(() => document.body.innerHTML);
      console.log("BODY HTML:", html.substring(0, 5000)); // First 5k chars
      console.log("BODY END HTML:", html.substring(html.length - 5000)); // Last 5k chars
      throw e;
    }

    // 2. Place a micro-order
    console.log("Clicking BUY...");
    const buyButton = page.locator('.trade-controls button').filter({ hasText: /buy|long/i }).first();
    await buyButton.click();

    // 3. Assert that the confirmation toast appears
    console.log("Waiting for Order Confirmed toast...");
    await expect(page.getByText(/Order Confirmed:/i)).toBeVisible({ timeout: 15000 });
  });
});
