import React, { useEffect } from 'react';
import { Clock } from 'lucide-react';
import { useTradeStore } from '../store/useTradeStore';
import { useNettingStore } from '../store/useNettingStore';
import { useWorkspaceStore } from '../store/useWorkspaceStore';

export const OrderHistory: React.FC = () => {
  const executions = useTradeStore(state => state.executions);
  const trades = useNettingStore(state => state.trades);
  const syncFromExecutions = useNettingStore(state => state.syncFromExecutions);

  useEffect(() => {
    if (executions && executions.length > 0) {
      syncFromExecutions(executions);
    }
  }, [executions, syncFromExecutions]);

  const handleTradeClick = (trade: any) => {
    // We want the chart to load the new ticker, THEN scroll.
    const wsStore = useWorkspaceStore.getState();
    const targetId = wsStore.selectedId || '0';
    wsStore.setTicker(targetId, trade.epic);
    
    useTradeStore.setState({ 
      currentMarket: { epic: trade.epic },
      pendingNavigation: { openTime: trade.openTime, closeTime: trade.closeTime, epic: trade.epic }
    });
  };

  const formatTime = (isoString: string) => {
    if (!isoString) return '---';
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="order-history" style={{
      display: 'flex', flexDirection: 'column', gap: '20px',
      padding: '12px', color: '#fff', fontSize: '13px',
      overflowY: 'auto', flex: 1
    }}>
      <section>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          marginBottom: '10px', color: '#94a3b8', textTransform: 'uppercase',
          fontSize: '11px', fontWeight: '700', letterSpacing: '0.05em'
        }}>
          <Clock size={14} />
          <span>Order History ({trades.length})</span>
        </div>
        
        {trades.length === 0 ? (
          <div style={{ color: '#475569', fontStyle: 'italic', padding: '8px' }}>No order history</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', background: '#334155' }}>
            {trades.map((trade, idx) => {
              const key = (trade as any).id || `${trade.epic}-${trade.openTime}-${idx}`;
              const isClosed = trade.status === 'CLOSED';
              const pnlStr = trade.realizedPnL !== undefined ? trade.realizedPnL.toFixed(2) : '---';
              const pnlAbs = trade.realizedPnL !== undefined ? Math.abs(trade.realizedPnL).toFixed(2) : '---';
              const pnlColor = trade.realizedPnL !== undefined && trade.realizedPnL >= 0 ? '#26a69a' : '#ef5350';
              const pnlSign = trade.realizedPnL !== undefined && trade.realizedPnL >= 0 ? '+' : '';
              
              return (
                <div key={key} onClick={() => handleTradeClick(trade)} style={{
                  background: '#0f172a', padding: '8px 12px', display: 'flex',
                  flexDirection: 'column', gap: '4px', cursor: isClosed ? 'pointer' : 'default',
                  opacity: isClosed ? 1 : 0.8
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: '600' }}>{trade.epic}</span>
                    <span style={{ color: pnlColor, fontWeight: '700' }}>
                      {trade.realizedPnL !== undefined ? `${pnlSign}$${pnlAbs}` : '---'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8' }}>
                    <span>
                      <span style={{ color: trade.direction === 'BUY' ? '#26a69a' : '#ef5350', fontWeight: '600' }}>{trade.direction}</span> {trade.maxSize || trade.totalSize}
                    </span>
                    <span>{trade.status}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#64748b' }}>
                    <span>Open: {formatTime(trade.openTime)}</span>
                    {trade.closeTime && <span>Close: {formatTime(trade.closeTime)}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
