import { create } from 'zustand';
import { Order, Position, OrderStatus, TradeConfirmation, OrderDirection, OrderType } from '../types/trade';
import { tradeApi } from '../api/trade';

interface PlaceOrderParams {
  epic: string;
  size: number;
  direction: OrderDirection;
  type: OrderType;
  level?: number;
}

interface TradeState {
  pendingOrders: Record<string, Order>;
  positions: Position[];
  addPendingOrder: (dealReference: string, order: Order) => void;
  updateOrderStatus: (dealReference: string, status: OrderStatus, details?: Partial<Order>) => void;
  addPosition: (position: Position) => void;
  removePosition: (dealId: string) => void;
  clearOrders: () => void;
  
  // Actions
  placeOrder: (params: PlaceOrderParams) => Promise<string>;
  handleConfirmation: (payload: TradeConfirmation) => void;
}

export const useTradeStore = create<TradeState>((set, get) => ({
  pendingOrders: {},
  positions: [],

  addPendingOrder: (dealReference, order) =>
    set((state) => ({
      pendingOrders: {
        ...state.pendingOrders,
        [dealReference]: order,
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

  clearOrders: () =>
    set(() => ({
      pendingOrders: {},
      positions: [],
    })),

  /**
   * Orchestrates the order placement flow.
   * 1. Calls the REST API.
   * 2. Adds to pending state.
   * 3. Sets a safeguard timer for polling confirmation.
   */
  placeOrder: async (params) => {
    let response;
    if (params.type === 'MARKET') {
      response = await tradeApi.placeMarketOrder({
        epic: params.epic,
        direction: params.direction,
        size: params.size,
      });
    } else {
      response = await tradeApi.placeLimitOrder({
        epic: params.epic,
        direction: params.direction,
        size: params.size,
        level: params.level || 0,
        type: params.type as 'LIMIT' | 'STOP',
      });
    }

    const { dealReference } = response;

    const order: Order = {
      ...params,
      status: 'PENDING',
      dealReference,
      timestamp: Date.now(),
    };

    get().addPendingOrder(dealReference, order);

    // Safeguard: if no confirmation in 5s, poll.
    setTimeout(async () => {
      const currentOrder = get().pendingOrders[dealReference];
      if (currentOrder && currentOrder.status === 'PENDING') {
        console.warn(`[TradeStore] No WS confirmation for ${dealReference} after 5s, polling...`);
        try {
          const confirmation = await tradeApi.getConfirmation(dealReference);
          get().handleConfirmation(confirmation);
        } catch (error) {
          console.error(`[TradeStore] Safeguard poll failed for ${dealReference}:`, error);
        }
      }
    }, 5000);

    return dealReference;
  },

  /**
   * Handles incoming trade confirmations from WebSocket or polling.
   */
  handleConfirmation: (payload) => {
    const { dealReference, status, dealId, reason, epic, size, direction, level } = payload;
    
    get().updateOrderStatus(dealReference, status, { dealId, reason });

    if (status === 'ACCEPTED') {
      get().addPosition({
        dealId,
        epic,
        size,
        direction,
        entryPrice: level,
        timestamp: Date.now(),
      });
    }
  },
}));
