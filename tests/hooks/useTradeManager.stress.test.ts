import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTradeManager } from '../../src/hooks/useTradeManager';

describe('useTradeManager STRESS TESTS', () => {
  it('should handle rapid renders', () => {
    const mockRefs = {
      ticker: 'AAPL',
      chartData: [],
      chartContainerRef: { current: document.createElement('div') } as any,
      chartRef: { current: null } as any,
      priceSeriesRef: { current: null } as any,
      tradePluginRef: { current: { setItems: vi.fn(), setHoveredExecutions: vi.fn(), registerBadgeRef: vi.fn() } } as any,
      pluginVersion: 0,
    };

    const { result, rerender } = renderHook(() => useTradeManager(mockRefs));
    expect(result.current.markers).toBeDefined();

    for (let i = 0; i < 100; i++) {
        rerender({ ...mockRefs, pluginVersion: i });
    }
    
    expect(result.current.markers).toBeInstanceOf(Array);
  });
});
