import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface OrderSettings {
  tradeSize: number;
  stopDistance: number;
  guaranteedStop: boolean;
}

export type PriceLinePreference = 'bid' | 'ask' | 'both' | 'none';

export interface ChartSettings {
  priceLines: PriceLinePreference;
}

interface SettingsState {
  orderSettings: Record<string, OrderSettings>;
  chartSettings: Record<string, ChartSettings>;
  updateOrderSettings: (ticker: string, settings: Partial<OrderSettings>) => void;
  getOrderSettings: (ticker: string) => OrderSettings;
  updateChartSettings: (ticker: string, settings: Partial<ChartSettings>) => void;
  getChartSettings: (ticker: string) => ChartSettings;
}

const DEFAULT_ORDER_SETTINGS: OrderSettings = {
  tradeSize: 1,
  stopDistance: 0,
  guaranteedStop: false,
};

const DEFAULT_CHART_SETTINGS: ChartSettings = {
  priceLines: 'both',
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      orderSettings: {},
      chartSettings: {},
      
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

      updateChartSettings: (ticker, settings) => {
        set((state) => {
          const currentSettings = state.chartSettings[ticker] || DEFAULT_CHART_SETTINGS;
          return {
            chartSettings: {
              ...state.chartSettings,
              [ticker]: { ...currentSettings, ...settings },
            },
          };
        });
      },

      getChartSettings: (ticker) => {
        return get().chartSettings[ticker] || DEFAULT_CHART_SETTINGS;
      },
    }),
    {
      name: 'trading-terminal-settings',
    }
  )
);
