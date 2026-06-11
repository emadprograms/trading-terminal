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
  updatePositionStopLoss: (dealId: string, stopLevel: number) => Promise<void>;
  cancelAllWorkingOrders: () => Promise<void>;
  syncPositions: () => Promise<void>;
}

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

          // Handle stopLoss logic
          if (params.stopDistance && params.stopDistance > 0) {
             const basePrice = (type === 'MARKET' || !type) 
                 ? (params.direction === 'BUY' ? bid : ofr) 
                 : params.level;
                 
             if (basePrice !== undefined) {
                 if (type === 'LIMIT' || type === 'STOP') {
                     // For limit orders, we must calculate stopLevel
                     const rawStop = params.direction === 'BUY' 
                         ? basePrice - params.stopDistance 
                         : basePrice + params.stopDistance;
                     finalParams.stopLevel = parseFloat(rawStop.toFixed(5));
                     delete finalParams.stopDistance;
                 } else {
                     // For market orders, send stopDistance natively, but explicitly set guaranteedStop to false
                     finalParams.stopDistance = parseFloat(params.stopDistance.toString());
                     finalParams.guaranteedStop = params.guaranteedStop || false;
                 }
             }
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
        const { positions } = get();
        const position = positions.find(p => p.dealId === dealId);

        set((state) => {
          const newSet = new Set(state.closingDealIds);
          newSet.add(dealId);
          return { isExecuting: true, closingDealIds: newSet };
        });

        try {
          await tradeApi.flattenPosition(dealId, position);
          // If successful, immediately remove it locally.
          set((state) => {
             const newSet = new Set(state.closingDealIds);
             newSet.delete(dealId);
             return { 
                 positions: state.positions.filter(p => p.dealId !== dealId),
                 closingDealIds: newSet,
                 isExecuting: false
             };
          });
          toast.success('Position closed');
        } catch (error: any) {
          console.error(`Failed to close position ${dealId}:`, error);
          set((state) => {
            const newSet = new Set(state.closingDealIds);
            newSet.delete(dealId);
            
            // If it's a 404, it means the position is already closed (ghost position)
            if (error.message && (error.message.includes('404') || error.message.toLowerCase().includes('not found'))) {
                 return { 
                     positions: state.positions.filter(p => p.dealId !== dealId),
                     closingDealIds: newSet,
                     isExecuting: false
                 };
            }
            
            return { closingDealIds: newSet, isExecuting: false };
          });
          
          if (error.message && (error.message.includes('404') || error.message.toLowerCase().includes('not found'))) {
              toast.success('Ghost position cleared');
          } else {
              toast.error(`Failed to close: ${error.message || 'Unknown error'}`);
          }
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
              await tradeApi.flattenPosition(pos.dealId, pos);
              set((state) => {
                const newSet = new Set(state.closingDealIds);
                newSet.delete(pos.dealId);
                return { 
                    positions: state.positions.filter(p => p.dealId !== pos.dealId),
                    closingDealIds: newSet 
                };
              });
            } catch (error: any) {
              console.error(`Failed to close position ${pos.dealId}:`, error);
              set((state) => {
                const newSet = new Set(state.closingDealIds);
                newSet.delete(pos.dealId);
                
                if (error.message && (error.message.includes('404') || error.message.toLowerCase().includes('not found'))) {
                     return { 
                         positions: state.positions.filter(p => p.dealId !== pos.dealId),
                         closingDealIds: newSet 
                     };
                }
                
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

      updatePositionStopLoss: async (dealId, stopLevel) => {
        const { positions } = get();
        const position = positions.find(p => p.dealId === dealId);
        if (!position) return;

        set({ isExecuting: true });
        try {
          // Format stopLevel to prevent API errors. Use null to clear it.
          const formattedStopLevel = stopLevel === 0 ? null : parseFloat(stopLevel.toFixed(5));
          
          await tradeApi.updatePosition(dealId, { stopLevel: formattedStopLevel as any });
          
          // Optimistically update the UI
          set(state => ({
            positions: state.positions.map(p => 
              p.dealId === dealId ? { ...p, stopLevel: stopLevel === 0 ? undefined : formattedStopLevel as number } : p
            ),
            isExecuting: false
          }));
          
          toast.success('Stop Loss updated');
        } catch (error) {
          console.error(`Failed to update position SL ${dealId}:`, error);
          set({ isExecuting: false });
          toast.error('Failed to update Stop Loss');
        }
      },

      updatePositionTakeProfit: async (dealId, profitLevel) => {
        const { positions } = get();
        const position = positions.find(p => p.dealId === dealId);
        if (!position) return;

        set({ isExecuting: true });
        try {
          // Format profitLevel to prevent API errors. Use null to clear it.
          const formattedProfitLevel = profitLevel === 0 ? null : parseFloat(profitLevel.toFixed(5));
          
          await tradeApi.updatePosition(dealId, { profitLevel: formattedProfitLevel as any });
          
          // Optimistically update the UI
          set(state => ({
            positions: state.positions.map(p => 
              p.dealId === dealId ? { ...p, profitLevel: profitLevel === 0 ? undefined : formattedProfitLevel as number } : p
            ),
            isExecuting: false
          }));
          
          toast.success('Take Profit updated');
        } catch (error) {
          console.error(`Failed to update position TP ${dealId}:`, error);
          set({ isExecuting: false });
          toast.error('Failed to update Take Profit');
        }
      },

      cancelWorkingOrder: async (workingOrderId) => {
        const { pendingOrders } = get();
        // Find the actual order object
        const order = pendingOrders[workingOrderId] || Object.values(pendingOrders).find(o => 
          o.dealReference === workingOrderId || 
          o.workingOrderId === workingOrderId || 
          o.dealId === workingOrderId
        );
        
        // If it's a stuck market order, we can't cancel it via API. Just remove it locally.
        if (order && order.type === 'MARKET') {
            set(state => {
                const newOrders = { ...state.pendingOrders };
                delete newOrders[order.dealReference];
                return { pendingOrders: newOrders, isExecuting: false };
            });
            return;
        }

        set({ isExecuting: true });
        try {
          const apiOrderId = order?.workingOrderId || order?.dealId || workingOrderId;
          await tradeApi.cancelWorkingOrder(apiOrderId);
          
          // Successfully cancelled! Remove it locally.
          set(state => {
            const newOrders = { ...state.pendingOrders };
            if (order) {
                delete newOrders[order.dealReference];
            } else {
                delete newOrders[workingOrderId];
            }
            return { pendingOrders: newOrders, isExecuting: false };
          });
        } catch (error) {
          console.error(`Failed to cancel working order ${workingOrderId}:`, error);
          set({ isExecuting: false });
          toast.error(`Failed to cancel order`);
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
            const m = raw.market || raw;
            return {
              dealId: p.dealId,
              epic: m.epic || p.epic,
              size: p.size,
              direction: p.direction,
              entryPrice: p.level || p.entryPrice || 0,
              stopLevel: p.stopLevel,
              timestamp: new Date(p.createdDate || p.timestamp || Date.now()).getTime(),
            };
          });

          const pendingOrders: Record<string, Order> = {};
          rawOrders.forEach(raw => {
            const data = raw.workingOrderData || raw;
            const m = raw.marketData || raw.market || raw;
            pendingOrders[data.dealId || data.dealReference] = {
              dealReference: data.dealId || data.dealReference,
              dealId: data.dealId,
              workingOrderId: data.dealId,
              epic: m.epic || data.epic,
              size: data.size,
              level: data.level || data.orderLevel,
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
                  stopLevel: buffered.stopLevel || order.stopLevel,
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
          stopLevel: rawPayload.stopLevel,
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
                stopLevel: payload.stopLevel || order.stopLevel,
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
