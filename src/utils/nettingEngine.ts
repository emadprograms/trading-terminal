export interface Execution {
  dateUTC: string;
  epic: string;
  dealId: string;
  type: string;
  status: string;
  details: {
    size: number;
    direction: 'BUY' | 'SELL';
    level: number;
    openPrice?: number;
  };
}

export interface Trade {
  epic: string;
  direction: 'BUY' | 'SELL';
  totalSize: number;
  openTime: string;
  closeTime: string | null;
  status: 'OPEN' | 'CLOSED';
  realizedPnL?: number;
}

export function processNetting(executions: Execution[]): Trade[] {
  const tradesMap = new Map<string, Trade>();
  
  // Sort executions by dateUTC to ensure chronological order
  const sortedExecutions = [...executions].sort((a, b) => {
    return new Date(a.dateUTC).getTime() - new Date(b.dateUTC).getTime();
  });

  for (const exec of sortedExecutions) {
    if (!tradesMap.has(exec.dealId)) {
      // This is an opening execution
      tradesMap.set(exec.dealId, {
        epic: exec.epic,
        direction: exec.details.direction,
        totalSize: exec.details.size,
        openTime: exec.dateUTC,
        closeTime: null,
        status: 'OPEN',
        realizedPnL: 0
      });
    } else {
      // This is a closing execution (partial or full)
      const trade = tradesMap.get(exec.dealId)!;
      
      // Calculate PnL for this partial/full close
      const closeSize = exec.details.size;
      const openPrice = exec.details.openPrice ?? 0;
      const closePrice = exec.details.level;
      
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
        trade.closeTime = exec.dateUTC;
      }
    }
  }

  return Array.from(tradesMap.values());
}
