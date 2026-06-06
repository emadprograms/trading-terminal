import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useTradeStore } from './useTradeStore';
import { TradeConfirmation, Order } from '../types/trade';

describe('useTradeStore - Hybrid Confirmation & Buffer', () => {
  beforeEach(() => {
    useTradeStore.getState().clearOrders();
    useTradeStore.getState().clearPositions();
    // @ts-ignore - access private buffer for testing if needed or use clear method
    if (useTradeStore.getState().clearBuffer) {
       useTradeStore.getState().clearBuffer();
    }
    vi.useFakeTimers();
  });

  it('should transition order to ACCEPTED when confirmation arrives after REST', async () => {
    const dealReference = 'ref-123';
    const order: Order = {
      dealReference,
      epic: 'EURUSD',
      size: 1,
      type: 'MARKET',
      direction: 'BUY',
      status: 'PENDING',
      timestamp: Date.now(),
    };

    // 1. REST response received and order added to pending
    useTradeStore.getState().addPendingOrder(dealReference, order);
    expect(useTradeStore.getState().pendingOrders[dealReference]).toBeDefined();

    // 2. WS confirmation arrives
    const confirmation: TradeConfirmation = {
      dealReference,
      status: 'ACCEPTED',
      dealId: 'deal-456',
      epic: 'EURUSD',
      size: 1,
      entryPrice: 1.1234,
      timestamp: Date.now(),
    };

    useTradeStore.getState().handleConfirmation(confirmation);

    // 3. Verify status updated and position created
    // Advance timers because addPosition is called in setTimeout
    vi.runAllTimers();

    const updatedOrder = useTradeStore.getState().pendingOrders[dealReference];
    expect(updatedOrder.status).toBe('ACCEPTED');
    expect(updatedOrder.dealId).toBe('deal-456');
    
    expect(useTradeStore.getState().positions).toHaveLength(1);
    expect(useTradeStore.getState().positions[0].dealId).toBe('deal-456');
  });

  it('should handle race condition: WS confirmation arrives BEFORE REST response', async () => {
    const dealReference = 'ref-race';
    const confirmation: TradeConfirmation = {
      dealReference,
      status: 'ACCEPTED',
      dealId: 'deal-race',
      epic: 'EURUSD',
      size: 1,
      entryPrice: 1.1234,
      timestamp: Date.now(),
    };

    // 1. WS confirmation arrives (handleConfirmation) before REST (addPendingOrder)
    useTradeStore.getState().handleConfirmation(confirmation);

    // Order shouldn't exist yet, but confirmation should be buffered
    expect(useTradeStore.getState().pendingOrders[dealReference]).toBeUndefined();

    // 2. REST response finally arrives and order is added
    const order: Order = {
      dealReference,
      epic: 'EURUSD',
      size: 1,
      type: 'MARKET',
      direction: 'BUY',
      status: 'PENDING',
      timestamp: Date.now(),
    };

    // This should internaly check the buffer
    useTradeStore.getState().addPendingOrder(dealReference, order);

    // Advance timers because addPosition is called in setTimeout
    vi.runAllTimers();

    // 3. Verify it immediately transitioned to ACCEPTED
    const updatedOrder = useTradeStore.getState().pendingOrders[dealReference];
    expect(updatedOrder).toBeDefined();
    expect(updatedOrder.status).toBe('ACCEPTED');
    expect(useTradeStore.getState().positions).toHaveLength(1);
  });

  it('should clear buffered confirmation after TTL', async () => {
    const dealReference = 'ref-ttl';
    const confirmation: TradeConfirmation = {
      dealReference,
      status: 'ACCEPTED',
      dealId: 'deal-ttl',
      epic: 'EURUSD',
      size: 1,
      entryPrice: 1.1234,
      timestamp: Date.now(),
    };

    useTradeStore.getState().handleConfirmation(confirmation);
    
    // Fast-forward 31 seconds (TTL is 30s)
    vi.advanceTimersByTime(31000);

    // Now REST arrives
    const order: Order = {
      dealReference,
      epic: 'EURUSD',
      size: 1,
      type: 'MARKET',
      direction: 'BUY',
      status: 'PENDING',
      timestamp: Date.now(),
    };

    useTradeStore.getState().addPendingOrder(dealReference, order);

    // Should stay PENDING because buffer was cleared
    expect(useTradeStore.getState().pendingOrders[dealReference].status).toBe('PENDING');
    expect(useTradeStore.getState().positions).toHaveLength(0);
  });
});
