# Investigation Report: Phase 03 Gap Closure Regression

## Incident Summary
During the execution of `/gsd:execute-phase 3 --gaps-only` (Plan 03-04), several critical fixes were applied to the order execution layer. Although all automated tests passed, the application suffered a major regression in the live environment, resulting in a complete loss of connectivity to the backend.

The system was subsequently reverted to commit `f502491` to restore stability.

## Implemented Changes (The "Suspects")
The following changes were introduced in the failed implementation:

### 1. Order Routing Logic (`src/store/useTradeStore.ts`)
- **Change**: Explicitly routed order types to different endpoints.
  - `Limit` / `Stop` $
ightarrow$ `tradeApi.placeLimitOrder` $
ightarrow$ `/v1/workingorders`
  - `Market` $
ightarrow$ `tradeApi.placeMarketOrder` $
ightarrow$ `/v1/positions`
- **Intent**: Resolve UAT gaps where orders were being sent to the wrong endpoints.

### 2. State Recovery / UI Robustness (`src/store/useTradeStore.ts`)
- **Change**: Wrapped `placeOrder`, `flattenPosition`, and `cancelWorkingOrder` in `try-catch-finally` (or added `catch` blocks) to ensure `set({ isExecuting: false })` is always called on failure.
- **Intent**: Prevent the UI from hanging (buttons remaining disabled) when an API call fails.

### 3. API Parameter Tuning (`src/store/useTradeStore.ts`)
- **Change**: Modified the `placeOrder` payload to only include `guaranteedStop: true` if explicitly selected, rather than sending `guaranteedStop: false` by default.
- **Intent**: Avoid `400 Bad Request` errors from the API when `false` was explicitly provided.

### 4. Aggressive Error Sanitization (`src/lib/api-utils.ts`)
- **Change**: Updated `sanitizeErrorMessage` to use a more aggressive regex to strip all URLs and replace them with `[INTERNAL_URL]`.
- **Intent**: Ensure no internal proxy hostnames or localhost URLs leak into the UI toasts.

## The Failure
- **Symptom**: The application could no longer connect to the backend.
- **Observation**: This was a "hard" failure—the connectivity was completely severed, not just specific features breaking.
- **Paradox**: All associated unit tests in `src/store/useTradeStore.test.ts` and `src/lib/api-utils.test.ts` passed successfully.

## Preliminary Analysis
Since the tests passed but the app failed, the issue likely resides in one of the following:
1. **Environment Discrepancy**: The mocks used in tests may not accurately reflect the actual backend routing or the way the proxy handles the new routing logic.
2. **Routing Side-Effect**: The shift to `/v1/workingorders` vs `/v1/positions` might have triggered a proxy-level rejection or a CORS issue that wasn't present in the mocks.
3. **State Machine Collision**: The changes to `isExecuting` might have interfered with other concurrent store updates, causing a race condition that blocked the initial connection handshake.
4. **Sanitization Over-reach**: If the sanitization logic was applied to critical connection strings or internal headers during the request/response cycle (though it was intended for error messages), it could have corrupted the communication.

## Recovery Action
- **Action**: Hard reset and force push to commit `f502491`.
- **Result**: Connectivity restored immediately.

## Recommendations for Next Attempt
- **Surgical Implementation**: Apply changes one by one rather than in a batch.
- **Live Logging**: Implement more verbose logging around the `ky` client and proxy requests to see exactly where the request fails (e.g., 404, 403, or a network error).
- **Integration Testing**: Move beyond unit tests to actual integration tests against the staging/demo backend before pushing to `main`.
- **Verify Proxy Config**: Ensure the Vercel/Cloudflare proxy is configured to handle both `/v1/positions` and `/v1/workingorders` correctly.


