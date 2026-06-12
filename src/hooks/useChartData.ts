import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { IChartApi, ISeriesApi, LogicalRange, CandlestickData } from 'lightweight-charts';
import type { ChartBar, GroupColor, RawBar, Timeframe, HistoryPrependState } from '../types';
import { fetchMarketData, fetchHistoricalChunk } from '../lib/db';
import { resampleData } from '../lib/resampling';
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

  const setTicker = (newTicker: string) => {
    useWorkspaceStore.getState().setTicker(chartId, newTicker);
  };

  const [localMasterData, setLocalMasterData] = useState<RawBar[]>([]);
  const [timeframe, setTimeframeLocal] = useState<Timeframe>(initialTf || '1H');

  const setTimeframe = (tf: Timeframe) => {
    setTimeframeLocal(tf);
    useWorkspaceStore.getState().setTimeframe(chartId, tf);
  };
  const [showEth, setShowEth] = useState<boolean>(initialEth || false);

  // Initialize timeframe in store on mount
  useEffect(() => {
    useWorkspaceStore.getState().setTimeframe(chartId, timeframe);
  }, []);

  const globalTime = usePlaybackStore((state) => state.currentTime);

  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const earliestLoadedDateRef = useRef<string | null>(null);
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
      console.log(`[DEBUG-BLANK] 📡 useChartData: Starting load for ${ticker} (${timeframe})`);
      
      const targetCandles = 1000;
      
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
      }
      dataTimeframeRef.current = timeframe;
      dataTickerRef.current = ticker;
      setLocalMasterData(data as RawBar[]);
      setIsLoadingHistory(false);
    }
    load();
    return () => { 
      console.log(`[DEBUG-BLANK] 📡 useChartData: Cancelling load effect for ${ticker}`);
      cancelled = true; 
      abortController.abort();
    };
  }, [ticker, selectedDate, timeframe, isAuthenticated]);

  // Infinite Scroll Listener
  useEffect(() => {
    if (!chartRef.current || !localMasterData || localMasterData.length === 0) return;
    
    const timeScale = chartRef.current.timeScale();
    
    const onVisibleLogicalRangeChanged = async (newLogicalRange: LogicalRange | null) => {
      if (!newLogicalRange) return;
      
      if (newLogicalRange.from < 100 && !isLoadingHistory && earliestLoadedDateRef.current) {
        setIsLoadingHistory(true);
        try {
          const oldLogicalRange = timeScale.getVisibleLogicalRange();
          const currentChartBars = priceSeriesRef.current ? (priceSeriesRef.current.data() as CandlestickData[]) : [];
          
          const chunk = await fetchHistoricalChunk(ticker, earliestLoadedDateRef.current, 1000, timeframe);
          
          if (chunk && chunk.length > 0) {
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
  const chartData = useMemo(() => {
    if (!localMasterData || localMasterData.length === 0) return [];
    if (timeframe !== dataTimeframeRef.current) return [];
    if (ticker !== dataTickerRef.current) return [];
    
    let filtered = (showEth && timeframe !== '1D') ? localMasterData : localMasterData.filter(d => d.session === 'RTH');
    
    // Legacy replay filtering disabled for Live Terminal
    /*
    if (isReplayMode && globalTime) {
      filtered = filtered.filter(d => new Date(d.time.replace(' ', 'T') + 'Z').getTime() <= globalTime);
    }
    */
    
    const result = resampleData(filtered, timeframe);
    console.log(`[DEBUG-BLANK] 🧮 chartData MEMO: masterLen=${localMasterData.length}, filteredLen=${filtered.length}, resampledLen=${result.length}, tf=${timeframe}, dataTfRef=${dataTimeframeRef.current}, match=${timeframe === dataTimeframeRef.current}`);
    return result;
  }, [localMasterData, timeframe, showEth, isReplayMode, globalTime]);

  return {
    ticker,
    setTicker,
    timeframe,
    setTimeframe,
    showEth,
    setShowEth,
    localMasterData,
    chartData,
    isLoadingHistory,
    pendingHistoryPrependRef,
  };
}
