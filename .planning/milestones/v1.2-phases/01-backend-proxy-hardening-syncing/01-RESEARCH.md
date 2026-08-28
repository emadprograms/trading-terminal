# Phase 1: Backend Proxy Hardening & Syncing - Research Notes

## Objective
To answer: "What do I need to know to PLAN this phase well?"
Focus heavily on finding gaps in the existing proxy code related to testing coverage, Zod validation, error handling, and syncing edge cases.

## Key Gaps Identified

### 1. Missing Zod Validation on Proxy (PROXY-02, D-05)
- **Current State:** The `api/order.ts` endpoint strictly passes incoming requests to `proxyRequest` without any body inspection or validation. Furthermore, the `zod` library is not installed in the project (`package.json`).
- **Gap:** No validation guarantees that malformed orders won't reach Capital.com.
- **Required Action in Plan:** 
  - Add `zod` to project dependencies.
  - Modify `api/order.ts` (and potentially others if mutating state) to parse the JSON body and enforce strict Zod schemas for order parameters (e.g., `MarketOrderParams`, `LimitOrderParams`).
  - Refactor `proxyRequest` in `api/_utils.ts` to accept an already-parsed JSON body, avoiding double-reading the stream.
  - Return a structured `400 Bad Request` containing `{ errorCode: 'PROXY_VALIDATION_ERROR', developerMessage: '...' }` when Zod fails, satisfying D-05.

### 2. Rate Limiting and Automatic Retries (D-06, D-07)
- **Current State (Market Data):** `src/lib/sync-coordinator.ts` (`fetchWithRetry`) attempts only 1 retry on failure, and merely logs a `console.warn` without notifying the user via the UI.
- **Current State (Order Placement):** `src/services/client.ts` uses `ky` with default options. By default, `ky` automatically retries `DELETE` and `PUT` requests (used to close/update orders) up to 2 times.
- **Gap:** 
  - D-06 requires up to 3 retries for market data, with explicit UI notifications when retrying and succeeding.
  - D-07 requires **NEVER** automatically retrying order placement/mutations.
- **Required Action in Plan:**
  - Update `syncCoordinator.fetchWithRetry` to attempt up to 3 retries and trigger a toast notification (e.g., via `sonner`) when a chart fetch fails, and another when it finally succeeds.
  - Explicitly set `retry: 0` in `ky.create()` inside `src/services/client.ts` to guarantee no unexpected retries occur for trading mutations.

### 3. Error Handling Precision (PROXY-03, D-03, D-04)
- **Current State:** `fetchTradeApi` in `src/services/trade.ts` extracts `errorCode` and `developerMessage` and throws a standard `Error`. UI components blindly catch and display `error.message`.
- **Gap:** If the proxy fails validation, the error thrown isn't distinctly identified as a proxy-side error. 
- **Required Action in Plan:**
  - Ensure `tradeApi.ts` handles the structured JSON from a Zod validation error specifically (e.g., prefixing with "Proxy Validation Error:") so the user is clear where it failed.

### 4. Testing Coverage Discrepancies
- **Current State:** `src/services/trade.test.ts` incorrectly mocks `ky`'s HTTP error handling. It expects `ky` to throw an error object with `response.body`, but `tradeApi.ts` uses `{ throwHttpErrors: false }` which prevents `ky` from throwing HTTP errors at all.
- **Gap:** The unit tests misrepresent actual runtime behavior, and there are no tests for Zod validation on the serverless handlers.
- **Required Action in Plan:**
  - Correct the mocking behavior in `tradeApi.test.ts`.
  - Add specific API tests/assertions for the new Zod schemas to ensure malformed payloads are correctly rejected by the proxy.

## Conclusion for Planning
The core syncing logic and WebSocket confirmations (`src/store/useTradeStore.ts`) are largely implemented correctly and surface Capital.com's rejections well. The plan should specifically target the missing Zod validation pipeline, configuring the exact retry behaviors specified in D-06/D-07, and aligning the API error structures and unit tests. Do not attempt to rewrite the WebSocket manager or `sync-coordinator`'s core syncing algorithms.
