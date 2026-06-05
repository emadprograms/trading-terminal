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

  it('should detect gap and fetch bridge data', async () => {
    const lastRestTime = '2026-06-05 08:00:00';
    const mockHistory = [{ time: lastRestTime, open: 100, high: 105, low: 95, close: 102, volume: 1000, session: 'REG' }];
    
    // WS tick at 08:15 (15 min gap > 10 min threshold for 5min TF)
    const firstWsTime = new Date('2026-06-05T08:15:00Z').getTime();
    const mockBuffer = [{ bid: 103, ofr: 104, timestamp: firstWsTime }];
    
    const mockBridge = [
      { time: '2026-06-05 08:05:00', open: 102, high: 103, low: 101, close: 102.5, volume: 500, session: 'REG' },
      { time: '2026-06-05 08:10:00', open: 102.5, high: 104, low: 102, close: 103.5, volume: 600, session: 'REG' }
    ];

    vi.mocked(fetchMarketData).mockResolvedValue(mockHistory as any);
    vi.mocked(wsManager.getAndClearBuffer).mockReturnValue(mockBuffer);
    vi.mocked(fetchHistoricalChunk).mockResolvedValue(mockBridge as any);

    const result = await syncCoordinator.syncTicker('SPY', '5min', '2026-06-05T08:15:00', 1000);

    expect(vi.mocked(fetchHistoricalChunk)).toHaveBeenCalled();
    expect(result.length).toBe(3); // 1 history + 2 bridge
    expect(result[1].time).toBe('2026-06-05 08:05:00');
    expect(result[2].time).toBe('2026-06-05 08:10:00');
  });

  it('should not fetch bridge if gap is within threshold', async () => {
    const lastRestTime = '2026-06-05 08:00:00';
    const mockHistory = [{ time: lastRestTime, open: 100, high: 105, low: 95, close: 102, volume: 1000, session: 'REG' }];
    
    // WS tick at 08:02 (2 min gap < 10 min threshold for 5min TF)
    const firstWsTime = new Date('2026-06-05T08:02:00Z').getTime();
    const mockBuffer = [{ bid: 103, ofr: 104, timestamp: firstWsTime }];

    vi.mocked(fetchMarketData).mockResolvedValue(mockHistory as any);
    vi.mocked(wsManager.getAndClearBuffer).mockReturnValue(mockBuffer);

    const result = await syncCoordinator.syncTicker('SPY', '5min', '2026-06-05T08:02:00', 1000);

    expect(vi.mocked(fetchHistoricalChunk)).not.toHaveBeenCalled();
    expect(result).toEqual(mockHistory);
  });
});
