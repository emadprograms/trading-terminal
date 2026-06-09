---
status: diagnosed
phase: 03-order-execution-layer
source: [03-00-SUMMARY.md, 03-01-SUMMARY.md, 03-02-SUMMARY.md, 03-03-SUMMARY.md]
started: 2026-06-09T10:00:00Z
updated: 2026-06-09T10:30:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Cold Start Smoke Test
expected: Restart application; server boots and UI loads live data without errors.
result: pass

### 2. Market Order Execution
expected: Place Market order -> Toast "Placing..." -> Order appears as Pending in TradeLog -> Toast "Success" -> Order becomes Position.
result: issue
reported: "A toast shows up but.. I see Trade API Error: Request failed with status code 400: POST [INTERNAL_PROXY]/api/order/v1/positions this error and then order gets canceled. and then the buy and sell button gets disabled So No, this doesn't work."
severity: blocker

### 3. Limit Order Execution
expected: Place Limit order -> Toast confirms placement -> Order appears as working order in TradeLog with correct limit price.
result: issue
reported: "It attempts to place an order and then I see Request failed with status code 400: POST [INTERNAL_PROXY]/api/order/v1/positions. and then the app hangs.It attempts to place an order and then I see Request failed with status code 400: POST [INTERNAL_PROXY]/api/order/v1/positions. and then the buy and sell buttons disable."
severity: blocker

### 4. Stop Order Execution
expected: Place Stop order -> Toast confirms placement -> Order appears as stop order in TradeLog.
result: issue
reported: "Request failed with status code 400: POST [INTERNAL_PROXY]/api/order/v1/positions same error for stop order as well."
severity: blocker

### 5. Risk Parameter Integration
expected: Set Stop Distance and Guaranteed Stop -> Place order -> Order is successfully placed with these risk parameters.
result: blocked
blocked_by: other
reason: "Blocked by order placement failure (400 error)"

### 6. Single Position Flattening
expected: Click Flatten on a position -> Row shows spinner ("...") -> Toast confirms closure -> Position removed from TradeLog.
result: blocked
blocked_by: other
reason: "Blocked by order placement failure (400 error)"

### 7. Batch Flatten All
expected: Click FLATTEN ALL -> All positions show spinners -> Toasts confirm closures -> TradeLog is cleared of positions.
result: blocked
blocked_by: other
reason: "Blocked by order placement failure (400 error)"

### 8. Single Order Cancellation
expected: Click Cancel on working order -> Row shows spinner -> Toast confirms cancellation -> Order removed from TradeLog.
result: blocked
blocked_by: other
reason: "Blocked by order placement failure (400 error)"

### 9. Batch Cancel All
expected: Click CANCEL ALL -> All working orders show spinners -> Toasts confirm cancellations -> TradeLog is cleared of working orders.
result: blocked
blocked_by: other
reason: "Blocked by order placement failure (400 error)"

### 10. Error Message Sanitization
expected: Trigger API error -> Toast shows friendly message. NO internal proxy URLs or security tokens (CST/X-SECURITY-TOKEN) are visible.
result: blocked
blocked_by: other
reason: "Blocked by order placement failure (400 error)"

### 11. Automatic Price Syncing
expected: In LIMIT/STOP mode, the price input field automatically syncs/updates with the current market price.
result: blocked
blocked_by: other
reason: "Blocked by order placement failure (400 error)"

## Summary

total: 11
passed: 1
issues: 3
pending: 0
skipped: 0
blocked: 7

## Gaps

- truth: "Place Market order -> Toast 'Placing...' -> Order appears as Pending in TradeLog -> Toast 'Success' -> Order becomes Position."
  status: failed
  reason: "User reported: A toast shows up but.. I see Trade API Error: Request failed with status code 400: POST [INTERNAL_PROXY]/api/order/v1/positions this error and then order gets canceled. and then the buy and sell button gets disabled So No, this doesn't work."
  severity: blocker
  test: 2
  root_cause: "Endpoint mismatch and forced guaranteedStop parameter. Store sends all orders to /v1/positions (market only) and forces guaranteedStop: true even when unsupported."
  artifacts:
    - path: "src/store/useTradeStore.ts"
      issue: "Unconditional call to placeMarketOrder and forced guaranteedStop: true"
    - path: "src/api/trade.ts"
      issue: "placeMarketOrder specifically targets /v1/positions"
  missing:
    - "Implement conditional routing in placeOrder based on order type (Market vs Limit/Stop)"
    - "Respect guaranteedStop preference from the UI/Store state"
  debug_session: ".planning/debug/order-execution-failures.md"

- truth: "Place Limit order -> Toast confirms placement -> Order appears as working order in TradeLog with correct limit price."
  status: failed
  reason: "User reported: It attempts to place an order and then I see Request failed with status code 400: POST [INTERNAL_PROXY]/api/order/v1/positions. and then the app hangs.It attempts to place an order and then I see Request failed with status code 400: POST [INTERNAL_PROXY]/api/order/v1/positions. and then the buy and sell buttons disable."
  severity: blocker
  test: 3
  root_cause: "Incorrect API endpoint routing and state lockup. Limit orders are sent to /v1/positions instead of /v1/workingorders. isExecuting flag is not reset on API failure."
  artifacts:
    - path: "src/store/useTradeStore.ts"
      issue: "Wrong endpoint selection and missing isExecuting reset in catch block"
  missing:
    - "Route Limit/Stop orders to /v1/workingorders"
    - "Add catch block to reset isExecuting: false on placement failure"
  debug_session: ".planning/debug/order-execution-failures.md"

- truth: "Place Stop order -> Toast confirms placement -> Order appears as stop order in TradeLog."
  status: failed
  reason: "User reported: Request failed with status code 400: POST [INTERNAL_PROXY]/api/order/v1/positions same error for stop order as well."
  severity: blocker
  test: 4
  root_cause: "Same as Market/Limit: Stop orders incorrectly routed to positions endpoint."
  artifacts:
    - path: "src/store/useTradeStore.ts"
      issue: "Incorrect endpoint routing"
  missing:
    - "Route Stop orders to /v1/workingorders"
  debug_session: ".planning/debug/order-execution-failures.md"

- truth: "Error messages in toasts are sanitized and do not leak internal proxy URLs or secrets."
  status: failed
  reason: "User reported: Internal proxy URL [INTERNAL_PROXY] visible in toast error message."
  severity: major
  test: 10
  root_cause: "sanitizeErrorMessage regex is too restrictive (Vercel-only) and only replaces the domain, leaving paths and protocol visible."
  artifacts:
    - path: "src/lib/api-utils.ts"
      issue: "Faulty regex in sanitizeErrorMessage"
  missing:
    - "Update sanitizeErrorMessage to strip full URLs from all origins (including localhost)"
  debug_session: ".planning/debug/order-execution-failures.md"
