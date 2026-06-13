import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useTradeStore } from './useTradeStore';
import { tradeApi } from '../services/trade';

// Mock tradeApi
vi.mock('../services/trade', () => ({
  tradeApi: {
    flattenPosition: vi.fn(),
    cancelWorkingOrder: vi.fn(),
    placeMarketOrder: vi.fn(),
    getConfirmation: vi.fn(),
  },
}));

describe('useTradeStore - Logic Hardening', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useTradeStore.getState().clearPositions();
    useTradeStore.getState().clearOrders();
    vi.useFakeTimers();
  });

  it('flattenAll iterates through active positions with 100ms sleep', async () => {
    // 1. Setup positions
    useTradeStore.setState({
      positions: [
        { dealId: 'd1', epic: 'AAPL', size: 1, direction: 'BUY', entryPrice: 150, timestamp: Date.now() },
        { dealId: 'd2', epic: 'GOOG', size: 1, direction: 'BUY', entryPrice: 2800, timestamp: Date.now() },
      ]
    });

    (tradeApi.flattenPosition as any).mockResolvedValue('ref');

    // 2. Trigger flattenAll
    const flattenPromise = useTradeStore.getState().flattenAll();

    // 3. Check first call
    await vi.waitFor(() => {
        expect(tradeApi.flattenPosition).toHaveBeenCalledWith('d1', expect.anything());
    });
    
    // 4. Fast-forward 100ms
    await vi.advanceTimersByTimeAsync(100);
    
    // 5. Check second call
    await vi.waitFor(() => {
        expect(tradeApi.flattenPosition).toHaveBeenCalledWith('d2', expect.anything());
    });

    // 6. Fast-forward again for the last throttle
    await vi.advanceTimersByTimeAsync(100);
    
    await flattenPromise;
    expect(useTradeStore.getState().isExecuting).toBe(false);
  });

  it('flattenAll uses try-finally to ensure state safety on failure', async () => {
    useTradeStore.setState({
      positions: [
        { dealId: 'd1', epic: 'AAPL', size: 1, direction: 'BUY', entryPrice: 150, timestamp: Date.now() },
      ]
    });

    (tradeApi.flattenPosition as any).mockRejectedValue(new Error('API Fail'));

    const flattenPromise = useTradeStore.getState().flattenAll();
    
    // Advance past the throttle
    await vi.advanceTimersByTimeAsync(100);
    await flattenPromise;

    // Verify state was reset even on failure
    expect(useTradeStore.getState().isExecuting).toBe(false);
    expect(useTradeStore.getState().closingDealIds.size).toBe(0);
  });

  it('closingDealIds correctly tracks individual deal IDs', async () => {
    useTradeStore.setState({
      positions: [
        { dealId: 'd1', epic: 'AAPL', size: 1, direction: 'BUY', entryPrice: 150, timestamp: Date.now() },
      ]
    });

    let resolveFlatten: any;
    const promise = new Promise((resolve) => { resolveFlatten = resolve; });
    (tradeApi.flattenPosition as any).mockReturnValue(promise);

    // Start flattening
    const flattenAllPromise = useTradeStore.getState().flattenAll();

    // Wait for microtasks so it hits the first iteration
    await vi.advanceTimersByTimeAsync(0);

    // Check if d1 is in closingDealIds
    expect(useTradeStore.getState().closingDealIds.has('d1')).toBe(true);

    // Resolve API call
    resolveFlatten('ref');
    
    // Advance timers to trigger throttle and loop end
    await vi.advanceTimersByTimeAsync(100);
    await flattenAllPromise;

    // Check if d1 was removed
    expect(useTradeStore.getState().closingDealIds.has('d1')).toBe(false);
  });

  it('cancelAllWorkingOrders implements same throttling logic', async () => {
    useTradeStore.setState({
      pendingOrders: {
        'ref1': { dealReference: 'ref1', epic: 'AAPL', size: 1, direction: 'BUY', type: 'LIMIT', level: 140, status: 'PENDING', timestamp: Date.now() },
        'ref2': { dealReference: 'ref2', epic: 'GOOG', size: 1, direction: 'BUY', type: 'STOP', level: 2700, status: 'PENDING', timestamp: Date.now() },
      }
    });

    (tradeApi.cancelWorkingOrder as any).mockResolvedValue('ref');

    const cancelPromise = useTradeStore.getState().cancelAllWorkingOrders();

    await vi.waitFor(() => {
        expect(tradeApi.cancelWorkingOrder).toHaveBeenCalled();
    });
    
    await vi.advanceTimersByTimeAsync(100);
    
    await vi.waitFor(() => {
        expect(tradeApi.cancelWorkingOrder).toHaveBeenCalledTimes(2);
    });

    await vi.advanceTimersByTimeAsync(100);
    await cancelPromise;
    expect(useTradeStore.getState().isExecuting).toBe(false);
  });
});
