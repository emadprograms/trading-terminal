import { proxyRequest } from './_utils.js';
import type { IncomingMessage, ServerResponse } from 'http';

/**
 * Granular proxy handler for Authentication & Session.
 * Handles /api/session -> /api/v1/session
 */
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  console.log('[StabilityTrace] Session handler started');
  try {
    await proxyRequest(req, res, '/session');
    console.log('[StabilityTrace] Session handler completed');
  } catch (err) {
    console.error('[StabilityTrace] Session handler CRASH:', err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  }
}
