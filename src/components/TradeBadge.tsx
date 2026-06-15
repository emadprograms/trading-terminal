import React, { useEffect } from 'react';
import { usePriceStore } from '../store/usePriceStore';
import { ChartMarker } from '../lib/TradePlugin';

interface TradeBadgeProps {
  marker: ChartMarker;
  badgeRef: React.RefObject<HTMLDivElement | null>;
  onClose?: () => void;
  onPointerDown?: (e: React.PointerEvent<HTMLDivElement>, suffix?: string) => void;
  onPointerMove?: React.PointerEventHandler<HTMLDivElement>;
  onPointerUp?: React.PointerEventHandler<HTMLDivElement>;
  onPointerCancel?: React.PointerEventHandler<HTMLDivElement>;
  onPointerEnter?: React.PointerEventHandler<HTMLDivElement>;
  onPointerLeave?: React.PointerEventHandler<HTMLDivElement>;
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
  onPointerEnter,
  onPointerLeave,
  cursor
}: TradeBadgeProps) {
  const currentPriceData = usePriceStore((state) => state.prices[marker.epic]);
  const currentPrice = marker.direction === 'BUY' ? currentPriceData?.bid : currentPriceData?.ask;

  const pnl = currentPrice !== undefined 
    ? (marker.direction === 'BUY' ? (currentPrice - marker.price) : (marker.price - currentPrice)) * marker.size
    : 0;

  const isPosition = marker.type === 'POSITION';

  const tvBlue = '#007aff';
  const tvRed = '#ff3b30';
  const tvGreen = '#089981';
  const tvOrange = '#ff9800';

  const isBuy = marker.direction === 'BUY';
  const isSL = marker.label === 'SL' || marker.id.endsWith('_SL');
  const isTP = marker.label === 'TP';
  const isPendingMarket = marker.type === 'ORDER' && marker.label?.startsWith('✓');

  let borderColor = tvBlue;
  let sizeBg = tvBlue;
  let sizeText = '#ffffff';
  let textColor = '#333';
  let closeColor = tvBlue;

  if (isPosition || isPendingMarket) {
     borderColor = isBuy ? tvBlue : tvRed;
     sizeBg = isBuy ? tvBlue : tvRed;
     closeColor = isBuy ? tvBlue : tvRed;
     textColor = isPendingMarket ? (isBuy ? tvBlue : tvRed) : (pnl >= 0 ? tvGreen : tvRed);
  } else if (isSL) {
     borderColor = tvOrange;
     sizeBg = '#f8f9fa';
     sizeText = tvOrange;
     closeColor = tvOrange;
     textColor = tvOrange;
  } else if (isTP) {
     borderColor = tvGreen;
     sizeBg = '#f8f9fa';
     sizeText = tvGreen;
     closeColor = tvGreen;
     textColor = tvGreen;
  } else {
     borderColor = tvOrange;
     sizeBg = '#f8f9fa';
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
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      style={{
      position: 'absolute',
      transform: 'translateY(-50%)',
      right: '90px',
      zIndex: 20,
      display: 'flex',
      alignItems: 'center',
      gap: '4px'
    }}>
      {isPosition && !marker.hasTP && (
        <div 
          onPointerDown={(e) => onPointerDown?.(e, '_TP')}
          style={{
            cursor: 'ns-resize',
            background: '#ffffff',
            border: `1px dashed ${tvGreen}`,
            color: tvGreen,
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: '600',
            padding: '0 4px',
            height: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, Ubuntu, sans-serif'
          }}
        >
          TP
        </div>
      )}
      
      {isPosition && !marker.hasSL && (
        <div 
          onPointerDown={(e) => onPointerDown?.(e, '_SL')}
          style={{
            cursor: 'ns-resize',
            background: '#ffffff',
            border: `1px dashed ${tvOrange}`,
            color: tvOrange,
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: '600',
            padding: '0 4px',
            height: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, Ubuntu, sans-serif'
          }}
        >
          SL
        </div>
      )}

      <div 
        onPointerDown={(e) => onPointerDown?.(e)}
        className="trade-badge-tv" 
        style={{
          cursor: cursor || 'default',
          background: '#f8f9fa',
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
        padding: '0 6px',
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
         padding: '0 8px',
         display: 'flex',
         alignItems: 'center',
         justifyContent: 'center',
         fontSize: '11px',
         fontWeight: '600',
         color: textColor,
         whiteSpace: 'nowrap',
         borderLeft: sizeBg === '#f8f9fa' ? `1px solid #e0e3eb` : 'none'
      }}>
        {valueText}
      </div>

      {/* Close button */}
      {onClose && (
        <div style={{
          display: 'flex',
          borderLeft: `1px solid #e0e3eb`,
          background: '#f8f9fa'
        }}>
          <button 
            onPointerDown={(e) => e.stopPropagation()}
            onClick={onClose}
            style={{ 
              background: 'transparent', 
              border: 'none', 
              color: closeColor, 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              padding: '0 6px',
              fontSize: '15px',
              lineHeight: 1,
              fontWeight: 'normal'
            }}
          >
            ×
          </button>
        </div>
      )}
    </div>
    </div>
  );
}

