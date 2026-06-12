import { useEffect, useRef } from 'react';
import { useWatchlistStore } from '../store/useWatchlistStore';
import { wsManager } from '../lib/ws-manager';
import { useWorkspaceStore } from '../store/useWorkspaceStore';
import { syncCoordinator } from '../lib/sync-coordinator';
import { useSessionStore } from '../store/useSessionStore';
import type { Timeframe } from '../types';

export function WatchlistManager() {
  const symbols = useWatchlistStore((state) => state.symbols);
  const isAuthenticated = useSessionStore((state) => state.isAuthenticated);
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

  const timeframesMap = useWorkspaceStore((state) => state.timeframes);

  // 1b. Background Prefetching of historical data for instant loads
  useEffect(() => {
    if (isAuthenticated && symbols.length > 0) {
      // Always pre-load 5min and 1D, plus whatever timeframes the user currently has open
      const tfs = new Set<Timeframe>(['5min', '1D']);
      Object.values(timeframesMap || {}).forEach(tf => {
        if (tf) tfs.add(tf);
      });
      const timeframesToFetch = Array.from(tfs);

      // Use a longer timeout to ensure foreground chart loads complete first
      const timer = setTimeout(() => {
        syncCoordinator.prefetchWatchlist(timeframesToFetch, 1000);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, symbols, timeframesMap]);

  return null;
}
