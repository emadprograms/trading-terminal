import { api } from './client';
import { OrderDirection, OrderType } from '../types/trade';
import { sanitizeErrorMessage } from '../lib/api-utils';

export interface MarketOrderParams {
  epic: string;
  size: number;
  direction: OrderDirection;
  type?: OrderType;
  guaranteedStop?: boolean;
  stopLevel?: number;
  stopDistance?: number;
  profitLevel?: number;
}

export interface LimitOrderParams extends MarketOrderParams {
  level: number;
  type: 'LIMIT' | 'STOP';
}

async function fetchTradeApi(method: 'get'|'post'|'put'|'delete', path: string, jsonParams?: any): Promise<any> {
  let response;
  try {
    const options: any = { throwHttpErrors: false };
    if (jsonParams !== undefined && method !== 'get') {
      options.json = jsonParams;
    }
    response = await api[method](path, options);
  } catch (error: any) {
    // Network errors or blocked requests
    throw new Error(sanitizeErrorMessage(error));
  }
  
  const textBody = await response.text();
  let data: any = null;
  if (textBody) {
    try { data = JSON.parse(textBody); } catch(e) {}
  }
  
  if (!response.ok) {
    let msg = '';
    if (data) {
      const code = data.errorCode || data.code || '';
      const desc = data.developerMessage || data.message || data.reason || data.error || '';
      if (code || desc) {
        // Only add the colon if we have both, otherwise just use the one we have
        msg = (code && desc) ? `${code}: ${desc}` : `${code}${desc}`;
      }
    }
    if (!msg) {
      msg = textBody ? textBody.substring(0, 200) : `HTTP ${response.status}`;
    }
    console.error(`[TradeAPI] ${method.toUpperCase()} ${path} FAILED:`, msg);
    throw new Error(msg);
  }
  
  return data || {};
}

