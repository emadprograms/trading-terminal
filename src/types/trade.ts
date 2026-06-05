export type OrderType = 'MARKET' | 'LIMIT' | 'STOP';
export type OrderDirection = 'BUY' | 'SELL';
export type OrderStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';

export interface Order {
  epic: string;
  size: number;
  direction: OrderDirection;
  type: OrderType;
  level?: number;
  status: OrderStatus;
  dealReference: string;
  reason?: string;
  dealId?: string;
  timestamp: number;
}

export interface Position {
  dealId: string;
  epic: string;
  size: number;
  direction: OrderDirection;
  entryPrice: number;
  timestamp: number;
}

export interface TradeConfirmation {
  dealReference: string;
  dealId: string;
  dealStatus: 'ACCEPTED' | 'REJECTED';
  status?: 'ACCEPTED' | 'REJECTED';
  reason?: string;
  epic?: string;
  level?: number;
  size?: number;
  direction?: OrderDirection;
}
