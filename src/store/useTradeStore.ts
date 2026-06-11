import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { toast } from 'sonner';
import { Order, Position, OrderStatus, TradeConfirmation } from '../types/trade';
import { tradeApi, MarketOrderParams, LimitOrderParams } from '../api/trade';

interface TradeState {
  pendingOrders: Record<string, Order>;
  positions: Position[];
  confirmationBuffer: Record<string, TradeConfirmation>;
  watchdogTimers: Record<string, any>;
  isExecuting: boolean;
  closingDealIds: Set<string>;
  
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

  placeOrder: (params: (MarketOrderParams | LimitOrderParams) & { bid?: number, ofr?: number }) => Promise<string>;
  flattenPosition: (dealId: string) => Promise<void>;
  flattenAll: () => Promise<void>;
  cancelWorkingOrder: (workingOrderId: string) => Promise<void>;
  cancelAllWorkingOrders: () => Promise<void>;
  syncPositions: () => Promise<void>;

const BUFFER_TTL = 30000; // 30 seconds
const WATCHDOG_DELAY = 2000; // 2 seconds
const SLIPPAGE_LIMIT = 0.005; // 0.5%
const BATCH_THROTTLE = 100; // 100ms between calls

export const useTradeStore = create<TradeState>()(
  persist(
    (set, get) => ({
      pendingOrders: {},
      positions: [],
      confirmationBuffer: {},
      watchdogTimers: {},
      isExecuting: false,
      closingDealIds: new Set<string>(),

      placeOrder: async (params) => {
        set({ isExecuting: true });
        try {
          const { bid, ofr, type, ...apiParams } = params;
          
          // Respect user preference for Guaranteed Stop
          const finalParams: any = { ...apiParams };
          if (params.guaranteedStop) {
            finalParams.guaranteedStop = true;
          } else {
            delete finalParams.guaranteedStop;
          }

          // Remove any undefined fields to ensure clean payload
          Object.keys(finalParams).forEach(key => {
            if (finalParams[key] === undefined) {
              delete finalParams[key];
            }
          });

          let dealReference: string;
          const orderType = type || 'MARKET';

          console.log(`[Surgical-Verify] Routing order type ${orderType} to ${orderType === 'LIMIT' || orderType === 'STOP' ? 'workingorders' : 'positions'}`);

          if (orderType === 'LIMIT' || orderType === 'STOP') {
            finalParams.type = orderType;
            finalParams.level = (params as LimitOrderParams).level;
            dealReference = await tradeApi.placeLimitOrder(finalParams as LimitOrderParams);
          } else {
            dealReference = await tradeApi.placeMarketOrder(finalParams as MarketOrderParams);
          }
          
          get().addPendingOrder(dealReference, {
            dealReference,
            epic: params.epic,
            size: params.size,
            type: orderType,
            direction: params.direction,
            status: 'PENDING',
            timestamp: Date.now(),
            guaranteedStop: finalParams.guaranteedStop,
            stopLevel: params.stopLevel,
            stopDistance: params.stopDistance,
            bid,
            ofr
          });

          return dealReference;
        } catch (error) {
          throw error;
        } finally {
          set({ isExecuting: false });
        }
      },

      flattenPosition: async (dealId) => {
        set((state) => {
          const newSet = new Set(state.closingDealIds);
          newSet.add(dealId);
          return { isExecuting: true, closingDealIds: newSet };
        });

        try {
          const dealReference = await tradeApi.flattenPosition(dealId);
          get().addPendingOrder(dealReference, {
            dealReference,
            epic: '',
            size: 0,
            type: 'MARKET',
            direction: 'SELL',
            status: 'PENDING',
            timestamp: Date.now(),
          });
        } finally {
          set((state) => {
            const newSet = new Set(state.closingDealIds);
            newSet.delete(dealId);
            return { closingDealIds: newSet };
          });
        }
      },

      flattenAll: async () => {
        const { positions } = get();
        if (positions.length === 0) return;

        set({ isExecuting: true });
        try {
          for (const pos of positions) {
            set((state) => {
              const newSet = new Set(state.closingDealIds);
              newSet.add(pos.dealId);
              return { closingDealIds: newSet };
            });

            try {
              await tradeApi.flattenPosition(pos.dealId);
              // We don't wait for confirmation in the loop, just fire the DELETE
            } catch (e) {
              console.error(`Failed to flatten ${pos.dealId}:`, e);
            } finally {
              set((state) => {
                const newSet = new Set(state.closingDealIds);
                newSet.delete(pos.dealId);
                return { closingDealIds: newSet };
              });
            }
            
            // Throttle
            await new Promise(resolve => setTimeout(resolve, BATCH_THROTTLE));
          }
        } finally {
          set({ isExecuting: false });
        }
      },

      cancelWorkingOrder: async (workingOrderId) => {
        set({ isExecuting: true });
        try {
          const dealReference = await tradeApi.cancelWorkingOrder(workingOrderId);
          get().addPendingOrder(dealReference, {
            dealReference,
            epic: '',
            size: 0,
            type: 'STOP',
            direction: 'BUY', 
            status: 'PENDING',
            timestamp: Date.now(),
          });
        } finally {
          // Resetting isExecuting happens in handleConfirmation
        }
      },

      cancelAllWorkingOrders: async () => {
        const { pendingOrders } = get();
        const workingOrders = Object.values(pendingOrders).filter(o => o.status === 'PENDING' && (o.type === 'LIMIT' || o.type === 'STOP'));
        
        if (workingOrders.length === 0) return;

        set({ isExecuting: true });
        try {
          for (const order of workingOrders) {
            const id = order.workingOrderId || order.dealId || order.dealReference;
            try {
              await tradeApi.cancelWorkingOrder(id);
            } catch (e) {
              console.error(`Failed to cancel order ${id}:`, e);
            }
            await new Promise(resolve => setTimeout(resolve, BATCH_THROTTLE));
          }
        } finally {
          set({ isExecuting: false });
        }
      },

      syncPositions: async () => {
        try {
          console.log('[DEBUG-SYNC] Fetching positions and working orders from Capital.com...');
          const rawPositions = await tradeApi.fetchPositions();
          const rawOrders = await tradeApi.fetchWorkingOrders();
          
          console.log('[DEBUG-SYNC] Raw Positions:', JSON.stringify(rawPositions, null, 2));
          console.log('[DEBUG-SYNC] Raw Orders:', JSON.stringify(rawOrders, null, 2));

          const mappedPositions: Position[] = rawPositions.map(raw => {
            const p = raw.position || raw;
            return {
              dealId: p.dealId,
              epic: p.epic,
              size: p.size,
              direction: p.direction,
              entryPrice: p.level || p.entryPrice || 0,
              timestamp: new Date(p.createdDate || p.timestamp || Date.now()).getTime(),
            };
          });

          const pendingOrders: Record<string, Order> = {};
          rawOrders.forEach(raw => {
            const data = raw.workingOrderData || raw;
            pendingOrders[data.dealId || data.dealReference] = {
              dealReference: data.dealId || data.dealReference,
              dealId: data.dealId,
              workingOrderId: data.dealId,
              epic: data.epic,
              size: data.size,
              level: data.level,
              type: data.type || 'LIMIT',
              direction: data.direction,
              status: 'PENDING',
              timestamp: new Date(data.createdDate || data.timestamp || Date.now()).getTime(),
            };
          });
          
          set({ 
            positions: mappedPositions,
            // optionally overwrite pending orders with active working orders
            // pendingOrders: pendingOrders
          });
          
          // Actually, let's keep local pending orders (which might be market orders in transit)
          // and just merge in the working orders from API.
          set(state => ({
            pendingOrders: {
              ...state.pendingOrders,
              ...pendingOrders
            }
          }));
          
        } catch (error) {
          console.error('[TradeStore] Failed to sync positions:', error);
        }
      },

      addPendingOrder: (dealReference, order) => {
        set((state) => {
          const buffered = state.confirmationBuffer[dealReference];
          
          if (buffered) {
            const updatedOrder = { 
              ...order, 
              status: buffered.status,
              dealId: buffered.dealId,
              workingOrderId: buffered.workingOrderId,
              reason: buffered.reason
            };

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

            const newBuffer = { ...state.confirmationBuffer };
            delete newBuffer[dealReference];

            return {
              isExecuting: false,
              pendingOrders: {
                ...state.pendingOrders,
                [dealReference]: updatedOrder,
              },
              confirmationBuffer: newBuffer
            };
          }

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
        const { watchdogTimers } = get();
        if (watchdogTimers[dealReference]) {
          clearTimeout(watchdogTimers[dealReference]);
        }

        const timer = setTimeout(async () => {
          const currentOrder = get().pendingOrders[dealReference];
          if (currentOrder && currentOrder.status === 'PENDING') {
            try {
              const confirmation = await tradeApi.getConfirmation(dealReference);
              if (confirmation) {
                get().handleConfirmation(confirmation);
              }
            } catch (error) {
              console.error(`[Watchdog] Polling failed for ${dealReference}:`, error);
            }
          }
          
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
          if (!order) return { ...state, isExecuting: false };

          return {
            isExecuting: false,
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

      handleConfirmation: (rawPayload: any) => {
        console.log('[DEBUG-PAYLOAD] Raw confirmation payload received:', JSON.stringify(rawPayload, null, 2));

        // Normalize Capital.com payload which might use dealStatus and level
        const payload: TradeConfirmation = {
          ...rawPayload,
          status: rawPayload.dealStatus || rawPayload.status,
          entryPrice: rawPayload.level || rawPayload.entryPrice || rawPayload.price,
          // Sometimes Capital.com hides the dealId in affectedDeals
          dealId: rawPayload.dealId || (rawPayload.affectedDeals && rawPayload.affectedDeals[0] && rawPayload.affectedDeals[0].dealId)
        };

        console.log('[DEBUG-PAYLOAD] Normalized payload:', JSON.stringify(payload, null, 2));

        const { dealReference, status, dealId, workingOrderId, reason, entryPrice, epic, size, timestamp } = payload;
        
        const { watchdogTimers } = get();
        if (watchdogTimers[dealReference]) {
          clearTimeout(watchdogTimers[dealReference]);
        }

        set((state) => {
          const order = state.pendingOrders[dealReference];
          const newTimers = { ...state.watchdogTimers };
          delete newTimers[dealReference];

          if (!order) {
            const newBuffer = {
              ...state.confirmationBuffer,
              [dealReference]: payload
            };

            setTimeout(() => {
              set((s) => {
                if (s.confirmationBuffer[dealReference]) {
                  const cleanedBuffer = { ...s.confirmationBuffer };
                  delete cleanedBuffer[dealReference];
                  return { confirmationBuffer: cleanedBuffer };
                }
                return s;
              });
            }, BUFFER_TTL);

            return { 
              isExecuting: false,
              confirmationBuffer: newBuffer,
              watchdogTimers: newTimers
            };
          }

          let finalStatus = status;
          let finalReason = reason;

          if (status === 'ACCEPTED' && entryPrice) {
            if (order.type === 'MARKET') {
              const targetPrice = order.direction === 'BUY' ? order.ofr : order.bid;
              if (targetPrice) {
                const slippage = Math.abs(entryPrice - targetPrice) / targetPrice;
                if (slippage > SLIPPAGE_LIMIT) {
                  finalReason = finalReason || `Slippage: ${(slippage * 100).toFixed(2)}%`;
                }
              }
            }

            if (order.stopLevel) {
              const stopDistance = Math.abs(entryPrice - order.stopLevel);
              const stopPercent = stopDistance / entryPrice;
              if (stopPercent < 0.001) {
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

          // Notify user of confirmation outcome
          if (finalStatus === 'REJECTED') {
            toast.error(`Order Rejected: ${finalReason || 'Unknown reason'}`);
            console.error(`[TradeStore] Order ${dealReference} rejected:`, payload);
          } else if (finalStatus === 'ACCEPTED') {
            toast.success(`Order Confirmed: ${order.type} ${order.direction}`);
          }

          if (status === 'ACCEPTED' && dealId && entryPrice) {
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
            isExecuting: false,
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
      partialize: (state) => ({ pendingOrders: state.pendingOrders }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          Object.keys(state.pendingOrders).forEach(dealReference => {
            if (state.pendingOrders[dealReference].status === 'PENDING') {
              state.startWatchdog(dealReference);
            }
          });
        }
      }
    }
  )
);
