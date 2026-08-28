import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { IChartApi, ISeriesApi, LogicalRange, CandlestickData } from 'lightweight-charts';
import type { ChartBar, GroupColor, RawBar, Timeframe, HistoryPrependState } from '../types';
import { fetchMarketData, fetchHistoricalChunk } from '../lib/db';
import { resampleData } from '../lib/resampling';
import { getTzForTicker } from '../lib/timezones';
import { useWorkspaceStore } from '../store/useWorkspaceStore';
import { wsManager } from '../lib/ws-manager';
import { useSessionStore } from '../store/useSessionStore';
import { syncCoordinator } from '../lib/sync-coordinator';

interface UseChartDataParams {
  initialTicker: string;
  initialTf: Timeframe;
  initialEth: boolean;
  groupColor: GroupColor;
  groupTicker?: string;
  chartRef: React.MutableRefObject<IChartApi | null>;
  priceSeriesRef: React.MutableRefObject<ISeriesApi<'Candlestick'> | null>;
  onTimeframeChange?: (id: number, tf: Timeframe) => void;
  onTickerChange?: (ticker: string) => void;
  id: number;
}

export function useChartData({
  initialTicker,
  initialTf,
  initialEth,
  groupColor,
  groupTicker,
  chartRef,
  priceSeriesRef,
  onTimeframeChange,
  id,
}: UseChartDataParams) {
  const chartId = id.toString();
  
  // Derive ticker atomically from Workspace Store
  const ticker = useWorkspaceStore((state) => {
    const group = state.groups[chartId] || 'none';
    if (group !== 'none' && state.groupTickers[group]) {
      return state.groupTickers[group];
    }
    return state.tickers[chartId] || initialTicker;
  });

  const setStoreTicker = useWorkspaceStore(state => state.setTicker);
  const setStoreTimeframe = useWorkspaceStore(state => state.setTimeframe);

  const setTicker = (newTicker: string) => {
    setStoreTicker(chartId, newTicker);
  };

  const [localMasterData, setLocalMasterData] = useState<RawBar[]>([]);
  const [timeframe, setTimeframeLocal] = useState<Timeframe>(initialTf || '1H');
  const [stitchingError, setStitchingError] = useState<{ description: string; reason: string } | null>(null);

  const setTimeframe = (tf: Timeframe) => {
    setTimeframeLocal(tf);
    setStoreTimeframe(chartId, tf);
  };
  const [showEth, setShowEth] = useState<boolean>(initialEth || false);

  // Initialize timeframe in store on mount
  useEffect(() => {
    setStoreTimeframe(chartId, timeframe);
  }, []);

  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const earliestLoadedDateRef = useRef<string | null>(null);
  const hasReachedHistoryEndRef = useRef<boolean>(false);
  const pendingHistoryPrependRef = useRef<HistoryPrependState | null>(null);

  const dataTimeframeRef = useRef(timeframe);
  const dataTickerRef = useRef(ticker);
  const isFirstRender = useRef(true);

  const isAuthenticated = useSessionStore((state) => state.isAuthenticated);

  // WebSocket Subscription (Now handled by SyncCoordinator for initial load, 
  // but we still need to cleanup on unmount or ticker change)
  useEffect(() => {
    // Note: syncTicker handles the initial subscribe
    return () => {
      if (ticker) {
        console.log(`[useChartData] Cleanup: Unsubscribing from ${ticker}`);
        wsManager.unsubscribe(ticker);
      }
    };
  }, [ticker]);

  // Report timeframe to parent
  useEffect(() => {
    if (onTimeframeChange) onTimeframeChange(id, timeframe);
  }, [timeframe, id, onTimeframeChange]);

  if (typeof window !== 'undefined') {
    console.log(`BROWSER: useChartData eval - ticker: ${ticker}, timeframe: ${timeframe}, showEth: ${showEth}, id: ${id}`);
  }

  // Force re-render when syncCoordinator finishes background fetching
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!ticker) return;
    const unsubMain = syncCoordinator.subscribe(ticker, timeframe, () => {
      setTick(t => t + 1);
    });
    
    let unsubIntra = () => {};
    if (timeframe === '1D') {
      unsubIntra = syncCoordinator.subscribe(ticker, '30min', () => {
        setTick(t => t + 1);
      });
    }

    return () => { 
      unsubMain(); 
      unsubIntra();
    };
  }, [ticker, timeframe]);

  // Initial data fetch + Sync
  useEffect(() => {
    if (!isAuthenticated) {
      console.log(`[useChartData] Waiting for authentication before syncing ${ticker}...`);
      return;
    }

    pendingHistoryPrependRef.current = null;
    let cancelled = false;
    const abortController = new AbortController();

    async function load() {
      setLocalMasterData([]);
      setIsLoadingHistory(true);
      
      const targetCandles = 1000;
      
      try {
        const data = await syncCoordinator.syncTicker(
          ticker, 
          timeframe, 
          new Date().toISOString(), 
          targetCandles,
          (cachedData) => {
            if (cancelled) return;
            console.log(`[useChartData] Instant cache hit for ${ticker}`);
            if (cachedData && cachedData.length > 0) {
              earliestLoadedDateRef.current = cachedData[0].time;
            }
            dataTimeframeRef.current = timeframe;
            dataTickerRef.current = ticker;
            setLocalMasterData(cachedData as RawBar[]);
            setIsLoadingHistory(false);
          },
          abortController.signal
        );
        
        if (cancelled) return;
        
        console.log(`[useChartData] Synced ${data?.length || 0} bars for ${ticker}`);
        if (data && data.length > 0) {
          earliestLoadedDateRef.current = data[0].time;
          hasReachedHistoryEndRef.current = false;
        }
        dataTimeframeRef.current = timeframe;
        dataTickerRef.current = ticker;
        setLocalMasterData((prev: RawBar[]) => {
          if (prev === data) return prev;
          if (prev.length === data?.length && prev[prev.length - 1]?.time === data[data.length - 1]?.time && prev[0]?.time === data[0]?.time) {
            return prev;
          }
          return data as RawBar[];
        });
        setStitchingError(null);
      } catch (err: any) {
        if (cancelled) return;
        if (err.name === 'DataStitchingError') {
          setStitchingError({ description: err.description, reason: err.reason });
        } else {
          console.error(`[useChartData] Sync failed for ${ticker}:`, err);
        }
      } finally {
        setIsLoadingHistory(false);
      }
    }
    load();
    return () => { 
      cancelled = true; 
      abortController.abort();
    };
  }, [ticker, timeframe, isAuthenticated]);

  // Trigger sync on tab visibility, network recovery, or WebSocket reconnect to bridge any offline gaps
  useEffect(() => {
    if (!isAuthenticated || !ticker) return;

    let cancelled = false;

    const triggerSync = async (reason: string, skipSubscribe = false) => {
      console.log(`[useChartData] Visibility/Network/WS event (${reason}): Triggering sync for ${ticker} (${timeframe})`);
      setIsLoadingHistory(true);
      const targetCandles = 1000;
      
      try {
        const data = await syncCoordinator.syncTicker(
          ticker,
          timeframe,
          new Date().toISOString(),
          targetCandles,
          undefined,
          undefined,
          skipSubscribe
        );
        
        if (cancelled) return;
        
        console.log(`[useChartData] Sync triggered by ${reason} completed. Received ${data?.length || 0} bars.`);
        if (data && data.length > 0) {
          earliestLoadedDateRef.current = data[0].time;
          setLocalMasterData(data as RawBar[]);
        }
        setStitchingError(null);
      } catch (err: any) {
        if (cancelled) return;
        if (err.name === 'DataStitchingError') {
          setStitchingError({ description: err.description, reason: err.reason });
        } else {
          console.error(`[useChartData] Sync failed for ${ticker}:`, err);
        }
      } finally {
        setIsLoadingHistory(false);
      }
    };

    const handleSyncOnActivity = () => {
      if (document.visibilityState === 'visible' && window.navigator.onLine) {
        triggerSync('visibility/online', true);
      }
    };

    document.addEventListener('visibilitychange', handleSyncOnActivity);
    window.addEventListener('online', handleSyncOnActivity);
    
    const unsubscribeWs = wsManager.onConnect(() => {
      if (document.visibilityState === 'visible') {
        triggerSync('ws_reconnect', true);
      }
    });

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', handleSyncOnActivity);
      window.removeEventListener('online', handleSyncOnActivity);
      unsubscribeWs();
    };
  }, [ticker, timeframe, isAuthenticated]);

  // Infinite Scroll Listener
  useEffect(() => {
    if (!chartRef.current || !localMasterData || localMasterData.length === 0) return;
    
    const timeScale = chartRef.current.timeScale();
    
    const onVisibleLogicalRangeChanged = async (newLogicalRange: LogicalRange | null) => {
      if (!newLogicalRange) return;
      
      if (newLogicalRange.from < 100 && !isLoadingHistory && earliestLoadedDateRef.current && !hasReachedHistoryEndRef.current) {
        setIsLoadingHistory(true);
        try {
          const oldLogicalRange = timeScale.getVisibleLogicalRange();
          const currentChartBars = priceSeriesRef.current ? (priceSeriesRef.current.data() as CandlestickData[]) : [];
          
          const chunk = await fetchHistoricalChunk(ticker, earliestLoadedDateRef.current, 1000, timeframe);
          
          if (chunk && chunk.length > 0) {
            if (chunk[0].time === earliestLoadedDateRef.current) {
               // No older data available
               hasReachedHistoryEndRef.current = true;
               return;
            }
            earliestLoadedDateRef.current = chunk[0].time;
            
            let newData = [...chunk, ...localMasterData];
            
            // Deduplicate and STRICTLY SORT by time to prevent lightweight-charts assertions
            const uniqueData: RawBar[] = [];
            const seen = new Set<string>();
            
            // Sort ascending by parsed epoch timestamps before deduplication
            newData.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

            for (const bar of newData) {
              if (!seen.has(bar.time)) {
                seen.add(bar.time);
                uniqueData.push(bar);
              }
            }
            
            pendingHistoryPrependRef.current = {
              oldFirstTime: currentChartBars.length > 0 ? (currentChartBars[0].time as number) : null,
              oldLogicalRange: oldLogicalRange
            };
            
            setLocalMasterData(uniqueData);
          }
        } finally {
          setIsLoadingHistory(false);
        }
      }
    };
    
    timeScale.subscribeVisibleLogicalRangeChange(onVisibleLogicalRangeChanged);
    return () => timeScale.unsubscribeVisibleLogicalRangeChange(onVisibleLogicalRangeChanged);
  }, [localMasterData, isLoadingHistory, ticker, chartRef, priceSeriesRef, timeframe]);

  // Memoized Chart Data
  const chartDataResult = useMemo(() => {
    if (!localMasterData || localMasterData.length === 0) return { data: [], boundaryTime: null };
    if (timeframe !== dataTimeframeRef.current) return { data: [], boundaryTime: null };
    let localMasterDataState = [...localMasterData];
    let boundaryTime: string | null = null;

    if (timeframe === '1D' && !showEth && getTzForTicker(ticker) !== 'UTC') {
      const intraday = syncCoordinator.getCache(ticker, '30min');
      if (typeof window !== 'undefined') console.log("INTRADAY CACHE LENGTH:", intraday?.length);
      if (intraday && intraday.length > 0) {
        const rthIntraday = intraday.filter(b => b.session === 'RTH');
        if (typeof window !== 'undefined') console.log("RTH INTRADAY LENGTH:", rthIntraday.length);
        const accurateRecentDaily = resampleData(rthIntraday, '1D');
        if (typeof window !== 'undefined') console.log("ACCURATE RECENT DAILY:", JSON.stringify(accurateRecentDaily));
        if (accurateRecentDaily.length > 0) {
          const oldestAccurateTime = accurateRecentDaily[0].time;
          boundaryTime = oldestAccurateTime;
          localMasterDataState = [
            ...localMasterDataState.filter(b => b.time < oldestAccurateTime),
            ...accurateRecentDaily
          ];
        }
      }
    }

    let filtered = localMasterDataState;
    if (!showEth && timeframe !== '1D') {
      filtered = localMasterDataState.filter(d => d.session === 'RTH');
    }
    
    const result = resampleData(filtered, timeframe);

    if (typeof window !== 'undefined') {
      if (!(window as any).__TEST_CHART_DATA__) {
        (window as any).__TEST_CHART_DATA__ = {};
      }
      (window as any).__TEST_CHART_DATA__[ticker] = result;
    }

    return { data: result, boundaryTime };
  }, [localMasterData, timeframe, showEth, tick]);

  const chartData = chartDataResult.data;
  const boundaryTime = chartDataResult.boundaryTime;

  return {
    ticker,
    setTicker,
    timeframe,
    setTimeframe,
    showEth,
    setShowEth,
    localMasterData,
    chartData,
    boundaryTime,
    isLoadingHistory,
    pendingHistoryPrependRef,
    stitchingError,
  };
}
