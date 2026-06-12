import React from 'react';
import { RefreshCcw } from 'lucide-react';
import { TradeBadge } from './TradeBadge';
import type { ChartMarker } from '../lib/TradePlugin';

interface ChartCanvasProps {
  chartContainerRef: React.RefObject<HTMLDivElement | null>;
  isDrawingMode: boolean;
  isViewModified: boolean;
  resetView: () => void;
  markers: ChartMarker[];
  onRegisterBadge: (id: string, ref: React.RefObject<HTMLDivElement | null>) => void;
  onCloseTrade?: (id: string) => void;
  onDragMarker?: (id: string, y: number) => void;
  onDropMarker?: (id: string) => void;
  onHoverMarker?: (id: string | null) => void;
  isHydrated: boolean;
}

export function ChartCanvas({
  chartContainerRef,
  isDrawingMode,
  isViewModified,
  resetView,
  markers,
  onRegisterBadge,
  onCloseTrade,
  onDragMarker,
  onDropMarker,
  onHoverMarker,
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

      {isViewModified && (
        <button 
          className="scroll-to-end-btn"
          onClick={resetView}
          title="Reset View"
        >
          <RefreshCcw size={16} />
        </button>
      )}

      {markers.map((marker) => (
        <BadgeWrapper 
          key={marker.id} 
          marker={marker} 
          onRegister={onRegisterBadge} 
          onClose={onCloseTrade ? () => onCloseTrade(marker.id) : undefined} 
          onDragMarker={onDragMarker}
          onDropMarker={onDropMarker}
          onHoverMarker={onHoverMarker}
        />
      ))}
    </div>
  );
}

// Internal wrapper to manage individual badge refs
function BadgeWrapper({ 
  marker, 
  onRegister, 
  onClose,
  onDragMarker,
  onDropMarker,
  onHoverMarker
}: { 
  marker: ChartMarker, 
  onRegister: (id: string, ref: React.RefObject<HTMLDivElement | null>) => void,
  onClose?: () => void,
  onDragMarker?: (id: string, y: number) => void,
  onDropMarker?: (id: string) => void,
  onHoverMarker?: (id: string | null) => void
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const isDragging = React.useRef(false);
  const draggedId = React.useRef<string | null>(null);
  
  React.useEffect(() => {
    onRegister(marker.id, ref);
  }, [marker.id, onRegister]);

  const handlePointerDown = (e: React.PointerEvent, suffix?: string) => {
    let targetId = marker.id;
    if (suffix) {
        targetId = marker.id + suffix;
    } else if (!marker.id.endsWith('_SL') && !marker.id.endsWith('_TP')) {
        return;
    }
    
    if (e.button !== 0) return; // Only left click
    draggedId.current = targetId;
    isDragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    e.stopPropagation();
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current || !onDragMarker || !draggedId.current) return;
    onDragMarker(draggedId.current, e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    isDragging.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
    if (onDropMarker && draggedId.current) {
        onDropMarker(draggedId.current);
    }
    draggedId.current = null;
  };

  return (
    <TradeBadge 
      marker={marker} 
      badgeRef={ref} 
      onClose={onClose}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerEnter={() => onHoverMarker?.(marker.id)}
      onPointerLeave={() => onHoverMarker?.(null)}
      cursor={(marker.id.endsWith('_SL') || marker.id.endsWith('_TP')) ? 'ns-resize' : 'default'}
    />
  );
}

