import React, { useState, useEffect, useRef } from 'react';
import { Plus, X, Activity, Search, Loader2, Bookmark } from 'lucide-react';
import { useWatchlistStore } from '../store/useWatchlistStore';
import { usePriceStore } from '../store/usePriceStore';
import { useWorkspaceStore } from '../store/useWorkspaceStore';
import { useDebounce } from '../hooks/useDebounce';
import { marketApi } from '../api/market';
import { MarketSearchResult } from '../types';

export const Watchlist: React.FC = () => {
  const [newSymbol, setNewSymbol] = useState('');
  const [searchResults, setSearchResults] = useState<MarketSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  
  const debouncedSearchTerm = useDebounce(newSymbol, 1000);
  const { symbols, addSymbol, removeSymbol, reorderSymbols, markedSymbols, toggleMark } = useWatchlistStore();
  const prices = usePriceStore((state) => state.prices);
  const { selectedId, setTicker } = useWorkspaceStore();

  const [draggedSymbol, setDraggedSymbol] = useState<string | null>(null);
  const [dragOverSymbol, setDragOverSymbol] = useState<string | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (debouncedSearchTerm.trim().length === 0) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const search = async () => {
      setIsSearching(true);
      try {
        const results = await marketApi.searchMarkets(debouncedSearchTerm);
        setSearchResults(results);
      } catch (error) {
        console.error('Search failed:', error);
      } finally {
        setIsSearching(false);
      }
    };

    search();
  }, [debouncedSearchTerm]);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSymbol.trim()) {
      addSymbol(newSymbol.toUpperCase());
      setNewSymbol('');
      setShowResults(false);
    }
  };

  const handleAddSearchResult = (epic: string) => {
    addSymbol(epic);
    setNewSymbol('');
    setShowResults(false);
  };

  const handleSelect = (symbol: string) => {
    if (selectedId) {
      setTicker(selectedId, symbol);
    }
  };

  const handleDragStart = (e: React.DragEvent, symbol: string) => {
    setDraggedSymbol(symbol);
    e.dataTransfer.effectAllowed = 'move';
    // Small timeout to allow the drag image to be generated before we hide the source item (if we wanted to)
    setTimeout(() => {
      // Optional: visual feedback on the dragging item
    }, 0);
  };

  const handleDragOver = (e: React.DragEvent, symbol: string) => {
    e.preventDefault(); // Necessary to allow dropping
    e.dataTransfer.dropEffect = 'move';
    if (dragOverSymbol !== symbol) {
      setDragOverSymbol(symbol);
    }
  };

  const handleDrop = (e: React.DragEvent, targetSymbol: string) => {
    e.preventDefault();
    if (!draggedSymbol || draggedSymbol === targetSymbol) {
      setDraggedSymbol(null);
      setDragOverSymbol(null);
      return;
    }

    const oldIndex = symbols.indexOf(draggedSymbol);
    const newIndex = symbols.indexOf(targetSymbol);

    if (oldIndex !== -1 && newIndex !== -1) {
      const newSymbols = [...symbols];
      newSymbols.splice(oldIndex, 1);
      newSymbols.splice(newIndex, 0, draggedSymbol);
      reorderSymbols(newSymbols);
    }

    setDraggedSymbol(null);
    setDragOverSymbol(null);
  };

  const handleDragEnd = () => {
    setDraggedSymbol(null);
    setDragOverSymbol(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)', position: 'relative' }} ref={searchContainerRef}>
        <form onSubmit={handleAdd} style={{ display: 'flex', gap: '8px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={14} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input
              type="text"
              placeholder="Search markets..."
              value={newSymbol}
              onChange={(e) => {
                setNewSymbol(e.target.value);
                setShowResults(true);
              }}
              onFocus={() => setShowResults(true)}
              style={{
                width: '100%',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                padding: '6px 10px 6px 28px',
                borderRadius: '4px',
                fontSize: '13px',
              }}
            />
            {isSearching && (
              <Loader2 className="spinner" size={14} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', animation: 'spin 1s linear infinite' }} />
            )}
          </div>
          <button 
            type="submit"
            className="btn-primary"
            style={{ padding: '6px', minWidth: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            disabled={symbols.length >= 40 || !newSymbol.trim()}
          >
            <Plus size={16} />
          </button>
        </form>

        {showResults && (newSymbol.trim().length > 0) && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: '16px',
            right: '16px',
            background: 'rgba(0, 0, 0, 0.95)',
            backdropFilter: 'var(--glass-blur)',
            border: '1px solid var(--border-color)',
            borderRadius: '4px',
            marginTop: '4px',
            maxHeight: '300px',
            overflowY: 'auto',
            zIndex: 100,
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          }}>
            {isSearching && searchResults.length === 0 ? (
              <div style={{ padding: '12px', fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'center' }}>Searching...</div>
            ) : searchResults.length === 0 ? (
              <div style={{ padding: '12px', fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'center' }}>No results found</div>
            ) : (
              searchResults.map(result => (
                <div 
                  key={result.epic}
                  onClick={() => handleAddSearchResult(result.epic)}
                  style={{
                    padding: '8px 12px',
                    cursor: 'pointer',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500 }}>{result.instrumentName}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    {result.epic} <span style={{ opacity: 0.5 }}>• {result.instrumentType}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

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
            const isMarked = markedSymbols?.includes(symbol) || false;
            const isDragOver = dragOverSymbol === symbol;
            const isDragging = draggedSymbol === symbol;
            
            return (
              <div 
                key={symbol}
                className="watchlist-item"
                draggable
                onDragStart={(e) => handleDragStart(e, symbol)}
                onDragOver={(e) => handleDragOver(e, symbol)}
                onDrop={(e) => handleDrop(e, symbol)}
                onDragEnd={handleDragEnd}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '4px 8px',
                  cursor: 'grab',
                  borderBottom: isDragOver ? '2px solid var(--accent-green)' : '1px solid rgba(255, 255, 255, 0.02)',
                  borderTop: '1px solid transparent', // Keep height consistent
                  transition: 'background 0.2s',
                  position: 'relative',
                  opacity: isDragging ? 0.5 : 1,
                  background: isMarked ? 'rgba(239, 83, 80, 0.05)' : 'transparent',
                }}
                onClick={() => handleSelect(symbol)}
                onMouseEnter={(e) => { if (!isMarked) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)' }}
                onMouseLeave={(e) => { if (!isMarked) e.currentTarget.style.background = 'transparent' }}
              >
                {/* Left ribbon / mark toggle */}
                <div 
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleMark(symbol);
                  }}
                  style={{
                    width: '16px',
                    height: '24px',
                    marginRight: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: isMarked ? 'var(--accent-red)' : 'transparent',
                    borderLeft: isMarked ? '3px solid var(--accent-red)' : '3px solid transparent',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => { if (!isMarked) e.currentTarget.style.color = 'rgba(255,255,255,0.2)'; }}
                  onMouseLeave={(e) => { if (!isMarked) e.currentTarget.style.color = 'transparent'; }}
                >
                  <Bookmark size={12} fill="currentColor" strokeWidth={0} />
                </div>

                <div style={{ flex: 1, fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>
                  {symbol}
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginRight: '8px', minWidth: '50px' }}>
                  <span style={{ fontSize: '12px', color: price ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                    {price ? price.bid.toFixed(2) : '---'}
                  </span>
                  <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
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
