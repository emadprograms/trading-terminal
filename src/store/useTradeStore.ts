import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { toast } from 'sonner';
import { Order, Position, OrderStatus, TradeConfirmation, Execution } from '../types/trade';
import { tradeApi, MarketOrderParams, LimitOrderParams } from '../api/trade';

interface TradeState {
  pendingOrders: Record<string, Order>;
  positions: Position[];
  confirmationBuffer: Record<string, TradeConfirmation>;
  watchdogTimers: Record<string, any>;
  isExecuting: boolean;
  closingDealIds: Set<string>;
  executions: Execution[];
  
  // Actions
  addExecution: (execution: Execution) => void;
  addPendingOrder: (dealReference: string, order: Order) => void;
  updateOrderStatus: (dealReference: string, status: OrderStatus, details?: Partial<Order>) => void;
  handleConfirmation: (payload: TradeConfirmation) => void;
  addPosition: (position: Position) => void;
  removePosition: (dealId: string) => void;
  clearOrders: () => void;
  clearPositions: () => void;
  clearBuffer: () => void;
  startWatchdog: (dealReference: string) => void;

  placeOrder: (params: (MarketOrderParams | LimitOrderParams) & { bid?: number, ofr?: number, level?: number }) => Promise<string>;
  flattenPosition: (dealId: string) => Promise<void>;
  flattenSymbol: (epic: string) => Promise<void>;
  flattenHalfSymbol: (epic: string) => Promise<void>;
  flattenAll: () => Promise<void>;
  cancelWorkingOrder: (workingOrderId: string) => Promise<void>;
  updatePositionStopLoss: (dealId: string, stopLevel: number) => Promise<void>;
  updatePositionTakeProfit: (dealId: string, profitLevel: number) => Promise<void>;
  cancelAllWorkingOrders: () => Promise<void>;
  syncPositions: () => Promise<void>;
  syncExecutions: () => Promise<void>;
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
      executions: [],

      addExecution: (execution) => {
        set((state) => ({
          executions: [...state.executions, execution]
        }));
      },

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
                 ? (params.direction === 'BUY' ? ofr : bid) 
                 : params.level;
                 
             if (basePrice !== undefined) {
                 const rawStop = params.direction === 'BUY' 
                     ? basePrice - params.stopDistance 
                     : basePrice + params.stopDistance;
                 finalParams.stopLevel = parseFloat(rawStop.toFixed(5));
                 delete finalParams.stopDistance;
                 if (type === 'MARKET' || !type) {
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
            console.log('[PlaceOrder-Debug] FINAL market order payload:', JSON.stringify(finalParams));
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
            stopLevel: finalParams.stopLevel,
            stopDistance: params.stopDistance,
            bid,
            ofr
          });

          // Sync positions after a short delay to get the real data from Capital.com
          // (including the stopLevel that the confirmation response doesn't include)
          setTimeout(() => {
            get().syncPositions();
          }, 3000);

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
          
          // Get current price for exit marker
          const priceStore = (await import('./usePriceStore')).usePriceStore;
          const currentPriceObj = priceStore.getState().prices[position!.epic];
          const exitPrice = currentPriceObj 
              ? (position!.direction === 'BUY' ? currentPriceObj.bid : currentPriceObj.ofr) 
              : position!.currentPrice || position!.entryPrice;

          if (exitPrice) {
            const execExists = get().executions.some(e => e.dealId === dealId && e.action === 'EXIT');
            if (!execExists) {
              get().addExecution({
                id: `${dealId}_EXIT_${Date.now()}`,
                dealId: dealId,
                epic: position!.epic,
                size: position!.size,
                price: exitPrice,
                direction: position!.direction === 'BUY' ? 'SELL' : 'BUY',
                timestamp: Date.now(),
                action: 'EXIT'
              });
            }
          }

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

