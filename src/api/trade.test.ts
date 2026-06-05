import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

// Define the MSW server to mock Capital.com endpoints
const server = setupServer(
  // Mock POST /positions (Market Order)
  http.post('*/api/v1/positions', () => {
    return HttpResponse.json({
      dealReference: 'mock-deal-ref-market',
    });
  }),

  // Mock POST /workingorders (Limit/Stop Order)
  http.post('*/api/v1/workingorders', () => {
    return HttpResponse.json({
      dealReference: 'mock-deal-ref-working',
    });
  }),

  // Mock GET /confirms/{dealReference}
  http.get('*/api/v1/confirms/:dealReference', ({ params }) => {
    const { dealReference } = params;
    
    if (dealReference === 'mock-deal-ref-market') {
      return HttpResponse.json({
        dealReference: 'mock-deal-ref-market',
        status: 'ACCEPTED',
        dealId: 'mock-deal-id-123',
        epic: 'AAPL',
        size: 0.1,
        entryPrice: 150.0,
        timestamp: Date.now(),
      });
    }
    
    return HttpResponse.json({
      dealReference,
      status: 'REJECTED',
      reason: 'INVALID_PARAMS',
      timestamp: Date.now(),
    });
  }),
);

beforeAll(() => server.listen());
afterAll(() => server.close());

describe('Trade API Scaffolding', () => {
  it('should mock a successful market order placement flow', async () => {
    // This is a scaffold test. In a real scenario, we would call the actual tradeApi.openPosition
    // For now, we verify that the MSW handlers are responding as expected.
    
    const response = await fetch('http://api.capital.com/api/v1/positions', {
      method: 'POST',
      body: JSON.stringify({ epic: 'AAPL', direction: 'BUY', size: 0.1 }),
    });
    const data = await response.json();
    
    expect(data.dealReference).toBe('mock-deal-ref-market');

    const confirmResponse = await fetch(`http://api.capital.com/api/v1/confirms/${data.dealReference}`);
    const confirmData = await confirmResponse.json();
    
    expect(confirmData.status).toBe('ACCEPTED');
    expect(confirmData.dealId).toBe('mock-deal-id-123');
  });

  it('should mock a limit order placement', async () => {
    const response = await fetch('http://api.capital.com/api/v1/workingorders', {
      method: 'POST',
      body: JSON.stringify({ epic: 'AAPL', direction: 'BUY', size: 0.1, level: 145.0, type: 'LIMIT' }),
    });
    const data = await response.json();
    
    expect(data.dealReference).toBe('mock-deal-ref-working');
  });
});
