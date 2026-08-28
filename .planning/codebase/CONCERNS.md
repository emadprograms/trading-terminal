# Codebase Concerns

**Analysis Date:** 2026-08-12

## Tech Debt

**Silent Error Swallowing in Services:**
- Issue: API fetch catch blocks silently return empty arrays or objects (e.g., `return []`) instead of propagating errors.
- Files: `src/services/trade.ts`, `src/services/market.ts`, `src/services/account.ts`, `src/services/watchlist.ts`
- Impact: API failures are masked, making the UI appear as if there is no data rather than showing a proper error state to the user.
- Fix approach: Rethrow errors or return a standardized Result object (e.g., `{ data, error }`) so the UI can handle and display errors gracefully.

## Known Bugs

Not detected

## Security Considerations

Not detected

## Performance Bottlenecks

Not detected

## Fragile Areas

**State Management (useTradeStore):**
- Files: `src/store/useTradeStore.ts`
- Why fragile: At over 1200 lines, this module acts as a God Object. It handles API requests, state management, complex stop-loss calculations, concurrent lock mechanisms (`executingOperations`), and watchdog timers. High coupling makes it extremely brittle.
- Safe modification: Very careful changes are required. Any change to order calculation or state mutation requires manual regression testing. Consider breaking it down into smaller, focused stores or moving logic to dedicated utility functions.
- Test coverage: Severe gaps. The test file `src/store/useTradeStore.test.ts` is only ~160 lines.

## Scaling Limits

Not detected

## Dependencies at Risk

Not detected

## Missing Critical Features

Not detected

## Test Coverage Gaps

**Trade Execution Logic:**
- What's not tested: Complex operations in the store (watchdogs, concurrent locks, slippage handling, complex position flattening) lack adequate coverage. The main store has ~1250 lines of code but only ~160 lines of tests.
- Files: `src/store/useTradeStore.ts`, `src/store/useTradeStore.test.ts`
- Risk: High risk of regressions when modifying critical trade execution logic, which could result in incorrect trades or lost funds.
- Priority: High

---

*Concerns audit: 2026-08-12*
