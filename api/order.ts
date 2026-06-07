import { proxyRequest } from './_utils.js';

/**
 * Granular proxy handler for Order Execution.
 * Handles /api/order -> /api/v1/order
 */
export default async function handler(req: Request) {
  // Use proxyRequest which supports body streaming for POST/PUT
  return proxyRequest(req, '/order');
}
