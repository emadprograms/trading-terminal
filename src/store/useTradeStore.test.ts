import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useTradeStore } from './useTradeStore';
import { Order, Position } from '../types/trade';
import { tradeApi } from '../services/trade';

// Mock tradeApi
vi.mock('../services/trade', () => ({
  tradeApi: {
    placeMarketOrder: vi.fn(),
    placeLimitOrder: vi.fn(),
    flattenPosition: vi.fn(),
    cancelWorkingOrder: vi.fn(),
    getConfirmation: vi.fn(),
  }
}));

describe('useTradeStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useTradeStore.getState().clearOrders();
    const state = useTradeStore.getState();
    if (typeof state.clearPositions === 'function') {
      state.clearPositions();
    }
    useTradeStore.setState({ isExecuting: false });
    vi.clearAllMocks();
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

  it('should route MARKET orders to placeMarketOrder', async () => {
    vi.mocked(tradeApi.placeMarketOrder).mockResolvedValue('ref-market');
    
    await useTradeStore.getState().placeOrder({
      epic: 'AAPL',
      size: 1,
      direction: 'BUY',
      // @ts-ignore - testing runtime behavior
      type: 'MARKET'
    });

    expect(tradeApi.placeMarketOrder).toHaveBeenCalled();
    expect(tradeApi.placeLimitOrder).not.toHaveBeenCalled();
  });

  it('should route LIMIT/STOP orders to placeLimitOrder', async () => {
    vi.mocked(tradeApi.placeLimitOrder).mockResolvedValue('ref-limit');
    
    await useTradeStore.getState().placeOrder({
      epic: 'AAPL',
      size: 1,
      direction: 'BUY',
      // @ts-ignore - testing routing
      type: 'LIMIT',
      level: 150
    });

    expect(tradeApi.placeLimitOrder).toHaveBeenCalled();
    expect(tradeApi.placeMarketOrder).not.toHaveBeenCalled();
  });

  it('should respect guaranteedStop preference', async () => {
    vi.mocked(tradeApi.placeMarketOrder).mockResolvedValue('ref-gs');
    
    await useTradeStore.getState().placeOrder({
      epic: 'AAPL',
      size: 1,
      direction: 'BUY',
      guaranteedStop: false
    });

    const callArgs = vi.mocked(tradeApi.placeMarketOrder).mock.calls[0][0];
    expect(callArgs.guaranteedStop).toBe(false);
  });

  it('should reset isExecuting if API call fails immediately', async () => {
    vi.mocked(tradeApi.placeMarketOrder).mockRejectedValue(new Error('API Error'));
    
    try {
      await useTradeStore.getState().placeOrder({
        epic: 'AAPL',
        size: 1,
        direction: 'BUY'
      });
    } catch (e) {
      // expected
    }

    expect(useTradeStore.getState().isExecuting).toBe(false);
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
