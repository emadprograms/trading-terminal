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

  addEpicToWatchlist: async (epic: string, id: string) => {
    try {
      const response = await api.put(`watchlist/${id}`, {
        json: { epic }
      });
      return await response.json();
    } catch (error: any) {
      console.error('[watchlistApi] addEpicToWatchlist error:', error);
      throw new Error(error.message || 'Failed to add epic to watchlist');
    }
  },

  removeEpicFromWatchlist: async (epic: string, id: string) => {
    try {
      const response = await api.delete(`watchlist/${id}/${epic}`);
      return await response.json();
    } catch (error: any) {
      console.error('[watchlistApi] removeEpicFromWatchlist error:', error);
      throw new Error(error.message || 'Failed to remove epic from watchlist');
    }
  }
};
