import { wsManager } from './ws-manager';
import { getTzForTicker } from './timezones';
import { fetchMarketData, fetchHistoricalChunk } from './db';
import { usePriceStore } from '../store/usePriceStore';
import { useWatchlistStore } from '../store/useWatchlistStore';
import type { RawBar, Timeframe } from '../types';

export class SyncCoordinator {
  private static instance: SyncCoordinator;
  private cache: Map<string, RawBar[]> = new Map();
  private listeners: Map<string, Set<() => void>> = new Map();

  private constructor() {}

  public static getInstance(): SyncCoordinator {
    if (!SyncCoordinator.instance) {
      SyncCoordinator.instance = new SyncCoordinator();
    }
    return SyncCoordinator.instance;
  }

  public subscribe(ticker: string, timeframe: Timeframe, cb: () => void) {
    const key = this.getCacheKey(ticker, timeframe);
    if (!this.listeners.has(key)) this.listeners.set(key, new Set());
    this.listeners.get(key)!.add(cb);
    return () => this.listeners.get(key)?.delete(cb);
  }

  public notifyListeners(ticker: string, timeframe: Timeframe) {
    const key = this.getCacheKey(ticker, timeframe);
    this.listeners.get(key)?.forEach(cb => cb());
  }

  public getCacheKey(ticker: string, timeframe: Timeframe): string {
    return `${ticker}_${timeframe}`;
  }

  public getCache(ticker: string, timeframe: Timeframe): RawBar[] | undefined {
    return this.cache.get(this.getCacheKey(ticker, timeframe));
  }

  private prefetchQueue: { ticker: string; tf: Timeframe }[] = [];
  private isPrefetching = false;
  private pendingFetches: Map<string, Promise<RawBar[]>> = new Map();

  public async prefetchWatchlist(timeframes: Timeframe[], targetCandles: number = 1000) {
    console.log(`[SyncCoordinator] Queuing background prefetch for Watchlist (${timeframes.join(', ')})...`);
    const symbols = useWatchlistStore.getState().symbols;
    
    for (const tf of timeframes) {
      for (const ticker of symbols) {
        const key = this.getCacheKey(ticker, tf);
        if (this.cache.has(key)) continue;

        // Add to queue if not already queued
        if (!this.prefetchQueue.some(item => item.ticker === ticker && item.tf === tf)) {
          this.prefetchQueue.push({ ticker, tf });
        }
      }
    }

    this.processPrefetchQueue(targetCandles);
  }

  private async processPrefetchQueue(targetCandles: number) {
    if (this.isPrefetching) return;
    this.isPrefetching = true;

    while (this.prefetchQueue.length > 0) {
      const item = this.prefetchQueue.shift();
      if (!item) continue;

      const { ticker, tf } = item;
      const key = this.getCacheKey(ticker, tf);
      
      if (this.cache.has(key) && this.cache.get(key)!.length > 0) {
        continue;
      }

      // If a foreground syncTicker is active, yield to it
      if (this.activeSyncs > 0) {
        await new Promise(r => setTimeout(r, 500));
      }

      try {
        const toIso = new Date().toISOString();
        let history: RawBar[] = [];

        if (this.pendingFetches.has(key)) {
          history = await this.pendingFetches.get(key)!;
        } else {
          const fetchPromise = fetchMarketData(ticker, toIso, targetCandles, tf).then(data => {
            this.pendingFetches.delete(key);
            return data;
          }).catch(err => {
            this.pendingFetches.delete(key);
            return [];
          });
          this.pendingFetches.set(key, fetchPromise);
          history = await fetchPromise;
        }

        if (history && history.length > 0) {
          this.cache.set(key, history);
        } else {
          this.cache.delete(key);
        }
        await new Promise(r => setTimeout(r, 250)); // 4 req/s max
      } catch (err) {
        console.warn(`[SyncCoordinator] Failed to prefetch ${ticker}`, err);
        this.cache.delete(key);
      }
    }

    this.isPrefetching = false;
    console.log(`[SyncCoordinator] Watchlist prefetch queue complete.`);
  }

  // Track how many foreground syncs are active so prefetcher can yield
  private activeSyncs = 0;

