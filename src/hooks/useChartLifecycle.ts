import React, { useState, useEffect, useRef, useCallback } from 'react';
import { IChartApi, ISeriesApi, MouseEventParams, Time, TickMarkType, IPriceLine } from 'lightweight-charts';
import type { ActiveTrade, ChartBar, DrawType, RawBar, RayDrawing, RectDrawing, RectPoint, TickerDrawings, Timeframe, HistoryPrependState } from '../types';
import { getTzForTicker } from '../lib/timezones';
import { usePlaybackStore } from '../store/usePlaybackStore';
import { useChartInit } from './chart/useChartInit';
import { useChartPlugins } from './chart/useChartPlugins';
import { useChartDrawings } from './chart/useChartDrawings';
import { useChartViewport } from './chart/useChartViewport';
import { usePriceStore } from '../store/usePriceStore';

const getBucketTime = (timestampMs: number, tf: Timeframe): number => {
  const date = new Date(timestampMs);
  
  if (tf === '1D') {
    const startOfDay = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
    return Math.floor(startOfDay / 1000);
  }
  
  const tfMap: Record<Timeframe, number> = {
    '1min': 1,
    '5min': 5,
    '15min': 15,
    '30min': 30,
    '1H': 60,
    '1D': 1440
  };
  
  const durationMin = tfMap[tf] || 1;
  const bucketStartMs = Math.floor(timestampMs / (durationMin * 60000)) * (durationMin * 60000);
  return Math.floor(bucketStartMs / 1000);
};


interface UseChartLifecycleParams {
  chartContainerRef: React.RefObject<HTMLDivElement | null>;
  ticker: string;
  timeframe: Timeframe;
  showEth: boolean;
  showVP: boolean;
  highContrast: boolean;
  chartData: ChartBar[];
  localMasterData: RawBar[];
  isReplayMode: boolean;
  isLoadingHistory: boolean;
  pendingHistoryPrependRef: React.MutableRefObject<HistoryPrependState | null>;
  isDrawingMode: boolean;
  drawType: DrawType;
  rectAnchor: RectPoint | null;
  setRectAnchor: React.Dispatch<React.SetStateAction<RectPoint | null>>;
  ghostPoint: RectPoint | null;
  setGhostPoint: React.Dispatch<React.SetStateAction<RectPoint | null>>;
  drawings: TickerDrawings;
  onUpdateDrawings: (ticker: string, type: 'rays' | 'rects', items: RayDrawing[] | RectDrawing[]) => void;
  chartRef: React.MutableRefObject<IChartApi | null>;
  priceSeriesRef: React.MutableRefObject<ISeriesApi<'Candlestick'> | null>;
  onFocus?: () => void;
}

