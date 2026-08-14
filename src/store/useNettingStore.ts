import { create } from 'zustand';
import { Trade, processNetting } from '../utils/nettingEngine';

interface NettingStore {
  trades: Trade[];
  setTrades: (trades: Trade[]) => void;
  syncFromExecutions: (executions: any[]) => void;
}

export const useNettingStore = create<NettingStore>((set) => ({
  trades: [],
  setTrades: (trades) => set({ trades }),
  syncFromExecutions: (executions) => {
    set({ trades: processNetting(executions) });
  }
}));

if (typeof window !== 'undefined') {
  (window as any).useNettingStore = useNettingStore;
}
