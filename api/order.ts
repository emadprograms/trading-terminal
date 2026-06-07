import { proxyRequest } from './_utils.js';
import type { IncomingMessage, ServerResponse } from 'http';

/**
 * Granular proxy handler for Order Execution.
 * Handles /api/order -> /api/v1/order
 */
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  console.log('[StabilityTrace] Order handler started');
  try {
    await proxyRequest(req, res, '/order');
    console.log('[StabilityTrace] Order handler completed');
  } catch (err) {
    console.error('[StabilityTrace] Order handler CRASH:', err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  }
}
