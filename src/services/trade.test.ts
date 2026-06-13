import { describe, it, expect, beforeEach, vi } from 'vitest';
import { tradeApi } from './trade';
import { api } from './client';

vi.mock('./client', () => ({
  api: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

describe('tradeApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('placeMarketOrder should call POST /positions and return dealReference', async () => {
    const mockResponse = { dealReference: 'DR12345' };
    (api.post as any).mockImplementation(() => ({
      json: () => Promise.resolve(mockResponse),
      text: () => Promise.resolve(JSON.stringify(mockResponse)),
      ok: true,
    }));

    const params = { epic: 'AAPL', size: 1, direction: 'BUY' };
    const result = await tradeApi.placeMarketOrder(params as any);

    expect(api.post).toHaveBeenCalledWith('order/v1/positions', expect.objectContaining({ json: params }));
    expect(result).toBe('DR12345');
  });

  it('placeLimitOrder should call POST /workingorders and return dealReference', async () => {
    const mockResponse = { dealReference: 'DR67890' };
    (api.post as any).mockImplementation(() => ({
      json: () => Promise.resolve(mockResponse),
      text: () => Promise.resolve(JSON.stringify(mockResponse)),
      ok: true,
    }));

    const params = { epic: 'AAPL', size: 1, direction: 'BUY', level: 150.0 };
    const result = await tradeApi.placeLimitOrder(params as any);

    expect(api.post).toHaveBeenCalledWith('order/v1/workingorders', expect.objectContaining({ json: params }));
    expect(result).toBe('DR67890');
  });

  it('getConfirmation should call GET /confirms/{dealReference}', async () => {
    const mockResponse = { status: 'ACCEPTED', dealId: 'D123' };
    (api.get as any).mockImplementation(() => ({
      json: () => Promise.resolve(mockResponse),
      text: () => Promise.resolve(JSON.stringify(mockResponse)),
      ok: true,
    }));

    const dealReference = 'DR12345';
    const result = await tradeApi.getConfirmation(dealReference);

    expect(api.get).toHaveBeenCalledWith(`order/v1/confirms/${dealReference}`, expect.objectContaining({ throwHttpErrors: false }));
    expect(result).toEqual(mockResponse);
  });

  it('should throw human-readable error on 400/401 responses', async () => {
    (api.post as any).mockImplementation(() => {
      return Promise.resolve({
        ok: false,
        status: 400,
        text: () => Promise.resolve(JSON.stringify({ 
          errorCode: 'PROXY_VALIDATION_ERROR', 
          developerMessage: 'Invalid parameters' 
        }))
      });
    });

    await expect(tradeApi.placeMarketOrder({ epic: 'AAPL', size: 1, direction: 'BUY' } as any)).rejects.toThrow('Proxy Validation Error: Invalid parameters');
  });
});
