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

  getWatchlists: async () => {
    try {
      const response = await api.get('watchlist');
      const data: any = await response.json();
      if (data && Array.isArray(data.watchlists)) {
        return data.watchlists.map((w: any) => ({ id: w.id, name: w.name }));
      }
      return [];
    } catch (error: any) {
      console.error('[watchlistApi] getWatchlists error:', error);
      throw new Error(error.message || 'Failed to fetch watchlists');
    }
  },

  getWatchlist: async (id: string) => {
    try {
      const response = await api.get(`watchlist/${id}`);
      return await response.json();
    } catch (error: any) {
      console.error('[watchlistApi] getWatchlist error:', error);
      throw new Error(error.message || 'Failed to fetch watchlist details');
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
