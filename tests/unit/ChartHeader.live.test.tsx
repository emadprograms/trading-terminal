import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChartHeader } from '../../src/components/ChartHeader';
import { usePriceStore } from '../../src/store/usePriceStore';
import React from 'react';

// Mock Store
vi.mock('../../src/store/usePriceStore', () => ({
  usePriceStore: {
    getState: vi.fn(),
    subscribe: vi.fn(),
  },
}));

describe('ChartHeader Live Price Integration', () => {
  const defaultProps = {
    ticker: 'AAPL',
    setTicker: vi.fn(),
    timeframe: '5min',
    setTimeframe: vi.fn(),
    showEth: false,
    setShowEth: vi.fn(),
    showVP: false,
    setShowVP: vi.fn(),
    isDrawingMode: false,
    setIsDrawingMode: vi.fn(),
    drawType: 'ray',
    setDrawType: vi.fn(),
    tickers: ['AAPL'],
    groupColor: 'none',
    onGroupChange: vi.fn(),
    onTickerChange: vi.fn(),
    onUpdateDrawings: vi.fn(),
    isMaximized: false,
    onToggleMaximize: vi.fn(),
  };

  it('should update displayed price when usePriceStore updates', async () => {
    let listener: (state: any) => void = () => {};
    
    // Capture the store subscription
    (usePriceStore.subscribe as any).mockImplementation((cb: any) => {
      listener = cb;
      return () => {};
    });

    // Mock initial state
    (usePriceStore.getState as any).mockReturnValue({
      prices: { 'AAPL': { bid: 150.00, ask: 150.10, timestamp: 123456789 } }
    });

    render(<ChartHeader {...defaultProps} />);
    
    expect(screen.getByText(/150\.00/)).toBeInTheDocument();

    // Update store and trigger listener
    act(() => {
      (usePriceStore.getState as any).mockReturnValue({
        prices: { 'AAPL': { bid: 150.50, ask: 150.60, timestamp: 123456790 } }
      });
      listener({}); 
    });

    expect(screen.getByText(/150\.50/)).toBeInTheDocument();
  });
});
