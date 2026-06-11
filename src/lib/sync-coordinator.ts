import { wsManager } from './ws-manager';
import { fetchMarketData, fetchHistoricalChunk } from './db';
import { usePriceStore } from '../store/usePriceStore';
import { useWatchlistStore } from '../store/useWatchlistStore';
import type { RawBar, Timeframe } from '../types';

export class SyncCoordinator {
  private static instance: SyncCoordinator;
  private cache: Map<string, RawBar[]> = new Map();

  private constructor() {}

  public static getInstance(): SyncCoordinator {
    if (!SyncCoordinator.instance) {
      SyncCoordinator.instance = new SyncCoordinator();
    }
    return SyncCoordinator.instance;
  }

  public getCacheKey(ticker: string, timeframe: Timeframe): string {
    return `${ticker}_${timeframe}`;
  }

  public async prefetchWatchlist(timeframes: Timeframe[], targetCandles: number = 1000) {
    console.log(`[SyncCoordinator] Starting background prefetch for Watchlist (${timeframes.join(', ')})...`);
    const symbols = useWatchlistStore.getState().symbols;
    
    for (const tf of timeframes) {
      for (const ticker of symbols) {
        const key = this.getCacheKey(ticker, tf);
        if (this.cache.has(key)) continue;

        // Mark as "fetching" with an empty array to prevent concurrent loops from fetching the same thing
        this.cache.set(key, []);

        try {
          const toIso = new Date().toISOString();
          const history = await fetchMarketData(ticker, toIso, targetCandles, tf);
          if (history && history.length > 0) {
            this.cache.set(key, history);
          } else {
            this.cache.delete(key); // clear empty lock if failed
          }
          // Small delay to avoid API rate limits
          await new Promise(r => setTimeout(r, 200));
        } catch (err) {
          console.warn(`[SyncCoordinator] Failed to prefetch ${ticker}`, err);
          this.cache.delete(key);
        }
      }
    }
    console.log(`[SyncCoordinator] Watchlist prefetch complete for ${timeframes.join(', ')}.`);
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
    targetCandles: number,
    onCacheHit?: (data: RawBar[]) => void
  ): Promise<RawBar[]> {
    console.log(`[SyncCoordinator] Starting sync for ${ticker} (${timeframe})`);

    // 1. Check Cache
    const cacheKey = this.getCacheKey(ticker, timeframe);
    let history = this.cache.get(cacheKey) || [];

    if (history.length > 0) {
      console.log(`[SyncCoordinator] Cache hit for ${ticker}. Returning immediately.`);
      if (onCacheHit) onCacheHit(history);
    }

    // 2. Subscribe with buffering enabled
    wsManager.subscribe(ticker, true);

    // 3. Fetch initial history if cache was empty
    if (history.length === 0) {
      history = await fetchMarketData(ticker, toIso, targetCandles, timeframe);
      if (!history || history.length === 0) {
        wsManager.setBuffering(ticker, false);
        return [];
      }
      this.cache.set(cacheKey, history);
      if (onCacheHit) onCacheHit(history);
    }

    // No need to redeclare history here

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
        
        // Update cache with bridged data
        this.cache.set(cacheKey, history);
        
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
