import { describe, it, expect } from 'vitest';

/**
 * Mocking the basic structure we discovered from Capital.com API.
 */
interface Execution {
  dateUTC: string;
  epic: string;
  dealId: string;
  type: string;
  status: string;
  details: {
    size: number;
    direction: 'BUY' | 'SELL';
    level: number;
    openPrice?: number;
  };
}

/**
 * Proposed interface for the output.
 */
interface Trade {
  epic: string;
  direction: 'BUY' | 'SELL';
  totalSize: number;
  openTime: string;
  closeTime: string | null;
  status: 'OPEN' | 'CLOSED';
  realizedPnL?: number;
}

/**
 * The netting engine we will build in Phase 2.
 */
function processNetting(executions: Execution[]): Trade[] {
  // TODO: implement logic
  return [];
}

describe('Netting Engine (TDD)', () => {
  it('should process a full close and calculate realized PnL', () => {
    const mockExecutions: Execution[] = [
      {
        dateUTC: '2024-01-01T10:00:00.000',
        epic: 'BTCUSD',
        dealId: 'deal-1',
        type: 'POSITION',
        status: 'ACCEPTED',
        details: { size: 1, direction: 'BUY', level: 50000 }
      },
      {
        dateUTC: '2024-01-01T11:00:00.000',
        epic: 'BTCUSD',
        dealId: 'deal-1',
        type: 'POSITION',
        status: 'ACCEPTED',
        details: { size: 1, direction: 'SELL', level: 51000, openPrice: 50000 }
      }
    ];

    const trades = processNetting(mockExecutions);
    
    expect(trades).toHaveLength(1);
    expect(trades[0].status).toBe('CLOSED');
    expect(trades[0].realizedPnL).toBe(1000); // (51000 - 50000) * 1
    expect(trades[0].closeTime).toBe('2024-01-01T11:00:00.000');
  });

  it('should process a partial close correctly', () => {
    const mockExecutions: Execution[] = [
      {
        dateUTC: '2024-01-01T10:00:00.000',
        epic: 'BTCUSD',
        dealId: 'deal-2',
        type: 'POSITION',
        status: 'ACCEPTED',
        details: { size: 2, direction: 'SELL', level: 60000 }
      },
      {
        dateUTC: '2024-01-01T12:00:00.000',
        epic: 'BTCUSD',
        dealId: 'deal-2',
        type: 'POSITION',
        status: 'ACCEPTED',
        details: { size: 1, direction: 'BUY', level: 59000, openPrice: 60000 }
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
