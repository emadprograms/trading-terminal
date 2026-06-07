console.log('[StabilityTrace] Loading _utils.ts');
import { Agent, request } from 'undici';
import { Readable } from 'stream';

/**
 * Shared undici Agent configured to force HTTP/1.1.
 * This resolves ALPN negotiation failures encountered with Cloudflare Tunnels.
 */
console.log('[StabilityTrace] Initializing sharedAgent');
export const sharedAgent = new Agent({
  allowH2: false,
});

/**
 * Common proxy logic for granular handlers.
 */
export async function proxyRequest(req: Request, path: string) {
  console.log(`[StabilityTrace] proxyRequest called for path: ${path}, method: ${req.method}`);
  
  // Guard against missing req or method
  if (!req || !req.method) {
    console.error('[StabilityTrace] Invalid request object received');
    return new Response(JSON.stringify({ error: 'Internal Error', message: 'Invalid request object' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // CORS Preflight
  if (req.method === 'OPTIONS') {
    console.log('[StabilityTrace] Handling OPTIONS preflight');
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

  try {
    // Parse original URL to preserve search params
    console.log(`[StabilityTrace] Original req.url: ${req.url}`);
    let url: string = req.url;
    if (url.startsWith('/')) {
      const host = req.headers.get('host') || 'localhost';
      url = `https://${host}${url}`;
      console.log(`[StabilityTrace] Reconstructed URL: ${url}`);
    }
    
    const urlObj = new URL(url);
    const targetUrl = `${backendUrl.replace(/\/$/, '')}${path}${urlObj.search}`;

    console.log(`[StabilityTrace] Proxying ${req.method} ${path} -> ${targetUrl}`);
    console.log(`[StabilityTrace] CF_ACCESS_CLIENT_ID present: ${!!process.env.CF_ACCESS_CLIENT_ID}`);

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

    // Determine body handling: Use arrayBuffer() for POST/PUT/PATCH to avoid Vercel 500s (streaming issues)
    let requestBody: any = undefined;
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      console.log('[StabilityTrace] Reading request body as arrayBuffer');
      requestBody = await req.arrayBuffer();
      console.log(`[StabilityTrace] Body size: ${requestBody?.byteLength || 0} bytes`);
    }

    console.log('[StabilityTrace] Sending upstream request via undici');
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

    // Convert Node.js Readable to Web ReadableStream for Response compatibility
    const webBody = body ? Readable.toWeb(body as any) : null;

    console.log('[StabilityTrace] Returning response to client');
    return new Response(webBody as any, {
      status: statusCode,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error(`[StabilityTrace] [Proxy Error] ${path}:`, error);
    return new Response(JSON.stringify({ 
      error: 'Proxy Error', 
      message: (error as Error).message,
      stack: (error as Error).stack 
    }), {
      status: 502,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
    });
  }
}
