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
    console.log(`[SyncCoordinator] DEBUG: Fetching history for ${ticker} to ${toIso}`);
    let history = await fetchMarketData(ticker, toIso, targetCandles, timeframe);
    
    if (!history || history.length === 0) {
      console.warn(`[SyncCoordinator] DEBUG: History fetch returned EMPTY for ${ticker}`);
      wsManager.setBuffering(ticker, false);
      return [];
    }

    console.log(`[SyncCoordinator] DEBUG: History fetch successful. Count: ${history.length}`);
    const lastRestCandle = history[history.length - 1];
    const lastRestTimeMs = new Date(lastRestCandle.time.replace(' ', 'T') + 'Z').getTime();
    
    console.log(`[SyncCoordinator] DEBUG: Last REST candle time: ${lastRestCandle.time} (${lastRestTimeMs}ms)`);
    console.log(`[SyncCoordinator] DEBUG: System current time: ${new Date().toISOString()} (${Date.now()}ms)`);

    // 3. Check for buffered ticks to find the "Live Start"
    const buffer = wsManager.getAndClearBuffer(ticker);
    wsManager.setBuffering(ticker, false);

    const firstWsTimeMs = buffer.length > 0 ? buffer[0].timestamp : Date.now();

    console.log(`[SyncCoordinator] DEBUG: Sync Target time (WS or Now): ${new Date(firstWsTimeMs).toISOString()} (${firstWsTimeMs}ms)`);
    console.log(`[SyncCoordinator] DEBUG: Calculated Gap: ${(firstWsTimeMs - lastRestTimeMs) / 60000} minutes`);

    // 4. Bridge Gap Detection
    // Threshold: 1x the timeframe duration (be more aggressive)
    const tfMins: Record<Timeframe, number> = {
      '1min': 1,
      '5min': 5,
      '15min': 15,
      '30min': 30,
      '1H': 60,
      '1D': 1440,
    };
    const thresholdMs = tfMins[timeframe] * 60000;
    console.log(`[SyncCoordinator] DEBUG: Threshold for ${timeframe}: ${thresholdMs / 60000} mins`);

    if (firstWsTimeMs - lastRestTimeMs > thresholdMs) {
      const gapMins = Math.round((firstWsTimeMs - lastRestTimeMs) / 60000);
      console.log(`[SyncCoordinator] !!! GAP DETECTED !!! ${gapMins} minutes. Fetching bridge...`);
      
      const bridgeTo = new Date(firstWsTimeMs).toISOString();
      console.log(`[SyncCoordinator] DEBUG: Bridge fetch parameters: ticker=${ticker}, to=${bridgeTo}, max=1000`);
      
      const bridgeData = await fetchHistoricalChunk(ticker, bridgeTo, 1000, timeframe);
      
      if (bridgeData && bridgeData.length > 0) {
        console.log(`[SyncCoordinator] DEBUG: Bridge fetch returned ${bridgeData.length} candles.`);
        console.log(`[SyncCoordinator] DEBUG: Bridge first: ${bridgeData[0].time}, Bridge last: ${bridgeData[bridgeData.length - 1].time}`);
        
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
        console.log(`[SyncCoordinator] Bridge complete. Added ${bridgeData.length} potential bridge bars. Total bars: ${history.length}`);
      }
    } else {
      console.log(`[SyncCoordinator] No significant gap detected.`);
    }

    // 5. Replay buffered ticks to ensure store is up to date
    console.log(`[SyncCoordinator] Replaying ${buffer.length} buffered ticks...`);
    buffer.forEach(tick => {
      usePriceStore.getState().updatePrice(ticker, tick.bid, tick.ofr, tick.timestamp);
    });

    return history;
  }
}

export const syncCoordinator = SyncCoordinator.getInstance();
