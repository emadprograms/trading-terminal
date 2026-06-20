# 06-06: Multiple Watchlists Support

## Output

Added support for fetching and selecting multiple watchlists from Capital.com.

## Accomplishments

- Updated `src/services/watchlist.ts` to fetch all watchlists and return their ids and names.
- Updated `src/store/useWatchlistStore.ts` to track `availableWatchlists`, default the remote ID to the first list, and allow switching watchlists via `setActiveWatchlist`.
- Updated `src/components/Sidebar.tsx` to display a dropdown menu in the Watchlist header allowing users to select the active remote watchlist to sync with.
- Updated `tests/e2e/watchlist-sync.spec.ts` to mock multiple watchlists and select one during the test flow.
