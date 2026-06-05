import React from 'react';
import { useTradeStore } from '../store/useTradeStore';
import { XCircle, Activity, Clock } from 'lucide-react';

export function TradeLog() {
  const positions = useTradeStore((state) => state.positions);
  const pendingOrders = useTradeStore((state) => state.pendingOrders);

  const pendingList = Object.values(pendingOrders).filter(o => o.status === 'PENDING');

  const formatPrice = (p?: number) => {
    if (p === undefined || p === null) return '---';
    return p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 5 });
  };

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="trade-log" style={{
      display: 'flex', flexDirection: 'column', gap: '20px',
      padding: '12px', color: '#fff', fontSize: '13px',
      overflowY: 'auto', flex: 1
    }}>
      {/* ACTIVE POSITIONS */}
      <section>
        <div style={{ 
          display: 'flex', alignItems: 'center', gap: '8px', 
          marginBottom: '10px', color: '#94a3b8', textTransform: 'uppercase', 
          fontSize: '11px', fontWeight: '700', letterSpacing: '0.05em' 
        }}>
          <Activity size={14} />
          <span>Active Positions ({positions.length})</span>
        </div>
        
        {positions.length === 0 ? (
          <div style={{ color: '#475569', fontStyle: 'italic', padding: '8px' }}>No active positions</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', background: '#334155' }}>
            {positions.map((pos) => (
              <div key={pos.dealId} style={{ 
                background: '#0f172a', padding: '8px 12px', display: 'grid', 
                gridTemplateColumns: '1fr 1fr 1fr', alignItems: 'center'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontWeight: '600' }}>{pos.epic}</span>
                  <span style={{ fontSize: '10px', color: '#64748b' }}>{formatTime(pos.timestamp)}</span>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <span style={{ 
                    color: pos.direction === 'BUY' ? '#26a69a' : '#ef5350',
                    fontWeight: '700'
                  }}>
                    {pos.direction} {pos.size}
                  </span>
                </div>
                <div style={{ textAlign: 'right', fontWeight: '500' }}>
                  {formatPrice(pos.entryPrice)}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* WORKING ORDERS */}
      <section>
        <div style={{ 
          display: 'flex', alignItems: 'center', gap: '8px', 
          marginBottom: '10px', color: '#94a3b8', textTransform: 'uppercase', 
          fontSize: '11px', fontWeight: '700', letterSpacing: '0.05em' 
        }}>
          <Clock size={14} />
          <span>Working Orders ({pendingList.length})</span>
        </div>
        
        {pendingList.length === 0 ? (
          <div style={{ color: '#475569', fontStyle: 'italic', padding: '8px' }}>No working orders</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', background: '#334155' }}>
            {pendingList.map((order) => (
              <div key={order.dealReference} style={{ 
                background: '#0f172a', padding: '8px 12px', display: 'grid', 
                gridTemplateColumns: '1.5fr 1fr 1fr auto', alignItems: 'center'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontWeight: '600' }}>{order.epic}</span>
                  <span style={{ fontSize: '10px', color: '#64748b' }}>{order.type} @ {formatPrice(order.level)}</span>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <span style={{ 
                    color: order.direction === 'BUY' ? '#26a69a' : '#ef5350',
                    fontWeight: '700'
                  }}>
                    {order.direction} {order.size}
                  </span>
                </div>
                <div style={{ textAlign: 'right', color: '#f59e0b', fontSize: '11px' }}>
                  {order.status}
                </div>
                <div style={{ paddingLeft: '8px' }}>
                  <button 
                    onClick={() => console.log('Cancel order:', order.dealReference)}
                    style={{ 
                      background: 'none', border: 'none', color: '#475569', 
                      cursor: 'pointer', display: 'flex', padding: '4px' 
                    }}
                    title="Cancel Order"
                  >
                    <XCircle size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
