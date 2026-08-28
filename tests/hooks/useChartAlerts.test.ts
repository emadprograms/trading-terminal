import { renderHook } from '@testing-library/react';
import { useChartAlerts } from '../../src/hooks/chart/useChartAlerts';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAlertStore } from '../../src/store/useAlertStore';

describe('useChartAlerts', () => {
  let mockSeries: any;
  let mockLine: any;
  let priceSeriesRef: any;

  beforeEach(() => {
    vi.clearAllMocks();
    useAlertStore.setState({ alerts: [] }); // Reset store

    mockLine = {
      applyOptions: vi.fn(),
    };

    mockSeries = {
      createPriceLine: vi.fn().mockReturnValue(mockLine),
      removePriceLine: vi.fn(),
    };

    priceSeriesRef = { current: mockSeries };
  });

  it('creates lines for active alerts', () => {
    // Add alert before hook renders
    useAlertStore.setState({
      alerts: [{
        id: '1', epic: 'AAPL', targetPrice: 150, condition: 'above', triggered: false, createdAt: 1
      }]
    });

    renderHook(() => useChartAlerts({ ticker: 'AAPL', priceSeriesRef, theme: 'light' }));
    
    expect(mockSeries.createPriceLine).toHaveBeenCalledWith(expect.objectContaining({
      price: 150,
      color: '#ff9800'
    }));
  });

  it('does not create lines for triggered alerts or other tickers', () => {
    useAlertStore.setState({
      alerts: [
        { id: '1', epic: 'AAPL', targetPrice: 150, condition: 'above', triggered: true, createdAt: 1 },
        { id: '2', epic: 'MSFT', targetPrice: 250, condition: 'above', triggered: false, createdAt: 2 }
      ]
    });

    renderHook(() => useChartAlerts({ ticker: 'AAPL', priceSeriesRef, theme: 'light' }));
    
    expect(mockSeries.createPriceLine).not.toHaveBeenCalled();
  });

  it('updates existing lines when alert price changes (store subscribe)', () => {
    renderHook(() => useChartAlerts({ ticker: 'AAPL', priceSeriesRef, theme: 'light' }));

    useAlertStore.setState({
      alerts: [{ id: '1', epic: 'AAPL', targetPrice: 150, condition: 'above', triggered: false, createdAt: 1 }]
    });

    expect(mockSeries.createPriceLine).toHaveBeenCalledTimes(1);

    useAlertStore.setState({
      alerts: [{ id: '1', epic: 'AAPL', targetPrice: 160, condition: 'above', triggered: false, createdAt: 1 }]
    });

    expect(mockLine.applyOptions).toHaveBeenCalledWith({ price: 160 });
    expect(mockSeries.createPriceLine).toHaveBeenCalledTimes(1); // Not created again
  });

  it('removes lines when alerts are removed or triggered', () => {
    useAlertStore.setState({
      alerts: [{ id: '1', epic: 'AAPL', targetPrice: 150, condition: 'above', triggered: false, createdAt: 1 }]
    });

    renderHook(() => useChartAlerts({ ticker: 'AAPL', priceSeriesRef, theme: 'light' }));
    
    // Now trigger it
    useAlertStore.setState({
      alerts: [{ id: '1', epic: 'AAPL', targetPrice: 150, condition: 'above', triggered: true, createdAt: 1 }]
    });

    expect(mockSeries.removePriceLine).toHaveBeenCalledWith(mockLine);
  });

  it('clears all lines on unmount', () => {
    useAlertStore.setState({
      alerts: [{ id: '1', epic: 'AAPL', targetPrice: 150, condition: 'above', triggered: false, createdAt: 1 }]
    });

    const { unmount } = renderHook(() => useChartAlerts({ ticker: 'AAPL', priceSeriesRef, theme: 'light' }));
    unmount();

    expect(mockSeries.removePriceLine).toHaveBeenCalledWith(mockLine);
  });

  it('clears all lines on ticker change', () => {
    useAlertStore.setState({
      alerts: [{ id: '1', epic: 'AAPL', targetPrice: 150, condition: 'above', triggered: false, createdAt: 1 }]
    });

    const { rerender } = renderHook(
      (props) => useChartAlerts(props),
      { initialProps: { ticker: 'AAPL', priceSeriesRef, theme: 'light' as const } }
    );

    rerender({ ticker: 'MSFT', priceSeriesRef, theme: 'light' });

    expect(mockSeries.removePriceLine).toHaveBeenCalledWith(mockLine);
  });
});
