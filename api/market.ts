import { proxyRequest } from './_utils.js';

/**
 * Granular proxy handler for Market Data.
 * Handles /api/market -> /api/v1/market
 */
export default async function handler(req: Request) {
  return proxyRequest(req, '/market');
}
