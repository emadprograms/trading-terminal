import { useEffect, useRef } from 'react';
import { useWatchlistStore } from '../store/useWatchlistStore';
import { wsManager } from '../lib/ws-manager';
import { useWorkspaceStore } from '../store/useWorkspaceStore';

export function WatchlistManager() {
  const symbols = useWatchlistStore((state) => state.symbols);
  const prevSymbolsRef = useRef<string[]>([]);

  // 1. WebSocket Subscriptions for Watchlist
  useEffect(() => {
    const prevSymbols = prevSymbolsRef.current;
    const added = symbols.filter(s => !prevSymbols.includes(s));
    const removed = prevSymbols.filter(s => !symbols.includes(s));

    added.forEach(s => wsManager.subscribe(s));
    removed.forEach(s => wsManager.unsubscribe(s));

    prevSymbolsRef.current = symbols;

    // Cleanup on unmount
    return () => {
      // We don't unsubscribe here because we want the effect to only trigger on symbols change.
      // If we unsubscribed on unmount, hot-reloads might drop subscriptions.
    };
  }, [symbols]);

  // 2. Spacebar Keyboard Shortcut to cycle symbols
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        const activeTag = document.activeElement?.tagName.toLowerCase();
        if (activeTag === 'input' || activeTag === 'textarea') {
          return;
        }

        e.preventDefault(); // Prevent default scroll behavior

        const state = useWorkspaceStore.getState();
        const { selectedId } = state;
        
        if (!selectedId) return;

        // Determine current effective ticker for the selected chart
        // Since getEffectiveTicker is not exported from the hook, we can calculate it
        const { groups, groupTickers, tickers } = state;
        const group = groups[selectedId] || 'none';
        
        let currentTicker = '';
        if (group !== 'none' && groupTickers[group]) {
          currentTicker = groupTickers[group];
        } else {
          currentTicker = tickers[selectedId] || '';
        }
        
        const currentWatchlist = useWatchlistStore.getState().symbols;
        if (currentWatchlist.length === 0) return;

        const currentIndex = currentWatchlist.indexOf(currentTicker);
        
        const nextIndex = currentIndex === -1 || currentIndex === currentWatchlist.length - 1 
          ? 0 
          : currentIndex + 1;

        const nextSymbol = currentWatchlist[nextIndex];
        
        // This naturally cascades to the whole group if the chart is grouped
        state.setTicker(selectedId, nextSymbol);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return null;
}
