import type { IncomingMessage, ServerResponse } from 'http';

/**
 * Debug endpoint for verifying Vercel environment configuration.
 * Returns environment variable presence (not values) and request metadata.
 */
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.end(JSON.stringify({
    url: req.url,
    method: req.method,
    headers: {
      'cst': req.headers['cst'] ? 'PRESENT' : 'MISSING',
      'x-security-token': req.headers['x-security-token'] ? 'PRESENT' : 'MISSING',
      'x-environment': req.headers['x-environment'] || 'NOT_SET',
    },
    env: {
      CAPITAL_API_KEY: process.env.CAPITAL_API_KEY ? 'PRESENT' : 'MISSING',
      CAPITAL_API_KEY_DEMO: process.env.CAPITAL_API_KEY_DEMO ? 'PRESENT' : 'MISSING',
      CAPITAL_API_KEY_LIVE: process.env.CAPITAL_API_KEY_LIVE ? 'PRESENT' : 'MISSING',
      CAPITAL_USER: process.env.CAPITAL_USER ? 'PRESENT' : 'MISSING',
      NODE_ENV: process.env.NODE_ENV,
    },
    architecture: 'direct-to-capital',
    runtime: 'node',
  }));
}
