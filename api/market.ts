import { proxyRequest } from './_utils.js';
import type { IncomingMessage, ServerResponse } from 'http';

export const config = {
  api: {
    bodyParser: false,
  },
};

/**
 * Granular proxy handler for Market Data.
 * Handles /api/market/v1/... -> Capital.com /api/v1/...
 */
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  console.log('[StabilityTrace] Market handler started');
  try {
    const urlPath = req.url?.split('?')[0] || '';
    const fullUrl = req.url || '';
    const subPath = urlPath.replace(/^\/api\/market/, '');
    
    // Construct the Capital.com API path
    // e.g., /v1/prices/EPIC -> /api/v1/prices/EPIC
    const targetPath = subPath.startsWith('/v1') ? `/api${subPath}` : `/api/v1${subPath}`;

    // Preserve query string
    const queryIndex = fullUrl.indexOf('?');
    const finalPath = queryIndex >= 0 ? `${targetPath}${fullUrl.substring(queryIndex)}` : targetPath;
    
    console.log(`[StabilityTrace] Market handler: method=${req.method}, targetPath="${finalPath}"`);

    await proxyRequest(req, res, finalPath);
    console.log('[StabilityTrace] Market handler completed');
  } catch (err) {
    console.error('[StabilityTrace] Market handler CRASH:', err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.end(JSON.stringify({ error: 'Internal Server Error', message: (err as Error).message }));
    }
  }
}
