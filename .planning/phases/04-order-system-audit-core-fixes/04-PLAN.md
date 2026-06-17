# Phase 4 Plan: Order System Audit & Core Fixes

## 1. Context & Scope
**Phase:** 4 - Order System Audit & Core Fixes
**Goal:** Fix known bugs and perform a deep code audit to discover and patch any state/event duplication issues.
**Requirements:** AUDIT-01, ORDER-01, ORDER-02, ORDER-03
**Dependencies:** None

## 2. Technical Approach
We will systematically resolve the root causes of the order system bugs by introducing execution locks to prevent race conditions, isolating global event listeners to the active chart, and addressing order ID resolution bugs during cancellations.

### 2.1 Granular State Locks (`useTradeStore.ts`)
- Replace the single `isExecuting` boolean with granular locks (e.g., `executingOrders: Set<string>` keyed by epic/ID or separate `isPlacingOrder` / `isCancellingOrder` flags). Add explicit guards to `flattenHalfSymbol`, `placeOrder`, and `cancelWorkingOrder` to prevent overlapping API calls without blocking unrelated actions.

### 2.2 Centralized Event Isolation (`useKeyboardShortcuts.ts`)
- Retain the `window.addEventListener('keydown')` but check explicitly if the chart is the *single* active chart by querying a centralized `useUIStore.getState().activeChartEpic` before proceeding with the shortcut logic. This avoids brittle DOM `tabIndex` focus management and guarantees only one chart handles the event.

### 2.3 Limit & Stop Order Cancellation (`useTradeStore.ts`)
- Investigate attached stops vs. standalone working orders.
- Modify `cancelWorkingOrder` to handle the case where the order is an attached stop-loss or take-profit by calling the position update API (`tradeApi.updatePosition`) to remove the stop, rather than the working order API.

## 3. Task Breakdown

### [Task 1] Implement Granular Execution Locks in Trade Store (COMPLETED)
- **Description:** Prevent race conditions using granular locks without blocking unrelated concurrent operations.
- **Files:** `src/store/useTradeStore.ts`
- **Actions:** Replace `isExecuting` with a more granular tracking mechanism (e.g., `executingOperations: Set<string>`). Add guards to `placeOrder`, `flattenHalfSymbol`, `flattenSymbol`, `cancelWorkingOrder`. Ensure locks are always cleared in `finally` blocks.

### [Task 2] Centralize Keyboard Shortcut Isolation (COMPLETED)
- **Description:** Fix the `alt+q` multiple firings bug using a centralized active chart state.
- **Files:** `src/hooks/useKeyboardShortcuts.ts`, `src/store/useUIStore.ts` (if applicable)
- **Actions:** Implement or utilize a global `activeChartEpic` state. Update `useKeyboardShortcuts` to verify that `currentTickerRef.current` strictly matches the globally active chart before executing trade shortcuts.

### [Task 3] Fix Attached Stop/Limit Order Cancellation & State Sync (COMPLETED)
- **Description:** Handle the Capital.com edge case for attached stops and ensure local state is perfectly synced.
- **Files:** `src/store/useTradeStore.ts`, `src/api/tradeApi.ts`
- **Actions:** Determine if the order is an attached stop-loss/take-profit by referencing the parent `dealId`. If so, call `tradeApi.updatePosition(parentDealId, { stopLevel: null })`. Explicitly trigger a local state refresh or targeted removal of the attached stop from the store to ensure the UI updates correctly.

### [Task 4] Fix Order System State Sync Crash (COMPLETED)
- **Description:** Fix the fatal `ReferenceError` caused by referencing `state.pendingOrders` before `state` is initialized. This bug broke position updates, which cascaded into breaking SL/TP dragging, breaking "double alt" netting, and causing standalone limit orders to ghost.
- **Files:** `src/store/useTradeStore.ts`
- **Actions:** Moved `const state = get();` above the line where `state.pendingOrders` is cloned in `syncPositions`.

### [Task 5] Fix Limit/Stop Order Placement Price Bug (COMPLETED)
- **Description:** Fix the fatal `TypeError` when placing Limit/Stop orders due to `get().prices[params.epic]` being undefined (because prices are actually stored in `usePriceStore`, not `useTradeStore`).
- **Files:** `src/store/useTradeStore.ts`
- **Actions:** Dynamically imported `usePriceStore` and accessed prices safely using `priceStore.getState().prices` in `placeOrder`.

## 4. Verification & Testing
- Attempt to spam "Double Alt" quickly. The UI should block the second press or safely ignore it without causing a double order.
- Open 4 charts. Focus on one and press `alt+q`. Verify that exactly one order is placed for the focused chart, and 0 orders for the others.
- Place a limit order on AAPL and cancel it. Verify it is successfully removed from the backend and local state. Place an attached stop-loss on a position and cancel it. Verify the position is updated without the stop-loss.

<threat_model>
- **Race conditions:** The execution lock explicitly mitigates API abuse and unintended position netting.
- **API Errors:** We must ensure `isExecuting` is reset in `finally` blocks, otherwise the app could be permanently locked out of placing orders if an API call throws an unhandled error.
</threat_model>
