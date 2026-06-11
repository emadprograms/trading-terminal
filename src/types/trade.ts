/**
 * Trade types for the Order Execution Layer.
 * Based on Capital.com API specifications.
 */

export type OrderType = 'MARKET' | 'LIMIT' | 'STOP';
export type OrderDirection = 'BUY' | 'SELL';
export type OrderStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';

/**
 * Represents a working or pending order.
 * These are orders that have been placed but not necessarily filled yet.
 */
export interface Order {
  dealReference: string;
  epic: string;
  size: number;
  level?: number; // Required for LIMIT and STOP orders
  type: OrderType;
  direction: OrderDirection;
  status: OrderStatus;
  timestamp: number;
  dealId?: string; // Filled when status becomes ACCEPTED
  workingOrderId?: string; // Filled when status becomes ACCEPTED for LIMIT/STOP orders
  guaranteedStop?: boolean; // Required for UI-02
  stopDistance?: number; // Added for precision risk parameters
  bid?: number; // Bid price for slippage tracking
  ofr?: number; // Offer/Ask price for slippage tracking
  reason?: string; // Rejection reason if status is REJECTED
}

/**
 * Represents an active open trade (a filled order).
 */
export interface Position {
  dealId: string;
  epic: string;
  size: number;
  entryPrice: number;
  direction: OrderDirection;
  timestamp: number;
  guaranteedStop?: boolean; // Tracked for risk visibility
  stopDistance?: number; // Tracked for risk visibility
  stopLevel?: number; // Added for stop loss rendering
  unrealizedPnL?: number;
  currentPrice?: number;
}

/**
 * The payload received from /confirms/{dealReference} or WebSocket stream.
 * This is used to transition an Order to a Position or mark it as REJECTED.
 */
export interface TradeConfirmation {
  dealReference: string;
  status: OrderStatus;
  dealId?: string;
  workingOrderId?: string;
  epic: string;
  size: number;
  entryPrice?: number;
  stopLevel?: number; // Added for stop loss visibility
  timestamp: number;
  reason?: string;
}
