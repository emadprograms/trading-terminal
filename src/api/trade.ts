import { api } from './client';
import { OrderDirection, OrderType, TradeConfirmation } from '../types/trade';

export interface MarketOrderParams {
  epic: string;
  direction: OrderDirection;
  size: number;
}

export interface LimitOrderParams {
  epic: string;
  direction: OrderDirection;
  size: number;
  level: number;
  type: 'LIMIT' | 'STOP';
}

/**
 * Trade API for Capital.com integration.
 * Handles market orders, working orders (limit/stop), and execution confirmations.
 */
export const tradeApi = {
  /**
   * Places a market order (opens a position).
   * @returns The deal reference for tracking.
   */
  async placeMarketOrder(params: MarketOrderParams): Promise<{ dealReference: string }> {
    try {
      const response = await api.post('positions', {
        json: {
          ...params,
          guaranteedStop: false,
          forceOpen: true, // Default to true for terminal behavior
        }
      }).json<{ dealReference: string }>();
      
      return response;
    } catch (error: any) {
      if (error.response) {
        try {
          const details = await error.response.json();
          throw new Error(`Market order failed: ${details?.errorCode || error.message}`);
        } catch (e) {
          // Fallback if JSON parsing fails
        }
      }
      throw new Error(`Market order failed: ${error.message}`);
    }
  },

  /**
   * Places a working order (LIMIT or STOP).
   * @returns The deal reference for tracking.
   */
  async placeLimitOrder(params: LimitOrderParams): Promise<{ dealReference: string }> {
    try {
      const response = await api.post('workingorders', {
        json: {
          ...params,
          guaranteedStop: false,
          forceOpen: true,
          timeInForce: 'GOOD_TILL_CANCELLED'
        }
      }).json<{ dealReference: string }>();

      return response;
    } catch (error: any) {
      if (error.response) {
        try {
          const details = await error.response.json();
          throw new Error(`Limit order failed: ${details?.errorCode || error.message}`);
        } catch (e) {
          // Fallback
        }
      }
      throw new Error(`Limit order failed: ${error.message}`);
    }
  },

  /**
   * Polls for trade confirmation using a deal reference.
   * Fallback for when WebSocket fails or as a safeguard.
   */
  async getConfirmation(dealReference: string): Promise<TradeConfirmation> {
    try {
      const response = await api.get(`confirms/${dealReference}`).json<TradeConfirmation>();
      return response;
    } catch (error: any) {
      if (error.response) {
        try {
          const details = await error.response.json();
          throw new Error(`Confirmation fetch failed: ${details?.errorCode || error.message}`);
        } catch (e) {
          // Fallback
        }
      }
      throw new Error(`Confirmation fetch failed: ${error.message}`);
    }
  },

  /**
   * Closes an active position.
   * @param dealId The ID of the position to close.
   */
  async closePosition(dealId: string): Promise<{ dealReference: string }> {
    try {
      const response = await api.delete(`positions/${dealId}`).json<{ dealReference: string }>();
      return response;
    } catch (error: any) {
      if (error.response) {
        try {
          const details = await error.response.json();
          throw new Error(`Close position failed: ${details?.errorCode || error.message}`);
        } catch (e) {
          // Fallback
        }
      }
      throw new Error(`Close position failed: ${error.message}`);
    }
  }
};
