import React from 'react';
import { ChevronRight } from 'lucide-react';
import { TradeBadge } from './TradeBadge';
import type { ChartMarker } from '../lib/TradePlugin';

interface ChartCanvasProps {
  chartContainerRef: React.RefObject<HTMLDivElement | null>;
  isDrawingMode: boolean;
  isAtEnd: boolean;
  scrollToRealTime: () => void;
  markers: ChartMarker[];
  onRegisterBadge: (id: string, ref: React.RefObject<HTMLDivElement | null>) => void;
  onCloseTrade?: (id: string) => void;
  isHydrated: boolean;
}

export function ChartCanvas({
  chartContainerRef,
  isDrawingMode,
  isAtEnd,
  scrollToRealTime,
  markers,
  onRegisterBadge,
  onCloseTrade,
  isHydrated
}: ChartCanvasProps) {
  return (
    <div ref={chartContainerRef} style={{ flex: 1, position: 'relative', minHeight: 0, minWidth: 0, overflow: 'hidden', cursor: isDrawingMode ? 'crosshair' : 'default' }}>
      
      {!isHydrated && (
        <div style={{ 
          position: 'absolute', 
          inset: 0, 
          backgroundColor: 'var(--bg-dark)', 
          zIndex: 10,
          pointerEvents: 'none' 
        }} />
      )}

      {!isAtEnd && (
        <button 
          className="scroll-to-end-btn"
          onClick={scrollToRealTime}
          title="Scroll to latest"
        >
          <ChevronRight size={18} />
        </button>
      )}

      {markers.map((marker) => (
        <BadgeWrapper 
          key={marker.id} 
          marker={marker} 
          onRegister={onRegisterBadge} 
          onClose={(onCloseTrade && !marker.id.endsWith('_SL')) ? () => onCloseTrade(marker.id) : undefined} 
        />
      ))}
    </div>
  );
}

// Internal wrapper to manage individual badge refs
function BadgeWrapper({ 
  marker, 
  onRegister, 
  onClose 
}: { 
  marker: ChartMarker, 
  onRegister: (id: string, ref: React.RefObject<HTMLDivElement | null>) => void,
  onClose?: () => void
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  
  React.useEffect(() => {
    onRegister(marker.id, ref);
  }, [marker.id, onRegister]);

  return <TradeBadge marker={marker} badgeRef={ref} onClose={onClose} />;
}

