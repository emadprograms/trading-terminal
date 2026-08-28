# Phase 4 Plan: Fix Audit Gaps (Engine & UI Integration)

## 1. Fix Alert Engine Integration (`src/store/useAlertStore.ts`)
- Add `ticker` (or `epic`) field to the `Alert` type.
- Update `addAlert` to accept `ticker`.
- Update `evaluatePrice` to take `ticker: string` along with `currentPrice: number`, and only evaluate alerts matching that ticker.

## 2. Hook up evaluatePrice to the WebSocket Feed
- Find where WebSocket messages or price updates are handled (e.g., `ws-manager` or `usePriceStore`).
- Call `useAlertStore.getState().evaluatePrice(epic, price)` on price updates.

## 3. Fix Hardcoded Initial Price in UI
- Check `AlertsPanel.tsx` (or `AlertCreationModal.tsx`) where the baseline price is hardcoded to 100.
- Retrieve the actual current price of the active ticker (e.g., from `useTradeStore` or `usePriceStore`) and use it.

## 4. Add Audio Trigger Mechanism
- Check `AlertToast.tsx`.
- Add an HTML5 `Audio` element or use a web audio API mock to play a sound when the toast/alert is triggered.

## 5. Fix E2E Test (`tests/e2e/alerts.spec.ts`)
- Remove `__E2E_PUSH_PRICE_TICK` mocking.
- Instead, trigger a mock WebSocket message, or find how the app naturally mocks the WebSocket for E2E tests, and use that so `evaluatePrice` is naturally invoked via the feed.
- Ensure the test waits for the alert toast to appear and checks the audio/toast.
