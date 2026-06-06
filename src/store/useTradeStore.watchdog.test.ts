import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useTradeStore } from './useTradeStore';
import { tradeApi } from '../api/trade';
import { Order } from '../types/trade';

// Mock tradeApi
vi.mock('../api/trade', () => ({
  tradeApi: {
    getConfirmation: vi.fn(),
  },
}));

describe('useTradeStore - Watchdog & Persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Clear localStorage before each test
    window.localStorage.clear();

    useTradeStore.getState().clearOrders();
    useTradeStore.getState().clearPositions();
    vi.useFakeTimers();
  });

  it('should trigger watchdog polling after 2 seconds for pending order', async () => {
    const dealReference = 'ref-watchdog';
    const order: Order = {
      dealReference,
      epic: 'EURUSD',
      size: 1,
      type: 'MARKET',
      direction: 'BUY',
      status: 'PENDING',
      timestamp: Date.now(),
    };

    // 1. Add order
    useTradeStore.getState().addPendingOrder(dealReference, order);
    
    // 2. Setup mock response for polling
    const mockConfirmation = {
      dealReference,
      status: 'ACCEPTED',
      dealId: 'deal-polled',
      epic: 'EURUSD',
      size: 1,
      entryPrice: 1.1234,
      timestamp: Date.now(),
    };
    (tradeApi.getConfirmation as any).mockResolvedValue(mockConfirmation);

    // 3. Fast-forward 2 seconds
    vi.advanceTimersByTime(2100);

    // 4. Verify polling was called
    expect(tradeApi.getConfirmation).toHaveBeenCalledWith(dealReference);
    
    // Wait for promise resolution
    await vi.waitFor(() => {
        expect(useTradeStore.getState().pendingOrders[dealReference].status).toBe('ACCEPTED');
    });
    
    expect(useTradeStore.getState().positions).toHaveLength(1);
  });

  it('should not poll if confirmation arrives via WS before 2 seconds', async () => {
    const dealReference = 'ref-fast-ws';
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

    // WS confirmation arrives at 1s
    vi.advanceTimersByTime(1000);
    useTradeStore.getState().handleConfirmation({
      dealReference,
      status: 'ACCEPTED',
      dealId: 'deal-fast',
      epic: 'EURUSD',
      size: 1,
      entryPrice: 1.1234,
      timestamp: Date.now(),
    });

    // Fast-forward past 2s
    vi.advanceTimersByTime(1500);

    // Should NOT have polled
    expect(tradeApi.getConfirmation).not.toHaveBeenCalled();
  });
});
