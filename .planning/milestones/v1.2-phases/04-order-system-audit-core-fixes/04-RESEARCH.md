# Phase 4 Research: Order System Audit & Core Fixes

## Executive Summary
This research investigates the root causes of the known order system bugs (Double Alt miscalculation, `alt+q` ghost/duplicate orders, and limit order cancellation failures). The findings inform the plan to harden the system against race conditions and event listener duplications.

## 1. Double Alt (`flattenHalfSymbol`) Safety
### Code Analyzed
- `src/store/useTradeStore.ts` -> `flattenHalfSymbol`
- `src/hooks/useKeyboardShortcuts.ts`

### Findings
1. **Pending Status Check:** The code currently includes `o.status === 'PENDING'` for pending market orders when calculating `netSize`, which addresses the massive historical sum bug noted in `FLATTEN_HALF_DIAGNOSIS.md`.
2. **Missing Concurrent Lock:** The `flattenHalfSymbol` function does NOT check if an execution is already in progress before proceeding. It sets `isExecuting = true`, but there is no guard at the top: `if (get().isExecuting) return;`.
3. **Shortcut Race Condition:** If a user double-presses `Alt` very fast, `useKeyboardShortcuts` fires `flattenHalfSymbol`. Since there's no lock, a second double-press immediately afterward will read the same `positions` and `pendingOrders` state before the first API request resolves, leading to double-netting and counter-order errors.

## 2. Multi-Chart `alt+q` Duplicate Firings
### Code Analyzed
- `src/hooks/useKeyboardShortcuts.ts` -> `window.addEventListener('keydown', handleKeyDown)`

### Findings
1. **Global Listener per Chart:** The `useKeyboardShortcuts` hook attaches a `keydown` listener to the global `window` object. If the UI renders 4 charts, there are 4 active global listeners.
2. **Loose Isolation Check:** The hook attempts to isolate by checking `const isHovered = container.matches(':hover') || container.contains(document.activeElement);` and `isSelected`.
3. **The Bug:** If the user presses `alt+q`, and multiple charts evaluate `isSelected` to true (due to state mismanagement) OR if the `isHovered` check fails to properly isolate, multiple instances of the hook will fire `useTradeStore.getState().placeOrder({...})` simultaneously.
4. **Fix Strategy:** Keyboard shortcuts for trading must either be registered as a single global listener that queries a definitive "Active Chart Ticker" state, OR the event listener should be bound directly to the chart container div (with `tabIndex`) instead of `window` so that only the focused chart receives the event.

## 3. Limit Order & Stop Loss Cancellation Failures
### Code Analyzed
- `src/store/useTradeStore.ts` -> `cancelWorkingOrder`

### Findings
1. **ID Resolution Risk:** The method determines the ID to cancel using `const apiOrderId = order?.workingOrderId || order?.dealId || workingOrderId;`. For certain limit/stop orders, Capital.com requires a specific ID format or different endpoint if it's a working order vs an attached stop-loss.
2. **Attached vs Standalone:** If the order is an attached stop-loss or take-profit on an active position, calling a "cancel working order" endpoint might fail. Capital.com requires updating the position to remove the stop/limit rather than cancelling a separate working order.
3. **Stuck Local State:** If `tradeApi.cancelWorkingOrder` throws an error, the catch block just logs the error and shows a toast. The order remains permanently in the local `pendingOrders` state, cluttering the UI until a hard refresh.

## Conclusion & Architectural Direction for Planner
To plan this phase effectively, the planner must address these three pillars:
1. **Store-Level Locks:** Add robust `isExecuting` guards in `useTradeStore.ts` to prevent race conditions across all order functions.
2. **Event Isolation:** Refactor `useKeyboardShortcuts` to definitively prevent multiple chart instances from handling the same trade hotkey event.
3. **Order API Hardening:** Differentiate between cancelling standalone working orders and removing attached stops/limits in `cancelWorkingOrder` and `closePosition`, ensuring the Capital.com proxy handles both correctly.
