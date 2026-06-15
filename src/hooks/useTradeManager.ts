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
  const nettedItems = useMemo(() => {
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

  const nonMarketOrders = useMemo(() => 
    tickerOrders.filter(o => o.type !== 'MARKET'),
  [tickerOrders]);

  const [dragPreview, setDragPreview] = React.useState<{ id: string, price: number } | null>(null);

  // Map to ChartMarkers
  const baseMarkers = useMemo((): ChartMarker[] => {
    const posMarkers: ChartMarker[] = nettedItems.filter(i => !i.isPending).flatMap(p => {
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

    const marketOrderMarkers: ChartMarker[] = nettedItems.filter(i => i.isPending).map(o => {
      let price = o.level || 0;
      let label = 'MARKET';
      const shortId = (o.dealReference || o.dealId || '').replace(/^o_/, '').substring(0, 6).toUpperCase();
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
      return {
        id: o.dealId || o.dealReference,
        epic: o.epic,
        price: o.level || 0,
        direction: o.direction,
        size: o.size,
        type: 'ORDER',
        label: o.type
      };
    });

    const executionMarkers: ChartMarker[] = tickerExecutions.map(e => {
       // Find the closest bar timestamp <= execution timestamp
       let matchBar = chartData[0];
       for (const bar of chartData) {
         if (new Date(bar.time + 'Z').getTime() <= e.timestamp) {
           matchBar = bar;
         } else {
           break;
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
         time: Math.floor(new Date(matchBar ? matchBar.time + 'Z' : 0).getTime() / 1000) as Time,
        };
    });

    return [...posMarkers, ...marketOrderMarkers, ...limitOrderMarkers, ...executionMarkers];
  }, [nettedItems, nonMarketOrders, tickerExecutions, chartData]);

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

        const exactTime = param.time as number;
        // Find executions that match this exact candle
        const hovered = markers.filter(m => m.type === 'EXECUTION' && m.time === exactTime);
        if (hovered.length > 0) {
          let closestExec = null;
          let minDistance = Infinity;

          for (const hMarker of hovered) {
            const execData = tickerExecutions.find(e => e.id === hMarker.id);
            if (!execData) continue;

            const y = priceSeriesRef.current!.priceToCoordinate(execData.price);
            if (y === null) continue;

            let arrowY = y;
            if (hMarker.direction === 'BUY' && hMarker.candleLow !== undefined) {
              arrowY = priceSeriesRef.current!.priceToCoordinate(hMarker.candleLow) ?? y;
            } else if (hMarker.direction === 'SELL' && hMarker.candleHigh !== undefined) {
              arrowY = priceSeriesRef.current!.priceToCoordinate(hMarker.candleHigh) ?? y;
            }

            // Distance can be to the triangle (arrowY) or to the price level (y)
            const dist = Math.min(
              Math.abs(param.point.y - arrowY),
              Math.abs(param.point.y - y)
            );

            if (dist < minDistance) {
              minDistance = dist;
              closestExec = {
                x: param.point.x,
                y,
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
            }
          } else {
            chartRef.current.applyOptions({ crosshair: { horzLine: { visible: true, labelVisible: true } } });
            if (typeof tradePluginRef.current.setHoveredExecutions === 'function') {
              tradePluginRef.current.setHoveredExecutions([]);
            }
          }
        } else {
          chartRef.current.applyOptions({ crosshair: { horzLine: { visible: true, labelVisible: true } } });
          if (typeof tradePluginRef.current.setHoveredExecutions === 'function') {
            tradePluginRef.current.setHoveredExecutions([]);
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
  }, [tickerExecutions, markers, priceSeriesRef, chartRef, tradePluginRef]);

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
