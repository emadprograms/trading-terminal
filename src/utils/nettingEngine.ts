import { Execution } from '../types/trade';

export interface Trade {
  epic: string;
  direction: 'BUY' | 'SELL';
  totalSize: number;
  maxSize: number;
  openTime: string;
  closeTime: string | null;
  status: 'OPEN' | 'CLOSED';
  realizedPnL?: number;
}

export function processNetting(executions: Execution[]): Trade[] {
  const tradesMap = new Map<string, Trade>();
  
  // Sort executions by timestamp to ensure chronological order
  const sortedExecutions = [...executions].sort((a, b) => a.timestamp - b.timestamp);

  for (const exec of sortedExecutions) {
    if (!tradesMap.has(exec.dealId)) {
      // This is an opening execution
      tradesMap.set(exec.dealId, {
        epic: exec.epic,
        direction: exec.direction,
        totalSize: exec.size,
        maxSize: exec.size,
        openTime: new Date(exec.timestamp).toISOString(),
        closeTime: null,
        status: 'OPEN',
        realizedPnL: 0
      });
    } else {
      // This is a closing execution (partial or full)
      const trade = tradesMap.get(exec.dealId)!;
      
      // Calculate PnL for this partial/full close
      const closeSize = exec.size;
      const openPrice = exec.openPrice ?? 0;
      const closePrice = exec.price;
      
      let pnl = 0;
      if (trade.direction === 'BUY') {
        pnl = (closePrice - openPrice) * closeSize;
      } else {
        pnl = (openPrice - closePrice) * closeSize;
      }
      
      trade.realizedPnL = (trade.realizedPnL || 0) + pnl;
      trade.totalSize -= closeSize;
      
      if (trade.totalSize <= 0) {
        trade.totalSize = 0;
        trade.status = 'CLOSED';
        trade.closeTime = new Date(exec.timestamp).toISOString();
      }
    }
  }

  return Array.from(tradesMap.values());
}
