import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface WatchlistState {
  symbols: string[];
  addSymbol: (symbol: string) => void;
  removeSymbol: (symbol: string) => void;
  setSymbols: (symbols: string[]) => void;
}

const MAX_SYMBOLS = 40;

export const useWatchlistStore = create<WatchlistState>()(
  persist(
    (set) => ({
      symbols: ['SPY', 'QQQ', 'IWM', 'AAPL', 'MSFT', 'TSLA', 'NVDA'],

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
    }),
    {
      name: 'watchlist-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
