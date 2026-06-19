import { api } from './client';
import { Timeframe, CapitalCandle, MarketSearchResult } from '../types';
import { mapTimeframeToResolution } from '../lib/api-utils';

export interface FetchOptions {
  max?: number;
  from?: string; // ISO string
  to?: string;   // ISO string
}

/**
 * Market Data Client for Capital.com
 */
export const marketApi = {
  /**
   * Fetches historical candles for a given epic.
   * 
   * @param epic - The asset identifier (e.g., 'SPY')
   * @param resolution - The timeframe for the candles
   * @param options - Optional range and limit constraints
   * @returns A typed array of Capital candles
   */
  async fetchCandles(epic: string, resolution: Timeframe, options: FetchOptions = {}): Promise<CapitalCandle[]> {
    const res = mapTimeframeToResolution(resolution);
    
    const query = new URLSearchParams();
    query.append('resolution', res);
    
    const sanitizeDate = (d: string) => {
      // Capital.com expects exactly "YYYY-MM-DDTHH:MM:SS" without timezones
      const replaced = d.replace(' ', 'T');
      const match = replaced.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/);
      if (match) return match[1];
      
      let cleaned = replaced.split('.')[0];
      if (cleaned.endsWith('Z')) {
        cleaned = cleaned.slice(0, -1);
      }
      if (cleaned.length === 10) {
        cleaned += 'T12:00:00';
      }
      return cleaned;
    };

    if (options.max) query.append('max', Math.min(options.max, 1000).toString());
    if (options.from) query.append('from', sanitizeDate(options.from));
    if (options.to) query.append('to', sanitizeDate(options.to));

    const response = await api.get(`market/v1/prices/${encodeURIComponent(epic)}`, {
      searchParams: query,
      throwHttpErrors: false, // Allow custom handling
    });

    const responseData = await response.json() as any;
    
    // DEBUG LOGGING
    console.log(`[MarketAPI] URL: ${response.url}`);
    console.log(`[MarketAPI] Response Status: ${response.status}`);
    console.log(`[MarketAPI] Candles received: ${responseData.prices?.length ?? 0}`);

    if (!response.ok) {
      throw new Error(`API Error ${response.status}: ${JSON.stringify(responseData)}`);
    }

    // Capital.com wraps historical candles in a "prices" array
    const data = responseData.prices;

    if (!Array.isArray(data)) {
      throw new Error(`Expected array of candles but received: ${typeof data}`);
    }

    return data as CapitalCandle[];
  },

  /**
   * Searches for markets by name or epic
   * 
   * @param searchTerm - The text to search for (e.g. "gas")
   * @returns Array of matching markets
   */
  async searchMarkets(searchTerm: string): Promise<MarketSearchResult[]> {
    if (!searchTerm || searchTerm.trim().length === 0) {
      return [];
    }
    
    const query = new URLSearchParams();
    query.append('searchTerm', searchTerm.trim());

    const response = await api.get('market/v1/markets', {
      searchParams: query,
      throwHttpErrors: false,
    });

    const responseData = await response.json() as any;

    if (!response.ok) {
      console.error(`[MarketAPI] Search Error: ${JSON.stringify(responseData)}`);
      return [];
    }

    const data = responseData.markets;

    if (!Array.isArray(data)) {
      return [];
    }

    return data as MarketSearchResult[];
  },
};
