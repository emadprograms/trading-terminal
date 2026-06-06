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
    process.env.BACKEND_URL = 'https://tunnel.test';
    process.env.CF_ACCESS_CLIENT_ID = 'test-id';
    process.env.CF_ACCESS_CLIENT_SECRET = 'test-secret';
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
      body: JSON.stringify({ success: true }),
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
    expect(res.status).toBe(200);
  });

  it('should propagate upstream errors (4xx/5xx)', async () => {
    (request as any).mockResolvedValue({
      statusCode: 401,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ error: 'unauthorized' }),
    });

    const req = new Request('http://localhost/api/session', {
      method: 'POST',
      body: JSON.stringify({ identifier: 'user', password: 'pass' }),
      headers: { 'Content-Type': 'application/json' }
    });

    const res = await sessionHandler(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe('unauthorized');
  });

  it('should use BACKEND_URL and log [StabilityTrace]', async () => {
    const consoleSpy = vi.spyOn(console, 'log');
    
    (request as any).mockResolvedValue({
      statusCode: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ success: true }),
    });

    const req = new Request('http://localhost/api/session', {
      method: 'POST',
      body: JSON.stringify({ identifier: 'user', password: 'pass' }),
    });

    await sessionHandler(req);

    expect(request).toHaveBeenCalledWith(
      expect.stringContaining('https://tunnel.test'),
      expect.anything()
    );
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[StabilityTrace]'));
  });

  it('should convert POST body to ArrayBuffer', async () => {
    (request as any).mockResolvedValue({
      statusCode: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ success: true }),
    });

    const testPayload = { identifier: 'user', password: 'pass' };
    const req = new Request('http://localhost/api/session', {
      method: 'POST',
      body: JSON.stringify(testPayload),
    });

    await sessionHandler(req);

    const callArgs = (request as any).mock.calls[0][1];
    expect(callArgs.body).toBeInstanceOf(ArrayBuffer);
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
      body: {
        json: () => Promise.resolve({ prices: [] }),
      },
    });

    const req = new Request('http://localhost/api/market?epic=ABC', {
      headers: {
        'CST': 'test-cst',
        'X-SECURITY-TOKEN': 'test-token',
        'x-env': 'LIVE',
        'Accept': 'application/json'
      }
    });

    await marketHandler(req);

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

  it('should forward request body as ArrayBuffer and preserve content-type', async () => {
    const orderHandler = (await import('./order')).default;
    const testBody = JSON.stringify({ epic: 'ABC', size: 1 });
    
    (request as any).mockResolvedValue({
      statusCode: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ success: true }),
    });

    const req = new Request('http://localhost/api/order', {
      method: 'POST',
      body: testBody,
      headers: { 'Content-Type': 'application/json' }
    });

    await orderHandler(req);

    expect(request).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'content-type': 'application/json'
        }),
        body: expect.any(ArrayBuffer)
      })
    );
  });

  it('should forward PUT request body as ArrayBuffer', async () => {
    const orderHandler = (await import('./order')).default;
    const testBody = JSON.stringify({ orderId: '123' });
    
    (request as any).mockResolvedValue({
      statusCode: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ success: true }),
    });

    const req = new Request('http://localhost/api/order', {
      method: 'PUT',
      body: testBody,
      headers: { 'Content-Type': 'application/json' }
    });

    await orderHandler(req);

    expect(request).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        method: 'PUT',
        body: expect.any(ArrayBuffer)
      })
    );
  });
});
