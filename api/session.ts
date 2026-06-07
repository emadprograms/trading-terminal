import { proxyRequest } from './_utils.js';

/**
 * Granular proxy handler for Authentication & Session.
 * Handles /api/session -> /api/v1/session
 */
export default async function handler(req: Request) {
  console.log('[StabilityTrace] Session handler started');
  try {
    const res = await proxyRequest(req, '/session');
    console.log('[StabilityTrace] Session handler completed with status:', res.status);
    return res;
  } catch (err) {
    console.error('[StabilityTrace] Session handler CRASH:', err);
    throw err;
  }
}
