import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useChartData } from '../../../src/hooks/useChartData';
import { syncCoordinator } from '../../../src/lib/sync-coordinator';
import { fetchHistoricalChunk } from '../../../src/lib/db';
import { useWorkspaceStore } from '../../../src/store/useWorkspaceStore';
import { wsManager } from '../../../src/lib/ws-manager';

vi.mock('../../../src/lib/sync-coordinator');
vi.mock('../../../src/lib/db');
vi.mock('../../../src/lib/ws-manager');
vi.mock('../../../src/store/useWorkspaceStore', async () => {
  const actual = await vi.importActual('../../../src/store/useWorkspaceStore');
  return {
    ...actual,
    useWorkspaceStore: vi.fn((selector) => {
      const state = {
        groups: {},
        groupTickers: {},
        tickers: { '1': 'AAPL' },
      };
      return selector(state);
    }),
  };
});

describe('useChartData', () => {
  const mockParams = {
    id: 1,
    initialTicker: 'AAPL',
    initialTf: '1H',
    initialEth: false,
    selectedDate: '2024-01-01',
    isReplayMode: false,
    groupColor: 'none',
    tickers: ['AAPL', 'MSFT'],
    chartRef: { current: {
      timeScale: () => ({
        subscribeVisibleLogicalRangeChange: vi.fn(),
        unsubscribeVisibleLogicalRangeChange: vi.fn(),
        getVisibleLogicalRange: vi.fn().mockReturnValue({ from: 50, to: 500 }),
      }),
    }},
    priceSeriesRef: { current: { data: vi.fn().mockReturnValue([]) } },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should sync ticker data on mount', async () => {
    (syncCoordinator.syncTicker as any).mockResolvedValue([
      { time: '2024-01-01', open: 100, high: 110, low: 90, close: 105, session: 'REG' }
    ]);

    const { result } = renderHook(() => useChartData(mockParams));

    // Use act to handle the async effect
    await act(async () => {
      // wait for useEffect
    });

    expect(syncCoordinator.syncTicker).toHaveBeenCalledWith(
      'AAPL', 
      '1H', 
      '2024-01-01', 
      1000
    );
    expect(result.current.localMasterData).toHaveLength(1);
  });

  it('should unsubscribe from ticker on unmount', () => {
    const { unmount } = renderHook(() => useChartData(mockParams));
    unmount();
    expect(wsManager.unsubscribe).toHaveBeenCalledWith('AAPL');
  });

  it('should fetch historical chunk when scrolling left', async () => {
    let rangeCallback: (range: any) => void = () => {};
    
    // Mock the timeScale subscribe to capture the callback
    (mockParams.chartRef.current.timeScale().subscribeVisibleLogicalRangeChange as any).mockImplementation((cb: any) => {
      rangeCallback = cb;
      return () => {};
    });

    (syncCoordinator.syncTicker as any).mockResolvedValue([
      { time: '2024-01-01', open: 100, high: 110, low: 90, close: 105, session: 'REG' }
    ]);

    (fetchHistoricalChunk as any).mockResolvedValue([
      { time: '2023-12-31', open: 95, high: 105, low: 90, close: 100, session: 'REG' }
    ]);

    const { result } = renderHook(() => useChartData(mockParams));
    
    await act(async () => {});

    // Simulate scrolling left (range.from < 100)
    await act(async () => {
      rangeCallback({ from: 50, to: 550 });
    });

    expect(fetchHistoricalChunk).toHaveBeenCalled();
    expect(result.current.localMasterData).toHaveLength(2);
  });
});
