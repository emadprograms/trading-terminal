import React, { useEffect } from 'react';
import { usePriceStore } from '../store/usePriceStore';
import { ChartMarker } from '../lib/TradePlugin';

interface TradeBadgeProps {
  marker: ChartMarker;
  badgeRef: React.RefObject<HTMLDivElement | null>;
  onClose?: () => void;
}

export function TradeBadge({ marker, badgeRef, onClose }: TradeBadgeProps) {
  const currentPriceData = usePriceStore((state) => state.prices[marker.epic]);
  const currentPrice = marker.direction === 'BUY' ? currentPriceData?.bid : currentPriceData?.ask;

  const pnl = currentPrice !== undefined 
    ? (marker.direction === 'BUY' ? (currentPrice - marker.price) : (marker.price - currentPrice)) * marker.size
    : 0;

  const isPosition = marker.type === 'POSITION';

  return (
    <div 
      ref={badgeRef}
      className="trade-badge" style={{
        position: 'absolute',
        transform: 'translateY(-50%)',
        right: '90px',
        zIndex: 20,
        background: 'rgba(30, 41, 59, 0.9)',
        border: `1px solid ${marker.direction === 'BUY' ? '#26a69a' : '#ef5350'}`,
        color: '#fff', padding: '2px 6px', borderRadius: '4px',
        fontSize: '10px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px',
        boxShadow: '0 2px 6px rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)',
        whiteSpace: 'nowrap'
      }}>
      <span style={{ 
        background: marker.direction === 'BUY' ? '#26a69a' : '#ef5350',
        color: '#fff', 
        padding: '1px 4px', 
        borderRadius: '3px',
        fontSize: '10px',
        fontWeight: '800',
        marginRight: '1px'
      }}>
        {marker.size}
      </span>
      
      {isPosition ? (
        <span style={{ color: pnl >= 0 ? '#26a69a' : '#ef5350' }}>
          {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)}
        </span>
      ) : (
        <span style={{ color: '#f59e0b', fontSize: '9px' }}>
          {marker.label || 'ORDER'}
        </span>
      )}

      {onClose && (
        <button 
          onClick={onClose}
          style={{ 
            background: 'rgba(0,0,0,0.2)', border: 'none', color: '#fff', 
            borderRadius: '50%', width: '12px', height: '12px', 
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '8px', padding: 0, marginLeft: '2px'
          }}
        >
          ✕
        </button>
      )}
    </div>
  );
}

