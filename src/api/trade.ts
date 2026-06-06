import { api } from './client';
import { OrderDirection, OrderType } from '../types/trade';

export interface MarketOrderParams {
  epic: string;
  size: number;
  direction: OrderDirection;
  guaranteedStop?: boolean;
  stopLevel?: number;
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
      // POST /positions for market orders
      const response: any = await api.post('positions', { json: params }).json();
      if (!response.dealReference) {
        throw new Error('API response missing dealReference');
      }
      return response.dealReference;
    } catch (error: any) {
      return this.handleApiError(error);
    }
  },

  /**
   * Place a limit or stop order.
   * Returns the dealReference from the API response.
   */
  async placeLimitOrder(params: LimitOrderParams): Promise<string> {
    try {
      // POST /workingorders for limit/stop orders
      const response: any = await api.post('workingorders', { json: params }).json();
      if (!response.dealReference) {
        throw new Error('API response missing dealReference');
      }
      return response.dealReference;
    } catch (error: any) {
      return this.handleApiError(error);
    }
  },

  /**
   * Get confirmation for a specific deal.
   * Used as a fallback when WebSocket messages are missed.
   */
  async getConfirmation(dealReference: string): Promise<any> {
    try {
      return await api.get(`confirms/${dealReference}`).json();
    } catch (error: any) {
      return this.handleApiError(error);
    }
  },

  /**
   * Close an active position.
   */
  async flattenPosition(dealId: string): Promise<string> {
    try {
      const response: any = await api.delete(`positions/${dealId}`).json();
      return response.dealReference;
    } catch (error: any) {
      return this.handleApiError(error);
    }
  },

  /**
   * Cancel a working order.
   */
  async cancelWorkingOrder(id: string): Promise<string> {
    try {
      const response: any = await api.delete(`workingorders/${id}`).json();
      return response.dealReference;
    } catch (error: any) {
      return this.handleApiError(error);
    }
  },

  /**
   * Centralized error handler for trade API calls.
   */
  handleApiError(error: any): never {
    // If it's already a formatted error, re-throw it
    if (error.message?.startsWith('Trade API Error:')) {
      throw error;
    }

    let message = 'Unknown error';
    
    // Ky/HTTP error handling
    if (error.response) {
      try {
        // Try to get message from response body
        const body = error.response.body;
        message = body?.message || `HTTP ${error.response.status}`;
      } catch {
        message = `HTTP ${error.response.status}`;
      }
    } else {
      message = error.message || 'Network error';
    }

    throw new Error(`Trade API Error: ${message}`);
  },
};
