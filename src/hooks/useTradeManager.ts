import React, { useEffect, useMemo, useCallback } from 'react';
import { useTradeStore } from '../store/useTradeStore';
import { usePriceStore } from '../store/usePriceStore';
import type { ISeriesApi } from 'lightweight-charts';
import type { ChartBar } from '../types';
import type { TradePlugin, ChartMarker } from '../lib/TradePlugin';

interface UseTradeManagerParams {
  ticker: string;
  chartData: ChartBar[];
  chartContainerRef: React.RefObject<HTMLDivElement | null>;
  priceSeriesRef: React.MutableRefObject<ISeriesApi<'Candlestick'> | null>;
  tradePluginRef: React.MutableRefObject<TradePlugin | null>;
  pluginVersion: number;
}

export function useTradeManager({
  ticker,
  chartData,
  chartContainerRef,
  priceSeriesRef,
  tradePluginRef,
  pluginVersion,
}: UseTradeManagerParams) {
  const positions = useTradeStore((state) => state.positions);
  const pendingOrders = useTradeStore((state) => state.pendingOrders);
  const currentPrices = usePriceStore((state) => state.prices[ticker]);

  // Filter positions and orders for this ticker
  const tickerPositions = useMemo(() => 
    positions.filter(p => p.epic === ticker),
    [positions, ticker]
  );

  const tickerOrders = useMemo(() => 
    Object.values(pendingOrders).filter(o => o.epic === ticker && o.status === 'PENDING'),
    [pendingOrders, ticker]
  );

  const [dragPreview, setDragPreview] = React.useState<{ id: string, price: number } | null>(null);

  // Map to ChartMarkers
  const baseMarkers = useMemo((): ChartMarker[] => {
    const posMarkers: ChartMarker[] = tickerPositions.flatMap(p => {
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
          direction: p.direction === 'BUY' ? 'SELL' : 'BUY', // Stop loss is opposite direction
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
          direction: p.direction === 'BUY' ? 'SELL' : 'BUY', // Take profit is opposite direction
          size: p.size,
          type: 'ORDER',
          label: 'TP',
          isDashed: true,
          parentPrice: p.entryPrice
        });
      }

      return markers;
    });

    const orderMarkers: ChartMarker[] = tickerOrders.map(o => {
      let price = o.level || 0;
      
      // For Market orders, use current price while pending
      if (o.type === 'MARKET' && !o.level && currentPrices) {
        price = o.direction === 'BUY' ? currentPrices.ask : currentPrices.bid;
      }

      return {
        id: o.dealId || o.dealReference,
        epic: o.epic,
        price,
        direction: o.direction,
        size: o.size,
        type: 'ORDER',
        label: o.type
      };
    });

    return [...posMarkers, ...orderMarkers];
  }, [tickerPositions, tickerOrders, currentPrices]);

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
    if (tradePluginRef.current) {
      tradePluginRef.current.setItems(markers);
    }
  }, [markers, tradePluginRef, pluginVersion]);

  // Register badge refs
  const handleRegisterBadge = useCallback((id: string, ref: React.RefObject<HTMLDivElement | null>) => {
    if (tradePluginRef.current) {
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

  // Calculate Unrealized PnL for this ticker's positions
  const unrealizedPnL = useMemo(() => {
    if (!currentPrices) return 0;
    
    return tickerPositions.reduce((total, pos) => {
      const currentPrice = pos.direction === 'BUY' ? currentPrices.bid : currentPrices.ask;
      const pnlPerUnit = pos.direction === 'BUY' 
        ? currentPrice - pos.entryPrice 
        : pos.entryPrice - currentPrice;
      return total + (pnlPerUnit * pos.size);
    }, 0);
  }, [tickerPositions, currentPrices]);

  // Realized PnL is currently not tracked per-ticker in the store, 
  // but we can expose a placeholder or track it globally.
  const realizedPnL = 0; 

  const onHoverMarker = useCallback((id: string | null) => {
    if (tradePluginRef.current) {
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
