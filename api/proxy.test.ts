import { describe, it, expect, vi, beforeEach } from 'vitest';
import { request } from 'undici';
import sessionHandler from './session';
import { sharedAgent } from './_utils';

vi.mock('undici', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    request: vi.fn(),
  };
});

describe('session handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CF_ACCESS_CLIENT_ID = 'test-id';
    process.env.CF_ACCESS_CLIENT_SECRET = 'test-secret';
    process.env.ENV = 'DEMO';
  });

  it('should handle OPTIONS preflight', async () => {
    const req = new Request('http://localhost/api/session', {
      method: 'OPTIONS',
    });

    const res = await sessionHandler(req);
    expect(res.status).toBe(200);
    expect(res.headers.get('Access-Control-Allow-Methods')).toContain('POST');
  });

  it('should inject Cloudflare Access Service Tokens and use sharedAgent', async () => {
    (request as any).mockResolvedValue({
      statusCode: 200,
      headers: { 'content-type': 'application/json' },
      body: {
        json: () => Promise.resolve({ success: true }),
        // For streaming, we might need more, but this is enough for basic check
      },
    });

    const req = new Request('http://localhost/api/session', {
      method: 'POST',
      body: JSON.stringify({ identifier: 'user', password: 'pass' }),
      headers: {
        'Content-Type': 'application/json',
        'x-env': 'LIVE'
      }
    });

    const res = await sessionHandler(req);
    
    expect(request).toHaveBeenCalledWith(
      expect.stringContaining('https://api-capital.backend-capital.com'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'CF-Access-Client-Id': 'test-id',
          'CF-Access-Client-Secret': 'test-secret',
          'x-env': 'LIVE',
        }),
        dispatcher: sharedAgent,
      })
    );
    expect(res.status).toBe(200);
  });
});

describe('market handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should forward authentication tokens and environment headers', async () => {
    const marketHandler = (await import('./market')).default;
    
    (request as any).mockResolvedValue({
      statusCode: 200,
      headers: { 'content-type': 'application/json' },
      body: {
        json: () => Promise.resolve({ prices: [] }),
      },
    });

    const req = new Request('http://localhost/api/market?epic=ABC', {
      headers: {
        'CST': 'test-cst',
        'X-SECURITY-TOKEN': 'test-token',
        'x-env': 'LIVE'
      }
    });

    await marketHandler(req);

    expect(request).toHaveBeenCalledWith(
      expect.stringContaining('https://api-capital.backend-capital.com/api/v1/market'),
      expect.objectContaining({
        headers: expect.objectContaining({
          'cst': 'test-cst',
          'x-security-token': 'test-token',
          'x-env': 'LIVE'
        })
      })
    );
  });
});

describe('order handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should forward request body for POST requests', async () => {
    const orderHandler = (await import('./order')).default;
    
    (request as any).mockResolvedValue({
      statusCode: 200,
      headers: { 'content-type': 'application/json' },
      body: {
        json: () => Promise.resolve({ success: true }),
      },
    });

    const req = new Request('http://localhost/api/order', {
      method: 'POST',
      body: JSON.stringify({ epic: 'ABC', size: 1 }),
      headers: { 'Content-Type': 'application/json' }
    });

    await orderHandler(req);

    expect(request).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        method: 'POST',
        body: expect.anything() // Could be a stream or string depending on environment
      })
    );
  });
});
