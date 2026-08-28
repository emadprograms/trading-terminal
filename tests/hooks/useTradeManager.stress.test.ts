import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useTradeManager } from '../../src/hooks/useTradeManager';
import { useTradeStore } from '../../src/store/useTradeStore';

describe('useTradeManager STRESS TESTS', () => {
  it('should handle rapid renders', () => {
    const mockRefs = {
      ticker: 'AAPL',
      chartData: [],
      chartContainerRef: { current: null } as any,
      chartRef: { current: null } as any,
      priceSeriesRef: { current: null } as any,
      tradePluginRef: { current: null } as any,
      pluginVersion: 0,
    };
    
    const { result, rerender } = renderHook(() => useTradeManager(mockRefs));
    
    for(let i=0; i<100; i++) {
      rerender();
    }
    
    expect(result.current.markers).toBeInstanceOf(Array);
  });

  it('should parse markers synchronously but extremely fast with binary search', () => {
    // Generate massive mock chart data and executions
    const chartData = Array.from({ length: 10000 }).map((_, i) => ({
      time: 1600000000 + i * 3600,
      open: 100, high: 101, low: 99, close: 100
    }));

    useTradeStore.setState({
      executions: Array.from({ length: 500 }).map((_, i) => ({
        id: `exec_${i}`,
        dealId: `deal_${i}`,
        epic: 'AAPL',
        size: 1,
        price: 100,
        direction: 'BUY',
        timestamp: 1600000000 + i * 3600 * 10,
        action: 'ENTRY'
      })),
      positions: [],
      pendingOrders: {}
    });

    const mockRefs = {
      ticker: 'AAPL',
      chartData,
      chartContainerRef: { current: document.createElement('div') } as any,
      chartRef: { current: null } as any,
      priceSeriesRef: { current: null } as any,
      tradePluginRef: { current: { setItems: vi.fn(), setHoveredExecutions: vi.fn(), registerBadgeRef: vi.fn() } } as any,
      pluginVersion: 0,
    };

    const start = performance.now();
    const { result } = renderHook(() => useTradeManager(mockRefs));
    const renderDuration = performance.now() - start;

    // Render must be fast even if synchronous (binary search makes it fast)
    expect(renderDuration).toBeLessThan(50); // Less than 50ms for initial render

    // Check if the calculation completed successfully
    expect(result.current.markers.length).toBe(500);
  });
});
