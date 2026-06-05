import { create } from 'zustand';
import { Order, Position, OrderStatus } from '../types/trade';

interface TradeState {
  pendingOrders: Record<string, Order>;
  positions: Position[];
  
  // Actions
  addPendingOrder: (dealReference: string, order: Order) => void;
  updateOrderStatus: (dealReference: string, status: OrderStatus, details?: Partial<Order>) => void;
  addPosition: (position: Position) => void;
  removePosition: (dealId: string) => void;
  clearOrders: () => void;
  clearPositions: () => void;
}

export const useTradeStore = create<TradeState>((set) => ({
  pendingOrders: {},
  positions: [],

  addPendingOrder: (dealReference, order) => 
    set((state) => ({
      pendingOrders: {
        ...state.pendingOrders,
        [dealReference]: { ...order, status: 'PENDING' },
      },
    })),

  updateOrderStatus: (dealReference, status, details) => 
    set((state) => {
      const order = state.pendingOrders[dealReference];
      if (!order) return state;

      return {
        pendingOrders: {
          ...state.pendingOrders,
          [dealReference]: {
            ...order,
            status,
            ...details,
          },
        },
      };
    }),

  addPosition: (position) => 
    set((state) => ({
      positions: [...state.positions, position],
    })),

  removePosition: (dealId) => 
    set((state) => ({
      positions: state.positions.filter((p) => p.dealId !== dealId),
    })),

  clearOrders: () => set({ pendingOrders: {} }),
  clearPositions: () => set({ positions: [] }),
}));
