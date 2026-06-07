import { proxyRequest } from './_utils.js';
import type { IncomingMessage, ServerResponse } from 'http';

/**
 * Granular proxy handler for Market Data.
 * Handles /api/market -> /api/v1/market
 */
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  console.log('[StabilityTrace] Market handler started');
  try {
    // Extract everything after /api/market (e.g., /v1/prices/EPIC)
    const urlPath = req.url?.split('?')[0] || '';
    const subPath = urlPath.replace(/^\/api\/market/, '');
    
    // The backend expects /api/... (e.g., /api/v1/prices/EPIC)
    const targetPath = `/api${subPath}`;
    
    await proxyRequest(req, res, targetPath);
    console.log('[StabilityTrace] Market handler completed');
  } catch (err) {
    console.error('[StabilityTrace] Market handler CRASH:', err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  }
}
