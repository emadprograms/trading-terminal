console.log('[StabilityTrace] Loading _utils.ts');
import { Agent, request } from 'undici';
import { Readable } from 'stream';
import type { IncomingMessage, ServerResponse } from 'http';

/**
 * Shared undici Agent configured to force HTTP/1.1.
 */
console.log('[StabilityTrace] Initializing sharedAgent');
export const sharedAgent = new Agent({
  allowH2: false,
});

/**
 * Capital.com API base URLs
 */
const CAPITAL_DEMO_URL = 'https://demo-api-capital.backend-capital.com';
const CAPITAL_LIVE_URL = 'https://api-capital.backend-capital.com';

/**
 * Resolve the Capital.com target URL and API key based on the environment.
 * The environment is determined by the X-Environment header from the frontend.
 */
function getCapitalTarget(req: IncomingMessage): { baseUrl: string; apiKey: string } {
  const envHeader = (req.headers['x-environment'] as string) || 'DEMO';
  const isLive = envHeader.toUpperCase() === 'LIVE';

  const apiKey = isLive
    ? (process.env.CAPITAL_API_KEY_LIVE || process.env.CAPITAL_API_KEY || '')
    : (process.env.CAPITAL_API_KEY_DEMO || process.env.CAPITAL_API_KEY || '');

  return {
    baseUrl: isLive ? CAPITAL_LIVE_URL : CAPITAL_DEMO_URL,
    apiKey,
  };
}

/**
 * Helper to read the request body from an IncomingMessage
 */
export async function readBody(req: IncomingMessage): Promise<Buffer | undefined> {
  // Handle pre-parsed body (e.g. if Vercel body parser wasn't successfully disabled)
  const vReq = req as any;
  if (vReq.body !== undefined) {
    if (Buffer.isBuffer(vReq.body)) return vReq.body;
    if (typeof vReq.body === 'string') return Buffer.from(vReq.body);
    if (typeof vReq.body === 'object') return Buffer.from(JSON.stringify(vReq.body));
    return Buffer.from(String(vReq.body));
  }

  // Handle stream (default when bodyParser is disabled)
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  return chunks.length > 0 ? Buffer.concat(chunks) : undefined;
}

/**
 * Common proxy logic for granular handlers.
 * Routes requests DIRECTLY to Capital.com, injecting the API key server-side.
 * No Cloudflare Tunnel or Hono server in the chain.
 */
export async function proxyRequest(req: IncomingMessage, res: ServerResponse, path: string, preParsedBody?: Buffer) {
  const method = req.method || 'GET';
  console.log(`[StabilityTrace] proxyRequest called for path: ${path}, method: ${method}`);
  
  // CORS Preflight
  if (method === 'OPTIONS') {
    console.log('[StabilityTrace] Handling OPTIONS preflight');
    res.statusCode = 200;
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Environment, CST, X-SECURITY-TOKEN, x-env, x-inject-error');
    res.setHeader('Access-Control-Max-Age', '86400');
    res.end();
    return;
  }

  // Resolve Capital.com target directly (no intermediate proxy)
  const { baseUrl, apiKey } = getCapitalTarget(req);

  // Error Injection for Testing
  const injectError = req.headers['x-inject-error'];
  if (injectError) {
    const statusCode = parseInt(injectError as string, 10) || 500;
    console.log(`[StabilityTrace] Injecting mock error: ${statusCode}`);
    res.statusCode = statusCode;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.end(JSON.stringify({
      errorCode: 'mock_error_injected',
      developerMessage: `Mocked error injected by x-inject-error header: ${statusCode}`
    }));
    return;
  }

  if (!apiKey) {
    console.error('[StabilityTrace] FATAL: CAPITAL_API_KEY is not defined in environment');
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Configuration Error', message: 'API key not configured' }));
    return;
  }

  try {
    const targetUrl = `${baseUrl}${path}`;
    console.log(`[StabilityTrace] Proxying ${method} ${path} -> ${targetUrl}`);
    
    // Build headers for Capital.com
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-CAP-API-KEY': apiKey,
    };
    if (process.env.VITE_CF_ACCESS_CLIENT_ID) {
      requestHeaders['CF-Access-Client-Id'] = process.env.VITE_CF_ACCESS_CLIENT_ID;
    }
    if (process.env.VITE_CF_ACCESS_CLIENT_SECRET) {
      requestHeaders['CF-Access-Client-Secret'] = process.env.VITE_CF_ACCESS_CLIENT_SECRET;
    }

    // Forward auth tokens from the browser
    const cst = req.headers['cst'] as string;
    const securityToken = req.headers['x-security-token'] as string;
    
    if (cst) requestHeaders['CST'] = cst;
    if (securityToken) requestHeaders['X-SECURITY-TOKEN'] = securityToken;

    // INSTRUMENTATION: Log header presence for debugging
    console.log(`[StabilityTrace] Upstream Auth: CST=${cst ? 'PRESENT' : 'MISSING'}, X-SECURITY-TOKEN=${securityToken ? 'PRESENT' : 'MISSING'}, X-CAP-API-KEY=PRESENT`);

    // Determine body handling
    let requestBody: any = undefined;
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      if (preParsedBody) {
        console.log('[StabilityTrace] Using pre-parsed request body');
        requestBody = preParsedBody;
      } else {
        console.log('[StabilityTrace] Reading request body');
        requestBody = await readBody(req);
      }
      console.log(`[StabilityTrace] Body size: ${requestBody?.length || 0} bytes`);
      if (requestBody) {
        console.log(`[StabilityTrace] Body content: ${requestBody.toString().substring(0, 200)}`);
      }
    }

    console.log('[StabilityTrace] Sending request to Capital.com via undici');
    const { statusCode, headers, body } = await request(targetUrl, {
      method: method as any,
      headers: requestHeaders,
      body: requestBody,
      dispatcher: sharedAgent,
    });

    console.log(`[StabilityTrace] Capital.com Response: ${statusCode}`);

    // Set response headers
    Object.entries(headers).forEach(([key, value]) => {
      if (value && !['transfer-encoding', 'content-length'].includes(key.toLowerCase())) {
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
      }));
    }
  }
}
