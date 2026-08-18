import { describe, it, expect } from 'vitest';
import { processNetting } from './nettingEngine';
import { Execution } from '../types/trade';

describe('nettingEngine', () => {
  it('should process a basic open and close trade correctly', () => {
    const executions: Execution[] = [
      {
        id: '1',
        dealId: 'deal1',
        epic: 'AAPL',
        size: 10,
        price: 150,
        direction: 'BUY',
        timestamp: 1000,
        action: 'ENTRY'
      },
      {
        id: '2',
        dealId: 'deal1',
        epic: 'AAPL',
        size: 10,
        price: 160,
        direction: 'SELL',
        timestamp: 2000,
        action: 'EXIT'
      }
    ];

    const trades = processNetting(executions);

    expect(trades).toHaveLength(1);
    const trade = trades[0];
    
    expect(trade.epic).toBe('AAPL');
    expect(trade.direction).toBe('BUY');
    expect(trade.totalSize).toBe(0);
    expect(trade.maxSize).toBe(10);
    expect(trade.status).toBe('CLOSED');
    // P&L: (160 - 150) * 10 = +100
    expect(trade.realizedPnL).toBe(100);
  });

  it('should calculate P&L correctly for partial closes', () => {
    const executions: Execution[] = [
      {
        id: '1',
        dealId: 'deal2',
        epic: 'TSLA',
        size: 20,
        price: 200,
        direction: 'SELL',
        timestamp: 1000,
        action: 'ENTRY'
      },
      {
        id: '2',
        dealId: 'deal2',
        epic: 'TSLA',
        size: 10,
        price: 190,
        direction: 'BUY',
        timestamp: 2000,
        action: 'EXIT'
      },
      {
        id: '3',
        dealId: 'deal2',
        epic: 'TSLA',
        size: 10,
        price: 210,
        direction: 'BUY',
        timestamp: 3000,
        action: 'EXIT'
      }
    ];

    const trades = processNetting(executions);

    expect(trades).toHaveLength(1);
    const trade = trades[0];
    
    expect(trade.status).toBe('CLOSED');
    expect(trade.totalSize).toBe(0);
    expect(trade.maxSize).toBe(20);

    // P&L logic for short: (open - close) * size
    // Leg 1: (200 - 190) * 10 = +100
    // Leg 2: (200 - 210) * 10 = -100
    // Total: 0
    expect(trade.realizedPnL).toBe(0);
  });

  it('should ignore an orphaned EXIT execution (e.g. from before the lookback window)', () => {
    const executions: Execution[] = [
      {
        id: '2',
        dealId: 'deal3',
        epic: 'AMZN',
        size: 5,
        price: 3000,
        direction: 'SELL',
        timestamp: 2000,
        action: 'EXIT'
      }
    ];

    const trades = processNetting(executions);

    // Because there was no ENTRY execution, it shouldn't create a phantom OPEN trade 
    // that assumes the EXIT was an ENTRY.
    expect(trades).toHaveLength(0);
  });

  it('should handle averaging into a position properly (multiple ENTRY actions)', () => {
    const executions: Execution[] = [
      {
        id: '1',
        dealId: 'deal4', // Assuming broker groups them under one deal or we test based on epic
        epic: 'MSFT',
        size: 10,
        price: 300,
        direction: 'BUY',
        timestamp: 1000,
        action: 'ENTRY'
      },
      {
        id: '2',
        dealId: 'deal4',
        epic: 'MSFT',
        size: 5,
        price: 290,
        direction: 'BUY', // Same direction, should ADD to the position
        timestamp: 2000,
        action: 'ENTRY'
      },
      {
        id: '3',
        dealId: 'deal4',
        epic: 'MSFT',
        size: 15,
        price: 310,
        direction: 'SELL',
        timestamp: 3000,
        action: 'EXIT'
      }
    ];

    const trades = processNetting(executions);

    expect(trades).toHaveLength(1);
    const trade = trades[0];
    
    expect(trade.totalSize).toBe(0);
    expect(trade.maxSize).toBe(15);
    expect(trade.status).toBe('CLOSED');
    
    // Leg 1: 10 units bought at 300, sold at 310 -> (310 - 300) * 10 = +100
    // Leg 2: 5 units bought at 290, sold at 310 -> (310 - 290) * 5 = +100
    // Total P&L: 200
    expect(trade.realizedPnL).toBeCloseTo(200, 2);
  });

  it('should separate trades with different dealIds', () => {
    const executions: Execution[] = [
      {
        id: '1',
        dealId: 'deal5',
        epic: 'NFLX',
        size: 10,
        price: 500,
        direction: 'BUY',
        timestamp: 1000,
        action: 'ENTRY'
      },
      {
        id: '2',
        dealId: 'deal6',
        epic: 'NFLX',
        size: 10,
        price: 500,
        direction: 'BUY',
        timestamp: 1000,
        action: 'ENTRY'
      }
    ];

    const trades = processNetting(executions);
    expect(trades).toHaveLength(2);
  });
});
