import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useTradeStore } from './useTradeStore';
import { tradeApi } from '../api/trade';

vi.mock('../api/trade', () => ({
  tradeApi: {
    placeMarketOrder: vi.fn(),
    placeLimitOrder: vi.fn(),
    getConfirmation: vi.fn(),
  },
}));

describe('useTradeStore', () => {
  beforeEach(() => {
    useTradeStore.getState().clearOrders();
    vi.clearAllMocks();
  });

  it('should place a market order and add to pendingOrders', async () => {
    const dealReference = 'deal_123';
    (tradeApi.placeMarketOrder as any).mockResolvedValue({ dealReference });

    await useTradeStore.getState().placeOrder({
      epic: 'AAPL',
      direction: 'BUY',
      size: 1,
      type: 'MARKET'
    });

    const state = useTradeStore.getState();
    expect(state.pendingOrders[dealReference]).toBeDefined();
    expect(state.pendingOrders[dealReference].status).toBe('PENDING');
    expect(tradeApi.placeMarketOrder).toHaveBeenCalled();
  });

  it('should handle successful confirmation', () => {
    const dealReference = 'deal_123';
    const order = {
      epic: 'AAPL',
      direction: 'BUY',
      size: 1,
      type: 'MARKET',
      status: 'PENDING',
      dealReference,
      timestamp: Date.now()
    };

    useTradeStore.getState().addPendingOrder(dealReference, order as any);

    useTradeStore.getState().handleConfirmation({
      dealReference,
      dealId: 'id_123',
      status: 'ACCEPTED',
      epic: 'AAPL',
      size: 1,
      direction: 'BUY',
      level: 150
    });

    const state = useTradeStore.getState();
    expect(state.pendingOrders[dealReference].status).toBe('ACCEPTED');
    expect(state.positions).toHaveLength(1);
    expect(state.positions[0].dealId).toBe('id_123');
  });

  it('should handle rejected confirmation', () => {
    const dealReference = 'deal_123';
    const order = {
      epic: 'AAPL',
      direction: 'BUY',
      size: 1,
      type: 'MARKET',
      status: 'PENDING',
      dealReference,
      timestamp: Date.now()
    };

    useTradeStore.getState().addPendingOrder(dealReference, order as any);

    useTradeStore.getState().handleConfirmation({
      dealReference,
      dealId: 'id_123',
      status: 'REJECTED',
      reason: 'INSUFFICIENT_FUNDS',
      epic: 'AAPL',
      size: 1,
      direction: 'BUY',
      level: 150
    });

    const state = useTradeStore.getState();
    expect(state.pendingOrders[dealReference].status).toBe('REJECTED');
    expect(state.pendingOrders[dealReference].reason).toBe('INSUFFICIENT_FUNDS');
    expect(state.positions).toHaveLength(0);
  });

  it('should poll for confirmation if not received within 5s', async () => {
    vi.useFakeTimers();
    const dealReference = 'deal_123';
    (tradeApi.placeMarketOrder as any).mockResolvedValue({ dealReference });
    (tradeApi.getConfirmation as any).mockResolvedValue({
      dealReference,
      dealId: 'id_123',
      status: 'ACCEPTED',
      epic: 'AAPL',
      size: 1,
      direction: 'BUY',
      level: 150
    });

    await useTradeStore.getState().placeOrder({
      epic: 'AAPL',
      direction: 'BUY',
      size: 1,
      type: 'MARKET'
    });

    // Advance time by 5s
    vi.advanceTimersByTime(5100);

    expect(tradeApi.getConfirmation).toHaveBeenCalledWith(dealReference);
    
    // Wait for the async poll to complete
    await vi.runAllTimersAsync();

    const state = useTradeStore.getState();
    expect(state.pendingOrders[dealReference].status).toBe('ACCEPTED');
    expect(state.positions).toHaveLength(1);

    vi.useRealTimers();
  });
});
