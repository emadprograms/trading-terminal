# Phase 4 Plan: Order System Audit & Core Fixes

## 1. Context & Scope
**Phase:** 4 - Order System Audit & Core Fixes
**Goal:** Fix known bugs and perform a deep code audit to discover and patch any state/event duplication issues.
**Requirements:** AUDIT-01, ORDER-01, ORDER-02, ORDER-03
**Dependencies:** None

## 2. Technical Approach
We will systematically resolve the root causes of the order system bugs by introducing execution locks to prevent race conditions, isolating global event listeners to the active chart, and addressing order ID resolution bugs during cancellations.

### 2.1 State Locks (`useTradeStore.ts`)
- Add an explicit `if (get().isExecuting) return;` guard to `flattenHalfSymbol`, `placeOrder`, `cancelWorkingOrder`, and other transactional functions to prevent overlapping API calls.

### 2.2 Event Isolation (`useKeyboardShortcuts.ts`)
- Remove the `window.addEventListener('keydown')` approach.
- Instead, attach a `keydown` listener directly to the chart container `div` and ensure it has `tabIndex={0}` to receive focus.
- Alternatively, check explicitly if the chart is the *single* active chart by querying a centralized `useUIStore.getState().activeChartEpic` before proceeding with the shortcut logic.

### 2.3 Limit & Stop Order Cancellation (`useTradeStore.ts`)
- Investigate attached stops vs. standalone working orders.
- Modify `cancelWorkingOrder` to handle the case where the order is an attached stop-loss or take-profit by calling the position update API (`tradeApi.updatePosition`) to remove the stop, rather than the working order API.

## 3. Task Breakdown

### [Task 1] Implement Execution Locks in Trade Store
- **Description:** Prevent race conditions by returning early if `isExecuting` is true.
- **Files:** `src/store/useTradeStore.ts`
- **Actions:** Add guards to `placeOrder`, `flattenHalfSymbol`, `flattenSymbol`, `cancelWorkingOrder`. Ensure `isExecuting` is always cleared in `finally` blocks.

### [Task 2] Refactor Keyboard Shortcut Isolation
- **Description:** Fix the `alt+q` multiple firings bug by scoping the keydown listener to the active chart only.
- **Files:** `src/hooks/useKeyboardShortcuts.ts`
- **Actions:** Instead of relying on `window` and fuzzy hover/selected checks, verify that `currentTickerRef.current` strictly matches a newly defined `activeTicker` state, or attach the listener to the container reference directly.

### [Task 3] Fix Attached Stop/Limit Order Cancellation
- **Description:** Handle the Capital.com edge case where attached stops/limits fail to cancel via `cancelWorkingOrder`.
- **Files:** `src/store/useTradeStore.ts`, `src/api/tradeApi.ts`
- **Actions:** Determine if the order to cancel is an attached stop-loss/take-profit by referencing the parent `dealId`. If so, call `tradeApi.updatePosition(parentDealId, { stopLevel: null })` instead of cancelling a working order.

## 4. Verification & Testing
- Attempt to spam "Double Alt" quickly. The UI should block the second press or safely ignore it without causing a double order.
- Open 4 charts. Focus on one and press `alt+q`. Verify that exactly one order is placed for the focused chart, and 0 orders for the others.
- Place a limit order on AAPL and cancel it. Verify it is successfully removed from the backend and local state. Place an attached stop-loss on a position and cancel it. Verify the position is updated without the stop-loss.

<threat_model>
- **Race conditions:** The execution lock explicitly mitigates API abuse and unintended position netting.
- **API Errors:** We must ensure `isExecuting` is reset in `finally` blocks, otherwise the app could be permanently locked out of placing orders if an API call throws an unhandled error.
</threat_model>
