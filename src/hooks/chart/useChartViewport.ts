import { useEffect, useRef, useCallback } from 'react';
import { IChartApi, ISeriesApi, LogicalRange } from 'lightweight-charts';
import type { HistoryPrependState } from '../../types';

interface UseChartViewportParams {
  chartRef: React.MutableRefObject<IChartApi | null>;
  priceSeriesRef: React.MutableRefObject<ISeriesApi<'Candlestick'> | null>;
  chartData: any[];
  pendingHistoryPrependRef: React.MutableRefObject<HistoryPrependState | null>;
}

export function useChartViewport({
  chartRef,
  priceSeriesRef,
  chartData,
  pendingHistoryPrependRef,
}: UseChartViewportParams) {
  const lastDataCountRef = useRef(0);

  const scrollToRealTime = useCallback(() => {
    if (chartRef.current) {
      const ts = chartRef.current.timeScale();
      const rightOffset = typeof ts.options === 'function' ? ts.options().rightOffset || 15 : 15;
      ts.scrollToPosition(rightOffset, false);
    }
  }, [chartRef]);

  const resetView = useCallback(() => {
    if (chartRef.current) {
      const ts = chartRef.current.timeScale();
      const rightOffset = typeof ts.options === 'function' ? ts.options().rightOffset || 15 : 15;
      ts.scrollToPosition(rightOffset, false);
      chartRef.current.priceScale('right').applyOptions({ autoScale: true });
    }
  }, [chartRef]);

  const syncViewport = useCallback((isSameContext: boolean) => {
    if (!chartRef.current || !priceSeriesRef.current || chartData.length === 0) return;

    const ts = chartRef.current.timeScale();
    const oldLogicalRange = ts.getVisibleLogicalRange();

    if (isSameContext && oldLogicalRange) {
      const wasAtEnd = oldLogicalRange.to >= lastDataCountRef.current - 0.5;

      if (pendingHistoryPrependRef.current) {
        // Priority 1: Prepend History
        const { oldFirstTime, oldLogicalRange: prependRange } = pendingHistoryPrependRef.current;
        
        if (oldFirstTime === null) {
          pendingHistoryPrependRef.current = null;
          ts.setVisibleLogicalRange(oldLogicalRange);
          return;
        }

        const newFirstIndex = chartData.findIndex(d => d.time === oldFirstTime);
        
        if (newFirstIndex > 0 && prependRange) {
            ts.setVisibleLogicalRange({
                from: prependRange.from + newFirstIndex,
                to: prependRange.to + newFirstIndex
            });
        } else {
            ts.setVisibleLogicalRange(oldLogicalRange);
        }
        pendingHistoryPrependRef.current = null;
      } else if (wasAtEnd) {
        // Priority 2: Manual Shift (End-of-chart)
        const shift = chartData.length - lastDataCountRef.current;
        if (shift > 0) {
          ts.setVisibleLogicalRange({
            from: oldLogicalRange.from + shift,
            to: oldLogicalRange.to + shift
          });
        } else {
          ts.setVisibleLogicalRange(oldLogicalRange);
        }
      } else {
        ts.setVisibleLogicalRange(oldLogicalRange);
      }
    } else if (pendingHistoryPrependRef.current) {
        // Handle prepend even if context changed
        const { oldFirstTime, oldLogicalRange: prependRange } = pendingHistoryPrependRef.current;
        const newFirstIndex = chartData.findIndex(d => d.time === oldFirstTime);
        
        if (newFirstIndex > 0 && prependRange) {
            ts.setVisibleLogicalRange({
                from: prependRange.from + newFirstIndex,
                to: prependRange.to + newFirstIndex
            });
        }
        pendingHistoryPrependRef.current = null;
    } else {
        const rightOffset = typeof ts.options === 'function' ? ts.options().rightOffset || 15 : 15;
        ts.scrollToPosition(rightOffset, false);
    }

    lastDataCountRef.current = chartData.length;
  }, [chartRef, priceSeriesRef, chartData, pendingHistoryPrependRef]);

  return {
    syncViewport,
    scrollToRealTime,
    resetView,
  };
}
