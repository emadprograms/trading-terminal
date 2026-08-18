# Phase 1: Alerting E2E Benchmark (TDD) - Execution Plan

**Status:** Approved
**Goal:** Build the strict Playwright E2E test that validates the full alert lifecycle.

## 1. Create Playwright E2E Test
- **File:** `tests/e2e/alerts.spec.ts`
- **Action:** Create the test file.
- **Details:** 
  - Define a test `should allow setting an alert and trigger it when price is met`.
  - Use page navigation to go to the app.
  - Bypass authentication like in the previous milestone (`window.__sessionStore.setState({ isAuthenticated: true })`).
  - Interact with a hypothetical "Set Alert" button and input a target price.
  - Mock the websocket to push a price update that hits the target price.
  - Assert that a toast notification or alert UI appears.
- **Verification:** Run `npx playwright test tests/e2e/alerts.spec.ts`. The test should be executed but FAIL because the UI and Engine do not exist yet.

## 2. Commit the Failing Test
- **Action:** Commit the test as the benchmark.
