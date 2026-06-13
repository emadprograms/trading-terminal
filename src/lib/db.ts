import type { RawBar, Timeframe } from "../types";
import { marketApi } from "../services/market";
import { transformCapitalCandles } from "./data-adapter";

// --- Market Data API Integration ---

export const fetchMarketData = async (ticker: string, dateIso: string, maxCandles = 1000, timeframe: Timeframe = '1D'): Promise<RawBar[]> => {
  try {
    const candles = await marketApi.fetchCandles(ticker, timeframe, { to: dateIso, max: maxCandles });
    return transformCapitalCandles(candles, ticker);
  } catch (error) {
    console.error(`[fetchMarketData] Error fetching data for ${ticker}:`, error);
    return [];
  }
};

export const fetchHistoricalChunk = async (ticker: string, endTimestamp: string, maxCandles = 1000, timeframe: Timeframe = '1D'): Promise<RawBar[]> => {
  try {
    const candles = await marketApi.fetchCandles(ticker, timeframe, { to: endTimestamp, max: maxCandles });
    return transformCapitalCandles(candles, ticker);
  } catch (error) {
    console.warn(`[fetchHistoricalChunk] First fetch chunk failed for ${ticker} (${timeframe}). Retrying in 1s...`, error);
    try {
      await new Promise(r => setTimeout(r, 1000));
      const candles = await marketApi.fetchCandles(ticker, timeframe, { to: endTimestamp, max: maxCandles });
      return transformCapitalCandles(candles, ticker);
    } catch (retryError) {
      console.error(`[fetchHistoricalChunk] Retry fetch chunk failed for ${ticker} (${timeframe}):`, retryError);
      return [];
    }
  }
};
