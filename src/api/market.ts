import { api } from './client';
import { Timeframe, CapitalCandle } from '../types';
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
   * @param epic - The asset identifier (e.g., 'S&P 500')
   * @param resolution - The timeframe for the candles
   * @param options - Optional range and limit constraints
   * @returns A typed array of Capital candles
   */
  async fetchCandles(epic: string, resolution: Timeframe, options: FetchOptions = {}): Promise<CapitalCandle[]> {
    const res = mapTimeframeToResolution(resolution);
    
    const query = new URLSearchParams();
    query.append('resolution', res);
    
    const sanitizeDate = (d: string) => {
      // Capital.com expects "YYYY-MM-DDTHH:MM:SS"
      // Remove everything after the seconds part (milliseconds and Z)
      let cleaned = d.replace(' ', 'T').split('.')[0];
      if (cleaned.endsWith('Z')) {
        cleaned = cleaned.slice(0, -1);
      }
      
      // If it's just YYYY-MM-DD, append T12:00:00
      if (cleaned.length === 10) {
        cleaned += 'T12:00:00';
      }
      return cleaned;
    };

    if (options.max) query.append('max', Math.min(options.max, 1000).toString());
    if (options.from) query.append('from', sanitizeDate(options.from));
    if (options.to) query.append('to', sanitizeDate(options.to));

    const response = await api.get(`v1/prices/${encodeURIComponent(epic)}`, {
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
};
