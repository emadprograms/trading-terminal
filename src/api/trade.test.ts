import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../tests/setup';
import { api } from './client';

describe('Trade API Scaffolding', () => {
  it('should mock position placement', async () => {
    server.use(
      http.post('*/positions', () => {
        return HttpResponse.json({ dealReference: 'mock-pos-ref' });
      })
    );

    const response = await api.post('positions', {
      json: { epic: 'EURUSD', direction: 'BUY', size: 1 }
    }).json<{ dealReference: string }>();

    expect(response.dealReference).toBe('mock-pos-ref');
  });

  it('should mock working order placement', async () => {
    server.use(
      http.post('*/workingorders', () => {
        return HttpResponse.json({ dealReference: 'mock-order-ref' });
      })
    );

    const response = await api.post('workingorders', {
      json: { epic: 'EURUSD', direction: 'BUY', size: 1, level: 1.1, type: 'LIMIT' }
    }).json<{ dealReference: string }>();

    expect(response.dealReference).toBe('mock-order-ref');
  });

  it('should mock trade confirmation', async () => {
    server.use(
      http.get('*/confirms/mock-ref', () => {
        return HttpResponse.json({
          dealReference: 'mock-ref',
          dealId: 'deal-123',
          status: 'ACCEPTED',
          epic: 'EURUSD',
          level: 1.05,
          size: 1,
          direction: 'BUY'
        });
      })
    );

    const response = await api.get('confirms/mock-ref').json<{ dealId: string; status: string }>();

    expect(response.status).toBe('ACCEPTED');
    expect(response.dealId).toBe('deal-123');
  });
});
