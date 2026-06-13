import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { IChartApi, ISeriesApi, LogicalRange, CandlestickData } from 'lightweight-charts';
import type { ChartBar, GroupColor, RawBar, Timeframe, HistoryPrependState } from '../types';
import { fetchMarketData, fetchHistoricalChunk } from '../lib/db';
import { resampleData } from '../lib/resampling';
import { getTzForTicker } from '../lib/timezones';
import { usePlaybackStore } from '../store/usePlaybackStore';
import { useWorkspaceStore } from '../store/useWorkspaceStore';
import { wsManager } from '../lib/ws-manager';
import { useSessionStore } from '../store/useSessionStore';
import { syncCoordinator } from '../lib/sync-coordinator';

interface UseChartDataParams {
  initialTicker: string;
  initialTf: Timeframe;
  initialEth: boolean;
  selectedDate: string;
  isReplayMode: boolean;
  groupColor: GroupColor;
  groupTicker?: string;
  tickers: string[];
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
  selectedDate,
  isReplayMode,
  groupColor,
  groupTicker,
  tickers,
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

  const globalTime = usePlaybackStore((state) => state.currentTime);

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

  // Force re-render when syncCoordinator finishes background fetching
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!ticker) return;
    const unsubscribe = syncCoordinator.subscribe(ticker, timeframe, () => {
      setTick(t => t + 1);
    });
    return () => unsubscribe();
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
          selectedDate, 
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
        setLocalMasterData(data as RawBar[]);
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
  }, [ticker, selectedDate, timeframe, isAuthenticated]);

  // Trigger sync on tab visibility, network recovery, or WebSocket reconnect to bridge any offline gaps
  useEffect(() => {
    if (!isAuthenticated || !ticker) return;

    let cancelled = false;

    const triggerSync = async (reason: string) => {
      console.log(`[useChartData] Visibility/Network/WS event (${reason}): Triggering sync for ${ticker} (${timeframe})`);
      setIsLoadingHistory(true);
      const targetCandles = 1000;
      
      try {
        const data = await syncCoordinator.syncTicker(
          ticker,
          timeframe,
          selectedDate,
          targetCandles
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
        triggerSync('visibility/online');
      }
    };

    document.addEventListener('visibilitychange', handleSyncOnActivity);
    window.addEventListener('online', handleSyncOnActivity);
    
    const unsubscribeWs = wsManager.onConnect(() => {
      if (document.visibilityState === 'visible') {
        triggerSync('ws_reconnect');
      }
    });

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', handleSyncOnActivity);
      window.removeEventListener('online', handleSyncOnActivity);
      unsubscribeWs();
    };
  }, [ticker, selectedDate, timeframe, isAuthenticated]);

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
            
            // Sort ascending by time string before deduplication
            newData.sort((a, b) => a.time.localeCompare(b.time));

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
      if (intraday && intraday.length > 0) {
        const rthIntraday = intraday.filter(b => b.session === 'RTH');
        const accurateRecentDaily = resampleData(rthIntraday, '1D');
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
    
    // Legacy replay filtering disabled for Live Terminal
    /*
    if (isReplayMode && globalTime) {
      filtered = filtered.filter(d => new Date(d.time.replace(' ', 'T') + 'Z').getTime() <= globalTime);
    }
    */
    
    const result = resampleData(filtered, timeframe);
    return { data: result, boundaryTime };
  }, [localMasterData, timeframe, showEth, isReplayMode, globalTime]);

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
