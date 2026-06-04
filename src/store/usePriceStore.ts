import { create } from 'zustand';

export interface PriceData {
  bid: number;
  ask: number;
  timestamp: number;
}

interface PriceState {
  prices: Record<string, PriceData>;
  updatePrice: (epic: string, bid: number, ask: number, timestamp: number) => void;
  clearPrice: (epic: string) => void;
}

export const usePriceStore = create<PriceState>((set) => ({
  prices: {},
  updatePrice: (epic, bid, ask, timestamp) =>
    set((state) => ({
      prices: {
        ...state.prices,
        [epic]: { bid, ask, timestamp },
      },
    })),
  clearPrice: (epic) =>
    set((state) => {
      const newPrices = { ...state.prices };
      delete newPrices[epic];
      return { prices: newPrices };
    }),
}));
