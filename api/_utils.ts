import { Agent, request } from 'undici';

/**
 * Shared undici Agent configured to force HTTP/1.1.
 * This resolves ALPN negotiation failures encountered with Cloudflare Tunnels.
 */
export const sharedAgent = new Agent({
  allowH2: false,
});

/**
 * Common proxy logic for granular handlers.
 */
export async function proxyRequest(req: Request, path: string) {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, x-env, CST, X-SECURITY-TOKEN',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  const backendUrl = process.env.BACKEND_URL;
  if (!backendUrl) {
    console.error('[StabilityTrace] FATAL: BACKEND_URL is not defined in environment');
    return new Response(JSON.stringify({ error: 'Configuration Error', message: 'Upstream target missing' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Parse original URL to preserve search params
  const urlObj = new URL(req.url);
  const targetUrl = `${backendUrl.replace(/\/$/, '')}${path}${urlObj.search}`;

  console.log(`[StabilityTrace] Proxying ${req.method} ${path} -> ${targetUrl}`);

  const requestHeaders: Record<string, string> = {};
  req.headers.forEach((value, key) => {
    // T-01.2-01: Strip hop-by-hop headers
    if (!['host', 'connection', 'content-length'].includes(key.toLowerCase())) {
      requestHeaders[key] = value;
    }
  });

  // Inject Cloudflare Access Service Tokens (T-01.2-02)
  if (process.env.CF_ACCESS_CLIENT_ID && process.env.CF_ACCESS_CLIENT_SECRET) {
    requestHeaders['CF-Access-Client-Id'] = process.env.CF_ACCESS_CLIENT_ID;
    requestHeaders['CF-Access-Client-Secret'] = process.env.CF_ACCESS_CLIENT_SECRET;
  }

  try {
    // Determine body handling: Use arrayBuffer() for POST/PUT/PATCH to avoid Vercel 500s (streaming issues)
    let requestBody: any = undefined;
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      requestBody = await req.arrayBuffer();
    }

    const { statusCode, headers, body } = await request(targetUrl, {
      method: req.method as any,
      headers: requestHeaders,
      body: requestBody,
      dispatcher: sharedAgent,
    });

    console.log(`[StabilityTrace] Upstream Response: ${statusCode}`);

    const responseHeaders = new Headers();
    Object.entries(headers).forEach(([key, value]) => {
      if (value && !['content-encoding', 'transfer-encoding', 'content-length'].includes(key.toLowerCase())) {
        if (Array.isArray(value)) {
          value.forEach(v => responseHeaders.append(key, v));
        } else {
          responseHeaders.set(key, value);
        }
      }
    });

    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Access-Control-Expose-Headers', 'CST, X-SECURITY-TOKEN');

    return new Response(body as any, {
      status: statusCode,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error(`[StabilityTrace] [Proxy Error] ${path}:`, error);
    return new Response(JSON.stringify({ error: 'Proxy Error', message: (error as Error).message }), {
      status: 502,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
    });
  }
}
