---
phase: 01-backend-proxy-hardening-syncing
verified: 2026-06-13T17:15:32Z
status: human_needed
score: 8/8 must-haves verified
overrides_applied: 0
re_verification:
  previous_status: human_needed
  previous_score: 6/6
  gaps_closed:
    - "Ungraceful network drops (e.g., ethernet cable removal) fail to trigger WebSocket onclose and toast notifications"
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "Simulate an ungraceful network failure (e.g., turning on offline mode in dev tools or pulling ethernet cable) during chart streaming."
    expected: "A toast notification should appear immediately stating 'Retrying chart data fetch...'. Once the network is restored, a 'Chart data fetch succeeded' toast should appear."
    why_human: "Requires simulating ungraceful network drops to verify browser event listeners correctly trigger UI toast notifications."
---

# Phase 1: Backend Proxy Hardening & Syncing Verification Report

**Phase Goal:** Establish a robust, resilient backend proxy foundation to handle order execution and synchronization reliably.
**Verified:** 2026-06-13T17:15:32Z
**Status:** human_needed
**Re-verification:** Yes — after gap closure

## Goal Achievement

### Observable Truths

| #   | Truth   | Status     | Evidence       |
| --- | ------- | ---------- | -------------- |
| 1   | Malformed orders are blocked at the proxy level and return 400 | ✓ VERIFIED | `api/order.ts` validates payloads using `zod` schemas (`marketOrderSchema`, `limitOrderSchema`, `updatePositionSchema`) and returns `400 PROXY_VALIDATION_ERROR`. Confirmed by passing tests in `api/order.test.ts`. |
| 2   | Order execution never automatically retries upon failure | ✓ VERIFIED | `src/services/client.ts` initializes the `ky` client with `retry: 0`, preventing automatic mutation retries. |
| 3   | User sees clear toast notifications if chart data fetches retry or succeed after a retry | ✓ VERIFIED | `src/lib/sync-coordinator.ts` implements up to 3 retries in `fetchWithRetry` and uses `toast.error` and `toast.success` to notify the user. |
| 4   | User sees precise error messages indicating whether validation failed at the proxy or was rejected by Capital.com | ✓ VERIFIED | `src/services/trade.ts` extracts `errorCode` and correctly formats messages with either `Proxy Validation Error: ` or `Capital.com Rejection: `. |
| 5   | User sees 'Retrying chart data fetch...' toast when WebSocket connection drops | ✓ VERIFIED | `src/lib/sync-coordinator.ts` registers an `onDisconnect` listener on `wsManager` that triggers the toast. Tested in `ws-manager.test.ts`. |
| 6   | User sees 'Chart data fetch succeeded' toast when WebSocket connection recovers | ✓ VERIFIED | `src/lib/sync-coordinator.ts` registers an `onReconnect` listener on `wsManager` that triggers the success toast. Tested in `ws-manager.test.ts`. |
| 7   | When the live streaming chart is active, turning off network access immediately forces the socket reconnect flow and triggers an error toast. | ✓ VERIFIED | `src/lib/ws-manager.ts` adds a `window.addEventListener('offline', ...)` listener that calls `socket.close()`, which natively cascades to `onclose`, triggering `onDisconnect` listeners (the error toast). |
| 8   | Restoring network access immediately forces socket connection and triggers a success toast. | ✓ VERIFIED | `src/lib/ws-manager.ts` adds a `window.addEventListener('online', ...)` listener that clears the reconnect timeout, forcefully sets `reconnectAttempts` to at least `1`, and calls `connect()`, which guarantees `onReconnectListeners` (success toast) are fired upon `onopen`. |

**Score:** 8/8 truths verified

### Required Artifacts

| Artifact | Expected    | Status | Details |
| -------- | ----------- | ------ | ------- |
| `api/order.ts` | Zod schemas and validation logic | ✓ VERIFIED | File exists, uses zod, and implements validation for order proxying. |
| `package.json` | zod dependency | ✓ VERIFIED | `zod` is installed in `package.json` (`^4.4.3`). |
| `src/lib/ws-manager.ts` | WebSocket connection state management and offline/online listeners | ✓ VERIFIED | File exists, exports `wsManager` with `onDisconnect`, `onReconnect`, and proper network browser event listeners. |
| `src/lib/sync-coordinator.ts` | UI toast notifications triggered by WebSocket state changes | ✓ VERIFIED | File exists, registers callbacks for toast notifications. |

### Key Link Verification

| From | To  | Via | Status | Details |
| ---- | --- | --- | ------ | ------- |
| `src/services/trade.ts` | UI | Throws formatted error message | ✓ WIRED | Correctly throws errors prefixed with `Proxy Validation Error:` based on JSON error response from `api/order.ts`. |
| `src/lib/sync-coordinator.ts` | `src/lib/ws-manager.ts` | `onDisconnect` / `onReconnect` | ✓ WIRED | Callbacks are successfully wired and trigger `toast.error` and `toast.success`. |
| `window` events | `wsManager` socket state | `offline` and `online` event listeners | ✓ WIRED | Successfully added listeners to the `window` to intercept ungraceful network drops and restore connection. |

### Data-Flow Trace (Level 4)

(N/A - This phase primarily focuses on infrastructural robustness and networking events, not database data flows directly mapped to UI views.)

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| Proxy Payload Validation | `npx vitest run api/order.test.ts` | Tests passed successfully | ✓ PASS |
| WS Manager Listeners | `npx vitest run tests/unit/ws-manager.test.ts` | Tests passed successfully | ✓ PASS |

### Probe Execution

| Probe | Command | Result | Status |
| ----- | ------- | ------ | ------ |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| ----------- | ---------- | ----------- | ------ | -------- |
| PROXY-01    | 01-PLAN.md | Syncs order history, prices, and orders with Capital.com without data misinterpretation | ✓ SATISFIED | Addressed by precise retry policies and data structure preservation in sync coordinator. |
| PROXY-02    | 01-PLAN.md / 03-PLAN.md | User orders are executed reliably via Vercel Serverless Functions with strict Zod validation | ✓ SATISFIED | Zod fully implemented in proxy API layer, rejecting invalid orders with 400 status. Network resilience added. |
| PROXY-03    | 01-PLAN.md | System gracefully handles Capital.com backend errors without crashing | ✓ SATISFIED | Errors accurately parsed and mapped to readable messages by `src/services/trade.ts` without throwing unhandled exceptions. |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| `src/lib/ws-manager.ts` | - | - | - | None found |
| `src/lib/sync-coordinator.ts` | - | - | - | None found |

### Human Verification Required

### 1. Ungraceful Drop Toast Notification

**Test:** Simulate an ungraceful network failure (e.g., turning on offline mode in dev tools or pulling ethernet cable) during chart streaming.
**Expected:** A toast notification should appear immediately stating 'Retrying chart data fetch...'. Once the network is restored, a 'Chart data fetch succeeded' toast should appear.
**Why human:** Requires simulating ungraceful network drops to verify browser event listeners correctly trigger UI toast notifications.

### Gaps Summary

No programmatic gaps found. The backend proxy has been hardened with Zod validation, precise retries are configured, and the ungraceful network drop gap closed by adding browser `offline` and `online` event listeners to forcefully reconnect the WebSocket. UI-related behavior (toast displays upon ungraceful drop) has been flagged for human verification to ensure the fix passes UAT.

---

_Verified: 2026-06-13T17:15:32Z_
_Verifier: the agent (gsd-verifier)_
