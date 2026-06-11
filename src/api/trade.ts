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

export const tradeApi = {
  /**
   * Place a market order.
   * Returns the dealReference from the API response.
   */
  async placeMarketOrder(params: MarketOrderParams): Promise<string> {
    try {
      // POST order/v1/positions for market orders
      const response: any = await api.post('order/v1/positions', { json: params }).json();
      if (!response.dealReference) {
        throw new Error('API response missing dealReference');
      }
      return response.dealReference;
    } catch (error: any) {
      const sanitized = sanitizeErrorMessage(error);
      // Specific handling for Guaranteed Stop errors
      if (sanitized.includes('guaranteedStop') || sanitized.includes('403')) {
        throw new Error(`Trade API Error: Guaranteed Stop not available for this instrument`);
      }
      throw new Error(`Trade API Error: ${sanitized}`);
    }
  },

  /**
   * Place a limit or stop order.
   * Returns the dealReference from the API response.
   */
  async placeLimitOrder(params: LimitOrderParams): Promise<string> {
    try {
      // POST order/v1/workingorders for limit/stop orders
      const response: any = await api.post('order/v1/workingorders', { json: params }).json();
      if (!response.dealReference) {
        throw new Error('API response missing dealReference');
      }
      return response.dealReference;
    } catch (error: any) {
      throw new Error(`Trade API Error: ${sanitizeErrorMessage(error)}`);
    }
  },

  /**
   * Get confirmation for a specific deal.
   * Used as a fallback when WebSocket messages are missed.
   */
  async getConfirmation(dealReference: string): Promise<any> {
    try {
      return await api.get(`order/v1/confirms/${dealReference}`).json();
    } catch (error: any) {
      throw new Error(`Trade API Error: ${sanitizeErrorMessage(error)}`);
    }
  },

  /**
   * Close an active position.
   */
  async flattenPosition(dealId: string): Promise<string> {
    try {
      const response: any = await api.delete(`order/v1/positions/${dealId}`).json();
      return response.dealReference;
    } catch (error: any) {
      throw new Error(`Trade API Error: ${sanitizeErrorMessage(error)}`);
    }
  },

  /**
   * Cancel a working order.
   */
  async cancelWorkingOrder(id: string): Promise<string> {
    try {
      const response: any = await api.delete(`order/v1/workingorders/${id}`).json();
      return response.dealReference;
    } catch (error: any) {
      throw new Error(`Trade API Error: ${sanitizeErrorMessage(error)}`);
    }
  },

  /**
   * Fetch all open positions.
   */
  async fetchPositions(): Promise<any[]> {
    try {
      const response: any = await api.get('order/v1/positions').json();
      return response.positions || [];
    } catch (error: any) {
      console.error('[TradeAPI] Failed to fetch positions:', error);
      return [];
    }
  },

  /**
   * Fetch all working orders.
   */
  async fetchWorkingOrders(): Promise<any[]> {
    try {
      const response: any = await api.get('order/v1/workingorders').json();
      return response.workingOrders || [];
    } catch (error: any) {
      console.error('[TradeAPI] Failed to fetch working orders:', error);
      return [];
    }
  },
};
