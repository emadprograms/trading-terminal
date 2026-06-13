import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChartHeader } from '../../src/components/ChartHeader';
import { usePriceStore } from '../../src/store/usePriceStore';
import React from 'react';

// No need to mock usePriceStore, we can use the actual store.

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
    // Set initial state
    act(() => {
      usePriceStore.getState().updatePrice('AAPL', 150.00, 150.10, 123456789);
    });

    render(<ChartHeader {...defaultProps} />);
    
    expect(screen.getByText(/150\.00/)).toBeInTheDocument();

    // Update store
    act(() => {
      usePriceStore.getState().updatePrice('AAPL', 150.50, 150.60, 123456790);
    });

    expect(screen.getByText(/150\.50/)).toBeInTheDocument();
  });
});
