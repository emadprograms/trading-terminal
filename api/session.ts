import type { IncomingMessage, ServerResponse } from 'http';
import { Agent, request } from 'undici';

export const config = {
  api: {
    bodyParser: false,
  },
};

/**
 * Capital.com API base URLs
 */
const CAPITAL_DEMO_URL = 'https://demo-api-capital.backend-capital.com';
const CAPITAL_LIVE_URL = 'https://api-capital.backend-capital.com';

const sharedAgent = new Agent({ allowH2: false });

/**
 * Granular proxy handler for Authentication & Session.
 * Calls Capital.com directly, injecting API key and optional credentials from env.
 */
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const method = req.method || 'GET';
  console.log('[StabilityTrace] Session handler started');

  // CORS Preflight
  if (method === 'OPTIONS') {
    res.statusCode = 200;
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Environment, CST, X-SECURITY-TOKEN');
    res.setHeader('Access-Control-Max-Age', '86400');
    res.end();
    return;
  }

  try {
    const envHeader = (req.headers['x-environment'] as string) || 'DEMO';
    const isLive = envHeader.toUpperCase() === 'LIVE';

    const baseUrl = isLive ? CAPITAL_LIVE_URL : CAPITAL_DEMO_URL;
    const apiKey = isLive
      ? (process.env.CAPITAL_API_KEY_LIVE || process.env.CAPITAL_API_KEY || '')
      : (process.env.CAPITAL_API_KEY_DEMO || process.env.CAPITAL_API_KEY || '');

    // Determine the sub-path (e.g., /api/session/v1/session -> /v1/session)
    const urlPath = req.url?.split('?')[0] || '';
    const subPath = urlPath.replace(/^\/api\/session/, '');
    const targetPath = subPath.startsWith('/v1') ? `/api${subPath}` : `/api/v1/session${subPath}`;
    const targetUrl = `${baseUrl}${targetPath}`;

    console.log(`[StabilityTrace] Session: ${method} -> ${targetUrl}, env=${envHeader}`);

    let bodyBuffer: Buffer | undefined;
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      if ((req as any).body) {
        // Vercel CLI might have already parsed it
        const b = (req as any).body;
        bodyBuffer = typeof b === 'string' ? Buffer.from(b) : Buffer.from(JSON.stringify(b));
      } else {
        const chunks: Buffer[] = [];
        for await (const chunk of req) {
          chunks.push(chunk as Buffer);
        }
        if (chunks.length > 0) {
          bodyBuffer = Buffer.concat(chunks);
        }
      }
    }

    // For POST /session, inject credentials from env if not provided by frontend
    let finalBody = bodyBuffer;
    if (method === 'POST' && bodyBuffer) {
      try {
        const parsed = JSON.parse(bodyBuffer.toString());
        if (!parsed.identifier || !parsed.password) {
          console.log('[StabilityTrace] Injecting credentials from environment');
          const enriched = {
            ...parsed,
            identifier: parsed.identifier || process.env.CAPITAL_USER || process.env.VITE_CAPITAL_USER,
            password: parsed.password || process.env.CAPITAL_PASSWORD || process.env.VITE_CAPITAL_PASSWORD,
          };
          console.log('[StabilityTrace] Enriched payload identifier:', enriched.identifier);
          finalBody = Buffer.from(JSON.stringify(enriched));
        }
      } catch (e) {
        // Not JSON, pass through as-is
      }
    }
    
    console.log('[StabilityTrace] Final body length:', finalBody ? finalBody.length : 0);

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

    // Forward existing auth tokens (for session refresh/delete)
    const cst = req.headers['cst'] as string;
    const securityToken = req.headers['x-security-token'] as string;
    if (cst) requestHeaders['CST'] = cst;
    if (securityToken) requestHeaders['X-SECURITY-TOKEN'] = securityToken;

    console.log(`[StabilityTrace] Session Auth: API_KEY=${apiKey ? 'PRESENT' : 'MISSING'}, CST=${cst ? 'PRESENT' : 'MISSING'}`);

    const { statusCode, headers, body } = await request(targetUrl, {
      method: method as any,
      headers: requestHeaders,
      body: finalBody,
      dispatcher: sharedAgent,
    });

    console.log(`[StabilityTrace] Capital.com session response: ${statusCode}`);

    // Forward response headers, especially CST and X-SECURITY-TOKEN
    Object.entries(headers).forEach(([key, value]) => {
      if (value && !['transfer-encoding', 'content-length'].includes(key.toLowerCase())) {
        res.setHeader(key, value);
      }
    });

    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Expose-Headers', 'CST, X-SECURITY-TOKEN, Content-Type');
    res.statusCode = statusCode;

    if (body) {
      body.pipe(res);
    } else {
      res.end();
    }

    console.log('[StabilityTrace] Session handler completed');
  } catch (err) {
    console.error('[StabilityTrace] Session handler CRASH:', err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.end(JSON.stringify({ error: 'Session Error', message: (err as Error).message }));
    }
  }
}
