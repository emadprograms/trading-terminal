# Phase 3: Order Execution Layer - Validation Plan

## Requirements Mapping

| Req ID | Requirement | Success Criteria | Verification Method |
|--------|-------------|------------------|---------------------|
| EXEC-01 | Market Order execution | User can place Market orders via the UI. | Integration Test + Manual Verification |
| EXEC-02 | Limit Order placement | User can place Limit orders via the UI. | Integration Test + Manual Verification |
| EXEC-03 | Order state tracking | Order state is tracked and displayed (Pending -> Accepted/Rejected). | Unit Test (Store) + Integration Test (WS) |
| UI-01 | Trade feedback | Trade confirmation messages are visible. | Component Test + Manual Verification |

## Automated Tests

### Wave 1: Foundation (03-00)
- **Unit Test:** `src/store/useTradeStore.test.ts`
  - Verify state updates for adding pending orders, updating order status, and managing positions.
- **Mocking:** Update `src/mocks/handlers.ts` to support order execution endpoints.

### Wave 2: Integration (03-01)
- **Integration Test:** `src/api/trade.test.ts`
  - Verify REST calls for order placement and confirmation.
- **WebSocket Test:** `src/lib/ws-manager.test.ts` (extended)
  - Verify handling of `confirms` updates.

### Wave 3: UI & Feedback (03-02)
- **Component Test:** `src/components/TradeControls.test.tsx`
  - Verify order placement triggers and UI state changes.
- **Component Test:** `src/components/TradeLog.test.tsx`
  - Verify order history display.

## Manual Verification Procedure

1. **Market Order Flow:**
   - Open the terminal.
   - Select a symbol.
   - Click "Buy" or "Sell" in `TradeControls`.
   - Observe "Pending" state in UI.
   - Observe toast notification upon success/failure.
   - Verify position appears in the store/UI if successful.

2. **Limit Order Flow:**
   - Set a target level in `TradeControls`.
   - Click "Place Limit Order".
   - Observe order appears in "Working Orders" section of `TradeLog`.
   - (Simulation) Trigger order fill and verify it becomes an active position.

3. **Error Handling:**
   - Attempt to place an order with invalid size (e.g., 0).
   - Verify validation error message.
   - (Simulation) Trigger a server-side rejection (e.g., `INSUFFICIENT_FUNDS`).
   - Verify human-readable toast notification.
