import { proxyRequest } from './_utils.js';

/**
 * Granular proxy handler for Market Data.
 * Handles /api/market -> /api/v1/market
 */
export default async function handler(req: Request) {
  console.log('[StabilityTrace] Market handler started');
  try {
    const res = await proxyRequest(req, '/market');
    console.log('[StabilityTrace] Market handler completed with status:', res.status);
    return res;
  } catch (err) {
    console.error('[StabilityTrace] Market handler CRASH:', err);
    throw err;
  }
}
