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
  remoteWatchlistId: string | null;
  availableWatchlists: { id: string; name: string }[];
  setActiveWatchlist: (id: string) => void;
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
      remoteWatchlistId: null,
      availableWatchlists: [],

      setActiveWatchlist: (id: string) => {
        set({ remoteWatchlistId: id, symbols: [], isInitialized: false });
        get().syncWithRemote().catch(console.error);
      },

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
          const data: any = await watchlistApi.fetchWatchlist();
          
          let remoteSymbols: string[] = [];
          let remoteId: string | null = state.remoteWatchlistId;
          let available: { id: string; name: string }[] = [];

          if (data && Array.isArray(data.watchlists) && data.watchlists.length > 0) {
            available = data.watchlists.map((w: any) => ({ id: w.id, name: w.name || w.id }));
            if (!remoteId || !available.find(w => w.id === remoteId)) {
              remoteId = data.watchlists[0].id;
            }
            if (remoteId) {
              const listData: any = await watchlistApi.getWatchlist(remoteId);
              
              let extractedSymbols: string[] = [];
              if (Array.isArray(listData)) {
                extractedSymbols = typeof listData[0] === 'string' ? listData : listData.map((m: any) => m.epic || m).filter(Boolean);
              } else {
                const activeList = listData.watchlists ? listData.watchlists.find((w: any) => w.id === remoteId) : listData;
                if (activeList) {
                  if (Array.isArray(activeList.epics)) extractedSymbols = activeList.epics;
                  else if (Array.isArray(activeList.markets)) extractedSymbols = activeList.markets.map((m: any) => m.epic).filter(Boolean);
                  else if (Array.isArray(activeList.instruments)) extractedSymbols = activeList.instruments.map((m: any) => m.epic).filter(Boolean);
                  else if (activeList.epic) extractedSymbols = [activeList.epic];
                }
              }
              remoteSymbols = extractedSymbols;
            }
          } else if (data && Array.isArray(data.epics)) {
            available = [{ id: data.id || 'default', name: data.name || 'My Watchlist' }];
            remoteSymbols = data.epics;
            remoteId = data.id || null;
          }

          set({ 
            symbols: remoteSymbols.slice(0, MAX_SYMBOLS), 
            isInitialized: true, 
            remoteWatchlistId: remoteId,
            availableWatchlists: available
          });
        } catch (error) {
          console.error('[useWatchlistStore] initializeWatchlist error:', error);
        }
      },

      syncWithRemote: async () => {
        const state = get();
        try {
          const { watchlistApi } = await import('../services/watchlist');
          const data: any = await watchlistApi.fetchWatchlist();
          
          let remoteSymbols: string[] = [];
          let remoteId: string | null = state.remoteWatchlistId;
          let available: { id: string; name: string }[] = state.availableWatchlists;

          if (data && Array.isArray(data.watchlists) && data.watchlists.length > 0) {
            available = data.watchlists.map((w: any) => ({ id: w.id, name: w.name || w.id }));
            if (!remoteId || !available.find(w => w.id === remoteId)) {
              remoteId = data.watchlists[0].id;
            }
            if (remoteId) {
              const listData: any = await watchlistApi.getWatchlist(remoteId);
              
              let extractedSymbols: string[] = [];
              if (Array.isArray(listData)) {
                extractedSymbols = typeof listData[0] === 'string' ? listData : listData.map((m: any) => m.epic || m).filter(Boolean);
              } else {
                const activeList = listData.watchlists ? listData.watchlists.find((w: any) => w.id === remoteId) : listData;
                if (activeList) {
                  if (Array.isArray(activeList.epics)) extractedSymbols = activeList.epics;
                  else if (Array.isArray(activeList.markets)) extractedSymbols = activeList.markets.map((m: any) => m.epic).filter(Boolean);
                  else if (Array.isArray(activeList.instruments)) extractedSymbols = activeList.instruments.map((m: any) => m.epic).filter(Boolean);
                  else if (activeList.epic) extractedSymbols = [activeList.epic];
                }
              }
              remoteSymbols = extractedSymbols;
            }
          } else if (data && Array.isArray(data.epics)) {
            available = [{ id: data.id || 'default', name: data.name || 'My Watchlist' }];
            remoteSymbols = data.epics;
            remoteId = data.id || null;
          }

          if (!remoteId) {
            throw new Error('Watchlist ID is missing');
          }

          // Process deletions
          for (const epic of state.pendingDeletions) {
            try {
              await watchlistApi.removeEpicFromWatchlist(epic, remoteId);
            } catch (error) {
              console.warn(`[useWatchlistStore] Failed to remove ${epic}:`, error);
              throw error;
            }
          }

          // Process additions
          for (const epic of state.pendingAdditions) {
            try {
              await watchlistApi.addEpicToWatchlist(epic, remoteId);
            } catch (error) {
              console.warn(`[useWatchlistStore] Failed to add ${epic}:`, error);
              throw error;
            }
          }

          let finalSymbols = remoteSymbols.filter(s => !state.pendingDeletions.includes(s));
          for (const add of state.pendingAdditions) {
            if (!finalSymbols.includes(add)) {
              finalSymbols.push(add);
            }
          }
          finalSymbols = finalSymbols.slice(0, MAX_SYMBOLS);

          set({
            symbols: finalSymbols,
            pendingAdditions: [],
            pendingDeletions: [],
            remoteWatchlistId: remoteId,
            availableWatchlists: available
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
      partialize: (state) => Object.fromEntries(
        Object.entries(state).filter(([key]) => !['isInitialized'].includes(key))
      )
    }
  )
);
