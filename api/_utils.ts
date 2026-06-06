import { Agent, request } from 'undici';

/**
 * Shared undici Agent configured to force HTTP/1.1.
 * This resolves ALPN negotiation failures encountered with Cloudflare Tunnels.
 */
export const sharedAgent = new Agent({
  allowH2: false,
});

/**
 * Determine the upstream target based on environment selection.
 */
export const getTarget = (env: string | null) => {
  return env === 'LIVE'
    ? 'https://api-capital.backend-capital.com'
    : 'https://demo-api-capital.backend-capital.com';
};

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

  const envHeader = req.headers.get('x-env');
  const env = envHeader || process.env.ENV || 'DEMO';
  const targetBase = getTarget(env);
  
  // Parse original URL to preserve search params
  const urlObj = new URL(req.url);
  const url = `${targetBase}/api/v1${path}${urlObj.search}`;

  const requestHeaders: Record<string, string> = {};
  req.headers.forEach((value, key) => {
    if (!['host', 'connection', 'content-length'].includes(key.toLowerCase())) {
      requestHeaders[key] = value;
    }
  });

  // Inject Cloudflare Access Service Tokens
  if (process.env.CF_ACCESS_CLIENT_ID && process.env.CF_ACCESS_CLIENT_SECRET) {
    requestHeaders['CF-Access-Client-Id'] = process.env.CF_ACCESS_CLIENT_ID;
    requestHeaders['CF-Access-Client-Secret'] = process.env.CF_ACCESS_CLIENT_SECRET;
  }

  try {
    // Determine body handling: Use text for small payloads, streaming for potentially larger ones
    let requestBody: any = undefined;
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      // Vercel Edge/Serverless Request.body is a ReadableStream
      requestBody = req.body;
    }

    const { statusCode, headers, body } = await request(url, {
      method: req.method as any,
      headers: requestHeaders,
      body: requestBody,
      dispatcher: sharedAgent,
    });

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
    console.error(`[Proxy Error] ${path}:`, error);
    return new Response(JSON.stringify({ error: 'Proxy Error', message: (error as Error).message }), {
      status: 502,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
    });
  }
}
