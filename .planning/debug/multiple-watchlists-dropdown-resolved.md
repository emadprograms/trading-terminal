---
status: resolved
updated: 2026-08-18
notes: "Root cause found. This is a feature gap (hardcoded to first watchlist), not a critical bug. Deferred to future milestone."
---
# Debug Session: multiple-watchlists-dropdown-missing

## Hypothesis
The application currently hardcodes the watchlist synchronization to use the first returned watchlist (`data.watchlists[0]`) from Capital.com, without storing or exposing other watchlists for selection.

## Investigation
Checked `src/store/useWatchlistStore.ts`, which showed:
```typescript
if (data && Array.isArray(data.watchlists) && data.watchlists.length > 0) {
  remoteSymbols = data.watchlists[0].epics || [];
  remoteId = data.watchlists[0].id || null;
}
```
This hardcodes selecting the 0th watchlist. The other watchlists are discarded.
Checked `src/components/Sidebar.tsx` and `src/components/Watchlist.tsx`, neither contain any dropdown UI for selecting watchlists.

```yaml
reasoning_checkpoint:
  hypothesis: "The application only parses and stores the first watchlist returned from the API, and the UI lacks a dropdown to allow selecting between multiple available watchlists."
  confirming_evidence:
    - "`src/store/useWatchlistStore.ts` lines 86-89 sets `remoteSymbols` and `remoteId` strictly from `data.watchlists[0]`."
    - "The `WatchlistState` interface only stores a single `remoteWatchlistId` and a single array of `symbols`, with no array of available watchlists."
    - "No dropdown or selection UI exists in `Sidebar.tsx` or `Watchlist.tsx`."
  falsification_test: "If the state stored all watchlists and the UI rendered a selector, this issue would not exist."
  fix_rationale: "Updating the store to hold all available watchlists and adding a UI selector addresses the root cause of hardcoded single-watchlist selection."
  blind_spots: "Whether `data.watchlists` includes the watchlist names. Usually Capital.com API includes a `name` or `id` which can be used, but we need to ensure the response has names to display in the dropdown."
```

## Conclusion
ROOT CAUSE FOUND. The system hardcodes watchlist selection to index 0 and lacks state/UI for multiple watchlists.
