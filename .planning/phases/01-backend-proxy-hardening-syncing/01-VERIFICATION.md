---
phase: 01-backend-proxy-hardening-syncing
verified: 2026-06-13T10:35:00Z
status: human_needed
score: 4/4 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Attempt to trigger a proxy validation error (e.g., intercept request and omit the 'epic' field)."
    expected: "The application should display a clear error message starting with 'Proxy Validation Error: ' and remain responsive."
    why_human: "Verifying the actual rendering and clarity of the error message toast in the UI."
  - test: "Simulate a network failure during chart data fetch."
    expected: "A toast notification should appear stating 'Retrying chart data fetch...'. Once the network is restored, a 'Chart data fetch succeeded' toast should appear."
    why_human: "Requires simulating network conditions to verify UI toast notifications appear correctly."
---

# Phase 1: Backend Proxy Hardening & Syncing Verification Report

**Phase Goal:** Establish a robust, resilient backend proxy foundation to handle order execution and synchronization reliably.
**Verified:** 2026-06-13T10:35:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #   | Truth   | Status     | Evidence       |
| --- | ------- | ---------- | -------------- |
| 1   | Malformed orders are blocked at the proxy level and return 400 | ✓ VERIFIED | `api/order.ts` validates payloads using `zod` schemas (`marketOrderSchema`, `limitOrderSchema`, `updatePositionSchema`) and returns `400 PROXY_VALIDATION_ERROR`. Confirmed by passing tests in `api/order.test.ts`. |
| 2   | Order execution never automatically retries upon failure | ✓ VERIFIED | `src/services/client.ts` initializes the `ky` client with `retry: 0`, preventing automatic mutation retries. |
| 3   | User sees clear toast notifications if chart data fetches retry or succeed after a retry | ✓ VERIFIED | `src/lib/sync-coordinator.ts` implements up to 3 retries in `fetchWithRetry` and uses `toast.error` and `toast.success` to notify the user. |
| 4   | User sees precise error messages indicating whether validation failed at the proxy or was rejected by Capital.com | ✓ VERIFIED | `src/services/trade.ts` extracts `errorCode` and correctly formats messages with either `Proxy Validation Error: ` or `Capital.com Rejection: `. |

**Score:** 4/4 truths verified

### Required Artifacts

| Artifact | Expected    | Status | Details |
| -------- | ----------- | ------ | ------- |
| `api/order.ts` | Zod schemas and validation logic | ✓ VERIFIED | File exists, uses zod, and implements validation for order proxying. |
| `package.json` | zod dependency | ✓ VERIFIED | `zod` is installed in `package.json` (`^4.4.3`). |

### Key Link Verification

| From | To  | Via | Status | Details |
| ---- | --- | --- | ------ | ------- |
| `src/services/trade.ts` | UI | Throws formatted error message | ✓ WIRED | Correctly throws errors prefixed with `Proxy Validation Error:` based on JSON error response from `api/order.ts`. |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| Proxy Payload Validation | `npm run test -- api/order.test.ts` | Tests passed successfully | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| ----------- | ---------- | ----------- | ------ | -------- |
| PROXY-01    | 01-PLAN.md | Syncs order history, prices, and orders with Capital.com without data misinterpretation | ✓ SATISFIED | Addressed by precise retry policies and data structure preservation in sync coordinator. |
| PROXY-02    | 01-PLAN.md | User orders are executed reliably via Vercel Serverless Functions with strict Zod validation | ✓ SATISFIED | Zod fully implemented in proxy API layer, rejecting invalid orders with 400 status. |
| PROXY-03    | 01-PLAN.md | System gracefully handles Capital.com backend errors without crashing | ✓ SATISFIED | Errors accurately parsed and mapped to readable messages by `src/services/trade.ts` without throwing unhandled exceptions. |

### Human Verification Required

### 1. Proxy Error Message Clarity

**Test:** Attempt to trigger a proxy validation error (e.g., intercept request and omit the 'epic' field).
**Expected:** The application should display a clear error message starting with 'Proxy Validation Error: ' and remain responsive.
**Why human:** Verifying the actual rendering and clarity of the error message toast in the UI.

### 2. Retry Toast Notification

**Test:** Simulate a network failure during chart data fetch.
**Expected:** A toast notification should appear stating 'Retrying chart data fetch...'. Once the network is restored, a 'Chart data fetch succeeded' toast should appear.
**Why human:** Requires simulating network conditions to verify UI toast notifications appear correctly.

### Gaps Summary

No programmatic gaps found. The backend proxy has been hardened with Zod validation, precise retries are configured, and tests provide strong coverage. UI-related behavior (toast displays) has been flagged for human verification.

---

_Verified: 2026-06-13T10:35:00Z_
_Verifier: the agent (gsd-verifier)_
