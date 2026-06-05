import { api } from './client';
import { OrderDirection, OrderType } from '../types/trade';

interface MarketOrderParams {
  epic: string;
  size: number;
  direction: OrderDirection;
}

interface LimitOrderParams extends MarketOrderParams {
  level: number;
  type: OrderType;
}

export const tradeApi = {
  /**
   * Place a market order.
   * Returns the dealReference from the API response.
   */
  async placeMarketOrder(params: MarketOrderParams): Promise<string> {
    try {
      const response = await api.post('/positions', { json: params }).json();
      if (!response.dealReference) {
        throw new Error('API response missing dealReference');
      }
      return response.dealReference;
    } catch (error: any) {
      this.handleApiError(error);
    }
  },

  /**
   * Place a limit or stop order.
   */
  async placeLimitOrder(params: LimitOrderParams): Promise<string> {
    try {
      const response = await api.post('/workingorders', { json: params }).json();
      if (!response.dealReference) {
        throw new Error('API response missing dealReference');
      }
      return response.dealReference;
    } catch (error: any) {
      this.handleApiError(error);
    }
  },

  /**
   * Get confirmation for a specific deal.
   * Used as a fallback when WebSocket messages are missed.
   */
  async getConfirmation(dealReference: string): Promise<any> {
    try {
      return await api.get(`/confirms/${dealReference}`).json();
    } catch (error: any) {
      this.handleApiError(error);
    }
  },

  /**
   * Centralized error handler for trade API calls.
   */
  handleApiError(error: any): never {
    const message = error.response?.body?.message || error.message || 'Unknown error';
    throw new Error(`Trade API Error: ${message}`);
  },
};
