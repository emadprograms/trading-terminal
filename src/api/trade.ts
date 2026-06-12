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

/**
 * Helper to extract a useful error message from an API error response.
 */
async function extractApiError(error: any): Promise<string> {
  const status = error.response?.status;
  
  if (error.response) {
    let textBody = '';
    try {
      // Clone the response so we don't hit "body stream already read" errors
      textBody = await error.response.clone().text();
    } catch (e) {
      console.error('[TradeAPI] Failed to read error response text:', e);
    }
    
    console.error(`[TradeAPI] HTTP ${status || '?'} response body:`, textBody || '(empty)');
    
    if (textBody) {
      let parsed = null;
      try { parsed = JSON.parse(textBody); } catch (e) {}
      if (parsed) {
        const code = parsed.errorCode || parsed.code || '';
        const msg = parsed.developerMessage || parsed.message || parsed.reason || parsed.error || '';
        if (code || msg) {
          return `${code} ${msg}`.trim();
        }
      }
      return textBody.substring(0, 200);
    }
  }
  
  return sanitizeErrorMessage(error);
}

export const tradeApi = {
  /**
   * Place a market order.
   * POST /api/v1/positions
   */
  async placeMarketOrder(params: MarketOrderParams): Promise<string> {
    console.log('[TradeAPI] placeMarketOrder:', JSON.stringify(params));
    try {
      const response: any = await api.post('order/v1/positions', { json: params }).json();
      if (!response.dealReference) {
        throw new Error('API response missing dealReference');
      }
      console.log('[TradeAPI] placeMarketOrder success:', response.dealReference);
      return response.dealReference;
    } catch (error: any) {
      const msg = await extractApiError(error);
      console.error('[TradeAPI] placeMarketOrder FAILED:', msg);
      throw new Error(`Trade API Error: ${msg}`);
    }
  },

  /**
   * Place a limit or stop order.
   * POST /api/v1/workingorders
   */
  async placeLimitOrder(params: LimitOrderParams): Promise<string> {
    console.log('[TradeAPI] placeLimitOrder:', JSON.stringify(params));
    try {
      const response: any = await api.post('order/v1/workingorders', { json: params }).json();
      if (!response.dealReference) {
        throw new Error('API response missing dealReference');
      }
      console.log('[TradeAPI] placeLimitOrder success:', response.dealReference);
      return response.dealReference;
    } catch (error: any) {
      const msg = await extractApiError(error);
      console.error('[TradeAPI] placeLimitOrder FAILED:', msg);
      throw new Error(`Trade API Error: ${msg}`);
    }
  },

  /**
   * Get confirmation for a specific deal.
   * GET /api/v1/confirms/{dealReference}
   */
  async getConfirmation(dealReference: string): Promise<any> {
    try {
      return await api.get(`order/v1/confirms/${dealReference}`).json();
    } catch (error: any) {
      throw new Error(`Trade API Error: ${sanitizeErrorMessage(error)}`);
    }
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
      const response = await api.delete(`order/v1/positions/${dealId}`);
      let data: any = {};
      const text = await response.text();
      if (text) {
        try { data = JSON.parse(text); } catch (e) {}
      }
      console.log('[TradeAPI] closePosition DELETE success:', data);
      return { dealReference: data.dealReference || dealId, usedFallback: false };
    } catch (deleteError: any) {
      const deleteStatus = deleteError.response?.status;
      console.warn(`[TradeAPI] closePosition DELETE failed (HTTP ${deleteStatus}), trying counter-order fallback...`);
      
      // Fallback: place an opposite market order to net the position
      if (!position) {
        throw new Error('Position details required to close via counter-order fallback.');
      }
      
      try {
        const oppositeDirection = position.direction === 'BUY' ? 'SELL' : 'BUY';
        const response: any = await api.post('order/v1/positions', { 
          json: {
            epic: position.epic,
            size: position.size,
            direction: oppositeDirection
          } 
        }).json();
        console.log('[TradeAPI] closePosition counter-order success:', response.dealReference);
        return { dealReference: response.dealReference, usedFallback: true };
      } catch (fallbackError: any) {
        const msg = await extractApiError(fallbackError);
        console.error('[TradeAPI] closePosition both methods FAILED:', msg);
        throw new Error(`Failed to close position: ${msg}`);
      }
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
    try {
      const response = await api.delete(`order/v1/workingorders/${id}`);
      let data: any = {};
      const text = await response.text();
      if (text) {
        try { data = JSON.parse(text); } catch (e) {}
      }
      console.log('[TradeAPI] cancelWorkingOrder success:', data);
      return data.dealReference || id;
    } catch (error: any) {
      const msg = await extractApiError(error);
      console.error('[TradeAPI] cancelWorkingOrder FAILED:', msg);
      throw new Error(`Cancel order failed: ${msg}`);
    }
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
    try {
      const response = await api.put(`order/v1/positions/${dealId}`, { json: params });
      let data: any = {};
      const text = await response.text();
      if (text) {
        try { data = JSON.parse(text); } catch (e) {}
      }
      console.log('[TradeAPI] updatePosition success:', data);
      return data.dealReference || dealId;
    } catch (error: any) {
      const msg = await extractApiError(error);
      console.error('[TradeAPI] updatePosition FAILED:', msg);
      throw new Error(`Update position failed: ${msg}`);
    }
  },

  /**
   * Fetch all open positions.
   * GET /api/v1/positions
   */
  async fetchPositions(): Promise<any[]> {
    try {
      const response: any = await api.get(`order/v1/positions?_t=${Date.now()}`).json();
      return response.positions || [];
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
      const response: any = await api.get(`order/v1/workingorders?_t=${Date.now()}`).json();
      return response.workingOrders || [];
    } catch (error: any) {
      console.error('[TradeAPI] Failed to fetch working orders:', error);
      return [];
    }
  },
};
