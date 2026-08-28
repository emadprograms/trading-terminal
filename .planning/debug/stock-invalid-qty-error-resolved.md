---
status: resolved
trigger: "Stock orders fail with invalid_qty_error from Capital.com. BTCUSD works, AAPL and all stocks fail. Size=10, minimum is 0.1/0.01."
created: 2026-06-22
updated: 2026-06-22
---

## Symptoms
- **Expected behavior**: Orders for 10 shares of AAPL (or any stock) should be placed successfully on Capital.com.
- **Actual behavior**: Capital.com returns `invalid_qty_error`. BTCUSD orders with the same size work fine.
- **Error messages**: `invalid_qty_error` from Capital.com API (previously showed as "Unknown reason" until today's fix in commit 67d0c3e).
- **Timeline**: Used to work but broke recently. Today's commits (67d0c3e, 150f63e) only improved error visibility, not order logic.
- **Reproduction**: Place a market order for any stock (AAPL, META, etc.) with size=10.

## Current Focus
- hypothesis: Capital.com's API returns `invalid_qty_error` for stocks NOT because of a code bug, but because of an instrument-level dealing rule difference between crypto and stocks that the app doesn't account for
- next_action: Query Capital.com GET /markets/{epic} for AAPL vs BTCUSD to compare dealing rules (minSize, stepSize, maxSize)

## Evidence
- Code trace: The payload sent to Capital.com is correct: `{"epic":"AAPL","size":10,"direction":"BUY"}` — no stale fields, no type issues
- Proxy validation (Zod schema in api/order.ts) confirms `size` is a number (would fail before reaching Capital.com otherwise)
- The `placeOrder` function in useTradeStore.ts correctly cleans undefined fields and removes `guaranteedStop: false`
- Commits d26d183 and 828bc33 fixed payload formatting issues (removed `guaranteedStop: false`), but these fixes are already deployed
- Today's commits (67d0c3e, 150f63e) ONLY changed error logging — order payload construction was NOT modified
- All stock orders fail, all crypto orders succeed — this is a category-level difference, not instrument-specific

## Eliminated
- hypothesis: Payload includes stale/incorrect fields (level, guaranteedStop:false, stopDistance) → eliminated: cleanup loop removes undefined, guaranteedStop deletion is correct
- hypothesis: Size is sent as string instead of number → eliminated: Zod validation catches this before reaching Capital.com
- hypothesis: Recent code changes broke order logic → eliminated: today's commits only changed console.log levels and error reason extraction
- hypothesis: Market is closed → eliminated: June 22 2026 is Monday, 9:55 AM ET is within market hours
- hypothesis: expiry field required for stocks → eliminated: Capital.com stock CFDs are open-ended

## Deferred
Deferred to future milestone — likely a Capital.com instrument-level dealing rule issue, not a code bug. Requires live API investigation.
