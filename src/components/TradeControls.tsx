import React, { useState } from 'react';
import { toast } from 'sonner';
import { usePriceStore } from '../store/usePriceStore';
import { useTradeStore } from '../store/useTradeStore';
import { OrderType } from '../types/trade';

interface TradeControlsProps {
  ticker: string;
}

export function TradeControls({ ticker }: TradeControlsProps) {
  const [tradeSize, setTradeSize] = useState(1);
  const [orderType, setOrderType] = useState<OrderType>('MARKET');
  const [level, setLevel] = useState<number>(0);

  const priceData = usePriceStore((state) => state.prices[ticker]);
  const placeOrder = useTradeStore((state) => state.placeOrder);

  const bid = priceData?.bid;
  const ask = priceData?.ask;

  // Sync level with price when switching to LIMIT if level is 0
  const handleTypeChange = (type: OrderType) => {
    setOrderType(type);
    if (type !== 'MARKET' && level === 0) {
      setLevel(type === 'LIMIT' ? (ask || 0) : (bid || 0));
    }
  };

  const handleOrder = async (direction: 'BUY' | 'SELL') => {
    const promise = placeOrder({
      epic: ticker,
      size: tradeSize,
      direction,
      type: orderType,
      level: orderType === 'MARKET' ? undefined : level
    });

    toast.promise(promise, {
      loading: `Placing ${orderType} ${direction}...`,
      success: 'Order Submitted',
      error: 'Placement Failed'
    });
  };

  const formatPrice = (p?: number) => {
    if (p === undefined || p === null) return '---';
    return p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 5 });
  };

  return (
    <div className="trade-controls" style={{
      position: 'absolute', top: '0px', left: '0px', zIndex: 20,
      display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px',
      color: '#fff', fontFamily: 'Inter, system-ui, sans-serif',
      padding: '10px', background: 'rgba(15, 23, 42, 0.8)',
      borderRadius: '0 0 8px 0', borderBottom: '1px solid #334155', borderRight: '1px solid #334155',
      backdropFilter: 'blur(4px)'
    }}>
      <div style={{ display: 'flex', gap: '4px' }}>
        <button 
          onClick={() => handleOrder('SELL')}
          style={{ 
            background: '#ef5350', color: '#fff', border: 'none', borderRadius: '4px', 
            padding: '6px 12px', fontSize: '13px', fontWeight: '700', cursor: 'pointer',
            transition: 'all 0.2s', minWidth: '90px', display: 'flex', flexDirection: 'column', alignItems: 'center'
          }}
          onMouseOver={e => e.currentTarget.style.filter = 'brightness(1.2)'}
          onMouseOut={e => e.currentTarget.style.filter = 'brightness(1)'}
        >
          <span style={{ fontSize: '10px', opacity: 0.8 }}>SELL</span>
          {formatPrice(bid)}
        </button>

        <button 
          onClick={() => handleOrder('BUY')}
          style={{ 
            background: '#26a69a', color: '#fff', border: 'none', borderRadius: '4px', 
            padding: '6px 12px', fontSize: '13px', fontWeight: '700', cursor: 'pointer',
            transition: 'all 0.2s', minWidth: '90px', display: 'flex', flexDirection: 'column', alignItems: 'center'
          }}
          onMouseOver={e => e.currentTarget.style.filter = 'brightness(1.2)'}
          onMouseOut={e => e.currentTarget.style.filter = 'brightness(1)'}
        >
          <span style={{ fontSize: '10px', opacity: 0.8 }}>BUY</span>
          {formatPrice(ask)}
        </button>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <select 
          value={orderType}
          onChange={(e) => handleTypeChange(e.target.value as OrderType)}
          style={{
            background: '#1e293b', border: '1px solid #334155', color: '#fff',
            borderRadius: '4px', padding: '4px', fontSize: '12px', outline: 'none'
          }}
        >
          <option value="MARKET">MKT</option>
          <option value="LIMIT">LMT</option>
          <option value="STOP">STP</option>
        </select>

        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <span style={{ position: 'absolute', left: '6px', fontSize: '10px', color: '#94a3b8' }}>Size</span>
          <input 
            type="number" 
            value={tradeSize} 
            onChange={(e) => setTradeSize(Number(e.target.value))}
            style={{ 
              width: '60px', background: '#0f172a', border: '1px solid #334155', 
              color: '#fff', borderRadius: '4px', padding: '4px 4px 4px 28px', fontSize: '12px', textAlign: 'right'
            }} 
          />
        </div>

        {orderType !== 'MARKET' && (
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <span style={{ position: 'absolute', left: '6px', fontSize: '10px', color: '#94a3b8' }}>@</span>
            <input 
              type="number" 
              step="0.00001"
              value={level} 
              onChange={(e) => setLevel(Number(e.target.value))}
              style={{ 
                width: '100px', background: '#0f172a', border: '1px solid #334155', 
                color: '#fff', borderRadius: '4px', padding: '4px 4px 4px 18px', fontSize: '12px', textAlign: 'right'
              }} 
            />
          </div>
        )}
      </div>
    </div>
  );
}
