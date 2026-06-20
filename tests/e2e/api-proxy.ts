import { Page } from '@playwright/test';

export async function setupLiveApiProxy(page: Page) {
  const identifier = process.env.CAPITAL_USER;
  const password = process.env.CAPITAL_PASSWORD;
  const apiKey = process.env.CAPITAL_API_KEY;

  if (!identifier || !password || !apiKey) {
    throw new Error('Missing Capital.com live credentials in .env.local');
  }

  // Use a transparent Playwright proxy to forward `/api` to the real Capital.com demo API.
  await page.route('**/api/**', async (route, req) => {
    const url = new URL(req.url());
    const urlPath = url.pathname;
    
    // We want to intercept our own proxy endpoints, not WebSocket or others
    if (!urlPath.startsWith('/api/') || urlPath.includes('connect')) {
      return route.fallback();
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
      } else {
        responseBody = await response.body();
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
}
