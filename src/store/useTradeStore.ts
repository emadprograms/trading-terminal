import { create } from 'zustand';
import { toast } from 'sonner';
import { Order, Position, OrderStatus, TradeConfirmation, OrderDirection, OrderType } from '../types/trade';
import { tradeApi } from '../api/trade';

interface PlaceOrderParams {
  epic: string;
  size: number;
  direction: OrderDirection;
  type: OrderType;
  level?: number;
  action?: 'OPEN' | 'CLOSE';
}

interface TradeState {
  pendingOrders: Record<string, Order & { action: 'OPEN' | 'CLOSE' }>;
  positions: Position[];
  addPendingOrder: (dealReference: string, order: Order & { action: 'OPEN' | 'CLOSE' }) => void;
  updateOrderStatus: (dealReference: string, status: OrderStatus, details?: Partial<Order>) => void;
  addPosition: (position: Position) => void;
  removePosition: (dealId: string) => void;
  clearOrders: () => void;
  closePosition: (dealId: string) => Promise<string>;
  
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

  closePosition: async (dealId) => {
    const position = get().positions.find(p => p.dealId === dealId);
    if (!position) throw new Error(`Position ${dealId} not found`);

    try {
      const response = await tradeApi.closePosition(dealId);
      const { dealReference } = response;
      
      toast.info(`Closing position ${dealId}...`, {
        description: `Reference: ${dealReference}`,
      });

      const order: Order & { action: 'OPEN' | 'CLOSE' } = {
        epic: position.epic,
        size: position.size,
        direction: position.direction === 'BUY' ? 'SELL' : 'BUY',
        type: 'MARKET',
        status: 'PENDING',
        dealReference,
        timestamp: Date.now(),
        action: 'CLOSE',
        dealId: dealId // Track which position is being closed
      };

      get().addPendingOrder(dealReference, order);

      // Safeguard poll for close confirmation
      setTimeout(async () => {
        const stillExists = get().positions.some(p => p.dealId === dealId);
        if (stillExists) {
          try {
            const confirmation = await tradeApi.getConfirmation(dealReference);
            get().handleConfirmation(confirmation);
          } catch (e) {
            console.error('Safeguard poll for close failed:', e);
          }
        }
      }, 5000);

      return dealReference;
    } catch (error) {
      toast.error(`Failed to close position ${dealId}`);
      throw error;
    }
  },

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

    const order: Order & { action: 'OPEN' | 'CLOSE' } = {
      ...params,
      status: 'PENDING',
      dealReference,
      timestamp: Date.now(),
      action: params.action || 'OPEN'
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
    const { dealReference, dealId, reason } = payload;
    const dealStatus = payload.dealStatus || payload.status;
    
    const pendingOrder = get().pendingOrders[dealReference];
    if (!pendingOrder) {
      console.warn(`[TradeStore] Confirmation for unknown order: ${dealReference}`);
    }

    const status: OrderStatus = dealStatus === 'ACCEPTED' ? 'ACCEPTED' : 'REJECTED';
    get().updateOrderStatus(dealReference, status, { dealId, reason });

    const epic = payload.epic || pendingOrder?.epic || 'Unknown';
    const direction = payload.direction || pendingOrder?.direction || 'BUY';
    const size = payload.size || pendingOrder?.size || 0;
    const level = payload.level || pendingOrder?.level || 0;

    if (dealStatus === 'ACCEPTED') {
      if (pendingOrder?.action === 'CLOSE') {
        toast.success(`Position Closed: ${epic}`, {
          description: `Size: ${size} at ${level}`,
        });
        if (pendingOrder.dealId) {
          get().removePosition(pendingOrder.dealId);
        }
      } else {
        toast.success(`Trade Success: ${direction} ${size} ${epic} at ${level}`, {
          description: `Deal ID: ${dealId}`,
        });
        get().addPosition({
          dealId,
          epic,
          size,
          direction,
          entryPrice: level,
          timestamp: Date.now(),
        });
      }
    } else {
      toast.error(`Trade Rejected: ${epic}`, {
        description: reason || 'Unknown rejection reason',
      });
    }
  },
}));

