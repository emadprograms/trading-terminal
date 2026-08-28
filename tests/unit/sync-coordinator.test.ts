import { describe, it, expect, vi, beforeEach } from 'vitest';
import { syncCoordinator } from '../../src/lib/sync-coordinator';
import { wsManager } from '../../src/lib/ws-manager';
import { fetchMarketData, fetchHistoricalChunk } from '../../src/lib/db';
import { usePriceStore } from '../../src/store/usePriceStore';

vi.mock('../../src/lib/ws-manager', () => ({
  wsManager: {
    subscribe: vi.fn(),
    setBuffering: vi.fn(),
    getAndClearBuffer: vi.fn(),
  }
}));

vi.mock('../../src/lib/db', () => ({
  fetchMarketData: vi.fn(),
  fetchHistoricalChunk: vi.fn(),
}));

vi.mock('../../src/store/usePriceStore', () => ({
  usePriceStore: {
    getState: vi.fn(() => ({
      updatePrice: vi.fn(),
    })),
    subscribe: vi.fn(),
  }
}));

describe('SyncCoordinator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return history directly if no buffered ticks exist', async () => {
    const mockHistory = [{ time: '2026-06-05 08:00:00', open: 100, high: 105, low: 95, close: 102, volume: 1000, session: 'REG' }];
    vi.mocked(fetchMarketData).mockResolvedValue(mockHistory as any);
    vi.mocked(wsManager.getAndClearBuffer).mockReturnValue([]);

    const result = await syncCoordinator.syncTicker('SPY', '5min', '2026-06-05T08:00:00', 1000);

    expect(result).toEqual(mockHistory);
    expect(wsManager.subscribe).toHaveBeenCalledWith('SPY', true);
    expect(wsManager.setBuffering).toHaveBeenCalledWith('SPY', false);
  });

  it('should detect outage gap and throw DataStitchingError if gap exceeds maxOutageGapMs', async () => {
    const lastRestTime = '2026-06-05 08:00:00';
    const mockHistory = [{ time: lastRestTime, open: 100, high: 105, low: 95, close: 102, volume: 1000, session: 'REG' }];
    
    // Pre-populate cache so wasFreshlyFetched = false
    vi.mocked(fetchMarketData).mockResolvedValue(mockHistory as any);
    await syncCoordinator.syncTicker('SPY2', '5min', '2026-06-05T08:00:00', 1000);
    
    // WS tick at 11:00 (3 hour gap > 2 hour maxOutageGapMs)
    const firstWsTime = new Date('2026-06-05T11:00:00Z').getTime();
    const mockBuffer = [{ bid: 103, ofr: 104, timestamp: firstWsTime }];

    vi.mocked(wsManager.getAndClearBuffer).mockReturnValue(mockBuffer);
    vi.mocked(fetchHistoricalChunk).mockResolvedValue([]); // Bridge fetch returns nothing

    await expect(syncCoordinator.syncTicker('SPY2', '5min', '2026-06-05T11:00:00', 1000))
      .rejects.toThrow('Timestamp continuity broken');
  });

  it('should skip redundant bridge fetch if history was freshly fetched (sparse data)', async () => {
    const lastRestTime = '2026-06-05 08:00:00';
    const mockHistory = [{ time: lastRestTime, open: 100, high: 105, low: 95, close: 102, volume: 1000, session: 'REG' }];
    
    // Gap of 30 mins (> threshold of 7.5 mins for 5min TF), but < 2 hours maxOutageGapMs
    const firstWsTime = new Date('2026-06-05T08:30:00Z').getTime();
    const mockBuffer = [{ bid: 103, ofr: 104, timestamp: firstWsTime }];
    
    // We are simulating an initial fetch (wasFreshlyFetched = true)
    vi.mocked(fetchMarketData).mockResolvedValue(mockHistory as any);
    vi.mocked(wsManager.getAndClearBuffer).mockReturnValue(mockBuffer);

    const result = await syncCoordinator.syncTicker('SPY3', '5min', '2026-06-05T08:30:00Z', 1000);

    // Should return history, not throw error, and not call fetchHistoricalChunk
    expect(result).toEqual(mockHistory);
    expect(vi.mocked(fetchHistoricalChunk)).not.toHaveBeenCalled();
  });

  it('should fetch bridge if gap is detected and data was from cache', async () => {
    const lastRestTime = '2026-06-05 08:00:00';
    const mockHistory = [{ time: lastRestTime, open: 100, high: 105, low: 95, close: 102, volume: 1000, session: 'REG' }];
    
    // Pre-populate cache so wasFreshlyFetched = false
    vi.mocked(fetchMarketData).mockResolvedValue(mockHistory as any);
    await syncCoordinator.syncTicker('SPY4', '5min', '2026-06-05T08:00:00', 1000);

    // Gap of 10 mins (> 7.5 min threshold)
    const firstWsTime = new Date('2026-06-05T08:10:00Z').getTime();
    const mockBuffer = [{ bid: 103, ofr: 104, timestamp: firstWsTime }];
    
    const bridgeData = [{ time: '2026-06-05 08:05:00', open: 100, high: 105, low: 95, close: 102, volume: 1000, session: 'REG' }];
    vi.mocked(wsManager.getAndClearBuffer).mockReturnValue(mockBuffer);
    vi.mocked(fetchHistoricalChunk).mockResolvedValue(bridgeData as any);

    const result = await syncCoordinator.syncTicker('SPY4', '5min', '2026-06-05T08:10:00', 1000);

    expect(vi.mocked(fetchHistoricalChunk)).toHaveBeenCalled();
    // Expected to merge history and bridge data
    expect(result.length).toBe(2);
    expect(result[1].time).toBe('2026-06-05 08:05:00');
  });

  it('should not fetch bridge if gap is within threshold', async () => {
    const lastRestTime = '2026-06-05 08:00:00';
    const mockHistory = [{ time: lastRestTime, open: 100, high: 105, low: 95, close: 102, volume: 1000, session: 'REG' }];
    
    // WS tick at 08:02 (2 min gap < 7.5 min threshold for 5min TF)
    const firstWsTime = new Date('2026-06-05T08:02:00Z').getTime();
    const mockBuffer = [{ bid: 103, ofr: 104, timestamp: firstWsTime }];

    vi.mocked(fetchMarketData).mockResolvedValue(mockHistory as any);
    vi.mocked(wsManager.getAndClearBuffer).mockReturnValue(mockBuffer);

    const result = await syncCoordinator.syncTicker('SPY', '5min', '2026-06-05T08:02:00', 1000);

    expect(vi.mocked(fetchHistoricalChunk)).not.toHaveBeenCalled();
    expect(result).toEqual(mockHistory);
  });
});
