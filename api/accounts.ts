import { proxyRequest } from './_utils.js';
import type { IncomingMessage, ServerResponse } from 'http';

export const config = {
  api: {
    bodyParser: false,
  },
};

/**
 * Granular proxy handler for Account management.
 * Handles /api/accounts/v1/accounts -> Capital.com /api/v1/accounts
 */
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  console.log('[StabilityTrace] Accounts handler started');
  try {
    const urlPath = req.url?.split('?')[0] || '';
    const subPath = urlPath.replace(/^\/api\/accounts/, '');
    
    // Construct the Capital.com API path
    const targetPath = subPath.startsWith('/v1') ? `/api${subPath}` : `/api/v1/accounts${subPath}`;
    
    console.log(`[StabilityTrace] Accounts handler: method=${req.method}, subPath="${subPath}", targetPath="${targetPath}"`);
    
    await proxyRequest(req, res, targetPath);
    console.log('[StabilityTrace] Accounts handler completed');
  } catch (err) {
    console.error('[StabilityTrace] Accounts handler CRASH:', err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.end(JSON.stringify({ error: 'Internal Server Error', message: (err as Error).message }));
    }
  }
}
