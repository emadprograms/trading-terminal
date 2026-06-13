import { describe, it, expect, vi, beforeEach } from 'vitest';
import handler from './order';
import * as utils from './_utils';
import { IncomingMessage, ServerResponse } from 'http';

vi.mock('./_utils.js', () => ({
  proxyRequest: vi.fn(),
  readBody: vi.fn(),
}));

describe('Order Proxy Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createMockReq = (method: string, url: string, body?: any): IncomingMessage => {
    const req = {
      method,
      url,
    } as IncomingMessage;
    return req;
  };

  const createMockRes = (): ServerResponse => {
    const res: any = {
      statusCode: 200,
      headersSent: false,
      setHeader: vi.fn(),
      end: vi.fn(),
    };
    return res;
  };

  it('rejects malformed market order with 400', async () => {
    const req = createMockReq('POST', '/api/order/v1/positions');
    const res = createMockRes();
    
    // Mock readBody to return malformed payload (missing epic)
    vi.spyOn(utils, 'readBody').mockResolvedValue(Buffer.from(JSON.stringify({
      direction: 'BUY',
      size: 1
    })));

    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.end).toHaveBeenCalledWith(expect.stringContaining('PROXY_VALIDATION_ERROR'));
    expect(utils.proxyRequest).not.toHaveBeenCalled();
  });

  it('rejects malformed limit order with 400', async () => {
    const req = createMockReq('POST', '/api/order/v1/workingorders');
    const res = createMockRes();
    
    // Mock readBody to return malformed payload (missing level)
    vi.spyOn(utils, 'readBody').mockResolvedValue(Buffer.from(JSON.stringify({
      epic: 'AAPL',
      direction: 'BUY',
      size: 1,
      type: 'LIMIT'
    })));

    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.end).toHaveBeenCalledWith(expect.stringContaining('PROXY_VALIDATION_ERROR'));
    expect(utils.proxyRequest).not.toHaveBeenCalled();
  });

  it('rejects malformed update position with 400', async () => {
    const req = createMockReq('PUT', '/api/order/v1/positions/12345');
    const res = createMockRes();
    
    // Mock readBody to return malformed payload (invalid type for guaranteedStop)
    vi.spyOn(utils, 'readBody').mockResolvedValue(Buffer.from(JSON.stringify({
      guaranteedStop: "yes"
    })));

    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.end).toHaveBeenCalledWith(expect.stringContaining('PROXY_VALIDATION_ERROR'));
    expect(utils.proxyRequest).not.toHaveBeenCalled();
  });

  it('passes valid market order to proxyRequest', async () => {
    const req = createMockReq('POST', '/api/order/v1/positions');
    const res = createMockRes();
    
    const validPayload = {
      epic: 'AAPL',
      direction: 'BUY',
      size: 1
    };
    const bodyBuffer = Buffer.from(JSON.stringify(validPayload));
    vi.spyOn(utils, 'readBody').mockResolvedValue(bodyBuffer);

    await handler(req, res);

    expect(utils.proxyRequest).toHaveBeenCalledWith(req, res, '/api/v1/positions', bodyBuffer);
  });
});
