import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TradeLog } from './TradeLog';
import { useTradeStore } from '../store/useTradeStore';

// Mock the store
vi.mock('../store/useTradeStore');

describe('TradeLog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders empty state when no positions or orders', () => {
    (useTradeStore as unknown as any).mockImplementation((selector: any) => 
      selector({
        positions: [],
        pendingOrders: {}
      })
    );

    render(<TradeLog />);
    
    expect(screen.getByText('No active positions')).toBeDefined();
    expect(screen.getByText('No working orders')).toBeDefined();
  });

  it('renders active positions', () => {
    (useTradeStore as unknown as any).mockImplementation((selector: any) => 
      selector({
        positions: [
          { 
            dealId: 'pos1', 
            epic: 'IX.D.DOW.IFS.IP', 
            direction: 'BUY', 
            size: 2, 
            entryPrice: 34000.5, 
            timestamp: Date.now() 
          }
        ],
        pendingOrders: {}
      })
    );

    render(<TradeLog />);
    
    expect(screen.getByText('Active Positions (1)')).toBeDefined();
    expect(screen.getByText('IX.D.DOW.IFS.IP')).toBeDefined();
    expect(screen.getByText('BUY 2')).toBeDefined();
    expect(screen.getByText('34,000.50')).toBeDefined();
  });

  it('renders working orders', () => {
    (useTradeStore as unknown as any).mockImplementation((selector: any) => 
      selector({
        positions: [],
        pendingOrders: {
          'ref123': {
            dealReference: 'ref123',
            epic: 'FTSE',
            direction: 'SELL',
            size: 1,
            type: 'LIMIT',
            level: 7500,
            status: 'PENDING',
            timestamp: Date.now()
          }
        }
      })
    );

    render(<TradeLog />);
    
    expect(screen.getByText('Working Orders (1)')).toBeDefined();
    expect(screen.getByText('FTSE')).toBeDefined();
    expect(screen.getByText('SELL 1')).toBeDefined();
    expect(screen.getByText('LIMIT @ 7,500.00')).toBeDefined();
    expect(screen.getByText('PENDING')).toBeDefined();
  });
});
