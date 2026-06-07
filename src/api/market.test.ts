import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { marketApi } from './market';
import { useSessionStore } from '../store/useSessionStore';

const server = setupServer(
  http.get('http://localhost:3000/api/v1/prices/*', async ({ request }) => {
    const url = new URL(request.url);
    const epic = url.pathname.split('/').pop();
    const resolution = url.searchParams.get('resolution');

    if (!epic || !resolution) {
      return new HttpResponse(null, { status: 400 });
    }

    return HttpResponse.json({
      prices: [
        {
          snapshotTime: '2024-01-01T00:00:00Z',
          openPrice: { bid: 100, ask: 101 },
          closePrice: { bid: 105, ask: 106 },
          highPrice: { bid: 110, ask: 111 },
          lowPrice: { bid: 90, ask: 91 },
        },
      ]
    });
  })
);

beforeEach(() => {
  server.listen();
});

afterEach(() => {
  server.resetHandlers();
  server.close();
});

describe('marketApi', () => {
  it('should fetch candles with the correct resolution mapping', async () => {
    const epic = 'S&P 500';
    const resolution = '1H' as any; // Timeframe
    
    const candles = await marketApi.fetchCandles(epic, resolution);
    
    expect(candles).toHaveLength(1);
    expect(candles[0].openPrice.bid).toBe(100);
  });

  it('should correctly encode the epic in the URL', async () => {
    const epic = 'S&P 500';
    const spy = vi.fn();
    server.use(
      http.get('http://localhost:3000/api/v1/prices/S%26P%20500', async () => {
        spy();
        return HttpResponse.json({ prices: [] });
      })
    );

    await marketApi.fetchCandles(epic, '1min');
    expect(spy).toHaveBeenCalled();
  });

  it('should apply max, from, and to query parameters', async () => {
    let capturedParams: URLSearchParams | null = null;
    
    server.use(
      http.get('http://localhost:3000/api/v1/prices/*', async ({ request }) => {
        capturedParams = new URL(request.url).searchParams;
        return HttpResponse.json({ prices: [] });
      })
    );

    await marketApi.fetchCandles('AAPL', '1min', {
      max: 100,
      from: '2024-01-01T00:00:00Z',
      to: '2024-01-02T00:00:00Z',
    });

    expect(capturedParams?.get('max')).toBe('100');
    expect(capturedParams?.get('from')).toBe('2024-01-01T00:00:00Z');
    expect(capturedParams?.get('to')).toBe('2024-01-02T00:00:00Z');
    expect(capturedParams?.get('resolution')).toBe('MINUTE');
  });

  it('should throw an error when the response is not OK', async () => {
    server.use(
      http.get('http://localhost:3000/api/v1/prices/*', () => {
        return new HttpResponse(JSON.stringify({ errorCode: 'error.invalid-resolution' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      })
    );

    await expect(marketApi.fetchCandles('AAPL', '1min'))
      .rejects.toThrow(/API Error/);
  });
});
