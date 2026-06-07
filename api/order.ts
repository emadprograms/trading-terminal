import { proxyRequest } from './_utils.js';

/**
 * Granular proxy handler for Order Execution.
 * Handles /api/order -> /api/v1/order
 */
export default async function handler(req: Request) {
  console.log('[StabilityTrace] Order handler started');
  try {
    const res = await proxyRequest(req, '/order');
    console.log('[StabilityTrace] Order handler completed with status:', res.status);
    return res;
  } catch (err) {
    console.error('[StabilityTrace] Order handler CRASH:', err);
    throw err;
  }
}
