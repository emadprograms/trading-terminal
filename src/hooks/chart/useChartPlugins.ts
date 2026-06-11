import { useEffect, useRef, useState } from 'react';
import { ISeriesApi } from 'lightweight-charts';
import { SessionShadingPlugin } from '../../lib/SessionShading';
import { VolumeProfilePlugin } from '../../lib/VolumeProfilePlugin';
import { HorizontalRayPlugin } from '../../lib/HorizontalRayPlugin';
import { RectanglePlugin } from '../../lib/RectanglePlugin';
import { TradePlugin } from '../../lib/TradePlugin';
import type { RayDrawing, RectDrawing, TickerDrawings, Timeframe } from '../../types';

interface UseChartPluginsParams {
  priceSeriesRef: React.MutableRefObject<ISeriesApi<'Candlestick'> | null>;
  timeframe: Timeframe;
  showEth: boolean;
  showVP: boolean;
  drawings: TickerDrawings;
}

export function useChartPlugins({
  priceSeriesRef,
  timeframe,
  showEth,
  showVP,
  drawings,
}: UseChartPluginsParams) {
  const shadingPluginRef = useRef<SessionShadingPlugin | null>(null);
  const vpPluginRef = useRef<VolumeProfilePlugin | null>(null);
  const rayPluginRef = useRef<HorizontalRayPlugin | null>(null);
  const rectPluginRef = useRef<RectanglePlugin | null>(null);
  const tradePluginRef = useRef<TradePlugin | null>(null);

  const [pluginVersion, setPluginVersion] = useState(0);

  useEffect(() => {
    const series = priceSeriesRef.current;
    if (!series) return;

    const isET = (new Date().getTimezoneOffset() === -240); // Simplified ET check for init, will be updated by ticker logic in lifecycle

    shadingPluginRef.current = new SessionShadingPlugin(timeframe, isET && showEth);
    series.attachPrimitive(shadingPluginRef.current);

    vpPluginRef.current = new VolumeProfilePlugin();
    series.attachPrimitive(vpPluginRef.current);

    rayPluginRef.current = new HorizontalRayPlugin();
    series.attachPrimitive(rayPluginRef.current);
    
    rectPluginRef.current = new RectanglePlugin();
    series.attachPrimitive(rectPluginRef.current);
    
    tradePluginRef.current = new TradePlugin();
    series.attachPrimitive(tradePluginRef.current);
    
    rayPluginRef.current.setRays(drawings.rays || []);
    rectPluginRef.current.setRects(drawings.rects || []);

    setPluginVersion(v => v + 1);

    return () => {
        if (series) {
            try { series.detachPrimitive(shadingPluginRef.current!); } catch(e) {}
            try { series.detachPrimitive(vpPluginRef.current!); } catch(e) {}
            try { series.detachPrimitive(rayPluginRef.current!); } catch(e) {}
            try { series.detachPrimitive(rectPluginRef.current!); } catch(e) {}
            try { series.detachPrimitive(tradePluginRef.current!); } catch(e) {}
        }
    };
  }, [priceSeriesRef]);

  // Update Ray/Rect Plugins when synced drawings change
  useEffect(() => {
    if (rayPluginRef.current && rectPluginRef.current) {
        rayPluginRef.current.setRays(drawings.rays || []);
        rectPluginRef.current.setRects(drawings.rects || []);
    }
  }, [drawings]);

  // Update VP Enabled State
  useEffect(() => {
      if (vpPluginRef.current) {
          vpPluginRef.current.setEnabled(showVP);
      }
  }, [showVP]);

  // Update shading plugin config (Tz/ETH/Tf)
  // This is called from useChartLifecycle based on ticker/timeframe changes
  const updateShadingConfig = (isET: boolean) => {
    if (shadingPluginRef.current) {
        shadingPluginRef.current.setConfig(timeframe, isET && showEth);
    }
  };

  return { 
    shadingPluginRef, 
    vpPluginRef, 
    rayPluginRef, 
    rectPluginRef, 
    tradePluginRef, 
    updateShadingConfig,
    pluginVersion
  };
}
