---
phase: 06-sync-watchlist-with-capital-com
verified: 2026-06-19T17:35:00Z
status: human_needed
score: 6/6 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Watchlist Initialization on Startup"
    expected: "On app load, the Watchlist is populated with the user's remote Capital.com watchlist state."
    why_human: "Requires live authentication and API keys to verify external service integration against the real Capital.com API."
  - test: "Manual Watchlist Sync"
    expected: "Clicking the 'Sync' button in the Watchlist sidebar shows a spinning loading icon. When complete, a success toast notification appears, and the local watchlist is synced with the remote API."
    why_human: "Requires live authentication and API keys to verify external service integration against the real Capital.com API."
---

# Phase 06: Sync watchlist with capital.com Verification Report

**Phase Goal:** Implement Capital.com watchlist sync
**Verified:** 2026-06-19T17:35:00Z
**Status:** human_needed
**Re-verification:** No

## Goal Achievement

### Observable Truths

| #   | Truth   | Status     | Evidence       |
| --- | ------- | ---------- | -------------- |
| 1   | Proxy endpoint `/api/watchlist` exists to communicate with Capital.com watchlist API. | ✓ VERIFIED | `api/watchlist.ts` handles the route and uses `proxyRequest`. |
| 2   | The UI features a "Sync" button in the Sidebar to manually trigger watchlist synchronization. | ✓ VERIFIED | `Sidebar.tsx` includes the Sync button mapped to `useWatchlistStore.syncWithRemote`. |
| 3   | On startup, the local watchlist is overwritten with the remote Capital.com watchlist state. | ✓ VERIFIED | `App.tsx` calls `initializeWatchlist` on startup. |
| 4   | Updates (add/remove) track pending changes and are pushed to Capital.com during sync. | ✓ VERIFIED | `useWatchlistStore.ts` tracks `pendingAdditions` and `pendingDeletions` correctly and uses them in `syncWithRemote`. |
| 5   | The UI shows loading state during sync and success/error toasts upon completion. | ✓ VERIFIED | `Sidebar.tsx` correctly handles `isSyncing` and uses `toast` notifications. |
| 6   | The Vercel proxy properly rewrites specific ID requests (e.g., `/api/watchlist/{id}`). | ✓ VERIFIED | `vercel.json` includes `{"source": "/api/watchlist/:path*", "destination": "/api/watchlist"}`. |

**Score:** 6/6 truths verified

### Required Artifacts

| Artifact | Expected    | Status | Details |
| -------- | ----------- | ------ | ------- |
| `api/watchlist.ts` | Proxy handler | ✓ VERIFIED | Exists, substantive, wired to `proxyRequest`. |
| `src/services/watchlist.ts` | Frontend service | ✓ VERIFIED | Exists, provides `fetchWatchlist` and `updateWatchlist`. |
| `src/store/useWatchlistStore.ts` | Zustand store | ✓ VERIFIED | Tracks state, `remoteWatchlistId`, `initializeWatchlist`, `syncWithRemote`. |
| `src/components/Sidebar.tsx` | Sync UI | ✓ VERIFIED | Sync button added with loading/error UI states. |
| `tests/e2e/watchlist-sync.spec.ts` | E2E Tests | ✓ VERIFIED | Tests are present and correctly mocked for `/api/watchlist*`. |
| `vercel.json` | Proxy rewrite | ✓ VERIFIED | Rewrite rule included correctly. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| -------- | ------------- | ------ | ------------------ | ------ |
| `Sidebar.tsx` | `isSyncing` | `useState` | local | ✓ FLOWING |
| `Watchlist.tsx` | `symbols` | `useWatchlistStore()` | Capital.com API via `initializeWatchlist` | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| E2E tests exist | `npx playwright test tests/e2e/watchlist-sync.spec.ts --list` | Lists 2 tests | ✓ PASS |

### Anti-Patterns Found

None.

### Human Verification Required

1. **Watchlist Initialization on Startup**
   - **Expected:** On app load, the Watchlist is populated with the user's remote Capital.com watchlist state.
   - **Why human:** Requires live authentication and API keys to verify external service integration against the real Capital.com API.

2. **Manual Watchlist Sync**
   - **Expected:** Clicking the 'Sync' button in the Watchlist sidebar shows a spinning loading icon. When complete, a success toast notification appears, and the local watchlist is synced with the remote API.
   - **Why human:** Requires live authentication and API keys to verify external service integration against the real Capital.com API.

---

_Verified: 2026-06-19T17:35:00Z_
_Verifier: the agent (gsd-verifier)_
