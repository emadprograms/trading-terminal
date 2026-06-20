---
status: diagnosed
phase: 06-sync-watchlist-with-capital-com
source: [06-VERIFICATION.md]
started: 2026-06-19T17:35:00Z
updated: 2026-06-20T11:36:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Watchlist Initialization on Startup
expected: |
  On app load, the Watchlist is populated with the user's remote Capital.com watchlist state.
why_human: "Requires live authentication and API keys to verify external service integration against the real Capital.com API."
result: issue
reported: "Request failed with status code 400: PUT https://trading-terminal-psi-ashen.vercel.app/api/watchlist/2220225 I'm getting this error."
severity: blocker

### 2. Manual Watchlist Sync
expected: |
  Clicking the 'Sync' button in the Watchlist sidebar shows a spinning loading icon. When complete, a success toast notification appears, and the local watchlist is synced with the remote API.
why_human: "Requires live authentication and API keys to verify external service integration against the real Capital.com API."
result: blocked
blocked_by: other
reason: "I can only test after you push changes and I see the changes on vercel app. that is where I do the testing. push the changes first."

## Summary

total: 2
passed: 0
issues: 1
pending: 0
skipped: 0
blocked: 1

## Gaps

- truth: "On app load, the Watchlist is populated with the user's remote Capital.com watchlist state."
  status: diagnosed
  reason: "User reported: Request failed with status code 400: PUT https://trading-terminal-psi-ashen.vercel.app/api/watchlist/2220225 I'm getting this error."
  severity: blocker
  test: 1
  root_cause: "Capital.com API expects individual market add/remove updates ({epic: SYMBOL}), but we sent an array bulk update."
  artifacts:
    - path: "src/store/useWatchlistStore.ts"
      issue: "Incorrect bulk payload format sent to sync endpoint."
    - path: "src/services/watchlist.ts"
      issue: "Missing single-epic add/remove endpoints."
  missing:
    - "Expose individual addEpicToWatchlist and removeEpicFromWatchlist in services."
    - "Update useWatchlistStore to process pending additions/deletions individually."
  debug_session: .planning/debug/watchlist-init-400.md