export function useChartLifecycle({
  chartContainerRef,
  ticker,
  timeframe,
  showEth,
  showVP,
  highContrast,
  chartData,
  localMasterData,
  isReplayMode,
  isLoadingHistory,
  pendingHistoryPrependRef,
  isDrawingMode,
  drawType,
  rectAnchor,
  setRectAnchor,
  ghostPoint,
  setGhostPoint,
  drawings,
  onUpdateDrawings,
  chartRef,
  priceSeriesRef,
  onFocus,
}: UseChartLifecycleParams) {
  const globalTime = usePlaybackStore((state) => state.currentTime);
  
  const { 
    chartRef: initChartRef, 
    priceSeriesRef: initPriceSeriesRef, 
    volumeSeriesRef: initVolumeSeriesRef, 
    lastBarSpacingRef: initLastBarSpacingRef 
  } = useChartInit({
    chartContainerRef,
    ticker,
    timeframe,
    onViewStateChange: useCallback((atEnd: boolean, autoScale: boolean) => setIsViewModified(!atEnd || !autoScale), []),
  });

  const {
    shadingPluginRef,
    vpPluginRef,
    rayPluginRef,
    rectPluginRef,
    tradePluginRef,
    updateShadingConfig,
    pluginVersion,
  } = useChartPlugins({
    priceSeriesRef: initPriceSeriesRef,
    ticker,
    timeframe,
    showEth,
    showVP,
    drawings,
  });


  const {
    syncViewport,
    checkAutoReveal,
    scrollToRealTime,
    resetView,
  } = useChartViewport({
    chartRef,
    priceSeriesRef,
    chartData,
    pendingHistoryPrependRef,
  });

  useChartDrawings({
    chartRef,
    priceSeriesRef,
    chartContainerRef,
    isDrawingMode,
    drawType,
    rectAnchor,
    setRectAnchor,
    ghostPoint,
    setGhostPoint,
    drawings,
    ticker,
    onUpdateDrawings,
  });

  const [isViewModified, setIsViewModified] = useState(false);
  const [chartUpdateTick, setChartUpdateTick] = useState(0);
  const [isHydrated, setIsHydrated] = useState(false);
  
  // The AUTO_REVEAL_THRESHOLD is now inside useChartViewport


  useEffect(() => {
    chartRef.current = initChartRef.current;
    priceSeriesRef.current = initPriceSeriesRef.current;
  }, [initChartRef.current, initPriceSeriesRef.current, chartRef, priceSeriesRef]);

  useEffect(() => {
    if (!initChartRef.current || !initPriceSeriesRef.current || !initVolumeSeriesRef.current) return;

    if (highContrast) {
        initChartRef.current.applyOptions({
            layout: { background: { color: '#cccccc' }, textColor: '#000000' },
            grid: { vertLines: { color: '#d1d5db' }, horzLines: { color: '#d1d5db' } },
            timeScale: { borderColor: '#b0b8c4' }
        });
        initChartRef.current.priceScale('right').applyOptions({
            borderColor: '#b0b8c4'
        });
        initPriceSeriesRef.current.applyOptions({
            upColor: '#ffffff',
            downColor: '#000000',
            borderVisible: true,
            borderColor: '#000000',
            borderUpColor: '#000000',
            borderDownColor: '#000000',
            wickUpColor: '#000000',
            wickDownColor: '#000000',
        });
    } else {
        initChartRef.current.applyOptions({
            layout: { background: { color: 'transparent' }, textColor: '#94a3b8' },
            grid: { vertLines: { color: 'rgba(255, 255, 255, 0.05)' }, horzLines: { color: 'rgba(255, 255, 255, 0.05)' } },
            timeScale: { borderColor: 'rgba(255, 255, 255, 0.1)' }
        });
        initChartRef.current.priceScale('right').applyOptions({
            borderColor: 'rgba(255, 255, 255, 0.1)'
        });
        initPriceSeriesRef.current.applyOptions({
            upColor: '#26a69a',
            downColor: '#ef5350',
            borderVisible: false,
            borderColor: 'transparent',
            borderUpColor: 'transparent',
            borderDownColor: 'transparent',
            wickUpColor: '#26a69a',
            wickDownColor: '#ef5350',
        });
    }
  }, [highContrast, initChartRef.current, initPriceSeriesRef.current, initVolumeSeriesRef.current]);

  // 3c. Update volume series colors when highContrast changes
  useEffect(() => {
    if (!initVolumeSeriesRef.current) return;
    const currentData = initVolumeSeriesRef.current.data();
    if (!currentData || currentData.length === 0) return;
    
    const newData = currentData.map((item: any) => {
      let isUp = item.color === '#26a69a' || item.color === '#999999';
      return {
        ...item,
        color: isUp ? (highContrast ? '#999999' : '#26a69a') : (highContrast ? '#222222' : '#ef5350')
      };
    });
    initVolumeSeriesRef.current.setData(newData);
  }, [highContrast, initVolumeSeriesRef.current]);

  const lastDataCountRef = useRef(0);
  const bidLineRef = useRef<IPriceLine | null>(null);
  const askLineRef = useRef<IPriceLine | null>(null);
  const replayPriceLineRef = useRef<IPriceLine | null>(null);
  const lastCandleRef = useRef<{ time: number; open: number; high: number; low: number; close: number; volume: number } | null>(null);
  const lastTickerRef = useRef(ticker);
  const lastTfRef = useRef(timeframe);
  const lastEthRef = useRef(showEth);
  
  const isDrawingModeRef = useRef(isDrawingMode);
  const currentTickerRef = useRef(ticker);


  useEffect(() => {
    isDrawingModeRef.current = isDrawingMode;
  }, [isDrawingMode]);

  useEffect(() => {
    console.log(`[DEBUG-BLANK] 🔄 Ticker changed to ${ticker}, resetting isHydrated to false`);
    currentTickerRef.current = ticker;
    setIsHydrated(false);
  }, [ticker]);

  useEffect(() => {
    console.log(`[DEBUG-BLANK] 🔄 Timeframe changed to ${timeframe}, resetting isHydrated to false`);
    setIsHydrated(false);
  }, [timeframe]);

  useEffect(() => {
    console.log(`[StabilityTrace] ScrollEffect: isHydrated=${isHydrated}, dataLength=${chartData.length}`);
    if (isHydrated && chartData.length > 0) {
      console.log(`[StabilityTrace] Triggering scrollToRealTime`);
      scrollToRealTime();
    }
  }, [isHydrated, scrollToRealTime]);

  // Update chart timezone and timeframe-aware formatters
  useEffect(() => {
    if (!initChartRef.current) return;
    const tz = getTzForTicker(ticker);
    initChartRef.current.applyOptions({
      localization: {
        timeFormatter: (time: Time) => {
          const date = new Date((time as number) * 1000);
          if (timeframe === '1D') {
            return date.toLocaleString('en-US', { timeZone: tz, month: 'short', day: 'numeric', year: 'numeric' });
          }
          return date.toLocaleString('en-US', { timeZone: tz, hour12: false, month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        }
      },
      timeScale: {
        timeVisible: timeframe !== '1D',
        tickMarkFormatter: (time: Time, tickMarkType: TickMarkType) => {
          const date = new Date((time as number) * 1000);
          if (tickMarkType <= 2) return date.toLocaleString('en-US', { timeZone: tz, month: 'short', day: 'numeric' });
          return date.toLocaleString('en-US', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false });
        }
      }
    });
  }, [ticker, timeframe]);

  // Update effect for ghost rectangle
  useEffect(() => {
    if (rectPluginRef.current && rectAnchor && ghostPoint) {
      rectPluginRef.current.setRects([...(drawings.rects || []), { p1: rectAnchor, p2: ghostPoint }]);
    } else if (rectPluginRef.current) {
        rectPluginRef.current.setRects(drawings.rects || []);
    }
  }, [rectAnchor, ghostPoint, drawings.rects]);

  // 3. Update Chart Data
  useEffect(() => {
    console.log(`[DEBUG-BLANK] 📊 Effect 3 triggered. chartData.length=${chartData.length}, ticker=${ticker}, tf=${timeframe}, isHydrated=${isHydrated}`);
    console.log(`[DEBUG-BLANK] 📊 Series refs: price=${!!initPriceSeriesRef.current}, volume=${!!initVolumeSeriesRef.current}, chart=${!!initChartRef.current}`);
    
    if (initPriceSeriesRef.current && initVolumeSeriesRef.current && initChartRef.current && chartData.length > 0) {
      const formatted: any[] = chartData.map(d => {
        const isoString = d.time.replace(' ', 'T') + 'Z';
        return {
          time: Math.floor(new Date(isoString).getTime() / 1000) as Time,
          open: d.open,
          high: d.high,
          low: d.low,
          close: d.close,
          volume: d.volume,
        };
      });

      // Check for time ordering issues
      for (let i = 1; i < formatted.length; i++) {
        if (formatted[i].time <= formatted[i-1].time) {
          console.error(`[DEBUG-BLANK] ⚠️ TIME ORDER VIOLATION at index ${i}: ${formatted[i-1].time} >= ${formatted[i].time}`);
        }
      }

      if (vpPluginRef.current) {
          vpPluginRef.current.setData(formatted);
      }

      const isSameContext = lastTickerRef.current === ticker && 
                            lastTfRef.current === timeframe && 
                            lastEthRef.current === showEth;
      console.log(`[DEBUG-BLANK] 📊 isSameContext: ${isSameContext}, dataLength: ${formatted.length}, first=${formatted[0]?.time}, last=${formatted[formatted.length-1]?.time}`);
      
      try {
        initPriceSeriesRef.current.setData(formatted.map(({ time, open, high, low, close }) => ({
          time, open, high, low, close
        })));
        console.log(`[DEBUG-BLANK] ✅ Price series setData succeeded`);
      } catch (err) {
        console.error(`[DEBUG-BLANK] ❌ Price series setData FAILED:`, err);
      }
      
      try {
        initVolumeSeriesRef.current.setData(formatted.map(({ time, volume, open, close }) => {
          const isUp = close >= open;
          return {
            time, 
            value: volume, 
            color: isUp ? (highContrast ? '#999999' : '#26a69a') : (highContrast ? '#222222' : '#ef5350')
          };
        }));
        console.log(`[DEBUG-BLANK] ✅ Volume series setData succeeded`);
      } catch (err) {
        console.error(`[DEBUG-BLANK] ❌ Volume series setData FAILED:`, err);
      }

      initChartRef.current.priceScale('right').applyOptions({ autoScale: true });
      
      syncViewport(isSameContext);

      lastDataCountRef.current = formatted.length;
      lastTickerRef.current = ticker;
      lastTfRef.current = timeframe;
      lastEthRef.current = showEth;

      // ALWAYS schedule hydration after successful setData.
      // Previously gated by `if (!isHydrated)`, but on cache hits the stale closure
      // reads isHydrated=true (from before ticker change reset it to false),
      // so hydration was never re-scheduled → isHydrated stuck false → blank chart.
      // setIsHydrated(true) is idempotent when already true (no extra re-renders).
      console.log(`[DEBUG-BLANK] 💧 Scheduling hydration via requestAnimationFrame (isHydrated was: ${isHydrated})`);
      requestAnimationFrame(() => {
        console.log(`[DEBUG-BLANK] 💧 Hydration state updating to TRUE`);
        setIsHydrated(true);
      });

      } else {
        console.warn(`[DEBUG-BLANK] ⚠️ Effect 3 skipped! Conditions not met: price=${!!initPriceSeriesRef.current}, vol=${!!initVolumeSeriesRef.current}, chart=${!!initChartRef.current}, data=${chartData.length}`);
      }

  }, [chartData, isReplayMode, syncViewport]);

  // 3b. Refresh shading plugin when ticker/timeframe/ETH changes
  useEffect(() => {
    const tz = getTzForTicker(ticker);
    const isET = tz === 'America/New_York';
    updateShadingConfig(isET);
  }, [ticker, timeframe, showEth, updateShadingConfig]);

  // 4. Auto-Reveal Logic during Replay
  useEffect(() => {
    if (!isReplayMode || !initChartRef.current || !initPriceSeriesRef.current) return;

    checkAutoReveal();
  }, [globalTime, isReplayMode, checkAutoReveal]);

  // 5. Handle Focus Click
  useEffect(() => {
    if (!initChartRef.current || !onFocus) return;
    
    const chart = initChartRef.current;
    const handleFocus = () => {
      onFocus();
    };

    chart.subscribeClick(handleFocus);
    return () => {
      try {
        chart.unsubscribeClick(handleFocus);
      } catch (_) {}
    };
  }, [initChartRef.current, onFocus]);

  // 6. Live Price Lines for Bid and Ask
  useEffect(() => {
    if (!initPriceSeriesRef.current || !isHydrated) return;

    const unsubscribe = usePriceStore.subscribe((state) => {
      const priceData = state.prices[ticker];
      if (!priceData || !initPriceSeriesRef.current) return;

      const { bid, ask } = priceData;
      
      // Update Bid Line
      const bidColor = highContrastRef.current ? '#999999' : '#ef5350';
      if (bid) {
        if (!bidLineRef.current) {
          bidLineRef.current = initPriceSeriesRef.current.createPriceLine({
            price: bid,
            color: bidColor, // Light gray for HC bid, Red for default
            lineWidth: 1,
            lineStyle: 2,
            axisLabelVisible: true,
            title: 'BID',
          });
        } else {
          bidLineRef.current.applyOptions({ price: bid, color: bidColor });
        }
      }

      // Update Ask Line
      const askColor = highContrastRef.current ? '#555555' : '#26a69a';
      if (ask) {
        if (!askLineRef.current) {
          askLineRef.current = initPriceSeriesRef.current.createPriceLine({
            price: ask,
            color: askColor, // Dark grey for HC ask, Teal for default
            lineWidth: 1,
            lineStyle: 2,
            axisLabelVisible: true,
            title: 'ASK',
          });
        } else {
          askLineRef.current.applyOptions({ price: ask, color: askColor });
        }
      }
    });

    return () => {
      unsubscribe();
      if (initPriceSeriesRef.current) {
        if (bidLineRef.current) {
          try { initPriceSeriesRef.current.removePriceLine(bidLineRef.current); } catch(_) {}
          bidLineRef.current = null;
        }
        if (askLineRef.current) {
          try { initPriceSeriesRef.current.removePriceLine(askLineRef.current); } catch(_) {}
          askLineRef.current = null;
        }
      }
    };
  }, [ticker, isHydrated]);

  // 6b. Replay Price Line for 1D chart or Replay Mode
  useEffect(() => {
    if (!initPriceSeriesRef.current) return;

    if (timeframe === '1D' && globalTime && localMasterData.length > 0) {
      let lastPrice = null;

      for (let i = localMasterData.length - 1; i >= 0; i--) {
        const barMs = new Date(localMasterData[i].time.replace(' ', 'T') + 'Z').getTime();
        if (barMs <= globalTime) {
          lastPrice = localMasterData[i].close;
          break;
        }
      }

      if (lastPrice !== null) {
        if (!replayPriceLineRef.current) {
          replayPriceLineRef.current = initPriceSeriesRef.current.createPriceLine({
            price: lastPrice,
            color: 'rgba(255, 210, 0, 0.6)',
            lineWidth: 1,
            lineStyle: 2,
            axisLabelVisible: true,
            title: 'Replay',
          });
        } else {
          replayPriceLineRef.current.applyOptions({ price: lastPrice });
        }
      }
    } else if (replayPriceLineRef.current && initPriceSeriesRef.current) {
      initPriceSeriesRef.current.removePriceLine(replayPriceLineRef.current);
      replayPriceLineRef.current = null;
    }
    
    return () => {
      if (replayPriceLineRef.current && initPriceSeriesRef.current) {
        try {
          initPriceSeriesRef.current.removePriceLine(replayPriceLineRef.current);
          replayPriceLineRef.current = null;
        } catch(_) {}
      }
    };
  }, [globalTime, timeframe, ticker, localMasterData]);

  // 7. Live Tick Updates from WebSocket
  const isHydratedRef = useRef(false);
  const highContrastRef = useRef(highContrast);
  
  useEffect(() => {
    isHydratedRef.current = isHydrated;
  }, [isHydrated]);

  useEffect(() => {
    highContrastRef.current = highContrast;
  }, [highContrast]);

  useEffect(() => {
    console.log(`[DEBUG-BLANK] 🎯 Effect 7 (Live Ticks) MOUNTING. ticker=${ticker}, tf=${timeframe}, isHydrated=${isHydrated}, price=${!!initPriceSeriesRef.current}, vol=${!!initVolumeSeriesRef.current}`);
    if (!initPriceSeriesRef.current || !initVolumeSeriesRef.current) {
      console.warn(`[DEBUG-BLANK] 🎯 Effect 7 SKIPPED - series not ready`);
      return;
    }

    let tickCount = 0;
    let errorCount = 0;
    let skippedNoHydration = 0;
    let skippedNoLastCandle = 0;
    const effectTicker = ticker; // Capture for closure debugging

    const unsubscribe = usePriceStore.subscribe((state) => {
      const priceData = state.prices[effectTicker];
      // Guard: Only update if we have price data, series are ready, AND the chart is hydrated
      if (!priceData || !initPriceSeriesRef.current || !initVolumeSeriesRef.current) return;
      
      if (!isHydratedRef.current) {
        skippedNoHydration++;
        if (skippedNoHydration <= 5) {
          console.log(`[DEBUG-BLANK] ⏳ Tick skipped (not hydrated yet) for ${effectTicker}. count=${skippedNoHydration}`);
        }
        return;
      }

      const { bid, timestamp } = priceData;
      const tickPrice = bid;
      if (!tickPrice || tickPrice <= 0) return;

      // Compute the candle bucket time for this tick
      const bucketTime = getBucketTime(timestamp, timeframe);

      const lastCandle = lastCandleRef.current;

      if (lastCandle) {
        // SAFETY GUARD: Lightweight-charts fails if we try to update a candle older than the latest one.
        if (bucketTime < lastCandle.time) {
          console.warn(`[DEBUG-BLANK] ⏪ Skipping out-of-order tick: tickBucket=${bucketTime}, lastCandle=${lastCandle.time}, ticker=${effectTicker}`);
          return;
        }

        tickCount++;
        if (tickCount <= 3 || tickCount % 50 === 0) {
          console.log(`[DEBUG-BLANK] 📈 Processing tick #${tickCount} for ${effectTicker}: price=${tickPrice}, bucket=${bucketTime}, lastCandleTime=${lastCandle.time}, match=${lastCandle.time === bucketTime}`);
        }

        try {
          if (lastCandle.time === bucketTime) {
            // Update the existing candle
            lastCandle.high = Math.max(lastCandle.high, tickPrice);
            lastCandle.low = Math.min(lastCandle.low, tickPrice);
            lastCandle.close = tickPrice;

            initPriceSeriesRef.current.update({
              time: bucketTime as any,
              open: lastCandle.open,
              high: lastCandle.high,
              low: lastCandle.low,
              close: lastCandle.close,
            });

            initVolumeSeriesRef.current.update({
              time: bucketTime as any,
              value: lastCandle.volume,
              color: lastCandle.close >= lastCandle.open 
                ? (highContrastRef.current ? '#999999' : '#26a69a') 
                : (highContrastRef.current ? '#222222' : '#ef5350'),
            });
          } else {
            // New candle bucket
            console.log(`[DEBUG-BLANK] 🕯️ NEW CANDLE for ${effectTicker}: oldTime=${lastCandle.time} -> newTime=${bucketTime}`);
            const newCandle = {
              time: bucketTime,
              open: tickPrice,
              high: tickPrice,
              low: tickPrice,
              close: tickPrice,
              volume: 0,
            };
            lastCandleRef.current = newCandle;

            initPriceSeriesRef.current.update({
              time: bucketTime as any,
              open: newCandle.open,
              high: newCandle.high,
              low: newCandle.low,
              close: newCandle.close,
            });

            initVolumeSeriesRef.current.update({
              time: bucketTime as any,
              value: 0,
              color: highContrastRef.current ? '#999999' : '#26a69a',
            });
          }
        } catch (err) {
          errorCount++;
          console.error(`[DEBUG-BLANK] ❌ CHART UPDATE ERROR #${errorCount} for ${effectTicker}:`, err);
          console.error(`[DEBUG-BLANK] ❌ Tick details: bucketTime=${bucketTime}, lastCandle=`, JSON.stringify(lastCandle));
        }
      } else {
        skippedNoLastCandle++;
        if (skippedNoLastCandle <= 5) {
          console.warn(`[DEBUG-BLANK] ⚠️ lastCandleRef is NULL for ${effectTicker}! Tick #${skippedNoLastCandle} dropped. price=${tickPrice}, bucket=${bucketTime}`);
        }
      }
    });

    return () => {
      console.log(`[DEBUG-BLANK] 🎯 Effect 7 UNMOUNTING for ${effectTicker}. Processed ${tickCount} ticks, ${errorCount} errors, ${skippedNoHydration} skipped(hydration), ${skippedNoLastCandle} skipped(noLastCandle)`);
      unsubscribe();
    };
  }, [ticker, timeframe, initPriceSeriesRef.current, initVolumeSeriesRef.current]);

  // 7b. Seed lastCandleRef from chart data so ticks extend the latest historical candle
  useEffect(() => {
    if (chartData.length > 0) {
      const last = chartData[chartData.length - 1];
      const isoString = last.time.replace(' ', 'T') + 'Z';
      const bucketTime = Math.floor(new Date(isoString).getTime() / 1000);
      const prev = lastCandleRef.current;
      lastCandleRef.current = {
        time: bucketTime,
        open: last.open,
        high: last.high,
        low: last.low,
        close: last.close,
        volume: last.volume,
      };
      console.log(`[DEBUG-BLANK] 🌱 Effect 7b: Seeded lastCandleRef. prevTime=${prev?.time ?? 'null'} -> newTime=${bucketTime}, ticker=${ticker}, dataLen=${chartData.length}`);
    } else {
      console.warn(`[DEBUG-BLANK] 🌱 Effect 7b: chartData is EMPTY for ${ticker}, lastCandleRef NOT seeded`);
    }
  }, [chartData]);

  return {
    volumeSeriesRef: initVolumeSeriesRef,
    tradePluginRef,
    pluginVersion,
    isViewModified,
    resetView,
    isHydrated,
  };
}
