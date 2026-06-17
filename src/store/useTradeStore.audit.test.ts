import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useTradeStore } from './useTradeStore';
import { tradeApi } from '../services/trade';

vi.mock('../services/trade', () => ({
  tradeApi: {
    placeMarketOrder: vi.fn(),
    placeLimitOrder: vi.fn(),
    cancelWorkingOrder: vi.fn(),
    updatePosition: vi.fn(),
    fetchPositions: vi.fn().mockResolvedValue([]),
    fetchWorkingOrders: vi.fn().mockResolvedValue([])
  }
}));

vi.mock('./usePriceStore', () => ({
  usePriceStore: {
    getState: () => ({
      prices: { 'AAPL': { bid: 100, ask: 101 } }
    })
  }
}));

describe('Phase 4: Order System Audit', () => {
  beforeEach(() => {
    useTradeStore.setState({ 
      executingOperations: new Set(), 
      pendingOrders: {},
      positions: []
    });
    vi.clearAllMocks();
  });

  it('placeOrder sets and clears executingOperations lock (AUDIT-01)', async () => {
    let resolveApi: any;
    const apiPromise = new Promise(resolve => { resolveApi = resolve; });
    (tradeApi.placeMarketOrder as any).mockReturnValue(apiPromise);

    const placePromise = useTradeStore.getState().placeOrder({ epic: 'AAPL', direction: 'BUY', size: 1, type: 'MARKET' });
    
    expect(useTradeStore.getState().executingOperations.has('placeOrder_AAPL')).toBe(true);

    await expect(useTradeStore.getState().placeOrder({ epic: 'AAPL', direction: 'BUY', size: 1, type: 'MARKET' })).rejects.toThrow('Operation in progress');

    resolveApi('deal-1');
    await placePromise;

    expect(useTradeStore.getState().executingOperations.has('placeOrder_AAPL')).toBe(false);
  });

  it('cancelWorkingOrder sets and clears executingOperations lock (AUDIT-01)', async () => {
    useTradeStore.setState({ pendingOrders: { 'order-1': { dealReference: 'order-1', epic: 'AAPL', size: 1, direction: 'BUY', status: 'PENDING', timestamp: 0 } as any } });
    
    let resolveApi: any;
    const apiPromise = new Promise(resolve => { resolveApi = resolve; });
    (tradeApi.cancelWorkingOrder as any).mockReturnValue(apiPromise);

    const cancelPromise = useTradeStore.getState().cancelWorkingOrder('order-1');
    
    expect(useTradeStore.getState().executingOperations.has('cancel_order-1')).toBe(true);

    await useTradeStore.getState().cancelWorkingOrder('order-1');
    expect(tradeApi.cancelWorkingOrder).toHaveBeenCalledTimes(1);

    resolveApi();
    await cancelPromise;

    expect(useTradeStore.getState().executingOperations.has('cancel_order-1')).toBe(false);
  });

  it('cancelWorkingOrder handles _SL and _TP suffixes (ORDER-02)', async () => {
    (tradeApi.updatePosition as any).mockResolvedValue({});
    useTradeStore.setState({ positions: [{ dealId: 'pos-1', epic: 'AAPL', size: 1, direction: 'BUY', entryPrice: 100, stopLevel: 90, profitLevel: 110, timestamp: 0 }] });

    await useTradeStore.getState().cancelWorkingOrder('pos-1_SL');
    expect(tradeApi.updatePosition).toHaveBeenCalledWith('pos-1', { stopLevel: null, profitLevel: 110 });
    expect(tradeApi.cancelWorkingOrder).not.toHaveBeenCalled();

    await useTradeStore.getState().cancelWorkingOrder('pos-1_TP');
    // We expect stopLevel: 90 because we reset the state manually or because the first updatePosition doesn't mutate our mocked state instantly.
    // However, the test store state was manually updated in optimistic UI? Let's check useTradeStore optimistic UI update.
    // `useTradeStore` optimistic update in `updatePositionStopLoss` updates the state, so stopLevel will be `undefined`.
    // Wait, let's just make the assertion loose or reset state between calls.
    useTradeStore.setState({ positions: [{ dealId: 'pos-1', epic: 'AAPL', size: 1, direction: 'BUY', entryPrice: 100, stopLevel: 90, profitLevel: 110, timestamp: 0 }] });
    await useTradeStore.getState().cancelWorkingOrder('pos-1_TP');
    expect(tradeApi.updatePosition).toHaveBeenCalledWith('pos-1', { profitLevel: null, stopLevel: 90 });
  });

  it('syncPositions does not crash when pendingOrders is accessed (ORDER-03)', async () => {
     useTradeStore.setState({ pendingOrders: { 'order-1': { dealReference: 'order-1', epic: 'AAPL', size: 1, direction: 'BUY', status: 'PENDING', timestamp: 0 } as any } });
     (tradeApi.fetchPositions as any).mockResolvedValue([]);
     (tradeApi.fetchWorkingOrders as any).mockResolvedValue([]);
     
     await expect(useTradeStore.getState().syncPositions()).resolves.not.toThrow();
  });

  it('placeOrder limit/stop fetches price correctly (Task 5)', async () => {
    (tradeApi.placeLimitOrder as any).mockResolvedValue('limit-1');
    
    await expect(useTradeStore.getState().placeOrder({ epic: 'AAPL', type: 'LIMIT', level: 90, size: 1, direction: 'BUY' })).resolves.toBe('limit-1');
    expect(tradeApi.placeLimitOrder).toHaveBeenCalledWith(expect.objectContaining({ type: 'LIMIT', level: 90 }));
  });
});
