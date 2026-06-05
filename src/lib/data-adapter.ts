import { CapitalCandle, RawBar } from '../types';

/**
 * Transforms Capital.com API candles into the internal RawBar format.
 * Defaults to using 'bid' prices for chart rendering.
 */
export function transformCapitalCandleToRawBar(candle: CapitalCandle, useAsk = false): RawBar {
  const priceKey = useAsk ? 'ask' : 'bid';
  
  // Convert ISO 8601 snapshotTime (e.g., "2024-01-15T14:30:00Z") 
  // to "YYYY-MM-DD HH:mm:ss" format used by RawBar.
  const date = new Date(candle.snapshotTime);
  const time = date.toISOString().replace('T', ' ').replace(/\..+Z$/, '');

  // The REST API uses 'ask' but the WebSocket API uses 'ofr'
  const getPrice = (priceObj: any, defaultKey: string) => {
    if (!priceObj) return 0;
    if (useAsk) {
      return priceObj.ask ?? priceObj.ofr ?? priceObj.bid ?? 0;
    }
    return priceObj.bid ?? 0;
  };

  return {
    time,
    open: getPrice(candle.openPrice, priceKey),
    high: getPrice(candle.highPrice, priceKey),
    low: getPrice(candle.lowPrice, priceKey),
    close: getPrice(candle.closePrice, priceKey),
    volume: candle.lastTradedVolume ?? 0, // Fallback to 0 if not provided
    session: 'REG',
  };
}

export function transformCapitalCandles(candles: CapitalCandle[], useAsk = false): RawBar[] {
  const transformed = candles.map(c => transformCapitalCandleToRawBar(c, useAsk));
  
  // Sort in ascending order by time string (which is lexicographically sortable)
  transformed.sort((a, b) => a.time.localeCompare(b.time));

  // Deduplicate by time string to prevent lightweight-charts duplicate timestamp assertions
  const unique: RawBar[] = [];
  const seen = new Set<string>();
  for (const bar of transformed) {
    if (!seen.has(bar.time)) {
      seen.add(bar.time);
      unique.push(bar);
    }
  }

  return unique;
}
