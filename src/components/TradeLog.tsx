import React from 'react';
import { useTradeStore } from '../store/useTradeStore';
import { XCircle, Activity, Clock, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export function TradeLog() {
  const positions = useTradeStore((state) => state.positions);
  const pendingOrders = useTradeStore((state) => state.pendingOrders);
  const isExecuting = useTradeStore((state) => state.isExecuting);
  const closingDealIds = useTradeStore((state) => state.closingDealIds);
  const flattenPosition = useTradeStore((state) => state.flattenPosition);
  const flattenAll = useTradeStore((state) => state.flattenAll);
  const cancelWorkingOrder = useTradeStore((state) => state.cancelWorkingOrder);
  const cancelAllWorkingOrders = useTradeStore((state) => state.cancelAllWorkingOrders);

  const pendingList = Object.values(pendingOrders).filter(o => o.status === 'PENDING' && (o.type === 'LIMIT' || o.type === 'STOP'));
  const historyList = Object.values(pendingOrders).filter(o => o.status !== 'PENDING').sort((a, b) => b.timestamp - a.timestamp);

  const handleFlatten = async (dealId: string) => {
    try {
      const promise = flattenPosition(dealId);
      toast.promise(promise, {
        loading: 'Flattening position...',
        success: 'Flatten Request Submitted',
        error: (err) => err.message || 'Flatten Failed'
      });
    } catch (error: any) {
      toast.error(error.message || 'Failed to flatten');
    }
  };

  const handleCancel = async (id: string) => {
    try {
      const promise = cancelWorkingOrder(id);
      toast.promise(promise, {
        loading: 'Cancelling order...',
        success: 'Cancel Request Submitted',
        error: (err) => err.message || 'Cancel Failed'
      });
    } catch (error: any) {
      toast.error(error.message || 'Failed to cancel');
    }
  };

  const handleFlattenAll = async () => {
    try {
      const promise = flattenAll();
      toast.promise(promise, {
        loading: 'Flattening all positions...',
        success: 'All Flatten Requests Submitted',
        error: (err) => err.message || 'Batch Flatten Failed'
      });
    } catch (error: any) {
      toast.error(error.message || 'Failed to flatten all');
    }
  };

  const handleCancelAll = async () => {
    try {
      const promise = cancelAllWorkingOrders();
      toast.promise(promise, {
        loading: 'Cancelling all working orders...',
        success: 'All Cancel Requests Submitted',
        error: (err) => err.message || 'Batch Cancel Failed'
      });
    } catch (error: any) {
      toast.error(error.message || 'Failed to cancel all');
    }
  };

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
      overflowY: 'auto', flex: 1,
      opacity: isExecuting && closingDealIds.size === 0 ? 0.8 : 1
    }}>
      {/* ACTIVE POSITIONS */}
      <section>
        <div style={{ 
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8', textTransform: 'uppercase', fontSize: '11px', fontWeight: '700', letterSpacing: '0.05em' }}>
            <Activity size={14} />
            <span>Active Positions ({positions.length})</span>
          </div>
          {positions.length > 1 && (
            <button 
              disabled={isExecuting}
              onClick={handleFlattenAll}
              style={{ 
                background: 'none', border: 'none', color: '#ef5350', 
                fontSize: '10px', fontWeight: '700', cursor: isExecuting ? 'not-allowed' : 'pointer',
                padding: '2px 4px'
              }}
            >
              FLATTEN ALL
            </button>
          )}
        </div>
        
        {positions.length === 0 ? (
          <div style={{ color: '#475569', fontStyle: 'italic', padding: '8px' }}>No active positions</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', background: '#334155' }}>
            {positions.map((pos) => {
              const isClosing = closingDealIds.has(pos.dealId);
              return (
                <div key={pos.dealId} style={{ 
                  background: '#0f172a', padding: '8px 12px', display: 'grid', 
                  gridTemplateColumns: '1fr 1fr 1fr auto', alignItems: 'center',
                  opacity: isClosing ? 0.6 : 1
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
                  <div style={{ paddingLeft: '12px' }}>
                    <button 
                      disabled={isExecuting || isClosing}
                      onClick={() => handleFlatten(pos.dealId)}
                      style={{ 
                        background: 'rgba(239, 83, 80, 0.1)', border: '1px solid #ef5350', 
                        color: '#ef5350', borderRadius: '4px', padding: '4px 8px',
                        fontSize: '10px', fontWeight: '700', cursor: (isExecuting || isClosing) ? 'not-allowed' : 'pointer',
                        minWidth: '60px'
                      }}
                    >
                      {isClosing ? '...' : 'FLATTEN'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* WORKING ORDERS */}
      <section>
        <div style={{ 
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8', textTransform: 'uppercase', fontSize: '11px', fontWeight: '700', letterSpacing: '0.05em' }}>
            <Clock size={14} />
            <span>Working Orders ({pendingList.length})</span>
          </div>
          {pendingList.length > 1 && (
            <button 
              disabled={isExecuting}
              onClick={handleCancelAll}
              style={{ 
                background: 'none', border: 'none', color: '#94a3b8', 
                fontSize: '10px', fontWeight: '700', cursor: isExecuting ? 'not-allowed' : 'pointer',
                padding: '2px 4px'
              }}
            >
              CANCEL ALL
            </button>
          )}
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
                    disabled={isExecuting}
                    onClick={() => order.dealId ? handleCancel(order.dealId) : handleCancel(order.dealReference)}
                    style={{ 
                      background: 'none', border: 'none', color: '#475569', 
                      cursor: isExecuting ? 'not-allowed' : 'pointer', display: 'flex', padding: '4px' 
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

      {/* RECENT HISTORY */}
      <section>
        <div style={{ 
          display: 'flex', alignItems: 'center', gap: '8px', 
          marginBottom: '10px', color: '#94a3b8', textTransform: 'uppercase', 
          fontSize: '11px', fontWeight: '700', letterSpacing: '0.05em' 
        }}>
          <Trash2 size={14} />
          <span>Recent History</span>
        </div>
        
        {historyList.length === 0 ? (
          <div style={{ color: '#475569', fontStyle: 'italic', padding: '8px' }}>No history</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', background: '#334155' }}>
            {historyList.slice(0, 5).map((order) => (
              <div key={order.dealReference} style={{ 
                background: '#0f172a', padding: '8px 12px', display: 'grid', 
                gridTemplateColumns: '1fr 1fr 1fr', alignItems: 'center',
                opacity: 0.7
              }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontWeight: '600' }}>{order.epic || 'Unknown'}</span>
                  <span style={{ fontSize: '10px', color: '#64748b' }}>{formatTime(order.timestamp)}</span>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <span style={{ 
                    color: order.status === 'ACCEPTED' ? '#26a69a' : '#ef5350',
                    fontSize: '11px', fontWeight: '700'
                  }}>
                    {order.status}
                  </span>
                </div>
                <div style={{ textAlign: 'right', fontSize: '10px', color: '#64748b' }}>
                   {order.reason || '---'}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