  /**
   * Starts the synchronization process for a ticker.
   * This is the FOREGROUND path — it is completely independent from
   * the background prefetcher. It never shares promises with it.
   * If the cache is empty, it always does its own fetch with retry.
   */
  public async syncTicker(
    ticker: string, 
    timeframe: Timeframe, 
    toIso: string, 
    targetCandles: number,
    onCacheHit?: (data: RawBar[]) => void,
    abortSignal?: AbortSignal
  ): Promise<RawBar[]> {
    this.activeSyncs++;

    try {
      // 1. Check Cache
      const cacheKey = this.getCacheKey(ticker, timeframe);
      let history = this.cache.get(cacheKey);

      if (history && history.length > 0) {
        console.log(`[SyncCoordinator] Cache hit for ${ticker}. Returning immediately.`);
        if (onCacheHit) onCacheHit(history);
      } else {
        history = undefined; // treat empty arrays as missing
      }

      // 2. Subscribe with buffering enabled
      wsManager.subscribe(ticker, true);

      // 3. Fetch initial history if cache was empty — INDEPENDENT fetch, never shared
      if (!history || history.length === 0) {
        if (abortSignal) {
          await new Promise(r => setTimeout(r, 150));
          if (abortSignal.aborted) {
            console.log(`[SyncCoordinator] Initial fetch aborted for ${ticker} due to rapid switching`);
            wsManager.setBuffering(ticker, false);
            return [];
          }
        }
        history = await this.fetchWithRetry(ticker, toIso, targetCandles, timeframe);

        if (!history || history.length === 0) {
          wsManager.setBuffering(ticker, false);
          return [];
        }
        this.cache.set(cacheKey, history);

        if (onCacheHit) onCacheHit(history);
      }

      if (timeframe === '1D' && getTzForTicker(ticker) !== 'UTC') {
        const intraKey = this.getCacheKey(ticker, '30min');
        if (!this.cache.has(intraKey)) {
          const intra = await this.fetchWithRetry(ticker, toIso, 1000, '30min');
          this.cache.set(intraKey, intra);
        }
      }

      const lastRestCandle = history[history.length - 1];
      const lastRestTimeMs = new Date(lastRestCandle.time.replace(' ', 'T') + 'Z').getTime();

      // 4. Check for buffered ticks to find the "Live Start"
      const buffer = wsManager.getAndClearBuffer(ticker);
      wsManager.setBuffering(ticker, false);

      const firstWsTimeMs = buffer.length > 0 ? buffer[0].timestamp : Date.now();

      // 5. Bridge Gap Detection
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
        console.log(`[SyncCoordinator] Gap detected for ${ticker}: ${gapMins} minutes. (firstWs: ${new Date(firstWsTimeMs).toISOString()}, lastRest: ${new Date(lastRestTimeMs).toISOString()}) Fetching bridge...`);
        
        if (abortSignal) {
          await new Promise(r => setTimeout(r, 150));
          if (abortSignal.aborted) {
            console.log(`[SyncCoordinator] Bridge fetch aborted for ${ticker} due to rapid switching`);
            // We return just the history since the request was aborted
            // The buffer will still be replayed below
          }
        }

        if (!abortSignal || !abortSignal.aborted) {
          const bridgeTo = new Date(firstWsTimeMs).toISOString();
          const bridgeData = await fetchHistoricalChunk(ticker, bridgeTo, 1000, timeframe);
          
          if (bridgeData && bridgeData.length > 0) {
            // Merge and deduplicate
            const merged = [...history, ...bridgeData];
            const seen = new Set<string>();
            const originalHistoryLength = history.length;
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
            
            console.log(`[SyncCoordinator] Bridge complete for ${ticker}. historyLen=${originalHistoryLength}, bridgeLen=${bridgeData.length}, mergedLen=${merged.length}, deduplicatedLen=${history.length}`);
          }
        }
      }

      // 5b. Bridge Gap Detection for Companion 30min data (for 1D ETH toggling)
      if (timeframe === '1D' && getTzForTicker(ticker) !== 'UTC') {
        const intraKey = this.getCacheKey(ticker, '30min');
        const intraCache = this.cache.get(intraKey);
        
        if (intraCache && intraCache.length > 0) {
          const lastIntra = intraCache[intraCache.length - 1];
          const lastIntraTimeMs = new Date(lastIntra.time.replace(' ', 'T') + 'Z').getTime();
          
          if (firstWsTimeMs - lastIntraTimeMs > 30 * 60000) {
            console.log(`[SyncCoordinator] Companion 30min gap detected for ${ticker}. Fetching bridge...`);
            if (!abortSignal || !abortSignal.aborted) {
              const bridgeTo = new Date(firstWsTimeMs).toISOString();
              const bridgeData = await fetchHistoricalChunk(ticker, bridgeTo, 1000, '30min');
              
              if (bridgeData && bridgeData.length > 0) {
                const merged = [...intraCache, ...bridgeData];
                const seen = new Set<string>();
                const newIntra: RawBar[] = [];
                
                merged.sort((a, b) => a.time.localeCompare(b.time));
                for (const bar of merged) {
                  if (!seen.has(bar.time)) {
                    seen.add(bar.time);
                    newIntra.push(bar);
                  }
                }
                
                this.cache.set(intraKey, newIntra);
                console.log(`[SyncCoordinator] Companion bridge complete for ${ticker}. Added ${bridgeData.length} bars.`);
              }
            }
          }
        }
      }

      // 6. Replay buffered ticks to ensure store is up to date
      if (buffer.length > 0) {
        console.log(`[SyncCoordinator] Replaying ${buffer.length} buffered ticks for ${ticker}.`);
        buffer.forEach(tick => {
          usePriceStore.getState().updatePrice(ticker, tick.bid, tick.ofr, tick.timestamp);
        });
      }

      return [...history];
    } finally {
      this.activeSyncs--;
    }
  }

  /**
   * Fetch with a single retry. If the first attempt fails (rate limit, network),
   * wait 1 second and try once more. This ensures foreground loads are resilient.
   */
  private async fetchWithRetry(
    ticker: string, toIso: string, targetCandles: number, timeframe: Timeframe
  ): Promise<RawBar[]> {
    let data = await fetchMarketData(ticker, toIso, targetCandles, timeframe);
    if (data && data.length > 0) return data;

    // Retry once after a short delay
    console.warn(`[SyncCoordinator] First fetch for ${ticker} (${timeframe}) returned empty. Retrying in 1s...`);
    await new Promise(r => setTimeout(r, 1000));
    data = await fetchMarketData(ticker, toIso, targetCandles, timeframe);
    return data || [];
  }
}

export const syncCoordinator = SyncCoordinator.getInstance();
