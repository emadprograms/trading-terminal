---
status: complete
phase: 01-backend-proxy-hardening-syncing
source: [03-SUMMARY.md]
started: 2026-06-13T14:18:55Z
updated: 2026-06-13T14:18:55Z
---

## Current Test
<!-- OVERWRITE each test - shows where we are -->

[testing complete]

## Tests

### 1. WebSocket Disconnect Toast
expected: When the live streaming chart is active, turning off network access (e.g. via dev tools 'Offline' mode or removing ethernet cable) should immediately display an error toast stating 'Retrying chart data fetch...'.
result: pass

### 2. WebSocket Reconnect Toast
expected: After the disconnect toast is shown, restoring network access should automatically reconnect the live streaming and display a success toast stating 'Chart data fetch succeeded'.
result: issue
reported: "I have a small issue when I reload the page even then I see retrying chart data fetch.. and chart data fetch succeeded. I don't want that. Instead of the toast can we update the online button on the top left. When internet is connected. The online button is green as usual and when there is not internet, it turns disconnected. Wouldn't that be cleaner? instead of this toast thing that shows up everytime I reload the page?"
severity: major

## Summary

total: 2
passed: 1
issues: 1
pending: 0
skipped: 0

## Gaps

- truth: "Instead of annoying toasts on every reload, network disconnection and reconnection should update the existing 'Online' button in the top left header (green for connected, disconnected state for offline)."
  status: failed
  reason: "User requested UX change: I have a small issue when I reload the page even then I see retrying chart data fetch.. and chart data fetch succeeded. I don't want that. Instead of the toast can we update the online button on the top left."
  severity: major
  test: 2
  artifacts: []
  missing: []