      flattenSymbol: async (epic) => {
        const { positions } = get();
        const symbolPositions = positions.filter(p => p.epic === epic);
        if (symbolPositions.length === 0) return;

        set({ isExecuting: true });
        try {
          for (const pos of symbolPositions) {
            set((state) => {
              const newSet = new Set(state.closingDealIds);
              newSet.add(pos.dealId);
              return { closingDealIds: newSet };
            });

            try {
              await tradeApi.flattenPosition(pos.dealId, pos);

              const priceStore = (await import('./usePriceStore')).usePriceStore;
              const currentPriceObj = priceStore.getState().prices[pos.epic];
              const exitPrice = currentPriceObj 
                  ? (pos.direction === 'BUY' ? currentPriceObj.bid : currentPriceObj.ofr) 
                  : pos.currentPrice || pos.entryPrice;

              if (exitPrice) {
                const execExists = get().executions.some(e => e.dealId === pos.dealId && e.action === 'EXIT');
                if (!execExists) {
                  get().addExecution({
                    id: `${pos.dealId}_EXIT_${Date.now()}`,
                    dealId: pos.dealId,
                    epic: pos.epic,
                    size: pos.size,
                    price: exitPrice,
                    direction: pos.direction === 'BUY' ? 'SELL' : 'BUY',
                    timestamp: Date.now(),
                    action: 'EXIT'
                  });
                }
              }

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

      flattenHalfSymbol: async (epic) => {
        const { positions } = get();
        const symbolPositions = positions.filter(p => p.epic === epic);
        if (symbolPositions.length === 0) return;

        set({ isExecuting: true });
        try {
          for (const pos of symbolPositions) {
            const halfSize = pos.size / 2;
            if (halfSize <= 0) continue; // Safety check

            try {
               const priceStore = (await import('./usePriceStore')).usePriceStore;
               const currentPriceObj = priceStore.getState().prices[pos.epic];
               
               await get().placeOrder({
                 epic: pos.epic,
                 size: halfSize,
                 direction: pos.direction === 'BUY' ? 'SELL' : 'BUY',
                 type: 'MARKET',
                 bid: currentPriceObj?.bid,
                 ofr: currentPriceObj?.ask || currentPriceObj?.ofr
               });
            } catch (error: any) {
              console.error(`Failed to halve position ${pos.dealId}:`, error);
              toast.error(`Failed to halve position: ${error.message || 'Unknown error'}`);
            }
            
            // Throttle
            await new Promise(resolve => setTimeout(resolve, BATCH_THROTTLE));
          }
        } finally {
          set({ isExecuting: false });
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

              const priceStore = (await import('./usePriceStore')).usePriceStore;
              const currentPriceObj = priceStore.getState().prices[pos.epic];
              const exitPrice = currentPriceObj 
                  ? (pos.direction === 'BUY' ? currentPriceObj.bid : currentPriceObj.ofr) 
                  : pos.currentPrice || pos.entryPrice;

              if (exitPrice) {
                const execExists = get().executions.some(e => e.dealId === pos.dealId && e.action === 'EXIT');
                if (!execExists) {
                  get().addExecution({
                    id: `${pos.dealId}_EXIT_${Date.now()}`,
                    dealId: pos.dealId,
                    epic: pos.epic,
                    size: pos.size,
                    price: exitPrice,
                    direction: pos.direction === 'BUY' ? 'SELL' : 'BUY',
                    timestamp: Date.now(),
                    action: 'EXIT'
                  });
                }
              }

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
          
          // Do NOT send guaranteedStop: false — Capital.com rejects it with 403
          // on instruments that don't support guaranteed stops
          const params: Record<string, any> = { 
             stopLevel: formattedStopLevel,
          };
          // Also send the current profitLevel to avoid it being cleared
          if (position.profitLevel) {
            params.profitLevel = position.profitLevel;
          }

          console.log(`[TradeStore] Updating SL for ${dealId}:`, JSON.stringify(params));
          await tradeApi.updatePosition(dealId, params);
          
          // Optimistically update the UI
          set(state => ({
            positions: state.positions.map(p => 
              p.dealId === dealId ? { ...p, stopLevel: stopLevel === 0 ? undefined : formattedStopLevel as number } : p
            ),
            isExecuting: false
          }));
          
          toast.success('Stop Loss updated');
        } catch (error: any) {
          console.error(`Failed to update position SL ${dealId}:`, error);
          set({ isExecuting: false });
          toast.error(`Failed: ${error.message || 'Unknown error'}`);
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
          
          // Do NOT send guaranteedStop: false — Capital.com rejects it with 403
          const params: Record<string, any> = { 
             profitLevel: formattedProfitLevel,
          };
          // Also send the current stopLevel to avoid it being cleared
          if (position.stopLevel) {
            params.stopLevel = position.stopLevel;
          }

          console.log(`[TradeStore] Updating TP for ${dealId}:`, JSON.stringify(params));
          await tradeApi.updatePosition(dealId, params);
          
          // Optimistically update the UI
          set(state => ({
            positions: state.positions.map(p => 
              p.dealId === dealId ? { ...p, profitLevel: profitLevel === 0 ? undefined : formattedProfitLevel as number } : p
            ),
            isExecuting: false
          }));
          
          toast.success('Take Profit updated');
        } catch (error: any) {
          console.error(`Failed to update position TP ${dealId}:`, error);
          set({ isExecuting: false });
          toast.error(`Failed: ${error.message || 'Unknown error'}`);
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
          const rawPositions = await tradeApi.fetchPositions();
          const rawOrders = await tradeApi.fetchWorkingOrders();

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
              profitLevel: p.profitLevel,
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

          const state = get();
          const newExecutions: Execution[] = [];
          const priceStore = (await import('./usePriceStore')).usePriceStore;

          // 1. Detect new positions (ENTRY)
          mappedPositions.forEach(p => {
            const exists = state.positions.some(old => old.dealId === p.dealId);
            if (!exists) {
              const execExists = state.executions.some(e => e.dealId === p.dealId && e.action === 'ENTRY');
              if (!execExists) {
                newExecutions.push({
                  id: `${p.dealId}_ENTRY_${p.timestamp || Date.now()}`,
                  dealId: p.dealId,
                  epic: p.epic,
                  size: p.size,
                  price: p.entryPrice,
                  direction: p.direction,
                  timestamp: p.timestamp || Date.now(),
                  action: 'ENTRY'
                });
              }
            }
          });

          // 2. Detect closed positions (EXIT)
          state.positions.forEach(p => {
            const stillExists = mappedPositions.some(newPos => newPos.dealId === p.dealId);
            if (!stillExists) {
              const execExists = state.executions.some(e => e.dealId === p.dealId && e.action === 'EXIT');
              if (!execExists) {
                const currentPriceObj = priceStore.getState().prices[p.epic];
                const exitPrice = currentPriceObj 
                    ? (p.direction === 'BUY' ? currentPriceObj.bid : currentPriceObj.ofr) 
                    : p.entryPrice;

                newExecutions.push({
                  id: `${p.dealId}_EXIT_${Date.now()}`,
                  dealId: p.dealId,
                  epic: p.epic,
                  size: p.size,
                  price: exitPrice,
                  direction: p.direction === 'BUY' ? 'SELL' : 'BUY',
                  timestamp: Date.now(),
                  action: 'EXIT'
                });
              }
            }
          });
          
          set(state => ({
            positions: mappedPositions,
            executions: newExecutions.length > 0 ? [...state.executions, ...newExecutions] : state.executions,
            pendingOrders: {
              ...state.pendingOrders,
              ...pendingOrders
            }
          }));
          
        } catch (error) {
          console.error('[TradeStore] Failed to sync positions:', error);
        }
      },

      syncExecutions: async () => {
        try {
          const rawActivities = await tradeApi.fetchActivityHistory(86400);
          const mapped: Execution[] = rawActivities
            .filter(a => a.type === 'POSITION' && a.status === 'ACCEPTED' && a.details)
            .map(a => {
              const d = a.details;
              const rawDate = a.dateUTC || a.date;
              const timestamp = rawDate ? new Date(rawDate).getTime() : Date.now();
              return {
                id: `${a.dealId}_${d.direction}_${timestamp}`,
                dealId: a.dealId,
                epic: a.epic || '',
                size: Math.abs(d.size || 0),
                price: d.level || d.openPrice || 0,
                direction: d.direction,
                timestamp,
                action: d.openPrice ? 'EXIT' : 'ENTRY'
              };
            });

          set(state => {
            const currentExecMap = new Map(state.executions.map(e => [e.id, e]));
            mapped.forEach(e => currentExecMap.set(e.id, e));
            return { executions: Array.from(currentExecMap.values()) };
          });
        } catch (error) {
          console.error('[TradeStore] Failed to sync executions:', error);
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

      addPosition: (position) => {
        set((state) => ({
          positions: [...state.positions.filter((p) => p.dealId !== position.dealId), position],
        }));
        
        const timestamp = position.timestamp || Date.now();
        const execExists = get().executions.some(e => e.dealId === position.dealId && e.action === 'ENTRY');
        if (!execExists) {
          get().addExecution({
            id: `${position.dealId}_ENTRY_${timestamp}`,
            dealId: position.dealId,
            epic: position.epic,
            size: position.size,
            price: position.entryPrice,
            direction: position.direction,
            timestamp,
            action: 'ENTRY'
          });
        }
      },

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
      partialize: (state) => ({ 
        pendingOrders: state.pendingOrders,
        executions: state.executions,
        positions: state.positions
      }),
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
