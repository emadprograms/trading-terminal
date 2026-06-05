import { describe, it, expect, beforeEach } from 'vitest';
import { useTradeStore } from './useTradeStore';
import { Order, Position } from '../types/trade';

describe('useTradeStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useTradeStore.getState().clearOrders();
    // Assuming we might need a way to clear positions too
    const state = useTradeStore.getState();
    if (typeof state.clearPositions === 'function') {
      state.clearPositions();
    }
  });

  it('should add a pending order', () => {
    const mockOrder: Order = {
      dealReference: 'ref-123',
      epic: 'AAPL',
      size: 0.1,
      type: 'MARKET',
      direction: 'BUY',
      status: 'PENDING',
      timestamp: Date.now(),
    };

    useTradeStore.getState().addPendingOrder('ref-123', mockOrder);
    
    const pendingOrders = useTradeStore.getState().pendingOrders;
    expect(pendingOrders['ref-123']).toEqual(mockOrder);
    expect(pendingOrders['ref-123'].status).toBe('PENDING');
  });

  it('should update order status', () => {
    const mockOrder: Order = {
      dealReference: 'ref-123',
      epic: 'AAPL',
      size: 0.1,
      type: 'MARKET',
      direction: 'BUY',
      status: 'PENDING',
      timestamp: Date.now(),
    };

    useTradeStore.getState().addPendingOrder('ref-123', mockOrder);
    
    useTradeStore.getState().updateOrderStatus('ref-123', 'ACCEPTED', {
      dealId: 'deal-456',
    });

    const order = useTradeStore.getState().pendingOrders['ref-123'];
    expect(order.status).toBe('ACCEPTED');
    expect(order.dealId).toBe('deal-456');
  });

  it('should add a new position', () => {
    const mockPosition: Position = {
      dealId: 'deal-456',
      epic: 'AAPL',
      size: 0.1,
      entryPrice: 150.0,
      direction: 'BUY',
      timestamp: Date.now(),
    };

    useTradeStore.getState().addPosition(mockPosition);
    
    const positions = useTradeStore.getState().positions;
    expect(positions).toContainEqual(mockPosition);
    expect(positions.length).toBe(1);
  });

  it('should remove a position', () => {
    const mockPosition: Position = {
      dealId: 'deal-456',
      epic: 'AAPL',
      size: 0.1,
      entryPrice: 150.0,
      direction: 'BUY',
      timestamp: Date.now(),
    };

    useTradeStore.getState().addPosition(mockPosition);
    useTradeStore.getState().removePosition('deal-456');
    
    const positions = useTradeStore.getState().positions;
    expect(positions).not.toContainEqual(mockPosition);
    expect(positions.length).toBe(0);
  });

  it('should clear all orders', () => {
    const mockOrder: Order = {
      dealReference: 'ref-123',
      epic: 'AAPL',
      size: 0.1,
      type: 'MARKET',
      direction: 'BUY',
      status: 'PENDING',
      timestamp: Date.now(),
    };

    useTradeStore.getState().addPendingOrder('ref-123', mockOrder);
    useTradeStore.getState().clearOrders();
    
    expect(useTradeStore.getState().pendingOrders).toEqual({});
  });
});
