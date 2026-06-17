import { Page, APIRequestContext } from '@playwright/test';

export async function cleanupTestState(page: Page, request: APIRequestContext) {
  let cst: string | null = null;
  let securityToken: string | null = null;

  // 1. Try to get from localStorage (client application state)
  const localTokens = await page.evaluate(() => {
    return {
      cst: localStorage.getItem('CST'),
      securityToken: localStorage.getItem('X-SECURITY-TOKEN')
    };
  });

  if (localTokens.cst && localTokens.securityToken) {
    cst = localTokens.cst;
    securityToken = localTokens.securityToken;
  }

  // 2. Fallback: Sniff an outgoing API request from the browser context
  if (!cst || !securityToken) {
    try {
      const req = await page.waitForRequest(
        (req) => {
          const headers = req.headers();
          return !!headers['cst'] && !!headers['x-security-token'];
        },
        { timeout: 3000 }
      );
      const headers = req.headers();
      cst = headers['cst'];
      securityToken = headers['x-security-token'];
    } catch (e) {
      // Ignored
    }
  }

  if (!cst || !securityToken) {
    throw new Error('Missing authentication tokens for cleanup');
  }

  const headers = {
    'CST': cst,
    'X-SECURITY-TOKEN': securityToken,
  };

  // Flatten active positions
  const positionsRes = await request.delete('/api/order/v1/positions', { headers });
  if (!positionsRes.ok()) {
    const text = await positionsRes.text();
    throw new Error(`Failed to flatten positions: ${positionsRes.status()} - ${text}`);
  }

  // Cancel active limit/stop orders
  const ordersRes = await request.delete('/api/order/v1/workingorders', { headers });
  if (!ordersRes.ok()) {
    const text = await ordersRes.text();
    throw new Error(`Failed to cancel working orders: ${ordersRes.status()} - ${text}`);
  }
}
