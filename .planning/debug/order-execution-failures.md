---
status: investigating
trigger: "Market, Limit, and Stop orders all fail with 400 Bad Request. UI buttons remain disabled. Proxy URLs visible in error toast."
created: 2024-03-21T10:00:00Z
updated: 2024-03-21T10:00:00Z
---

## Current Focus

hypothesis: Order placement payload mismatch, state reset failure, and sanitization regex issue.
test: Review code and compare with Capital.com API specs.
expecting: Identify payload discrepancies, missing state resets, and faulty regex.
next_action: gather initial evidence by reading requested files.

## Symptoms

expected: Orders placed successfully, UI buttons re-enabled after failure, proxy URLs stripped from error messages.
actual: 400 Bad Request, buttons remain disabled, proxy URLs visible.
errors: "Trade API Error: Request failed with status code 400: POST [INTERNAL_PROXY]/api/order/v1/positions"
reproduction: Attempt to place any order (Market, Limit, Stop).
started: Phase 03 UAT

## Eliminated

## Evidence

## Resolution

root_cause: |
  The order execution failures are caused by three distinct issues:
  1. **Order Routing & Payload Mismatch (400 Bad Request):**
     - `useTradeStore.ts` ALWAYS calls `tradeApi.placeMarketOrder` regardless of whether it's a Market, Limit, or Stop order. Limit/Stop orders are sent to `/v1/positions` instead of `/v1/workingorders`, causing the API to reject them.
     - `placeOrder` in `useTradeStore.ts` forces `guaranteedStop: true` for all orders. This causes 400 errors for instruments that do not support Guaranteed Stop Loss.
     - The payload contains extra fields (`type`, `bid`, `ofr`) that might be rejected by a strict backend, and lacks potentially required fields like `orderType: "MARKET"`.
  2. **State Management Leak (Buttons Disabled):**
     - `placeOrder` in `useTradeStore.ts` sets `isExecuting: true` but lacks a `catch` block to reset it on API failure.
     - The `finally` block explicitly skips resetting `isExecuting` because it expects `handleConfirmation` to do it, but `handleConfirmation` is only reachable if the API request succeeds.
  3. **Incomplete Error Sanitization (Proxy URLs Visible):**
     - `sanitizeErrorMessage` in `src/lib/api-utils.ts` uses a narrow regex that only matches `.vercel.app` domains.
     - The regex only replaces the domain portion, leaving the rest of the URL path (e.g., `/api/order/v1/positions`) visible in the UI toast.
fix: 
verification: 
files_changed: [src/store/useTradeStore.ts, src/api/trade.ts, src/lib/api-utils.ts]
