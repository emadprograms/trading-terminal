import { wsManager } from './ws-manager';
import { fetchMarketData, fetchHistoricalChunk } from './db';
import { usePriceStore } from '../store/usePriceStore';
import type { RawBar, Timeframe } from '../types';

export class SyncCoordinator {
  private static instance: SyncCoordinator;

  private constructor() {}

  public static getInstance(): SyncCoordinator {
    if (!SyncCoordinator.instance) {
      SyncCoordinator.instance = new SyncCoordinator();
    }
    return SyncCoordinator.instance;
  }

  /**
   * Starts the synchronization process for a ticker.
   * 1. Enables WS buffering.
   * 2. Fetches initial history.
   * 3. Detects gaps and fetches "Bridge" data.
   * 4. Reconciles and switches to live mode.
   */
  public async syncTicker(
    ticker: string, 
    timeframe: Timeframe, 
    toIso: string, 
    targetCandles: number
  ): Promise<RawBar[]> {
    console.log(`[SyncCoordinator] Starting sync for ${ticker} (${timeframe})`);

    // 1. Subscribe with buffering enabled
    wsManager.subscribe(ticker, true);

    // 2. Fetch initial history
    let history = await fetchMarketData(ticker, toIso, targetCandles, timeframe);
    
    if (!history || history.length === 0) {
      wsManager.setBuffering(ticker, false);
      return [];
    }

    const lastRestCandle = history[history.length - 1];
    const lastRestTimeMs = new Date(lastRestCandle.time.replace(' ', 'T') + 'Z').getTime();

    // 3. Check for buffered ticks to find the "Live Start"
    const buffer = wsManager.getAndClearBuffer(ticker);
    wsManager.setBuffering(ticker, false);

    const firstWsTimeMs = buffer.length > 0 ? buffer[0].timestamp : Date.now();

    // 4. Bridge Gap Detection
    const tfMins: Record<Timeframe, number> = {
      '1min': 1,
      '5min': 5,
      '15min': 15,
      '30min': 30,
      '1H': 60,
      '1D': 1440,
    };
    const thresholdMs = tfMins[timeframe] * 60000;

    if (firstWsTimeMs - lastRestTimeMs > thresholdMs) {
      const gapMins = Math.round((firstWsTimeMs - lastRestTimeMs) / 60000);
      console.log(`[SyncCoordinator] Gap detected for ${ticker}: ${gapMins} minutes. Fetching bridge...`);
      
      const bridgeTo = new Date(firstWsTimeMs).toISOString();
      const bridgeData = await fetchHistoricalChunk(ticker, bridgeTo, 1000, timeframe);
      
      if (bridgeData && bridgeData.length > 0) {
        // Merge and deduplicate
        const merged = [...history, ...bridgeData];
        const seen = new Set<string>();
        history = [];
        
        merged.sort((a, b) => a.time.localeCompare(b.time));
        for (const bar of merged) {
          if (!seen.has(bar.time)) {
            seen.add(bar.time);
            history.push(bar);
          }
        }
        console.log(`[SyncCoordinator] Bridge complete for ${ticker}. Added ${bridgeData.length} bars.`);
      }
    }

    // 5. Replay buffered ticks to ensure store is up to date
    if (buffer.length > 0) {
      console.log(`[SyncCoordinator] Replaying ${buffer.length} buffered ticks for ${ticker}.`);
      buffer.forEach(tick => {
        usePriceStore.getState().updatePrice(ticker, tick.bid, tick.ofr, tick.timestamp);
      });
    }

    return history;
  }
}

export const syncCoordinator = SyncCoordinator.getInstance();
