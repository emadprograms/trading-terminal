import React, { useState } from 'react';
import { Plus, X, Activity } from 'lucide-react';
import { useWatchlistStore } from '../store/useWatchlistStore';
import { usePriceStore } from '../store/usePriceStore';
import { useWorkspaceStore } from '../store/useWorkspaceStore';

export const Watchlist: React.FC = () => {
  const [newSymbol, setNewSymbol] = useState('');
  const { symbols, addSymbol, removeSymbol } = useWatchlistStore();
  const prices = usePriceStore((state) => state.prices);
  const { selectedId, setTicker } = useWorkspaceStore();

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSymbol.trim()) {
      addSymbol(newSymbol);
      setNewSymbol('');
    }
  };

  const handleSelect = (symbol: string) => {
    if (selectedId) {
      setTicker(selectedId, symbol);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)' }}>
        <form onSubmit={handleAdd} style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            placeholder="Add symbol..."
            value={newSymbol}
            onChange={(e) => setNewSymbol(e.target.value)}
            style={{
              flex: 1,
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              padding: '6px 10px',
              borderRadius: '4px',
              fontSize: '13px',
              textTransform: 'uppercase'
            }}
          />
          <button 
            type="submit"
            className="btn-primary"
            style={{ padding: '6px', minWidth: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            disabled={symbols.length >= 40 || !newSymbol.trim()}
          >
            <Plus size={16} />
          </button>
        </form>
        {symbols.length >= 40 && (
          <div style={{ fontSize: '10px', color: 'var(--accent-red)', marginTop: '4px' }}>
            Maximum 40 symbols reached.
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {symbols.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '12px' }}>
            <Activity size={24} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
            No symbols in watchlist
          </div>
        ) : (
          symbols.map((symbol) => {
            const price = prices[symbol];
            
            return (
              <div 
                key={symbol}
                className="watchlist-item"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '8px 16px',
                  cursor: 'pointer',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.02)',
                  transition: 'background 0.2s',
                }}
                onClick={() => handleSelect(symbol)}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ flex: 1, fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>
                  {symbol}
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginRight: '12px', minWidth: '60px' }}>
                  <span style={{ fontSize: '13px', color: price ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                    {price ? price.bid.toFixed(2) : '---'}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    {price ? price.ask.toFixed(2) : '---'}
                  </span>
                </div>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeSymbol(symbol);
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '4px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'var(--accent-red)';
                    e.currentTarget.style.background = 'rgba(244, 67, 54, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'var(--text-secondary)';
                    e.currentTarget.style.background = 'transparent';
                  }}
                  title="Remove"
                >
                  <X size={14} />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
