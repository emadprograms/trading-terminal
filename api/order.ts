import { proxyRequest, readBody } from './_utils.js';
import type { IncomingMessage, ServerResponse } from 'http';
import { z } from 'zod';

export const config = {
  api: {
    bodyParser: false,
  },
};

const marketOrderSchema = z.object({
  epic: z.string().min(1, 'epic is required'),
  direction: z.enum(['BUY', 'SELL']),
  size: z.number().positive('size must be positive'),
  guaranteedStop: z.boolean().optional(),
  stopLevel: z.number().optional(),
  stopDistance: z.number().optional(),
  profitLevel: z.number().optional()
});

const limitOrderSchema = z.object({
  epic: z.string().min(1, 'epic is required'),
  direction: z.enum(['BUY', 'SELL']),
  size: z.number().positive('size must be positive'),
  level: z.number().positive('level must be positive'),
  type: z.enum(['LIMIT', 'STOP']),
  guaranteedStop: z.boolean().optional(),
  stopLevel: z.number().optional(),
  stopDistance: z.number().optional(),
  profitLevel: z.number().optional()
});

const updatePositionSchema = z.object({
  guaranteedStop: z.boolean().optional(),
  stopLevel: z.number().optional(),
  stopDistance: z.number().optional(),
  profitLevel: z.number().optional()
});

/**
 * Granular proxy handler for Order Execution.
 * Handles /api/order/v1/positions/... and /api/order/v1/workingorders/...
 * Routes directly to Capital.com API.
 */
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  console.log('[StabilityTrace] Order handler started');
  try {
    const urlPath = req.url?.split('?')[0] || '';
    const fullUrl = req.url || '';
    const subPath = urlPath.replace(/^\/api\/order/, '');

    // Construct the Capital.com API path
    // Input: /v1/positions/{dealId} -> /api/v1/positions/{dealId}
    const targetPath = subPath.startsWith('/v1') ? `/api${subPath}` : `/api/v1${subPath}`;

    // Preserve query string
    const queryIndex = fullUrl.indexOf('?');
    const finalPath = queryIndex >= 0 ? `${targetPath}${fullUrl.substring(queryIndex)}` : targetPath;

    console.log(`[StabilityTrace] Order handler: method=${req.method}, subPath="${subPath}", finalPath="${finalPath}"`);

    let preParsedBody: Buffer | undefined = undefined;

    if (req.method === 'POST' || req.method === 'PUT') {
      preParsedBody = await readBody(req);
      if (preParsedBody && preParsedBody.length > 0) {
        try {
          const bodyStr = preParsedBody.toString('utf-8');
          const jsonBody = JSON.parse(bodyStr);

          if (req.method === 'POST' && subPath.includes('/workingorders')) {
            limitOrderSchema.parse(jsonBody);
          } else if (req.method === 'POST' && subPath.includes('/positions')) {
            marketOrderSchema.parse(jsonBody);
          } else if (req.method === 'PUT' && subPath.includes('/positions')) {
            updatePositionSchema.parse(jsonBody);
          }
        } catch (err: any) {
          console.error('[StabilityTrace] Validation error:', err);
          if (err instanceof z.ZodError) {
            if (!res.headersSent) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.end(JSON.stringify({
                errorCode: 'PROXY_VALIDATION_ERROR',
                developerMessage: err.errors.map(e => e.message).join(', ')
              }));
            }
            return;
          }
          // If JSON parse fails, it's also a validation error
          if (!res.headersSent) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.end(JSON.stringify({
              errorCode: 'PROXY_VALIDATION_ERROR',
              developerMessage: 'Invalid JSON payload'
            }));
          }
          return;
        }
      }
    }

    await proxyRequest(req, res, finalPath, preParsedBody);
    console.log('[StabilityTrace] Order handler completed');
  } catch (err) {
    console.error('[StabilityTrace] Order handler CRASH:', err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.end(JSON.stringify({ error: 'Internal Server Error', message: (err as Error).message }));
    }
  }
}
