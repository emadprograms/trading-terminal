import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { tradeApi } from './trade';
import { useSessionStore } from '../store/useSessionStore';

const server = setupServer(
  http.post('http://localhost:3000/positions', async ({ request }) => {
    const body = await request.json() as any;
    if (!body.epic || !body.direction || !body.size) {
      return new HttpResponse(null, { status: 400 });
    }
    return HttpResponse.json({ dealReference: 'deal_ref_123' });
  }),
  http.post('http://localhost:3000/workingorders', async ({ request }) => {
    const body = await request.json() as any;
    if (!body.epic || !body.direction || !body.size || !body.level) {
      return new HttpResponse(null, { status: 400 });
    }
    return HttpResponse.json({ dealReference: 'deal_ref_456' });
  }),
  http.get('http://localhost:3000/confirms/:dealReference', async ({ params }) => {
    const { dealReference } = params;
    if (dealReference === 'deal_ref_123') {
      return HttpResponse.json({
        dealReference: 'deal_ref_123',
        dealId: 'deal_id_123',
        status: 'ACCEPTED',
        epic: 'AAPL',
        level: 150,
        size: 1,
        direction: 'BUY'
      });
    }
    return new HttpResponse(null, { status: 404 });
  })
);

beforeEach(() => {
  useSessionStore.getState().setProxyUrl('http://localhost:3000');
  server.listen();
});

afterEach(() => {
  server.resetHandlers();
  server.close();
});

describe('tradeApi', () => {
  it('should place a market order and return dealReference', async () => {
    const result = await tradeApi.placeMarketOrder({
      epic: 'AAPL',
      direction: 'BUY',
      size: 1
    });
    expect(result.dealReference).toBe('deal_ref_123');
  });

  it('should place a limit order and return dealReference', async () => {
    const result = await tradeApi.placeLimitOrder({
      epic: 'AAPL',
      direction: 'BUY',
      size: 1,
      level: 145,
      type: 'LIMIT'
    });
    expect(result.dealReference).toBe('deal_ref_456');
  });

  it('should get confirmation for a deal reference', async () => {
    const result = await tradeApi.getConfirmation('deal_ref_123');
    expect(result.dealId).toBe('deal_id_123');
    expect(result.status).toBe('ACCEPTED');
  });

  it('should throw error on failed market order', async () => {
    server.use(
      http.post('http://localhost:3000/positions', () => {
        return new HttpResponse(JSON.stringify({ errorCode: 'error.invalid-size' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      })
    );

    await expect(tradeApi.placeMarketOrder({ epic: 'AAPL', direction: 'BUY', size: 0 }))
      .rejects.toThrow(/Market order failed/);
  });
});
