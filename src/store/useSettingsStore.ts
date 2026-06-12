import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface OrderSettings {
  tradeSize: number;
  stopDistance: number;
  guaranteedStop: boolean;
}

interface SettingsState {
  orderSettings: Record<string, OrderSettings>;
  updateOrderSettings: (ticker: string, settings: Partial<OrderSettings>) => void;
  getOrderSettings: (ticker: string) => OrderSettings;
}

const DEFAULT_ORDER_SETTINGS: OrderSettings = {
  tradeSize: 1,
  stopDistance: 0,
  guaranteedStop: false,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      orderSettings: {},
      
      updateOrderSettings: (ticker, settings) => {
        set((state) => {
          const currentSettings = state.orderSettings[ticker] || DEFAULT_ORDER_SETTINGS;
          return {
            orderSettings: {
              ...state.orderSettings,
              [ticker]: { ...currentSettings, ...settings },
            },
          };
        });
      },

      getOrderSettings: (ticker) => {
        return get().orderSettings[ticker] || DEFAULT_ORDER_SETTINGS;
      },
    }),
    {
      name: 'trading-terminal-settings',
    }
  )
);
