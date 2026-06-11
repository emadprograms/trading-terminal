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

  // Map to ChartMarkers
  const markers = useMemo((): ChartMarker[] => {
    const posMarkers: ChartMarker[] = tickerPositions.flatMap(p => {
      const markers: ChartMarker[] = [{
        id: p.dealId,
        epic: p.epic,
        price: p.entryPrice,
        direction: p.direction,
        size: p.size,
        type: 'POSITION'
      }];

      if (p.stopLevel) {
        markers.push({
          id: `${p.dealId}_SL`,
          epic: p.epic,
          price: p.stopLevel,
          direction: p.direction === 'BUY' ? 'SELL' : 'BUY', // Stop loss is opposite direction
          size: p.size,
          type: 'ORDER',
          label: 'SL'
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
        id: o.dealReference,
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

  return {
    markers,
    handleRegisterBadge,
    realizedPnL,
    unrealizedPnL,
  };
}
