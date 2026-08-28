import { describe, it, expect } from 'vitest';

import { Execution, Trade, processNetting } from '../../src/utils/nettingEngine';
describe('Netting Engine (TDD)', () => {
  it('should process a full close and calculate realized PnL', () => {
    const mockExecutions: Execution[] = [
      {
        id: '1',
        timestamp: new Date('2024-01-01T10:00:00.000').getTime(),
        epic: 'BTCUSD',
        dealId: 'deal-1',
        action: 'ENTRY',
        size: 1, direction: 'BUY', price: 50000
      },
      {
        id: '2',
        timestamp: new Date('2024-01-01T11:00:00.000').getTime(),
        epic: 'BTCUSD',
        dealId: 'deal-1',
        action: 'EXIT',
        size: 1, direction: 'SELL', price: 51000, openPrice: 50000
      }
    ];

    const trades = processNetting(mockExecutions);
    
    expect(trades).toHaveLength(1);
    expect(trades[0].status).toBe('CLOSED');
    expect(trades[0].realizedPnL).toBe(1000); // (51000 - 50000) * 1
    expect(trades[0].closeTime).toBe(new Date('2024-01-01T11:00:00.000').toISOString());
  });

  it('should process a partial close correctly', () => {
    const mockExecutions: Execution[] = [
      {
        id: '3',
        timestamp: new Date('2024-02-01T10:00:00.000').getTime(),
        epic: 'AAPL',
        dealId: 'deal-2',
        action: 'ENTRY',
        size: 2, direction: 'SELL', price: 60000
      },
      {
        id: '4',
        timestamp: new Date('2024-02-01T11:00:00.000').getTime(),
        epic: 'AAPL',
        dealId: 'deal-2',
        action: 'EXIT',
        size: 1, direction: 'BUY', price: 59000, openPrice: 60000
      }
    ];

    const trades = processNetting(mockExecutions);
    
    // We expect the original trade to be partially closed (still OPEN with remaining size 1)
    // Or we expect a closed sub-trade of size 1 and an open sub-trade of size 1.
    // Assuming we return a single trade object tracking the remaining size and accumulated PnL
    expect(trades).toHaveLength(1);
    expect(trades[0].status).toBe('OPEN');
    expect(trades[0].totalSize).toBe(1);
    expect(trades[0].realizedPnL).toBe(1000); // 1 * (60000 - 59000) for a short
  });
});
