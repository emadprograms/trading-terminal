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
    
    if (options.max) query.append('max', options.max.toString());
    if (options.from) query.append('from', options.from);
    if (options.to) query.append('to', options.to);

    const response = await api.get(`/api/v1/prices/${encodeURIComponent(epic)}`, {
      searchParams: query,
    });

    return await response.json<CapitalCandle[]>();
  },
};
