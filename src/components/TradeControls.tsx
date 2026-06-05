import React from 'react';
import type { TradeType } from '../types';
import { usePriceStore } from '../store/usePriceStore';

interface TradeControlsProps {
  ticker: string;
  tradeSize: number;
  setTradeSize: (size: number) => void;
  placeOrder: (type: TradeType) => void;
}

export function TradeControls({ ticker, tradeSize, setTradeSize, placeOrder }: TradeControlsProps) {
  const priceData = usePriceStore((state) => state.prices[ticker]);
  const bid = priceData?.bid;
  const ask = priceData?.ask;

  // Format price helper
  const formatPrice = (p?: number) => {
    if (p === undefined || p === null) return '---';
    // Use 5 decimal places for forex, or whatever is appropriate
    return p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 5 });
  };

  return (
    <div className="trade-controls" style={{
      position: 'absolute', top: '0px', left: '0px', zIndex: 20,
      display: 'flex', alignItems: 'center', gap: '5px',
      color: '#fff', fontFamily: 'Inter, system-ui, sans-serif',
      paddingTop: '10px', paddingLeft: '10px'
    }}>
      {/* SELL BUTTON (BID PRICE) - RED */}
      <button 
        onClick={() => placeOrder('short')}
        style={{ 
          background: '#ef5350', color: '#fff', border: 'none', borderRadius: '4px', 
          padding: '4px 12px', fontSize: '12px', fontWeight: '700', cursor: 'pointer',
          transition: 'filter 0.2s', minWidth: '80px'
        }}
        onMouseOver={e => e.currentTarget.style.filter = 'brightness(1.2)'}
        onMouseOut={e => e.currentTarget.style.filter = 'brightness(1)'}
      >
        {formatPrice(bid)}
      </button>
      
      <input 
        type="number" 
        value={tradeSize} 
        onChange={(e) => setTradeSize(Number(e.target.value))}
        style={{ 
          width: '50px', background: '#0f172a', border: '1px solid #334155', 
          color: '#fff', borderRadius: '4px', padding: '2px 4px', fontSize: '12px', textAlign: 'center'
        }} 
      />
      
      {/* BUY BUTTON (ASK PRICE) - GREEN */}
      <button 
        onClick={() => placeOrder('long')}
        style={{ 
          background: '#26a69a', color: '#fff', border: 'none', borderRadius: '4px', 
          padding: '4px 12px', fontSize: '12px', fontWeight: '700', cursor: 'pointer',
          transition: 'filter 0.2s', minWidth: '80px'
        }}
        onMouseOver={e => e.currentTarget.style.filter = 'brightness(1.2)'}
        onMouseOut={e => e.currentTarget.style.filter = 'brightness(1)'}
      >
        {formatPrice(ask)}
      </button>
    </div>
  );
}
