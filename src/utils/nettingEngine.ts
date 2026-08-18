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
  // added internal tracking for entry price if needed
  entryPrice?: number;
}

export function processNetting(executions: Execution[]): Trade[] {
  const tradesMap = new Map<string, Trade>();
  
  // Sort executions by timestamp to ensure chronological order
  const sortedExecutions = [...executions].sort((a, b) => a.timestamp - b.timestamp);

  for (const exec of sortedExecutions) {
    if (exec.action === 'ENTRY') {
      if (!tradesMap.has(exec.dealId)) {
        tradesMap.set(exec.dealId, {
          epic: exec.epic,
          direction: exec.direction,
          totalSize: exec.size,
          maxSize: exec.size,
          openTime: new Date(exec.timestamp).toISOString(),
          closeTime: null,
          status: 'OPEN',
          realizedPnL: 0,
          entryPrice: exec.price, // Store the explicit execution price as entryPrice
        });
      } else {
        // Averaging into a position under the same dealId (if possible)
        const trade = tradesMap.get(exec.dealId)!;
        if (trade.direction === exec.direction) {
          // Weighted average entry price
          const oldTotalCost = (trade.entryPrice || 0) * trade.totalSize;
          const newCost = exec.price * exec.size;
          
          trade.totalSize += exec.size;
          trade.maxSize = Math.max(trade.maxSize, trade.totalSize);
          trade.entryPrice = (oldTotalCost + newCost) / trade.totalSize;
        }
      }
    } else if (exec.action === 'EXIT') {
      if (!tradesMap.has(exec.dealId)) {
        // Orphaned EXIT execution (e.g. ENTRY was before lookback window)
        // We must ignore it or we'll create a phantom open trade.
        continue;
      }
      
      const trade = tradesMap.get(exec.dealId)!;
      
      // Calculate PnL for this partial/full close
      const closeSize = exec.size;
      const openPrice = trade.entryPrice ?? 0;
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

  // Before returning, strip out the internal entryPrice field if you want to keep the signature exactly the same, 
  // or just leave it since the interface is now updated.
  return Array.from(tradesMap.values()).map(t => {
    const { entryPrice, ...rest } = t;
    return rest as Trade; // returning strictly the Trade structure without entryPrice to avoid polluting state, or keep it. Let's just return it since we added it to interface.
  });
}
