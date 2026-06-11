import React, { useEffect } from 'react';
import { usePriceStore } from '../store/usePriceStore';
import { ChartMarker } from '../lib/TradePlugin';

interface TradeBadgeProps {
  marker: ChartMarker;
  badgeRef: React.RefObject<HTMLDivElement | null>;
  onClose?: () => void;
  onPointerDown?: React.PointerEventHandler<HTMLDivElement>;
  onPointerMove?: React.PointerEventHandler<HTMLDivElement>;
  onPointerUp?: React.PointerEventHandler<HTMLDivElement>;
  onPointerCancel?: React.PointerEventHandler<HTMLDivElement>;
  cursor?: string;
}

export function TradeBadge({ 
  marker, 
  badgeRef, 
  onClose,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  cursor
}: TradeBadgeProps) {
  const currentPriceData = usePriceStore((state) => state.prices[marker.epic]);
  const currentPrice = marker.direction === 'BUY' ? currentPriceData?.bid : currentPriceData?.ask;

  const pnl = currentPrice !== undefined 
    ? (marker.direction === 'BUY' ? (currentPrice - marker.price) : (marker.price - currentPrice)) * marker.size
    : 0;

  const isPosition = marker.type === 'POSITION';

  const tvBlue = '#2962ff';
  const tvRed = '#f23645';
  const tvGreen = '#089981';
  const tvOrange = '#ff9800';

  const isBuy = marker.direction === 'BUY';
  const isSL = marker.label === 'SL' || marker.id.endsWith('_SL');
  const isTP = marker.label === 'TP';

  let borderColor = tvBlue;
  let sizeBg = tvBlue;
  let sizeText = '#fff';
  let textColor = '#333';
  let closeColor = tvBlue;

  if (isPosition) {
     borderColor = isBuy ? tvBlue : tvRed;
     sizeBg = isBuy ? tvBlue : tvRed;
     closeColor = isBuy ? tvBlue : tvRed;
     textColor = pnl >= 0 ? tvGreen : tvRed;
  } else if (isSL) {
     borderColor = tvOrange;
     sizeBg = '#fff';
     sizeText = tvOrange;
     closeColor = tvOrange;
     textColor = tvOrange;
  } else if (isTP) {
     borderColor = tvGreen;
     sizeBg = '#fff';
     sizeText = tvGreen;
     closeColor = tvGreen;
     textColor = tvGreen;
  } else {
     borderColor = tvOrange;
     sizeBg = '#fff';
     sizeText = tvOrange;
     closeColor = tvOrange;
     textColor = tvOrange;
  }

  let valueText = marker.label || 'ORDER';
  if (isPosition) {
     valueText = `${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)} USD`;
  } else if (marker.parentPrice !== undefined) {
     const isSlBuy = marker.direction === 'BUY';
     const hitPnl = (marker.price - marker.parentPrice) * marker.size * (isSlBuy ? -1 : 1);
     valueText = `${hitPnl >= 0 ? '+' : ''}${hitPnl.toFixed(2)} USD`;
  }

  return (
    <div 
      ref={badgeRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      className="trade-badge-tv" 
      style={{
        position: 'absolute',
        transform: 'translateY(-50%)',
        right: '90px',
        zIndex: 20,
        cursor: cursor || 'default',
        background: '#ffffff',
        border: `1px solid ${borderColor}`,
        borderRadius: '4px',
        display: 'flex', 
        alignItems: 'stretch',
        boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
        overflow: 'hidden',
        height: '18px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, Ubuntu, sans-serif'
      }}>
      
      {/* Size segment */}
      <div style={{ 
        background: sizeBg,
        color: sizeText, 
        padding: '0 8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '11px',
        fontWeight: '600'
      }}>
        {marker.size}
      </div>
      
      {/* Value segment */}
      <div style={{
         padding: '0 12px',
         display: 'flex',
         alignItems: 'center',
         justifyContent: 'center',
         fontSize: '11px',
         fontWeight: '600',
         color: textColor,
         whiteSpace: 'nowrap',
         borderLeft: sizeBg === '#fff' ? `1px solid #e0e3eb` : 'none'
      }}>
        {valueText}
      </div>

      {/* Close button */}
      {onClose && (
        <div style={{
          display: 'flex',
          borderLeft: `1px solid #e0e3eb`,
          background: '#fff'
        }}>
          <button 
            onClick={onClose}
            style={{ 
              background: 'transparent', 
              border: 'none', 
              color: closeColor, 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              padding: '0 8px',
              fontSize: '14px',
              lineHeight: 1,
              fontWeight: 'bold'
            }}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}

