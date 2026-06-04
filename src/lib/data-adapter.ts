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

  return {
    time,
    open: candle.openPrice[priceKey],
    high: candle.highPrice[priceKey],
    low: candle.lowPrice[priceKey],
    close: candle.closePrice[priceKey],
    volume: 0, // Volume not provided by the historical candles endpoint
    session: 'REG',
  };
}

/**
 * Batch transforms an array of Capital candles.
 */
export function transformCapitalCandles(candles: CapitalCandle[], useAsk = false): RawBar[] {
  return candles.map(c => transformCapitalCandleToRawBar(c, useAsk));
}
