---
status: resolved
updated: 2026-08-18
---
# Debug Session: watchlist-init-400

## Objective
Investigate issue: 400 Bad Request on `PUT /api/watchlist/[id]` during watchlist initialization/sync.

## Symptoms
- **Expected:** On app load, the Watchlist is populated with the user's remote Capital.com watchlist state.
- **Actual:** User reported: Request failed with status code 400: PUT https://trading-terminal-psi-ashen.vercel.app/api/watchlist/2220225 I'm getting this error.
- **Timeline:** Discovered during UAT.

## Investigation Steps
1. Located `updateWatchlist` in `src/services/watchlist.ts`. It was sending a payload of `{ epics: symbols }` to `PUT /api/watchlist/[id]`.
2. Checked the backend proxy `api/watchlist.ts`, which forwards the request path and body directly to Capital.com API `/api/v1/watchlists/[id]`.
3. Researched the Capital.com API documentation. The `PUT /api/v1/watchlists/{watchlistId}` endpoint is designed to add a *single* market to a watchlist, and it expects a payload of `{ "epic": "SYMBOL" }` (or path parameter `/{epic}`).
4. Sending `{ epics: symbols }` (an array of symbols) to an endpoint that expects a single string `epic` causes the Capital.com API to return a 400 Bad Request.

## Resolution
**Root Cause:**
The frontend `syncWithRemote` logic was attempting to bulk-update the Capital.com watchlist by sending an array of epics (`{ epics: symbols }`) to `PUT /api/watchlist/[id]`. However, the Capital.com API only supports adding or removing individual epics one at a time.

**Fix Details (Applied for verification):**
1. Updated `src/services/watchlist.ts` to replace `updateWatchlist(symbols)` with `addEpicToWatchlist(epic, id)` and `removeEpicFromWatchlist(epic, id)`.
2. Updated `src/store/useWatchlistStore.ts` `syncWithRemote` method to iterate over `pendingDeletions` and call `removeEpicFromWatchlist`, and iterate over `pendingAdditions` and call `addEpicToWatchlist`.
3. Updated `tests/e2e/watchlist-sync.spec.ts` mock to intercept `DELETE` requests and adjusted the cleanup logic to match the single-epic PUT requests.

DEBUG COMPLETE
ROOT CAUSE FOUND
