import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useTradeStore } from './useTradeStore';
import { tradeApi } from '../api/trade';

// Mock tradeApi
vi.mock('../api/trade', () => ({
  tradeApi: {
    placeMarketOrder: vi.fn(),
    flattenPosition: vi.fn(),
    cancelWorkingOrder: vi.fn(),
    getConfirmation: vi.fn(),
  },
}));

describe('useTradeStore Risk & Position Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useTradeStore.getState().clearOrders();
    useTradeStore.getState().clearPositions();
  });

  it('should include guaranteedStop: true in placeOrder', async () => {
    (tradeApi.placeMarketOrder as any).mockResolvedValue('ref-123');
    
    await useTradeStore.getState().placeOrder({
      epic: 'AAPL',
      size: 1,
      direction: 'BUY',
    });

    expect(tradeApi.placeMarketOrder).toHaveBeenCalledWith(expect.objectContaining({
      guaranteedStop: true,
    }));
  });

  it('should store bid/ofr/stopLevel in pending order', async () => {
    (tradeApi.placeMarketOrder as any).mockResolvedValue('ref-123');
    
    await useTradeStore.getState().placeOrder({
      epic: 'AAPL',
      size: 1,
      direction: 'BUY',
      bid: 149.5,
      ofr: 150.5,
      stopLevel: 140.0,
    });

    const order = useTradeStore.getState().pendingOrders['ref-123'];
    expect(order.bid).toBe(149.5);
    expect(order.ofr).toBe(150.5);
    expect(order.stopLevel).toBe(140.0);
  });

  it('should warn on slippage > 0.5% in handleConfirmation', () => {
    const dealReference = 'ref-123';
    useTradeStore.getState().addPendingOrder(dealReference, {
      dealReference,
      epic: 'AAPL',
      size: 1,
      type: 'MARKET',
      direction: 'BUY',
      status: 'PENDING',
      timestamp: Date.now(),
      ofr: 100.0, // Target price
    });

    // 1% slippage (101.0 vs 100.0)
    useTradeStore.getState().handleConfirmation({
      dealReference,
      status: 'ACCEPTED',
      dealId: 'deal-1',
      epic: 'AAPL',
      size: 1,
      entryPrice: 101.0,
      timestamp: Date.now(),
    });

    const order = useTradeStore.getState().pendingOrders[dealReference];
    expect(order.reason).toContain('Slippage: 1.00%');
  });

  it('should warn if SL is too close to fill price (< 0.1%)', () => {
    const dealReference = 'ref-123';
    useTradeStore.getState().addPendingOrder(dealReference, {
      dealReference,
      epic: 'AAPL',
      size: 1,
      type: 'MARKET',
      direction: 'BUY',
      status: 'PENDING',
      timestamp: Date.now(),
      stopLevel: 99.95,
    });

    // Entry price 100.0, Stop 99.95 -> 0.05% distance
    useTradeStore.getState().handleConfirmation({
      dealReference,
      status: 'ACCEPTED',
      dealId: 'deal-1',
      epic: 'AAPL',
      size: 1,
      entryPrice: 100.0,
      timestamp: Date.now(),
    });

    const order = useTradeStore.getState().pendingOrders[dealReference];
    expect(order.reason).toContain('SL risk: fill price too close to stop level');
  });

  it('should implement flattenPosition action', async () => {
    (tradeApi.flattenPosition as any).mockResolvedValue('ref-close');
    
    await useTradeStore.getState().flattenPosition('deal-1');

    expect(tradeApi.flattenPosition).toHaveBeenCalledWith('deal-1');
    expect(useTradeStore.getState().pendingOrders['ref-close']).toBeDefined();
  });

  it('should implement cancelWorkingOrder action', async () => {
    (tradeApi.cancelWorkingOrder as any).mockResolvedValue('ref-cancel');
    
    await useTradeStore.getState().cancelWorkingOrder('work-1');

    expect(tradeApi.cancelWorkingOrder).toHaveBeenCalledWith('work-1');
    expect(useTradeStore.getState().pendingOrders['ref-cancel']).toBeDefined();
  });
});
