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
}

const MAX_SYMBOLS = 40;

export const useWatchlistStore = create<WatchlistState>()(
  persist(
    (set) => ({
      symbols: ['SPY', 'QQQ', 'IWM', 'AAPL', 'MSFT', 'TSLA', 'NVDA'],
      markedSymbols: [],

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
          return { symbols: [...state.symbols, sanitized] };
        });
      },

      removeSymbol: (symbol) => {
        set((state) => ({
          symbols: state.symbols.filter((s) => s !== symbol),
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
    }),
    {
      name: 'watchlist-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
