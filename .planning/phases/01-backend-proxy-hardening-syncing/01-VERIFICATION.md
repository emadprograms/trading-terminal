---
phase: 01-backend-proxy-hardening-syncing
verified: 2026-06-13T17:36:00Z
status: human_needed
score: 6/6 must-haves verified
overrides_applied: 0
re_verification:
  previous_status: human_needed
  previous_score: 8/8
  gaps_closed:
    - "Toast notifications have been removed in favor of a persistent 'Online/Disconnected' connection state indicator in the AccountHeader (Plan 04)."
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "Simulate an ungraceful network failure (e.g., turning on offline mode in dev tools or pulling ethernet cable) during chart streaming."
    expected: "The 'ONLINE' button in the top left header should immediately change to 'DISCONNECTED'. Once the network is restored, it should change back to 'ONLINE'."
    why_human: "Requires simulating ungraceful network drops to verify browser event listeners correctly trigger UI state changes."
---

# Phase 1: Backend Proxy Hardening & Syncing Verification Report

**Phase Goal:** Establish a robust, resilient backend proxy foundation to handle order execution and synchronization reliably.
**Verified:** 2026-06-13T17:36:00Z
**Status:** human_needed
**Re-verification:** Yes — after gap closure (Plan 04)

## Goal Achievement

### Observable Truths

| #   | Truth   | Status     | Evidence       |
| --- | ------- | ---------- | -------------- |
| 1   | Malformed orders are blocked at the proxy level and return 400 | ✓ VERIFIED | `api/order.ts` validates payloads using `zod` schemas and returns `400 PROXY_VALIDATION_ERROR`. Confirmed by passing tests in `api/order.test.ts`. |
| 2   | Order execution never automatically retries upon failure | ✓ VERIFIED | `src/services/client.ts` initializes the `ky` client with `retry: 0`, preventing automatic mutation retries. |
| 3   | User sees precise error messages indicating whether validation failed at the proxy or was rejected by Capital.com | ✓ VERIFIED | `src/services/trade.ts` extracts `errorCode` and correctly formats messages with either `Proxy Validation Error: ` or `Capital.com Rejection: `. |
| 4   | Instead of toasts, network disconnection and reconnection update the existing 'Online' button in the top left header | ✓ VERIFIED | `src/lib/sync-coordinator.ts` toasts removed; `src/lib/ws-manager.ts` updates `isWsConnected` in `useSessionStore`; `src/components/AccountHeader.tsx` renders connection status based on this state. |
| 5   | When the live streaming chart is active, turning off network access immediately forces the socket reconnect flow and updates the 'Online' button | ✓ VERIFIED | `src/lib/ws-manager.ts` adds a `window.addEventListener('offline', ...)` listener that calls `socket.close()`, which updates store connection state to false. |
| 6   | Restoring network access immediately forces socket connection and updates the 'Online' button | ✓ VERIFIED | `src/lib/ws-manager.ts` adds a `window.addEventListener('online', ...)` listener that reconnects and updates store connection state to true. |

**Score:** 6/6 truths verified

### Required Artifacts

| Artifact | Expected    | Status | Details |
| -------- | ----------- | ------ | ------- |
| `api/order.ts` | Zod schemas and validation logic | ✓ VERIFIED | File exists, uses zod, and implements validation for order proxying. |
| `src/lib/ws-manager.ts` | WebSocket connection state management and offline/online listeners | ✓ VERIFIED | Updates store connection state on `onopen` and `onclose`. |
| `src/components/AccountHeader.tsx` | UI indicator reflecting WebSocket connection state | ✓ VERIFIED | File uses `isWsConnected` from the session store. |
| `src/store/useSessionStore.ts` | State for WebSocket connection | ✓ VERIFIED | Exposes `isWsConnected` and `setIsWsConnected`. |

### Key Link Verification

| From | To  | Via | Status | Details |
| ---- | --- | --- | ------ | ------- |
| `src/lib/ws-manager.ts` | `src/store/useSessionStore.ts` | `setIsWsConnected` | ✓ WIRED | `wsManager` calls `useSessionStore.getState().setIsWsConnected(true/false)`. |
| `src/components/AccountHeader.tsx` | `src/store/useSessionStore.ts` | `isWsConnected` | ✓ WIRED | Consumes `isWsConnected` and renders 'ONLINE' or 'DISCONNECTED'. |
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
| `src/components/AccountHeader.tsx` | - | - | - | None found |

### Human Verification Required

### 1. Ungraceful Drop UI Update

**Test:** Simulate an ungraceful network failure (e.g., turning on offline mode in dev tools or pulling ethernet cable) during chart streaming.
**Expected:** The 'ONLINE' button in the top left header should immediately change to 'DISCONNECTED'. Once the network is restored, it should change back to 'ONLINE'.
**Why human:** Requires simulating ungraceful network drops to verify browser event listeners correctly trigger UI state changes.

### Gaps Summary

No programmatic gaps found. The backend proxy has been hardened, precise retries configured, and the intrusive toast notifications have been successfully replaced by a persistent 'Online'/'Disconnected' status indicator in the `AccountHeader` component (Plan 04). The ungraceful network drop recovery logic remains intact. UI-related behavior (status indicator update upon ungraceful drop) has been flagged for human verification to ensure the fix passes UAT.

---

_Verified: 2026-06-13T17:36:00Z_
_Verifier: the agent (gsd-verifier)_
