# Phase 4 Context: Order System Audit & Core Fixes

**Domain:** Fix known bugs and perform a deep code audit to discover and patch any state/event duplication issues.

## Decisions

### Audit Strategy
- **Approach:** Top-down trace (UI components -> global state store -> Vercel proxy -> Capital.com API). We will track the exact execution flow of an order to ensure no double-firings occur.

### Double Alt Safety
- **Concurrent Execution Lock:** Implement a strict lock during Double Alt execution. If the user spams the shortcut before the order is confirmed and the netting is finished by Capital.com, the system will block the subsequent attempts and inform the user that the operation is pending. The pending status logic from `FLATTEN_HALF_DIAGNOSIS.md` must also be implemented.

### Limit & Stop Loss Orders
- **True Fix, No Optimistic UI:** We will not use optimistic UI removal to hide stuck orders. We will investigate and fix the root cause preventing limit orders (e.g., AAPL) and stop losses from being cancelled or closed properly. The system must be genuinely hardened.

### Shortcut Context
- **Active Chart Scoping:** All keyboard shortcuts (like `alt+q`) MUST be strictly scoped to the active chart. Global event listeners that trigger across multiple open charts are prohibited.

## Deferred Ideas
- None.

## Canonical Refs
- `scratch/FLATTEN_HALF_DIAGNOSIS.md` - Context on the historical pending orders bug for Double Alt.

## Code Context
- Relevant files likely include `src/store/useTradeStore.ts`, chart components handling `alt+q`, and the Vercel serverless proxy handlers for order placement/cancellation.
