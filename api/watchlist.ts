import { proxyRequest } from './_utils.js';
import type { IncomingMessage, ServerResponse } from 'http';

export const config = {
  api: {
    bodyParser: false,
  },
};

/**
 * Proxy handler for Watchlist Data.
 * Handles /api/watchlist/... -> Capital.com /api/v1/watchlists/...
 */
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  console.log('[StabilityTrace] Watchlist handler started');
  try {
    const urlPath = req.url?.split('?')[0] || '';
    const fullUrl = req.url || '';
    const subPath = urlPath.replace(/^\/api\/watchlist/, '');
    
    // Construct the Capital.com API path
    // e.g., / -> /api/v1/watchlists
    const targetPath = `/api/v1/watchlists${subPath}`;

    // Preserve query string
    const queryIndex = fullUrl.indexOf('?');
    const finalPath = queryIndex >= 0 ? `${targetPath}${fullUrl.substring(queryIndex)}` : targetPath;
    
    console.log(`[StabilityTrace] Watchlist handler: method=${req.method}, targetPath="${finalPath}"`);

    await proxyRequest(req, res, finalPath);
    console.log('[StabilityTrace] Watchlist handler completed');
  } catch (err) {
    console.error('[StabilityTrace] Watchlist handler CRASH:', err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.end(JSON.stringify({ error: 'Internal Server Error', message: (err as Error).message }));
    }
  }
}
