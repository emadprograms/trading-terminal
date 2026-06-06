# Phase 3: Order Execution Layer - Validation Plan

## Requirements Mapping

| Req ID | Requirement | Success Criteria | Verification Method |
|--------|-------------|------------------|---------------------|
| EXEC-01 | Market Order execution | User can place Market orders with tracked status. | Unit Test (Store) + Manual |
| EXEC-02 | Limit Order placement | User can place Limit orders with tracked status. | Unit Test (Store) + Manual |
| EXEC-03 | One-Click Flatten | User can close a position with a single click. | Unit Test (API/Store) + Manual |
| UI-02 | Automated Stop Loss | SL is placed automatically with `guaranteedStop: true`. | Unit Test (Risk logic) |

## Automated Tests

### Wave 1: Foundation (03-00)
- **Test Scaffolding:** Create `src/api/client.test.ts`, `src/api/trade.test.ts`, `src/store/useTradeStore.test.ts`.
- **Unit Test:** `src/store/useTradeStore.test.ts`
  - Verify state updates for adding pending orders and managing positions.
- **Unit Test:** `src/api/trade.test.ts`
  - Verify REST calls for market/limit orders and confirms.

### Wave 2: Integration (03-01)
- **Integration Test:** `src/store/useTradeStore.hybrid.test.ts`
  - Verify WebSocket confirmation routing and buffer logic.
- **Integration Test:** `src/store/useTradeStore.watchdog.test.ts`
  - Verify REST polling fallback if WS is missed.

### Wave 3: UI & Management (03-02)
- **Unit Test:** `src/store/useTradeStore.risk.test.ts`
  - Verify pre-flight SL calculation and `guaranteedStop` inclusion.
- **Component Test:** `src/components/TradeControls.test.tsx`
  - Verify button states, size inputs, and order triggers.
- **Component Test:** `src/components/TradeLog.test.tsx`
  - Verify history display, flattening triggers, and cancel buttons.

## Manual Verification Procedure

1. **Trade Lifecycle:**
   - Place a Market Order; verify "Pending" status and toast.
   - Verify position appears in list once accepted.
   - Click "Flatten" on the position; verify it closes and toast confirms.

2. **Limit Order & Cancellation:**
   - Place a Limit Order; verify it appears in "Working Orders".
   - Click "Cancel" on the working order; verify it is removed.

3. **Risk Guards:**
   - Check that every placed order in the "Confirms" REST response or WS payload includes the expected Stop Loss level.
   - Verify that "Guaranteed Stop" is checked/true in the API payload (captured via Network tab or test spy).
