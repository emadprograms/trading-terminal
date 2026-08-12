import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useTradeStore } from './useTradeStore';
import { tradeApi } from '../services/trade';

vi.mock('../services/trade', () => ({
  tradeApi: {
    fetchActivityHistory: vi.fn(),
  },
}));

describe('useTradeStore - syncExecutions', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    useTradeStore.setState({ executions: [] });
  });

  it('should parse actual filled trades and ignore pending orders or unrelated activities', async () => {
    const mockActivities = [
      // 1. Real Trade (Market order opening a position)
      {
        dealId: 'deal-1',
        epic: 'TSLA',
        type: 'POSITION',
        status: 'OPENED',
        dateUTC: '2023-11-20T10:00:00',
        details: {
          direction: 'BUY',
          size: 10,
          level: 250.5,
        }
      },
      // 2. Real Trade (Working order filled)
      {
        dealId: 'deal-2',
        epic: 'AAPL',
        type: 'WORKING_ORDER',
        status: 'FILLED', // or EXECUTED
        dateUTC: '2023-11-20T10:05:00',
        details: {
          direction: 'SELL',
          size: 5,
          level: 150.0,
        }
      },
      // 3. Phantom Trade (Pending order just placed, should NOT be an execution)
      {
        dealId: 'deal-3',
        epic: 'TSLA',
        type: 'WORKING_ORDER',
        status: 'ACCEPTED',
        dateUTC: '2023-11-20T10:10:00',
        details: {
          direction: 'BUY',
          size: 20,
          level: 240.0,
        }
      },
      // 4. Unrelated Activity (e.g. Deposit)
      {
        dealId: 'deal-4',
        type: 'ACCOUNT',
        status: 'ACCEPTED',
        dateUTC: '2023-11-20T10:15:00',
        details: {
          amount: 1000,
        }
      },
      // 5. Position Closed
      {
        dealId: 'deal-1',
        epic: 'TSLA',
        type: 'POSITION',
        status: 'CLOSED',
        dateUTC: '2023-11-20T11:00:00',
        details: {
          direction: 'SELL',
          size: 10,
          level: 255.0,
        }
      }
    ];

    (tradeApi.fetchActivityHistory as any).mockResolvedValue(mockActivities);

    await useTradeStore.getState().syncExecutions(1);

    const executions = useTradeStore.getState().executions;

    // Only 'deal-1' (OPENED), 'deal-2' (FILLED), and 'deal-1' (CLOSED) should be parsed
    expect(executions).toHaveLength(3);
    
    expect(executions.map(e => e.dealId)).toContain('deal-1');
    expect(executions.map(e => e.dealId)).toContain('deal-2');
    
    // The phantom pending order (deal-3) should be completely ignored
    expect(executions.map(e => e.dealId)).not.toContain('deal-3');
    
    // Check fields of one real trade
    const deal2Exec = executions.find(e => e.dealId === 'deal-2');
    expect(deal2Exec).toMatchObject({
      epic: 'AAPL',
      direction: 'SELL',
      size: 5,
      price: 150.0,
    });
  });
});
