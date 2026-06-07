export default async function handler(req: Request) {
  return new Response(JSON.stringify({
    url: req.url,
    method: req.method,
    headers: Object.fromEntries(req.headers.entries()),
    env: {
      BACKEND_URL: process.env.BACKEND_URL ? 'DEFINED' : 'UNDEFINED',
      NODE_ENV: process.env.NODE_ENV,
    },
    runtime: typeof EdgeRuntime !== 'undefined' ? 'edge' : 'node',
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}
