import { describe, it, expect, vi, beforeEach } from 'vitest';
import { request } from 'undici';
import sessionHandler from '../../api/session';
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

describe('session handler (direct-to-Capital.com)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CAPITAL_API_KEY = 'test-api-key';
  });

  it('should handle OPTIONS preflight', async () => {
    const { req, res } = createMocks({ method: 'OPTIONS' });

    await sessionHandler(req, res);
    expect(res.statusCode).toBe(200);
    expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Methods', expect.stringContaining('PUT'));
    expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Methods', expect.stringContaining('DELETE'));
  });

  it('should inject X-CAP-API-KEY and call Capital.com directly', async () => {
    (request as any).mockResolvedValue({
      statusCode: 200,
      headers: { 
        'content-type': 'application/json',
        'cst': 'new-cst-token',
        'x-security-token': 'new-security-token',
      },
      body: {
        pipe: vi.fn((dest) => {
          dest.end(JSON.stringify({ accountType: 'CFD' }));
        })
      },
    });

    const { req, res } = createMocks({
      method: 'POST',
      body: JSON.stringify({ identifier: 'user@test.com', password: 'pass123' }),
      headers: {
        'content-type': 'application/json',
        'x-environment': 'DEMO',
      }
    });

    await sessionHandler(req, res);
    
    // Should call Capital.com demo URL directly
    expect(request).toHaveBeenCalledWith(
      expect.stringContaining('demo-api-capital.backend-capital.com'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'X-CAP-API-KEY': 'test-api-key',
          'Content-Type': 'application/json',
        }),
      })
    );
    expect(res.statusCode).toBe(200);
  });

  it('should route to LIVE Capital.com when X-Environment is LIVE', async () => {
    process.env.CAPITAL_API_KEY_LIVE = 'live-api-key';
    
    (request as any).mockResolvedValue({
      statusCode: 200,
      headers: { 'content-type': 'application/json' },
      body: { pipe: vi.fn() },
    });

    const { req, res } = createMocks({
      method: 'POST',
      body: JSON.stringify({ identifier: 'user', password: 'pass' }),
      headers: { 'x-environment': 'LIVE' }
    });

    await sessionHandler(req, res);

    expect(request).toHaveBeenCalledWith(
      expect.stringContaining('api-capital.backend-capital.com'),
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-CAP-API-KEY': 'live-api-key',
        }),
      })
    );
  });

  it('should propagate upstream errors', async () => {
    (request as any).mockResolvedValue({
      statusCode: 401,
      headers: { 'content-type': 'application/json' },
      body: {
        pipe: vi.fn((dest) => {
          dest.end(JSON.stringify({ errorCode: 'error.invalid.details' }));
        })
      },
    });

    const { req, res } = createMocks({
      method: 'POST',
      body: JSON.stringify({ identifier: 'bad', password: 'bad' }),
    });

    await sessionHandler(req, res);
    expect(res.statusCode).toBe(401);
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

describe('order handler (direct-to-Capital.com)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CAPITAL_API_KEY = 'test-api-key';
  });

  it('should forward PUT request body for position updates', async () => {
    const orderHandler = (await import('../../api/order')).default;
    const testBody = JSON.stringify({ stopLevel: 100.5 });
    
    (request as any).mockResolvedValue({
      statusCode: 200,
      headers: { 'content-type': 'application/json' },
      body: { pipe: vi.fn() },
    });

    const { req, res } = createMocks({
      method: 'PUT',
      url: '/api/order/v1/positions/DEAL123',
      body: testBody,
      headers: { 
        'content-type': 'application/json',
        'cst': 'test-cst',
        'x-security-token': 'test-token',
      }
    });

    await orderHandler(req, res);

    expect(request).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/positions/DEAL123'),
      expect.objectContaining({
        method: 'PUT',
        headers: expect.objectContaining({
          'X-CAP-API-KEY': 'test-api-key',
          'CST': 'test-cst',
          'X-SECURITY-TOKEN': 'test-token',
        }),
        body: expect.any(Buffer)
      })
    );
  });

  it('should forward DELETE request for closing positions', async () => {
    const orderHandler = (await import('./order')).default;
    
    (request as any).mockResolvedValue({
      statusCode: 200,
      headers: { 'content-type': 'application/json' },
      body: { pipe: vi.fn() },
    });

    const { req, res } = createMocks({
      method: 'DELETE',
      url: '/api/order/v1/positions/DEAL456',
      headers: { 
        'cst': 'test-cst',
        'x-security-token': 'test-token',
      }
    });

    await orderHandler(req, res);

    expect(request).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/positions/DEAL456'),
      expect.objectContaining({
        method: 'DELETE',
        headers: expect.objectContaining({
          'X-CAP-API-KEY': 'test-api-key',
        }),
      })
    );
    expect(res.statusCode).toBe(200);
  });
});

describe('market handler (direct-to-Capital.com)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CAPITAL_API_KEY = 'test-api-key';
  });

  it('should forward authentication tokens to Capital.com', async () => {
    const marketHandler = (await import('../../api/market')).default;
    
    (request as any).mockResolvedValue({
      statusCode: 200,
      headers: { 'content-type': 'application/json' },
      body: { pipe: vi.fn() },
    });

    const { req, res } = createMocks({
      url: '/api/market/v1/prices/AAPL?max=100',
      headers: {
        'cst': 'test-cst',
        'x-security-token': 'test-token',
        'x-environment': 'DEMO',
      }
    });

    await marketHandler(req, res);

    expect(request).toHaveBeenCalledWith(
      expect.stringContaining('demo-api-capital.backend-capital.com/api/v1/prices/AAPL'),
      expect.objectContaining({
        headers: expect.objectContaining({
          'CST': 'test-cst',
          'X-SECURITY-TOKEN': 'test-token',
          'X-CAP-API-KEY': 'test-api-key',
        })
      })
    );
  });
});
