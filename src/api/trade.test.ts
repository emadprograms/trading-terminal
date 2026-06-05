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
    }));

    const params = { epic: 'AAPL', size: 1, direction: 'BUY' };
    const result = await tradeApi.placeMarketOrder(params);

    expect(api.post).toHaveBeenCalledWith('/positions', { json: params });
    expect(result).toBe('DR12345');
  });

  it('placeLimitOrder should call POST /workingorders and return dealReference', async () => {
    const mockResponse = { dealReference: 'DR67890' };
    (api.post as any).mockImplementation(() => ({
      json: () => Promise.resolve(mockResponse),
    }));

    const params = { epic: 'AAPL', size: 1, direction: 'BUY', level: 150.0 };
    const result = await tradeApi.placeLimitOrder(params);

    expect(api.post).toHaveBeenCalledWith('/workingorders', { json: params });
    expect(result).toBe('DR67890');
  });

  it('getConfirmation should call GET /confirms/{dealReference}', async () => {
    const mockResponse = { status: 'ACCEPTED', dealId: 'D123' };
    (api.get as any).mockImplementation(() => ({
      json: () => Promise.resolve(mockResponse),
    }));

    const dealReference = 'DR12345';
    const result = await tradeApi.getConfirmation(dealReference);

    expect(api.get).toHaveBeenCalledWith(`/confirms/${dealReference}`);
    expect(result).toEqual(mockResponse);
  });

  it('should throw human-readable error on 400/401 responses', async () => {
    (api.post as any).mockImplementation(() => {
      throw {
        response: {
          status: 400,
          body: { message: 'Invalid parameters' },
        },
      };
    });

    await expect(tradeApi.placeMarketOrder({})).rejects.toThrow('Trade API Error: Invalid parameters');
  });
});
