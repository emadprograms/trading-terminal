import { proxyRequest } from './_utils';

/**
 * Granular proxy handler for Authentication & Session.
 * Handles /api/session -> /api/v1/session
 */
export default async function handler(req: Request) {
  return proxyRequest(req, '/session');
}
