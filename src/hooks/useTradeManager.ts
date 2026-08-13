import React, { useEffect, useMemo, useCallback } from 'react';
import { useTradeStore } from '../store/useTradeStore';
import { usePriceStore } from '../store/usePriceStore';
import type { ISeriesApi, Time } from 'lightweight-charts';
import type { ChartBar } from '../types';
import type { TradePlugin, ChartMarker } from '../lib/TradePlugin';

interface UseTradeManagerParams {
  ticker: string;
  chartData: ChartBar[];
  chartContainerRef: React.RefObject<HTMLDivElement | null>;
  chartRef: React.MutableRefObject<any>; // IChartApi
  priceSeriesRef: React.MutableRefObject<ISeriesApi<'Candlestick'> | null>;
  tradePluginRef: React.MutableRefObject<TradePlugin | null>;
  pluginVersion: number;
}

export function useTradeManager({
  ticker,
  chartData,
  chartContainerRef,
  chartRef,
  priceSeriesRef,
  tradePluginRef,
  pluginVersion,
}: UseTradeManagerParams) {
  const positions = useTradeStore((state) => state.positions);
  const pendingOrders = useTradeStore((state) => state.pendingOrders);

  // Filter positions and orders for this ticker
  const tickerPositions = useMemo(() => 
    positions.filter(p => p.epic === ticker),
    [positions, ticker]
  );

  const tickerOrders = useMemo(() => 
    Object.values(pendingOrders).filter(o => o.epic === ticker && o.status === 'PENDING'),
    [pendingOrders, ticker]
  );

  const executions = useTradeStore((state) => state.executions);
  const tickerExecutions = useMemo(() => 
    executions.filter(e => e.epic === ticker),
    [executions, ticker]
  );

  // --- VISUAL FIFO NETTING ---
  const rawNettedItems = useMemo(() => {
    const longs: any[] = [];
    const shorts: any[] = [];

    tickerPositions.forEach(p => {
      const clone = { ...p, isPending: false };
      if (p.direction === 'BUY') longs.push(clone);
      else shorts.push(clone);
    });

    tickerOrders.filter(o => o.type === 'MARKET').forEach(o => {
      const clone = { ...o, isPending: true };
      if (o.direction === 'BUY') longs.push(clone);
      else shorts.push(clone);
    });

    while (longs.length > 0 && shorts.length > 0) {
      let oldestLong = longs[0];
      let oldestShort = shorts[0];
      
      if (oldestLong.size > oldestShort.size) {
        oldestLong.size -= oldestShort.size;
        shorts.shift(); 
      } else if (oldestLong.size < oldestShort.size) {
        oldestShort.size -= oldestLong.size;
        longs.shift(); 
      } else {
        longs.shift();
        shorts.shift();
      }
    }

    return [...longs, ...shorts];
  }, [tickerPositions, tickerOrders]);

  // Prevent flicker during Capital.com backend netting (which deletes legs before creating the netted leg)
  const [debouncedNettedItems, setDebouncedNettedItems] = React.useState(rawNettedItems);
  const nettingTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (rawNettedItems.length === 0 && debouncedNettedItems.length > 0) {
      nettingTimeoutRef.current = setTimeout(() => {
        setDebouncedNettedItems(rawNettedItems);
      }, 500);
    } else {
      if (nettingTimeoutRef.current) clearTimeout(nettingTimeoutRef.current);
      setDebouncedNettedItems(rawNettedItems);
    }
    return () => {
      if (nettingTimeoutRef.current) clearTimeout(nettingTimeoutRef.current);
    };
  }, [rawNettedItems]);

  const nonMarketOrders = useMemo(() => 
    tickerOrders.filter(o => o.type !== 'MARKET'),
  [tickerOrders]);

  const [dragPreview, setDragPreview] = React.useState<{ id: string, price: number } | null>(null);

  // Map to ChartMarkers
  // Calculate base markers synchronously via useMemo to prevent race conditions and missing updates
  const baseMarkers = useMemo(() => {
      const posMarkers: ChartMarker[] = debouncedNettedItems.filter(i => !i.isPending).flatMap(p => {
        const markers: ChartMarker[] = [{
          id: p.dealId,
          epic: p.epic,
          price: p.entryPrice,
          direction: p.direction,
          size: p.size,
          type: 'POSITION',
          hasSL: !!p.stopLevel,
          hasTP: !!p.profitLevel
        }];

        if (p.stopLevel) {
          markers.push({
            id: `${p.dealId}_SL`,
            epic: p.epic,
            price: p.stopLevel,
            direction: p.direction === 'BUY' ? 'SELL' : 'BUY',
            size: p.size,
            type: 'ORDER',
            label: 'SL',
            isDashed: true,
            parentPrice: p.entryPrice
          });
        }

        if (p.profitLevel) {
          markers.push({
            id: `${p.dealId}_TP`,
            epic: p.epic,
            price: p.profitLevel,
            direction: p.direction === 'BUY' ? 'SELL' : 'BUY',
            size: p.size,
            type: 'ORDER',
            label: 'TP',
            isDashed: true,
            parentPrice: p.entryPrice
          });
        }

        return markers;
      });

      const marketOrderMarkers: ChartMarker[] = debouncedNettedItems.filter(i => i.isPending).map(o => {
        let price = o.level || 0;
        let label = 'MARKET';
        const shortId = (o.dealReference || o.dealId || '').replace(/^o_/, '').slice(-6).toUpperCase();
        label = `✓ ${shortId}`;

        return {
          id: o.dealId || o.dealReference,
          epic: o.epic,
          price,
          direction: o.direction,
          size: o.size,
          type: 'ORDER',
          label
        };
      });

      const limitOrderMarkers: ChartMarker[] = nonMarketOrders.map(o => {
        const shortId = (o.dealReference || o.dealId || '').replace(/^o_/, '').slice(-6).toUpperCase();
        const prefix = o.type === 'STOP' ? 'STP' : 'LMT';
        return {
          id: o.dealId || o.dealReference,
          epic: o.epic,
          price: o.level || 0,
          direction: o.direction,
          size: o.size,
          type: 'ORDER',
          label: `${prefix} ${shortId}`
        };
      });

      const parseTime = (time: any) => {
        if (typeof time === 'number') return time * 1000;
        if (typeof time === 'string') {
          if (time.includes(' ')) return new Date(time.replace(' ', 'T') + 'Z').getTime();
          if (time.includes('T')) return new Date(time).getTime();
          return new Date(time + 'T00:00:00Z').getTime();
        }
        if (time && typeof time === 'object' && 'year' in time) {
          return new Date(Date.UTC(time.year, time.month - 1, time.day)).getTime();
        }
        return 0;
      };

      const executionMarkers: ChartMarker[] = tickerExecutions.map(e => {
         // Binary search for closest bar <= execution timestamp
         if (!chartData || chartData.length === 0) {
           return {
             id: e.id,
             epic: e.epic,
             price: e.price,
             direction: e.direction,
             size: e.size,
             type: 'EXECUTION',
             time: e.timestamp / 1000 as Time // fallback to exact seconds
           };
         }

         let left = 0;
         let right = chartData.length - 1;
         let matchBar = chartData[0];
         let matchBarTimeMs = 0;

         while (left <= right) {
           const mid = Math.floor((left + right) / 2);
           const barTimeMs = parseTime(chartData[mid].time);
           
           if (barTimeMs <= e.timestamp) {
             matchBar = chartData[mid];
             matchBarTimeMs = barTimeMs;
             left = mid + 1; // Try to find a closer one on the right
           } else {
             right = mid - 1;
           }
         }
         
         return {
           id: e.id,
           epic: e.epic,
           price: e.price,
           candleLow: matchBar ? matchBar.low : undefined,
           candleHigh: matchBar ? matchBar.high : undefined,
           direction: e.direction,
           size: e.size,
           type: 'EXECUTION',
           time: matchBar ? (Math.floor(parseTime(matchBar.time) / 1000) as Time) : undefined,
          };
      });

      return [...posMarkers, ...marketOrderMarkers, ...limitOrderMarkers, ...executionMarkers];
  }, [debouncedNettedItems, nonMarketOrders, tickerExecutions, chartData]);

  const markers = useMemo(() => {
    if (!dragPreview) return baseMarkers;
    
    const exists = baseMarkers.some(m => m.id === dragPreview.id);
    if (exists) {
      return baseMarkers.map(m => m.id === dragPreview.id ? { ...m, price: dragPreview.price } : m);
    } else {
      // Create a phantom marker for the new TP or SL being dragged
      const isTP = dragPreview.id.endsWith('_TP');
      const isSL = dragPreview.id.endsWith('_SL');
      const parentId = dragPreview.id.replace('_TP', '').replace('_SL', '');
      const parent = baseMarkers.find(m => m.id === parentId);
      
      if (parent) {
        const phantom: ChartMarker = {
          id: dragPreview.id,
          epic: parent.epic,
          price: dragPreview.price,
          direction: parent.direction === 'BUY' ? 'SELL' : 'BUY',
          size: parent.size,
          type: 'ORDER',
          label: isTP ? 'TP' : 'SL',
          isDashed: true,
          parentPrice: parent.price
        };
        return [...baseMarkers, phantom];
      }
    }
    return baseMarkers;
  }, [baseMarkers, dragPreview]);

  // Expose markers for E2E tests
  if (typeof window !== 'undefined') {
    (window as any).__TEST_MARKERS__ = markers;
    (window as any).__MARKERS__ = markers;
    (window as any).__TEST_CHART_API__ = chartRef?.current;
    (window as any).__TEST_PRICE_SERIES__ = priceSeriesRef?.current;
  }

  // Update TradePlugin
  useEffect(() => {
    if (tradePluginRef.current && typeof tradePluginRef.current.setItems === 'function') {
      tradePluginRef.current.setItems(markers);
    }
  }, [markers, tradePluginRef, pluginVersion]);

  // Subscribe to crosshair move to detect hover over executions
  useEffect(() => {
    if (chartRef?.current && tradePluginRef?.current) {
      const handleCrosshairMove = (param: any) => {
        if (!param.time || !param.point || !priceSeriesRef?.current || !tradePluginRef?.current) {
          chartRef.current.applyOptions({ crosshair: { horzLine: { visible: true, labelVisible: true } } });
          if (tradePluginRef?.current && typeof tradePluginRef.current.setHoveredExecutions === 'function') {
            tradePluginRef.current.setHoveredExecutions([]);
          }
          return;
        }

        if (typeof window !== 'undefined') (window as any).__MARKERS__ = markers;
        let exactTime: number | undefined;
        if (typeof param.time === 'string') {
          exactTime = new Date(param.time).getTime() / 1000;
        } else if (param.time && typeof param.time === 'object' && 'year' in param.time) {
          exactTime = new Date(Date.UTC(param.time.year, param.time.month - 1, param.time.day)).getTime() / 1000;
        } else if (typeof param.time === 'number') {
          exactTime = param.time;
        }
        
        // Find executions that match this exact candle
        const hovered = markers.filter(m => m.type === 'EXECUTION' && m.time === exactTime);
        if (typeof window !== 'undefined') (window as any).__LAST_HOVERED_RAW__ = hovered;

        if (hovered.length > 0) {
          let closestExec = null;
          let minDistance = Infinity;

          let scale = 1;
          if (chartRef.current) {
            const timeScale = chartRef.current.timeScale();
            const logicalRange = timeScale.getVisibleLogicalRange();
            if (logicalRange) {
              const width = timeScale.width();
              const barsVisible = logicalRange.to - logicalRange.from;
              const barSpacing = width / barsVisible;
              if (barSpacing < 8) {
                scale = Math.max(0.3, barSpacing / 8);
              }
            }
          }

          const executionCounts = new Map<string, number>();

          // Don't just use `hovered`, we need to check ALL executions for true 2D distance.
          // Wait, hovered already filters by `m.time === exactTime`, which restricts us to the EXACT candle.
          // That's actually fine as long as we also verify X distance, but if the user hovers slightly off 
          // horizontally, `exactTime` might be a different candle.
          // Let's rely on calculating the exact screen `x` for the markers that matched `exactTime` 
          // AND ensure the mouse is within a 15px radius of the marker's center.
          for (const hMarker of hovered) {
            const execData = tickerExecutions.find(e => e.id === hMarker.id);
            if (!execData) continue;

            const y = priceSeriesRef.current!.priceToCoordinate(execData.price);
            if (y === null) continue;

            const x = chartRef.current!.timeScale().timeToCoordinate(hMarker.time!);
            if (x === null) continue;

            let arrowY = y;
            if (hMarker.direction === 'BUY' && hMarker.candleLow !== undefined) {
              arrowY = priceSeriesRef.current!.priceToCoordinate(hMarker.candleLow) ?? y;
            } else if (hMarker.direction === 'SELL' && hMarker.candleHigh !== undefined) {
              arrowY = priceSeriesRef.current!.priceToCoordinate(hMarker.candleHigh) ?? y;
            }

            const directionKey = hMarker.direction;
            // Use exact same key as TradePlugin
            const key = `${Math.round(x)}_${directionKey}`;
            const count = executionCounts.get(key) || 0;
            executionCounts.set(key, count + 1);

            const stackOffset = count * 8 * scale;
            if (hMarker.direction === 'BUY') {
              arrowY += stackOffset;
            } else {
              arrowY -= stackOffset;
            }

            const offset = 6 * scale;
            const h = 8 * scale;
            let markerCenterY = arrowY;
            if (hMarker.direction === 'BUY') {
              markerCenterY += offset + h / 2;
            } else {
              markerCenterY -= offset + h / 2;
            }

            // Calculate true 2D Euclidean distance to the marker triangle center
            const distX = Math.abs(param.point.x - x);
            const distY = Math.abs(param.point.y - markerCenterY);
            const dist = Math.hypot(distX, distY);

            // Use a strict 2D radius
            if (dist < minDistance && dist <= 15) {
              minDistance = dist;
              closestExec = {
                x: x as any,
                y: y as any,
                price: execData.price,
                direction: execData.direction,
                action: execData.action
              };
            }
          }

          if (closestExec) {
            chartRef.current.applyOptions({ crosshair: { horzLine: { visible: false, labelVisible: false } } });
            if (typeof tradePluginRef.current.setHoveredExecutions === 'function') {
              tradePluginRef.current.setHoveredExecutions([closestExec]);
              if (typeof window !== 'undefined') (window as any).__TEST_HOVERED_EXECUTIONS__ = [closestExec];
            }
          } else {
            chartRef.current.applyOptions({ crosshair: { horzLine: { visible: true, labelVisible: true } } });
            if (typeof tradePluginRef.current.setHoveredExecutions === 'function') {
              tradePluginRef.current.setHoveredExecutions([]);
              if (typeof window !== 'undefined') (window as any).__TEST_HOVERED_EXECUTIONS__ = [];
            }
          }
        } else {
          chartRef.current.applyOptions({ crosshair: { horzLine: { visible: true, labelVisible: true } } });
          if (typeof tradePluginRef.current.setHoveredExecutions === 'function') {
            tradePluginRef.current.setHoveredExecutions([]);
            if (typeof window !== 'undefined') (window as any).__TEST_HOVERED_EXECUTIONS__ = [];
          }
        }
      };
      
      chartRef.current.subscribeCrosshairMove(handleCrosshairMove);
      return () => {
        try {
          chartRef.current?.unsubscribeCrosshairMove(handleCrosshairMove);
        } catch(e) {}
      };
    }
  }, [tickerExecutions, markers, priceSeriesRef, chartRef, tradePluginRef, pluginVersion]);

  // Register badge refs
  const handleRegisterBadge = useCallback((id: string, ref: React.RefObject<HTMLDivElement | null>) => {
    if (tradePluginRef.current && typeof tradePluginRef.current.registerBadgeRef === 'function') {
      tradePluginRef.current.registerBadgeRef(id, ref);
    }
  }, [tradePluginRef, pluginVersion]);

  const onDragMarker = useCallback((id: string, clientY: number) => {
    if (!chartContainerRef.current || !priceSeriesRef.current) return;
    const rect = chartContainerRef.current.getBoundingClientRect();
    const y = clientY - rect.top;
    const price = priceSeriesRef.current.coordinateToPrice(y as any);
    if (price !== null) {
      setDragPreview({ id, price });
    }
  }, [chartContainerRef, priceSeriesRef]);

  const onDropMarker = useCallback((id: string) => {
    if (dragPreview && dragPreview.id === id) {
      const dealId = id.replace('_SL', '').replace('_TP', '');
      if (id.endsWith('_SL')) {
        useTradeStore.getState().updatePositionStopLoss(dealId, dragPreview.price);
      } else if (id.endsWith('_TP')) {
        useTradeStore.getState().updatePositionTakeProfit(dealId, dragPreview.price);
      }
    }
    setDragPreview(null);
  }, [dragPreview]);

  // PnL calculation has been decoupled and moved to TradeControls.tsx to prevent re-renders
  const realizedPnL = 0; 
  const unrealizedPnL = 0;

  const onHoverMarker = useCallback((id: string | null) => {
    if (tradePluginRef.current && typeof tradePluginRef.current.setHoveredId === 'function') {
      tradePluginRef.current.setHoveredId(id);
    }
  }, [tradePluginRef, pluginVersion]);

  return {
    markers,
    handleRegisterBadge,
    realizedPnL,
    unrealizedPnL,
    onDragMarker,
    onDropMarker,
    onHoverMarker
  };
}
