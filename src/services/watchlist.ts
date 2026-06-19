import { api } from './client';

export const watchlistApi = {
  fetchWatchlist: async () => {
    try {
      // Ky throws on non-2xx by default, so we can just return .json()
      const response = await api.get('watchlist');
      return await response.json();
    } catch (error: any) {
      console.error('[watchlistApi] fetchWatchlist error:', error);
      throw new Error(error.message || 'Failed to fetch watchlist');
    }
  },

  updateWatchlist: async (symbols: string[], id?: string | null) => {
    try {
      const endpoint = id ? `watchlist/${id}` : 'watchlist';
      const response = await api.put(endpoint, {
        json: { epics: symbols }
      });
      return await response.json();
    } catch (error: any) {
      console.error('[watchlistApi] updateWatchlist error:', error);
      throw new Error(error.message || 'Failed to update watchlist');
    }
  }
};
