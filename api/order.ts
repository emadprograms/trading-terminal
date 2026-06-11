import { proxyRequest } from './_utils.js';
import type { IncomingMessage, ServerResponse } from 'http';

/**
 * Granular proxy handler for Order Execution.
 * Handles /api/order/v1/positions/... and /api/order/v1/workingorders/...
 * Routes directly to Capital.com API.
 */
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  console.log('[StabilityTrace] Order handler started');
  try {
    const urlPath = req.url?.split('?')[0] || '';
    const subPath = urlPath.replace(/^\/api\/order/, '');
    
    // Construct the Capital.com API path
    // Input: /v1/positions/{dealId} -> /api/v1/positions/{dealId}
    const targetPath = subPath.startsWith('/v1') ? `/api${subPath}` : `/api/v1${subPath}`;
    
    console.log(`[StabilityTrace] Order handler: method=${req.method}, subPath="${subPath}", targetPath="${targetPath}"`);
    
    await proxyRequest(req, res, targetPath);
    console.log('[StabilityTrace] Order handler completed');
  } catch (err) {
    console.error('[StabilityTrace] Order handler CRASH:', err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.end(JSON.stringify({ error: 'Internal Server Error', message: (err as Error).message }));
    }
  }
}
