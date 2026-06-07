import type { IncomingMessage, ServerResponse } from 'http';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({
    url: req.url,
    method: req.method,
    headers: req.headers,
    env: {
      BACKEND_URL: process.env.BACKEND_URL ? 'DEFINED' : 'UNDEFINED',
      NODE_ENV: process.env.NODE_ENV,
    },
    runtime: 'node',
  }));
}
