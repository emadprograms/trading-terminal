import { proxyRequest } from './_utils.js';
import type { IncomingMessage, ServerResponse } from 'http';

/**
 * Granular proxy handler for Account management.
 * Handles /api/accounts -> /api/v1/accounts
 */
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  console.log('[StabilityTrace] Accounts handler started');
  try {
    const urlPath = req.url?.split('?')[0] || '';
    const subPath = urlPath.replace(/^\/api\/accounts/, '');
    
    // Determine target path. 
    // If we have a versioned subpath (e.g. /v1/...), we prepend /api so it becomes /api/v1/...
    // Otherwise we just use /accounts and let the backend add /api/v1/...
    const targetPath = subPath.startsWith('/v1') ? `/api${subPath}` : `/accounts${subPath}`;
    
    console.log(`[StabilityTrace] Accounts handler: subPath="${subPath}", targetPath="${targetPath}"`);
    
    await proxyRequest(req, res, targetPath);
    console.log('[StabilityTrace] Accounts handler completed');
  } catch (err) {
    console.error('[StabilityTrace] Accounts handler CRASH:', err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  }
}
