import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface WatchlistState {
  symbols: string[];
  markedSymbols: string[];
  addSymbol: (symbol: string) => void;
  removeSymbol: (symbol: string) => void;
  setSymbols: (symbols: string[]) => void;
  reorderSymbols: (symbols: string[]) => void;
  toggleMark: (symbol: string) => void;
  pendingAdditions: string[];
  pendingDeletions: string[];
  isInitialized: boolean;
  initializeWatchlist: () => Promise<void>;
  syncWithRemote: () => Promise<void>;
}

const MAX_SYMBOLS = 40;

export const useWatchlistStore = create<WatchlistState>()(
  persist(
    (set, get) => ({
      symbols: ['SPY', 'QQQ', 'IWM', 'AAPL', 'MSFT', 'TSLA', 'NVDA'],
      markedSymbols: [],
      pendingAdditions: [],
      pendingDeletions: [],
      isInitialized: false,

      addSymbol: (symbol) => {
        const sanitized = symbol.trim().toUpperCase();
        if (!sanitized) return;

        set((state) => {
          if (state.symbols.includes(sanitized)) {
            return state; // Already exists
          }
          if (state.symbols.length >= MAX_SYMBOLS) {
            console.warn(`Watchlist is full (max ${MAX_SYMBOLS} symbols)`);
            return state;
          }
          return { 
            symbols: [...state.symbols, sanitized],
            pendingAdditions: [...state.pendingAdditions, sanitized],
            pendingDeletions: state.pendingDeletions.filter((s) => s !== sanitized)
          };
        });
      },

      removeSymbol: (symbol) => {
        set((state) => ({
          symbols: state.symbols.filter((s) => s !== symbol),
          pendingDeletions: [...state.pendingDeletions, symbol],
          pendingAdditions: state.pendingAdditions.filter((s) => s !== symbol)
        }));
      },

      setSymbols: (symbols) => {
        set({ symbols: symbols.slice(0, MAX_SYMBOLS) });
      },

      reorderSymbols: (symbols) => {
        set({ symbols });
      },

      toggleMark: (symbol) => {
        set((state) => ({
          markedSymbols: state.markedSymbols.includes(symbol)
            ? state.markedSymbols.filter((s) => s !== symbol)
            : [...state.markedSymbols, symbol],
        }));
      },

      initializeWatchlist: async () => {
        const state = get();
        if (state.isInitialized) return;

        try {
          const { watchlistApi } = await import('../services/watchlist');
          const data = await watchlistApi.fetchWatchlist();
          
          let remoteSymbols: string[] = [];
          if (data && Array.isArray(data.watchlists) && data.watchlists.length > 0) {
            remoteSymbols = data.watchlists[0].epics || [];
          } else if (data && Array.isArray(data.epics)) {
            remoteSymbols = data.epics;
          }

          set({ symbols: remoteSymbols.slice(0, MAX_SYMBOLS), isInitialized: true });
        } catch (error) {
          console.error('[useWatchlistStore] initializeWatchlist error:', error);
        }
      },

      syncWithRemote: async () => {
        const state = get();
        try {
          const { watchlistApi } = await import('../services/watchlist');
          const data = await watchlistApi.fetchWatchlist();
          
          let remoteSymbols: string[] = [];
          if (data && Array.isArray(data.watchlists) && data.watchlists.length > 0) {
            remoteSymbols = data.watchlists[0].epics || [];
          } else if (data && Array.isArray(data.epics)) {
            remoteSymbols = data.epics;
          }

          let finalSymbols = remoteSymbols.filter(s => !state.pendingDeletions.includes(s));
          for (const add of state.pendingAdditions) {
            if (!finalSymbols.includes(add)) {
              finalSymbols.push(add);
            }
          }
          finalSymbols = finalSymbols.slice(0, MAX_SYMBOLS);

          await watchlistApi.updateWatchlist(finalSymbols);
          
          set({
            symbols: finalSymbols,
            pendingAdditions: [],
            pendingDeletions: []
          });
        } catch (error) {
          console.error('[useWatchlistStore] syncWithRemote error:', error);
          throw error;
        }
      },
    }),
    {
      name: 'watchlist-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
