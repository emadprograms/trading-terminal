# Phase 4 Gap Fixes Plan: Order System Audit & Core Fixes

## 1. Context & Scope
**Phase:** 4 - Order System Audit & Core Fixes (Gap Closure)
**Goal:** Fix the remaining bugs discovered during UAT phase testing.
**Source:** `04-UAT.md` gaps

## 2. Technical Approach

### 2.1 Fix Empty Finally Blocks (`useTradeStore.ts`)
- The `flattenSymbol`, `flattenAll`, and `cancelAllWorkingOrders` functions currently have empty `finally` blocks.
- Because of this, they fail to delete their lock keys from the `executingOperations` Set, permanently freezing the UI after execution (e.g., when spamming double alt).
- We need to add `executingOperations.delete(lockKey)` to these `finally` blocks.

### 2.2 Fix Limit Order ID Extraction (`useTradeManager.ts`)
- `useTradeManager.ts` incorrectly extracts `shortId` using `.substring(0, 6)`.
- Since Capital.com limit order IDs are often zero-padded at the beginning (e.g., `000000X`), this leads to all IDs displaying as `000000`.
- We will update the `shortId` extraction to use `.slice(-6)` or remove leading zeros.

## 3. Task Breakdown

### [Task 1] Fix empty finally blocks and write Double Alt Playwright test
- **Description:** Fix UI freezing caused by empty finally blocks in `useTradeStore.ts`. Write a Playwright test to ensure the UI does not freeze on Double Alt spam.
- **Files:** `src/store/useTradeStore.ts`, `tests/e2e/double-alt.spec.ts` (or equivalent test file)
- **Actions:** 
  - Update `flattenSymbol`, `flattenAll`, and `cancelAllWorkingOrders` to remove their lock keys in the `finally` block.
  - Write a Playwright test that simulates spamming Double Alt and verifies the UI does not freeze and buttons remain clickable.

### [Task 2] Fix Limit Order shortId extraction
- **Description:** Ensure limit order short IDs are correctly extracted.
- **Files:** `src/hooks/useTradeManager.ts`
- **Actions:** Change `.substring(0, 6)` to `.slice(-6)` for `shortId` to prevent the UI from showing "000000" for limit orders.

## 4. Verification & Testing
- Run the new Playwright test for double alt spam to verify the UI does not freeze.
- Place a limit order in the application and verify the short ID is properly displayed and not "000000".
