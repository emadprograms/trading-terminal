import { describe, it, expect, beforeEach } from 'vitest';
import { useTradeStore } from './useTradeStore';
import { Order, Position } from '../types/trade';

describe('useTradeStore', () => {
  beforeEach(() => {
    useTradeStore.getState().clearOrders();
  });

  it('should add a pending order', () => {
    const order: Order = {
      epic: 'IX.D.DAX.IFD.IP',
      size: 1,
      direction: 'BUY',
      type: 'MARKET',
      status: 'PENDING',
      dealReference: 'ref-123',
      timestamp: Date.now(),
    };

    useTradeStore.getState().addPendingOrder('ref-123', order);

    const state = useTradeStore.getState();
    expect(state.pendingOrders['ref-123']).toEqual(order);
  });

  it('should update order status', () => {
    const order: Order = {
      epic: 'IX.D.DAX.IFD.IP',
      size: 1,
      direction: 'BUY',
      type: 'MARKET',
      status: 'PENDING',
      dealReference: 'ref-123',
      timestamp: Date.now(),
    };

    useTradeStore.getState().addPendingOrder('ref-123', order);
    useTradeStore.getState().updateOrderStatus('ref-123', 'ACCEPTED', { dealId: 'deal-456' });

    const state = useTradeStore.getState();
    expect(state.pendingOrders['ref-123'].status).toBe('ACCEPTED');
    expect(state.pendingOrders['ref-123'].dealId).toBe('deal-456');
  });

  it('should add a position', () => {
    const position: Position = {
      dealId: 'deal-456',
      epic: 'IX.D.DAX.IFD.IP',
      size: 1,
      direction: 'BUY',
      entryPrice: 15000,
      timestamp: Date.now(),
    };

    useTradeStore.getState().addPosition(position);

    const state = useTradeStore.getState();
    expect(state.positions).toContainEqual(position);
  });

  it('should remove a position', () => {
    const position: Position = {
      dealId: 'deal-456',
      epic: 'IX.D.DAX.IFD.IP',
      size: 1,
      direction: 'BUY',
      entryPrice: 15000,
      timestamp: Date.now(),
    };

    useTradeStore.getState().addPosition(position);
    useTradeStore.getState().removePosition('deal-456');

    const state = useTradeStore.getState();
    expect(state.positions).toHaveLength(0);
  });
});
