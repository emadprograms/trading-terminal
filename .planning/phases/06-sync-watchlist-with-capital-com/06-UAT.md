---
status: complete
phase: 06-sync-watchlist-with-capital-com
source: [06-01-SUMMARY.md, 06-02-SUMMARY.md, 06-03-SUMMARY.md, 06-04-SUMMARY.md]
started: 2026-06-19T17:00:00Z
updated: 2026-06-19T17:03:33.704Z
---

## Current Test

[testing complete]

## Tests

### 1. Watchlist Initialization on Startup
expected: |
  On app load, the Watchlist is populated with the user's remote Capital.com watchlist state.
result: issue
reported: "Request failed with status code 405: PUT https://trading-terminal-psi-ashen.vercel.app/api/watchlist"
severity: blocker

### 2. Manual Watchlist Sync
expected: |
  Clicking the 'Sync' button in the Watchlist sidebar shows a spinning loading icon. When complete, a success toast notification appears, and the local watchlist is synced with the remote API.
result: issue
reported: "after the test failed, I think I can say that everything has failed. clicking on the sync button gives. Request failed with status code 405: PUT https://trading-terminal-psi-ashen.vercel.app/api/watchlist"
severity: blocker

### 3. Sync Failure Notification
expected: |
  If the manual sync fails (e.g. network error), an error toast notification is displayed to the user.
result: skipped
reason: "I don't know how to test this."

## Summary

total: 3
passed: 0
issues: 2
pending: 0
skipped: 1

## Gaps

- truth: "On app load, the Watchlist is populated with the user's remote Capital.com watchlist state."
  status: diagnosed
  reason: "User reported: Request failed with status code 405: PUT https://trading-terminal-psi-ashen.vercel.app/api/watchlist"
  severity: blocker
  test: 1
  root_cause: "vercel.json is missing the rewrite rule for /api/watchlist, causing requests to fall through to index.html and return 405 Method Not Allowed."
  artifacts:
    - path: "vercel.json"
      issue: "Missing rewrite rule for /api/watchlist"
  missing:
    - "Add rewrite rule to vercel.json before the catch-all rule"
  debug_session: .planning/debug/watchlist-initialization-on-startup.md

- truth: "Clicking the 'Sync' button in the Watchlist sidebar shows a spinning loading icon. When complete, a success toast notification appears, and the local watchlist is synced with the remote API."
  status: diagnosed
  reason: "User reported: after the test failed, I think I can say that everything has failed. clicking on the sync button gives. Request failed with status code 405: PUT https://trading-terminal-psi-ashen.vercel.app/api/watchlist"
  severity: blocker
  test: 2
  root_cause: "Frontend sends PUT to generic /api/watchlist instead of specific watchlist ID, and backend proxy forwards it to /api/v1/watchlists which doesn't support PUT."
  artifacts:
    - path: "src/store/useWatchlistStore.ts"
      issue: "Doesn't store remote watchlist ID"
    - path: "src/services/watchlist.ts"
      issue: "Sends PUT to generic endpoint without ID"
    - path: "api/watchlist.ts"
      issue: "Needs to forward PUT to /api/v1/watchlists/{id}"
  missing:
    - "Store watchlist ID in fetchWatchlist"
    - "Append ID to PUT request in updateWatchlist"
    - "Forward ID correctly in api/watchlist.ts"
  debug_session: .planning/debug/manual-watchlist-sync.md
