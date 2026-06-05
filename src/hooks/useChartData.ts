import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { IChartApi, ISeriesApi, LogicalRange, CandlestickData } from 'lightweight-charts';
import type { ChartBar, GroupColor, RawBar, Timeframe, HistoryPrependState } from '../types';
import { fetchMarketData, fetchHistoricalChunk } from '../lib/db';
import { resampleData } from '../lib/resampling';
import { usePlaybackStore } from '../store/usePlaybackStore';
import { useWorkspaceStore } from '../store/useWorkspaceStore';
import { wsManager } from '../lib/ws-manager';

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
  const [timeframe, setTimeframe] = useState<Timeframe>(initialTf || '1H');
  const [showEth, setShowEth] = useState<boolean>(initialEth || false);

  const globalTime = usePlaybackStore((state) => state.currentTime);

  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const earliestLoadedDateRef = useRef<string | null>(null);
  const pendingHistoryPrependRef = useRef<HistoryPrependState | null>(null);

  const dataTimeframeRef = useRef(timeframe);
  const isFirstRender = useRef(true);

  // WebSocket Subscription
  useEffect(() => {
    if (ticker) {
      console.log(`[WSManager] Subscribing to ${ticker}`);
      wsManager.subscribe(ticker);
    }
    return () => {
      if (ticker) {
        console.log(`[WSManager] Unsubscribing from ${ticker}`);
        wsManager.unsubscribe(ticker);
      }
    };
  }, [ticker]);

  // Report timeframe to parent
  useEffect(() => {
    if (onTimeframeChange) onTimeframeChange(id, timeframe);
  }, [timeframe, id, onTimeframeChange]);

  // Initial data fetch
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLocalMasterData([]);
      setIsLoadingHistory(true);
      
      // Calculate daysBack to aim for ~1000 candles based on timeframe
      const tfMins: Record<Timeframe, number> = {
        '1min': 1,
        '5min': 5,
        '15min': 15,
        '30min': 30,
        '1H': 60,
        '1D': 1440,
      };
      
      const targetCandles = 1000;
      const minsPerDay = 1440;
      const daysBack = (targetCandles * tfMins[timeframe]) / minsPerDay;
      
      console.log(`[useChartData] Requesting data: ticker=${ticker}, timeframe=${timeframe}, to=${selectedDate}, targetCandles=${targetCandles}`);
      const data = await fetchMarketData(ticker, selectedDate, targetCandles, timeframe);
      if (cancelled) return;
      
      console.log(`[useChartData] Fetched ${data?.length || 0} bars for ${ticker} at ${timeframe} (daysBack: ${daysBack.toFixed(2)})`);
      if (data && data.length > 0) {
        earliestLoadedDateRef.current = data[0].time;
      }
      dataTimeframeRef.current = timeframe;
      setLocalMasterData(data as RawBar[]);
      setIsLoadingHistory(false);
    }
    load();
    return () => { cancelled = true; };
  }, [ticker, selectedDate, timeframe]);

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
    
    let filtered = (showEth && timeframe !== '1D') ? localMasterData : localMasterData.filter(d => d.session === 'REG');
    
    // Legacy replay filtering disabled for Live Terminal
    /*
    if (isReplayMode && globalTime) {
      filtered = filtered.filter(d => new Date(d.time.replace(' ', 'T') + 'Z').getTime() <= globalTime);
    }
    */
    
    return resampleData(filtered, timeframe);
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
