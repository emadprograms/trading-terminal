import { useEffect, useRef } from 'react';
import { useAlertStore, Alert } from '../../store/useAlertStore';
import type { ISeriesApi, IPriceLine } from 'lightweight-charts';

export interface UseChartAlertsProps {
  ticker: string;
  priceSeriesRef: React.MutableRefObject<ISeriesApi<"Candlestick"> | null>;
  theme: 'light' | 'dark';
}

export function useChartAlerts({ ticker, priceSeriesRef, theme }: UseChartAlertsProps) {
  const linesRef = useRef<Map<string, IPriceLine>>(new Map());

  useEffect(() => {
    const syncAlerts = (state: ReturnType<typeof useAlertStore.getState>) => {
      // Filter active alerts for the current ticker
      const activeAlerts = state.alerts.filter(
        (a: Alert) => a.epic === ticker && !a.triggered
      );

      const currentLines = linesRef.current;
      const series = priceSeriesRef.current;

      if (!series) return;

      // Keep track of which alert IDs we saw in this update
      const activeIds = new Set<string>();

      // Update existing lines or create new ones
      for (const alert of activeAlerts) {
        activeIds.add(alert.id);
        const existingLine = currentLines.get(alert.id);
        
        if (existingLine) {
          existingLine.applyOptions({
            price: alert.targetPrice,
          });
        } else {
          const newLine = series.createPriceLine({
            price: alert.targetPrice,
            color: '#ff9800',
            lineWidth: 2,
            lineStyle: 0,
            axisLabelVisible: true,
            title: 'ALERT',
          });
          currentLines.set(alert.id, newLine);
        }
      }

      // Remove orphaned lines
      for (const [id, line] of currentLines.entries()) {
        if (!activeIds.has(id)) {
          series.removePriceLine(line);
          currentLines.delete(id);
        }
      }
    };

    // Initial sync
    syncAlerts(useAlertStore.getState());

    // Subscribe to updates
    const unsubscribe = useAlertStore.subscribe(syncAlerts);

    return () => {
      unsubscribe();
      const currentLines = linesRef.current;
      const series = priceSeriesRef.current;
      if (series) {
        for (const line of currentLines.values()) {
          try {
            series.removePriceLine(line);
          } catch (e) {
            // ignore if series is already destroyed
          }
        }
      }
      currentLines.clear();
    };
  }, [ticker, priceSeriesRef, theme]);
}