export const tradeApi = {
  /**
   * Place a market order.
   * POST /api/v1/positions
   */
  async placeMarketOrder(params: MarketOrderParams): Promise<string> {
    console.log('[TradeAPI] placeMarketOrder:', JSON.stringify(params));
    const data = await fetchTradeApi('post', 'order/v1/positions', params);
    if (!data.dealReference) {
      throw new Error('API response missing dealReference');
    }
    console.log('[TradeAPI] placeMarketOrder success:', data.dealReference);
    return data.dealReference;
  },

  /**
   * Place a limit or stop order.
   * POST /api/v1/workingorders
   */
  async placeLimitOrder(params: LimitOrderParams): Promise<string> {
    console.log('[TradeAPI] placeLimitOrder:', JSON.stringify(params));
    const data = await fetchTradeApi('post', 'order/v1/workingorders', params);
    if (!data.dealReference) {
      throw new Error('API response missing dealReference');
    }
    console.log('[TradeAPI] placeLimitOrder success:', data.dealReference);
    return data.dealReference;
  },

  /**
   * Get confirmation for a specific deal.
   * GET /api/v1/confirms/{dealReference}
   */
  async getConfirmation(dealReference: string): Promise<any> {
    return await fetchTradeApi('get', `order/v1/confirms/${dealReference}`);
  },

  /**
   * Close an active position using the proper DELETE endpoint.
   * DELETE /api/v1/positions/{dealId}
   * 
   * Falls back to placing an opposite market order if DELETE fails.
   */
  async closePosition(dealId: string, position?: any): Promise<{ dealReference: string, usedFallback: boolean }> {
    console.log(`[TradeAPI] closePosition DELETE order/v1/positions/${dealId}`);
    
    // Try the proper DELETE endpoint first
    try {
      const data = await fetchTradeApi('delete', `order/v1/positions/${dealId}`);
      console.log('[TradeAPI] closePosition DELETE success:', data);
      return { dealReference: data.dealReference || dealId, usedFallback: false };
    } catch (deleteError: any) {
      console.warn(`[TradeAPI] closePosition DELETE failed, trying counter-order fallback...`);
      
      // Fallback: place an opposite market order to net the position
      if (!position) {
        throw new Error('Position details required to close via counter-order fallback.');
      }
      
      const oppositeDirection = position.direction === 'BUY' ? 'SELL' : 'BUY';
      const data = await fetchTradeApi('post', 'order/v1/positions', { 
        epic: position.epic,
        size: position.size,
        direction: oppositeDirection
      });
      console.log('[TradeAPI] closePosition counter-order success:', data.dealReference);
      return { dealReference: data.dealReference, usedFallback: true };
    }
  },

  /**
   * @deprecated Use closePosition instead. Kept for backward compatibility.
   */
  async flattenPosition(dealId: string, position?: any): Promise<{ dealReference: string, usedFallback: boolean }> {
    return this.closePosition(dealId, position);
  },

  /**
   * Cancel a working order.
   * DELETE /api/v1/workingorders/{dealId}
   */
  async cancelWorkingOrder(id: string): Promise<string> {
    console.log(`[TradeAPI] cancelWorkingOrder DELETE order/v1/workingorders/${id}`);
    const data = await fetchTradeApi('delete', `order/v1/workingorders/${id}`);
    console.log('[TradeAPI] cancelWorkingOrder success:', data);
    return data.dealReference || id;
  },

  /**
   * Update an existing position (Stop Loss / Take Profit).
   * PUT /api/v1/positions/{dealId}
   * 
   * IMPORTANT: Do NOT include guaranteedStop in params —
   * Capital.com can reject it on instruments that don't support guaranteed stops.
   */
  async updatePosition(dealId: string, params: { stopLevel?: number | null, profitLevel?: number | null }): Promise<string> {
    console.log(`[TradeAPI] updatePosition PUT order/v1/positions/${dealId}`, JSON.stringify(params));
    const data = await fetchTradeApi('put', `order/v1/positions/${dealId}`, params);
    console.log('[TradeAPI] updatePosition success:', data);
    return data.dealReference || dealId;
  },

  /**
   * Fetch all open positions.
   * GET /api/v1/positions
   */
  async fetchPositions(): Promise<any[]> {
    try {
      const data = await fetchTradeApi('get', `order/v1/positions?_t=${Date.now()}`);
      return data.positions || [];
    } catch (error: any) {
      console.error('[TradeAPI] Failed to fetch positions:', error);
      return [];
    }
  },

  /**
   * Fetch all working orders.
   * GET /api/v1/workingorders
   */
  async fetchWorkingOrders(): Promise<any[]> {
    try {
      const data = await fetchTradeApi('get', `order/v1/workingorders?_t=${Date.now()}`);
      return data.workingOrders || [];
    } catch (error: any) {
      console.error('[TradeAPI] Failed to fetch working orders:', error);
      return [];
    }
  },

  /**
   * Fetch detailed activity history for executions.
   * GET /api/v1/history/activity
   */
  async fetchActivityHistory(lastPeriodSeconds = 86400): Promise<any[]> {
    try {
      const data = await fetchTradeApi('get', `order/v1/history/activity?detailed=true&lastPeriod=${lastPeriodSeconds}&_t=${Date.now()}`);
      return data.activities || [];
    } catch (error: any) {
      console.error('[TradeAPI] Failed to fetch activity history:', error);
      return [];
    }
  },

  /**
   * Fetch detailed activity history for a specific date range.
   * GET /api/v1/history/activity
   */
  async fetchActivityHistoryRange(from: string, to: string): Promise<any[]> {
    try {
      const data = await fetchTradeApi('get', `order/v1/history/activity?detailed=true&from=${from}&to=${to}&_t=${Date.now()}`);
      return data.activities || [];
    } catch (error: any) {
      console.error('[TradeAPI] Failed to fetch activity history range:', error);
      return [];
    }
  },
};
