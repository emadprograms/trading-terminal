# Phase 2: Alerting Engine Implementation - Execution Plan

## 1. Create Alert Store
- **File:** `src/store/useAlertStore.ts`
- **Action:** Create Zustand store.
- **Details:** Actions for `addAlert`, `removeAlert`, and `evaluatePrice(currentPrice)`.

## 2. Write Unit Tests
- **File:** `src/store/useAlertStore.test.ts`
- **Action:** Test `evaluatePrice`.
- **Details:** Ensure 'above' and 'below' conditions trigger correctly.

## 3. Hook up to Global Engine
- **File:** `src/store/useTradeStore.ts` or somewhere global.
- **Action:** Call `useAlertStore.getState().evaluatePrice(price)` when new WebSocket ticks arrive. (Or we can expose a hook `__E2E_PUSH_PRICE_TICK` on window just for the test).
