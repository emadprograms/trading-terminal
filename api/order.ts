import { proxyRequest } from './_utils.js';
import type { IncomingMessage, ServerResponse } from 'http';

/**
 * Granular proxy handler for Order Execution.
 * Handles /api/order -> /api/v1/...
 */
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  console.log('[StabilityTrace] Order handler started');
  try {
    const urlPath = req.url?.split('?')[0] || '';
    const subPath = urlPath.replace(/^\/api\/order/, '');
    
    // Determine target path. 
    // If we have a versioned subpath (e.g. /v1/...), we prepend /api so it becomes /api/v1/...
    // Otherwise we just use /order and let the backend add /api/v1/...
    const targetPath = subPath.startsWith('/v1') ? `/api${subPath}` : `/order${subPath}`;
    
    console.log(`[StabilityTrace] Order handler: subPath="${subPath}", targetPath="${targetPath}"`);
    
    await proxyRequest(req, res, targetPath);
    console.log('[StabilityTrace] Order handler completed');
  } catch (err) {
    console.error('[StabilityTrace] Order handler CRASH:', err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  }
}
