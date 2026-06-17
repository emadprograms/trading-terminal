# Phase 5: Order Lifecycle Testing & Validation - Research

## Overview
This document synthesizes the contextual decisions and codebase realities to guide the planning of Phase 5. The primary objective is to build a rigorous, functionally-focused test suite covering order execution, latency edge cases, and concurrency locks (TEST-03).

## Key Context & Constraints
1. **Scope Boundary:** Strict focus on functional correctness, data integrity, and concurrency. No new capabilities, UI polish, or analytics.
2. **Prior Phase Readiness:** Phase 4 previously fixed underlying system bugs (multi-chart ghost orders, double alt limit calculations, un-cancellable limits). Phase 5 must rigorously *verify* these fixes using end-to-end testing.
3. **Hybrid Environment (Decision D-01):**
   - Playwright must support both a mocked MSW environment (for rapid stress iteration) and the live Vercel proxy.
   - *Current Codebase Reality:* `playwright.config.ts` currently forces `x-bypass-mocks: true` unconditionally. Vitest handles MSW natively via `tests/setup.ts`. We need a toggle mechanism (e.g., environment variables like `USE_MOCKS=true`) in Playwright to easily switch between the mocked environment and the live proxy.

## Actionable Execution Plan for the Planner

### 1. Test Data State Setup (Decision D-03)
- **Requirement:** Reuse the same test account but guarantee a clean slate before each test run by flattening active positions and canceling limit/stop orders.
- **Implementation Insight:** Instead of cleaning up via the slow UI interactions, use Playwright's `request` fixture to communicate directly with the Vercel API proxy (`/api/order/v1/positions` and `/api/order/v1/workingorders`). This will require extracting the `CST` and `X-SECURITY-TOKEN` headers from the browser context after the app logs in, or setting up a dedicated test session script.

### 2. Concurrency Simulation (Decision D-02)
- **Requirement:** Run both a "realistic" pass (human delays) and an "impossible speed" pass (zero delay).
- **Implementation Insight:** For the "impossible speed" test (e.g., verifying Double Alt locking), use Playwright's network interception (`page.route()`) to inject artificial network delays (simulating latency/hanging requests), while simultaneously rapid-firing UI events like `page.keyboard.press('Alt')` with zero delay.
- The planner must ensure these tests verify that under impossible UI speeds, the application locks correctly and does not freeze or crash.

### 3. Assertion Strategy & Lifecycle Rigor (Decision D-04 & TEST-03)
- **Assertion Strategy:** Tests must explicitly assert both the final UI state AND the exact number of network payloads fired.
- **Implementation Insight:** Set up request counters in Playwright using `page.on('request')` or `page.route()` to track how many times the `POST /api/order/v1/positions` or `DELETE` endpoints are hit. Assert that a "Double Alt" spam or a multi-chart "Alt+Q" shortcut fires exactly *one* valid request and ignores subsequent inputs during the execution lock.
- **Limit Orders:** Verify that limit orders can be cleanly placed and, more importantly, cancelled without entering a "permanently stuck" state (verifying ORDER-02).

### 4. Multi-Chart Event Handling
- **Requirement:** Verify the multi-chart bug (AUDIT-01) doesn't duplicate events.
- **Implementation Insight:** Simulate a multi-chart setup by triggering rapid instrument switches or interacting with secondary chart components before firing the global `alt+q` shortcut. Verify strictly via network intercepts that only one order payload is fired, ensuring no unmanaged ghost order state exists.

## Next Steps for Planner
When drafting `PLAN.md`, structure the tasks to include:
1. **Configuration:** Updating `playwright.config.ts` to support a toggleable MSW mock environment.
2. **Utilities:** Creating an `api-cleanup.ts` helper in the e2e folder to handle the state cleanup via the Vercel proxy.
3. **Test Suites:** Creating dedicated E2E spec files:
   - `order-lifecycle.spec.ts` (limit/market placement and cancellation verification)
   - `concurrency-locks.spec.ts` (impossible speed double alt & multi-chart alt+q payload counting)
4. Ensure all tests strictly combine DOM visibility assertions with Network payload counts.
