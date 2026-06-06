import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Order, Position, OrderStatus, TradeConfirmation } from '../types/trade';
import { tradeApi, MarketOrderParams } from '../api/trade';

interface TradeState {
  pendingOrders: Record<string, Order>;
  positions: Position[];
  confirmationBuffer: Record<string, TradeConfirmation>;
  watchdogTimers: Record<string, any>;
  
  // Actions
  addPendingOrder: (dealReference: string, order: Order) => void;
  updateOrderStatus: (dealReference: string, status: OrderStatus, details?: Partial<Order>) => void;
  handleConfirmation: (payload: TradeConfirmation) => void;
  addPosition: (position: Position) => void;
  removePosition: (dealId: string) => void;
  clearOrders: () => void;
  clearPositions: () => void;
  clearBuffer: () => void;
  startWatchdog: (dealReference: string) => void;

  placeOrder: (params: MarketOrderParams & { bid?: number, ofr?: number }) => Promise<string>;
  flattenPosition: (dealId: string) => Promise<void>;
  cancelWorkingOrder: (workingOrderId: string) => Promise<void>;
}

const BUFFER_TTL = 30000; // 30 seconds
const WATCHDOG_DELAY = 2000; // 2 seconds
const SLIPPAGE_LIMIT = 0.005; // 0.5%

