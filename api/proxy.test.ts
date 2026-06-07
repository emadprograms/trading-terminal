import { describe, it, expect, vi, beforeEach } from 'vitest';
import { request } from 'undici';
import sessionHandler from './session';
import { sharedAgent } from './_utils';
import { Readable, PassThrough } from 'stream';

vi.mock('undici', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    request: vi.fn(),
  };
});

// Helper to create mock req/res
function createMocks(options: any = {}) {
  const req = new Readable({
    read() {}
  }) as any;
  req.method = options.method || 'GET';
  req.url = options.url || '/api/session';
  req.headers = options.headers || {};
  
  if (options.body) {
    req.push(Buffer.from(options.body));
  }
  req.push(null);

  const res = new PassThrough() as any;
  res.statusCode = 200;
  res.headers = {};
  res.setHeader = vi.fn((name, value) => { res.headers[name.toLowerCase()] = value; });
  res.getHeader = vi.fn((name) => res.headers[name.toLowerCase()]);
  const originalEnd = res.end.bind(res);
  res.end = vi.fn((data) => {
    if (data) res.write(data);
    originalEnd();
  });

  return { req, res };
}

describe('session handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.BACKEND_URL = 'https://tunnel.test';
    process.env.CF_ACCESS_CLIENT_ID = 'test-id';
    process.env.CF_ACCESS_CLIENT_SECRET = 'test-secret';
  });

  it('should handle OPTIONS preflight', async () => {
    const { req, res } = createMocks({ method: 'OPTIONS' });

    await sessionHandler(req, res);
    expect(res.statusCode).toBe(200);
    expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Methods', expect.stringContaining('POST'));
  });

  it('should inject Cloudflare Access Service Tokens and use sharedAgent', async () => {
    (request as any).mockResolvedValue({
      statusCode: 200,
      headers: { 'content-type': 'application/json' },
      body: {
        pipe: vi.fn((dest) => {
          dest.end(JSON.stringify({ success: true }));
        })
      },
    });

    const { req, res } = createMocks({
      method: 'POST',
      body: JSON.stringify({ identifier: 'user', password: 'pass' }),
      headers: {
        'content-type': 'application/json',
        'x-env': 'LIVE',
        'host': 'localhost'
      }
    });

    await sessionHandler(req, res);
    
    expect(request).toHaveBeenCalledWith(
      expect.stringContaining('https://tunnel.test'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'CF-Access-Client-Id': 'test-id',
          'CF-Access-Client-Secret': 'test-secret',
        }),
        dispatcher: sharedAgent,
      })
    );
    expect(res.statusCode).toBe(200);
  });

  it('should propagate upstream errors (4xx/5xx)', async () => {
    (request as any).mockResolvedValue({
      statusCode: 401,
      headers: { 'content-type': 'application/json' },
      body: {
        pipe: vi.fn((dest) => {
          dest.end(JSON.stringify({ error: 'unauthorized' }));
        })
      },
    });

    const { req, res } = createMocks({
      method: 'POST',
      body: JSON.stringify({ identifier: 'user', password: 'pass' }),
      headers: { 'content-type': 'application/json' }
    });

    await sessionHandler(req, res);
    expect(res.statusCode).toBe(401);
  });

  it('should use BACKEND_URL and log [StabilityTrace]', async () => {
    const consoleSpy = vi.spyOn(console, 'log');
    
    (request as any).mockResolvedValue({
      statusCode: 200,
      headers: { 'content-type': 'application/json' },
      body: { pipe: vi.fn() },
    });

    const { req, res } = createMocks({
      method: 'POST',
      body: JSON.stringify({ identifier: 'user', password: 'pass' }),
    });

    await sessionHandler(req, res);

    expect(request).toHaveBeenCalledWith(
      expect.stringContaining('https://tunnel.test'),
      expect.anything()
    );
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[StabilityTrace]'));
  });

  it('should strip host, connection, and content-length headers before proxying', async () => {
    (request as any).mockResolvedValue({
      statusCode: 200,
      headers: { 'content-type': 'application/json' },
      body: { pipe: vi.fn() },
    });

    const { req, res } = createMocks({
      method: 'POST',
      headers: {
        'host': 'localhost',
        'connection': 'keep-alive',
        'content-length': '123',
        'x-custom-header': 'keep-me'
      }
    });

    await sessionHandler(req, res);

    const callArgs = (request as any).mock.calls[0][1];
    const headers = callArgs.headers;
    
    expect(headers['host']).toBeUndefined();
    expect(headers['connection']).toBeUndefined();
    expect(headers['content-length']).toBeUndefined();
    expect(headers['x-custom-header']).toBe('keep-me');
  });

  it('should read POST body as Buffer', async () => {
    (request as any).mockResolvedValue({
      statusCode: 200,
      headers: { 'content-type': 'application/json' },
      body: { pipe: vi.fn() },
    });

    const testPayload = { identifier: 'user', password: 'pass' };
    const { req, res } = createMocks({
      method: 'POST',
      body: JSON.stringify(testPayload),
    });

    await sessionHandler(req, res);

    const callArgs = (request as any).mock.calls[0][1];
    expect(callArgs.body).toBeInstanceOf(Buffer);
  });
});

describe('market handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.BACKEND_URL = 'https://tunnel.test';
  });

  it('should forward authentication tokens and environment headers', async () => {
    const marketHandler = (await import('./market')).default;
    
    (request as any).mockResolvedValue({
      statusCode: 200,
      headers: { 'content-type': 'application/json' },
      body: { pipe: vi.fn() },
    });

    const { req, res } = createMocks({
      url: '/api/market?epic=ABC',
      headers: {
        'cst': 'test-cst',
        'x-security-token': 'test-token',
        'x-env': 'LIVE',
        'accept': 'application/json',
        'host': 'localhost'
      }
    });

    await marketHandler(req, res);

    expect(request).toHaveBeenCalledWith(
      expect.stringContaining('https://tunnel.test/market'),
      expect.objectContaining({
        headers: expect.objectContaining({
          'cst': 'test-cst',
          'x-security-token': 'test-token',
          'x-env': 'LIVE',
          'accept': 'application/json'
        })
      })
    );
  });
});

describe('order handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.BACKEND_URL = 'https://tunnel.test';
  });

  it('should forward request body as Buffer and preserve content-type', async () => {
    const orderHandler = (await import('./order')).default;
    const testBody = JSON.stringify({ epic: 'ABC', size: 1 });
    
    (request as any).mockResolvedValue({
      statusCode: 200,
      headers: { 'content-type': 'application/json' },
      body: { pipe: vi.fn() },
    });

    const { req, res } = createMocks({
      method: 'POST',
      body: testBody,
      headers: { 'content-type': 'application/json' }
    });

    await orderHandler(req, res);

    expect(request).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'content-type': 'application/json'
        }),
        body: expect.any(Buffer)
      })
    );
  });
});
