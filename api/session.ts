import { proxyRequest } from './_utils';

/**
 * Granular proxy handler for Authentication & Session.
 * Handles /api/session -> /api/v1/session
 */
export default async function handler(req: Request) {
  // If the request doesn't have a body (auto-login attempt), 
  // we inject the secrets from the server-side environment.
  if (req.method === 'POST') {
    const body = await req.json().catch(() => ({}));
    if (!body.identifier || !body.password) {
      console.log('[StabilityTrace] Injecting server-side credentials for session handshake');
      const secureBody = {
        ...body,
        identifier: process.env.CAPITAL_USER,
        password: process.env.CAPITAL_PASSWORD
      };
      
      // Create a new request with the injected body
      const secureReq = new Request(req.url, {
        method: req.method,
        headers: req.headers,
        body: JSON.stringify(secureBody)
      });
      return proxyRequest(secureReq, '/session');
    }
  }

  return proxyRequest(req, '/session');
}