export const useTradeStore = create<TradeState>()(
  persist(
    (set, get) => ({
      pendingOrders: {},
      positions: [],
      confirmationBuffer: {},
      watchdogTimers: {},

      placeOrder: async (params) => {
        const { bid, ofr, ...apiParams } = params;
        
        // Auto-include Guaranteed Stop
        const finalParams = {
          ...apiParams,
          guaranteedStop: true,
        };

        const dealReference = await tradeApi.placeMarketOrder(finalParams);
        
        get().addPendingOrder(dealReference, {
          dealReference,
          epic: params.epic,
          size: params.size,
          type: 'MARKET',
          direction: params.direction,
          status: 'PENDING',
          timestamp: Date.now(),
          guaranteedStop: true,
          stopLevel: params.stopLevel,
          bid,
          ofr
        });

        return dealReference;
      },

      flattenPosition: async (dealId) => {
        const dealReference = await tradeApi.flattenPosition(dealId);
        // We treat it as a pending order for tracking confirmation
        get().addPendingOrder(dealReference, {
          dealReference,
          epic: '', // Epic will be filled by confirmation or we could lookup from current positions
          size: 0, 
          type: 'MARKET',
          direction: 'SELL', // Simplification, in reality it's the opposite of the position
          status: 'PENDING',
          timestamp: Date.now(),
        });
      },

      cancelWorkingOrder: async (workingOrderId) => {
        const dealReference = await tradeApi.cancelWorkingOrder(workingOrderId);
        get().addPendingOrder(dealReference, {
          dealReference,
          epic: '',
          size: 0,
          type: 'STOP', // or LIMIT
          direction: 'BUY', 
          status: 'PENDING',
          timestamp: Date.now(),
        });
      },

      addPendingOrder: (dealReference, order) => {
        set((state) => {
          // Check if we already have a buffered confirmation for this dealReference
          const buffered = state.confirmationBuffer[dealReference];
          
          if (buffered) {
            console.log(`[TradeStore] Using buffered confirmation for ${dealReference}`);
            
            // Immediately transition order status based on buffered confirmation
            const updatedOrder = { 
              ...order, 
              status: buffered.status,
              dealId: buffered.dealId,
              workingOrderId: buffered.workingOrderId,
              reason: buffered.reason
            };

            // If accepted, add to positions
            if (buffered.status === 'ACCEPTED' && buffered.dealId && buffered.entryPrice) {
              setTimeout(() => {
                get().addPosition({
                  dealId: buffered.dealId!,
                  epic: buffered.epic,
                  size: buffered.size,
                  direction: order.direction,
                  entryPrice: buffered.entryPrice!,
                  timestamp: buffered.timestamp,
                });
              }, 0);
            }

            // Remove from buffer
            const newBuffer = { ...state.confirmationBuffer };
            delete newBuffer[dealReference];

            return {
              pendingOrders: {
                ...state.pendingOrders,
                [dealReference]: updatedOrder,
              },
              confirmationBuffer: newBuffer
            };
          }

          // Standard path: just add as PENDING
          // We'll trigger the watchdog after the state update
          setTimeout(() => {
            get().startWatchdog(dealReference);
          }, 0);

          return {
            pendingOrders: {
              ...state.pendingOrders,
              [dealReference]: { ...order, status: 'PENDING' },
            },
          };
        });
      },

      startWatchdog: (dealReference) => {
        const { watchdogTimers, pendingOrders } = get();
        
        // Clear existing timer if any
        if (watchdogTimers[dealReference]) {
          clearTimeout(watchdogTimers[dealReference]);
        }

        const timer = setTimeout(async () => {
          const currentOrder = get().pendingOrders[dealReference];
          if (currentOrder && currentOrder.status === 'PENDING') {
            console.log(`[TradeStore] Watchdog triggered for ${dealReference}`);
            try {
              const confirmation = await tradeApi.getConfirmation(dealReference);
              if (confirmation) {
                get().handleConfirmation(confirmation);
              }
            } catch (error) {
              console.error(`[TradeStore] Watchdog polling failed for ${dealReference}:`, error);
            }
          }
          
          // Clean up timer reference
          set(state => {
            const newTimers = { ...state.watchdogTimers };
            delete newTimers[dealReference];
            return { watchdogTimers: newTimers };
          });
        }, WATCHDOG_DELAY);

        set(state => ({
          watchdogTimers: {
            ...state.watchdogTimers,
            [dealReference]: timer
          }
        }));
      },

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

      handleConfirmation: (payload) => {
        const { dealReference, status, dealId, workingOrderId, reason, entryPrice, epic, size, timestamp } = payload;
        
        const { watchdogTimers } = get();
        if (watchdogTimers[dealReference]) {
          clearTimeout(watchdogTimers[dealReference]);
          // We'll clean up the reference in the state later or now
        }

        set((state) => {
          const order = state.pendingOrders[dealReference];

          // Clean up watchdog timer reference
          const newTimers = { ...state.watchdogTimers };
          delete newTimers[dealReference];

          if (!order) {
            console.warn(`[TradeStore] No pending order found for ${dealReference}, buffering confirmation`);
            
            // Race condition: confirmation arrived before REST response. Buffer it.
            const newBuffer = {
              ...state.confirmationBuffer,
              [dealReference]: payload
            };

            // Set TTL to prevent memory leaks
            setTimeout(() => {
              set((s) => {
                if (s.confirmationBuffer[dealReference]) {
                  console.log(`[TradeStore] TTL expired for buffered confirmation ${dealReference}`);
                  const cleanedBuffer = { ...s.confirmationBuffer };
                  delete cleanedBuffer[dealReference];
                  return { confirmationBuffer: cleanedBuffer };
                }
                return s;
              });
            }, BUFFER_TTL);

            return { 
              confirmationBuffer: newBuffer,
              watchdogTimers: newTimers
            };
          }

          // Normal path: update the existing pending order
          let finalStatus = status;
          let finalReason = reason;

          // Risk & Slippage Guards
          if (status === 'ACCEPTED' && entryPrice && order) {
            // 1. Slippage Safety Cap (0.5%)
            if (order.type === 'MARKET') {
              const targetPrice = order.direction === 'BUY' ? order.ofr : order.bid;
              if (targetPrice) {
                const slippage = Math.abs(entryPrice - targetPrice) / targetPrice;
                if (slippage > SLIPPAGE_LIMIT) {
                  console.warn(`[TradeStore] Slippage limit exceeded: ${(slippage * 100).toFixed(2)}%`);
                  finalReason = finalReason || `Slippage: ${(slippage * 100).toFixed(2)}%`;
                }
              }
            }

            // 2. Post-fill SL Validation
            if (order.stopLevel) {
              const stopDistance = Math.abs(entryPrice - order.stopLevel);
              const stopPercent = stopDistance / entryPrice;
              // If SL is too close (e.g. < 0.1% due to slippage), warn user
              if (stopPercent < 0.001) {
                console.warn(`[TradeStore] Post-fill SL Validation: SL is extremely close (${(stopPercent * 100).toFixed(3)}%)`);
                finalReason = finalReason || 'SL risk: fill price too close to stop level';
              }
            }
          }

          const updatedOrder = {
            ...order,
            status: finalStatus,
            dealId,
            workingOrderId,
            reason: finalReason
          };

          // Create position if accepted
          if (status === 'ACCEPTED' && dealId && entryPrice) {
            // We use setTimeout to ensure this happens after the state update
            setTimeout(() => {
              get().addPosition({
                dealId,
                epic,
                size,
                direction: order.direction,
                entryPrice,
                timestamp,
              });
            }, 0);
          }

          return {
            pendingOrders: {
              ...state.pendingOrders,
              [dealReference]: updatedOrder,
            },
            watchdogTimers: newTimers
          };
        });
      },

      addPosition: (position) => 
        set((state) => {
          // Avoid duplicate positions if confirmation arrives multiple times (unlikely but safe)
          if (state.positions.find(p => p.dealId === position.dealId)) {
            return state;
          }
          return {
            positions: [...state.positions, position],
          };
        }),

      removePosition: (dealId) => 
        set((state) => ({
          positions: state.positions.filter((p) => p.dealId !== dealId),
        })),

      clearOrders: () => set({ pendingOrders: {} }),
      clearPositions: () => set({ positions: [] }),
      clearBuffer: () => set({ confirmationBuffer: {} }),
    }),
    {
      name: 'trade-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ pendingOrders: state.pendingOrders }), // Whitelist pendingOrders only
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Resume watchdog for any pending orders found in storage
          Object.keys(state.pendingOrders).forEach(dealReference => {
            if (state.pendingOrders[dealReference].status === 'PENDING') {
              console.log(`[TradeStore] Resuming watchdog for ${dealReference}`);
              state.startWatchdog(dealReference);
            }
          });
        }
      }
    }
  )
);
