console.log('[StabilityTrace] Loading _utils.ts');
import { Agent, request } from 'undici';
import { Readable } from 'stream';
import type { IncomingMessage, ServerResponse } from 'http';

/**
 * Shared undici Agent configured to force HTTP/1.1.
 * This resolves ALPN negotiation failures encountered with Cloudflare Tunnels.
 */
console.log('[StabilityTrace] Initializing sharedAgent');
export const sharedAgent = new Agent({
  allowH2: false,
});

/**
 * Helper to read the request body from an IncomingMessage
 */
async function readBody(req: IncomingMessage): Promise<Buffer | undefined> {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  return chunks.length > 0 ? Buffer.concat(chunks) : undefined;
}

/**
 * Common proxy logic for granular handlers using Node.js (req, res) signature.
 */
export async function proxyRequest(req: IncomingMessage, res: ServerResponse, path: string) {
  const method = req.method || 'GET';
  console.log(`[StabilityTrace] proxyRequest called for path: ${path}, method: ${method}`);
  
  // CORS Preflight
  if (method === 'OPTIONS') {
    console.log('[StabilityTrace] Handling OPTIONS preflight');
    res.statusCode = 200;
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-env, CST, X-SECURITY-TOKEN');
    res.setHeader('Access-Control-Max-Age', '86400');
    res.end();
    return;
  }

  const backendUrl = process.env.BACKEND_URL;
  if (!backendUrl) {
    console.error('[StabilityTrace] FATAL: BACKEND_URL is not defined in environment');
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Configuration Error', message: 'Upstream target missing' }));
    return;
  }

  try {
    // Reconstruct URL to preserve search params. req.url in Node.js is usually just the path + query.
    const host = (req.headers['host'] as string) || 'localhost';
    const protocol = req.headers['x-forwarded-proto'] === 'http' ? 'http' : 'https';
    const fullUrl = new URL(req.url || '', `${protocol}://${host}`);
    
    const targetUrl = `${backendUrl.replace(/\/$/, '')}${path}${fullUrl.search}`;

    console.log(`[StabilityTrace] Proxying ${method} ${path} -> ${targetUrl}`);
    console.log(`[StabilityTrace] CF_ACCESS_CLIENT_ID present: ${!!process.env.CF_ACCESS_CLIENT_ID}`);

    const requestHeaders: Record<string, string> = {};
    Object.entries(req.headers).forEach(([key, value]) => {
      // T-01.2-01: Strip hop-by-hop headers
      if (!['host', 'connection', 'content-length'].includes(key.toLowerCase()) && value !== undefined) {
        requestHeaders[key] = Array.isArray(value) ? value.join(', ') : value;
      }
    });

    // Inject Cloudflare Access Service Tokens (T-01.2-02)
    if (process.env.CF_ACCESS_CLIENT_ID && process.env.CF_ACCESS_CLIENT_SECRET) {
      requestHeaders['CF-Access-Client-Id'] = process.env.CF_ACCESS_CLIENT_ID;
      requestHeaders['CF-Access-Client-Secret'] = process.env.CF_ACCESS_CLIENT_SECRET;
    }

    // Determine body handling
    let requestBody: any = undefined;
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      console.log('[StabilityTrace] Reading request body');
      requestBody = await readBody(req);
      console.log(`[StabilityTrace] Body size: ${requestBody?.length || 0} bytes`);
    }

    console.log('[StabilityTrace] Sending upstream request via undici');
    const { statusCode, headers, body } = await request(targetUrl, {
      method: method as any,
      headers: requestHeaders,
      body: requestBody,
      dispatcher: sharedAgent,
    });

    console.log(`[StabilityTrace] Upstream Response: ${statusCode}`);

    // Set response headers
    Object.entries(headers).forEach(([key, value]) => {
      if (value && !['content-encoding', 'transfer-encoding', 'content-length'].includes(key.toLowerCase())) {
        res.setHeader(key, value);
      }
    });

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Expose-Headers', 'CST, X-SECURITY-TOKEN');
    res.statusCode = statusCode;

    // Stream body to response
    if (body) {
      body.pipe(res);
    } else {
      res.end();
    }
    
    console.log('[StabilityTrace] Response streamed to client');
  } catch (error) {
    console.error(`[StabilityTrace] [Proxy Error] ${path}:`, error);
    if (!res.headersSent) {
      res.statusCode = 502;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.end(JSON.stringify({ 
        error: 'Proxy Error', 
        message: (error as Error).message,
        stack: (error as Error).stack 
      }));
    }
  }
}
