import { proxyRequest } from './_utils.js';
import type { IncomingMessage, ServerResponse } from 'http';

/**
 * Granular proxy handler for Market Data.
 * Handles /api/market -> /api/v1/market
 */
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  console.log('[StabilityTrace] Market handler started');
  try {
    await proxyRequest(req, res, '/market');
    console.log('[StabilityTrace] Market handler completed');
  } catch (err) {
    console.error('[StabilityTrace] Market handler CRASH:', err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  }
}
