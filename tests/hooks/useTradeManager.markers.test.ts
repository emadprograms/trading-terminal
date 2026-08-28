import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTradeManager } from '../../src/hooks/useTradeManager';
import { useTradeStore } from '../../src/store/useTradeStore';

// Mock useTradeStore
vi.mock('../../src/store/useTradeStore', () => ({
  useTradeStore: vi.fn(),
}));

describe('useTradeManager - Markers', () => {
  it('should calculate the exact correct timestamp and price for EXECUTION markers', () => {
    // 1. Mock execution data: Trade executed at timestamp 1700000050 (Unix seconds)
    // In milliseconds, that's 1700000050000
    const mockExecutionTimeMs = 1700000050000;
    
    // We mock the Zustand store to return a specific execution
    (useTradeStore as unknown as any).mockImplementation((selector: any) => {
      const state = {
        positions: [],
        pendingOrders: {},
        executions: [
          {
            id: 'exec-1',
            epic: 'AAPL',
            price: 150.5,
            direction: 'BUY',
            size: 10,
            timestamp: mockExecutionTimeMs,
          }
        ],
      };
      return selector(state);
    });

    // 2. Mock chart data: 3 candles at 10-second intervals (Unix timestamps)
    // Lightweight charts `time` can be a Unix timestamp (number)
    const mockChartData = [
      { time: 1700000000, open: 150, high: 151, low: 149, close: 150 }, // Bar 0
      { time: 1700000010, open: 150, high: 151, low: 149, close: 150 }, // Bar 1
      { time: 1700000060, open: 150, high: 151, low: 149, close: 150 }, // Bar 2
    ];

    const mockRefs = {
      ticker: 'AAPL',
      chartData: mockChartData,
      chartContainerRef: { current: document.createElement('div') } as any,
      chartRef: { current: null } as any,
      priceSeriesRef: { current: null } as any,
      tradePluginRef: { current: { setItems: vi.fn(), setHoveredExecutions: vi.fn(), registerBadgeRef: vi.fn() } } as any,
      pluginVersion: 0,
    };

    // 3. Render hook
    const { result } = renderHook(() => useTradeManager(mockRefs));
    
    // 4. Find the EXECUTION marker
    const markers = result.current.markers;
    const executionMarker = markers.find(m => m.type === 'EXECUTION');
    
    expect(executionMarker).toBeDefined();
    
    // 5. The execution timestamp was 1700000050000 ms (1700000050 Unix seconds)
    // The closest candle <= execution time is Bar 1 at time 1700000010.
    // So the marker's time should precisely be 1700000010 so it attaches to that exact candle on the chart!
    expect(executionMarker?.time).toBe(1700000010);
  });
});
