# Phase 02: Data Integrity & E2E Testing - Research

## Overview
This phase focuses on validating the critical path of the application (order placement, chart rendering, data stitching) against real-world conditions without the use of mocks. We will implement comprehensive Playwright E2E tests hitting the live Vercel deployment and the Capital.com demo environment.

## What is needed to PLAN this phase well?

### 1. Requirements & Scope
- **TEST-01**: Validate data stitching (REST history seamlessly synced with live WebSocket ticks) to guarantee state integrity.
- **TEST-02**: Build Playwright E2E suite testing the critical path (order placement, chart switching, order histories) against regressions in latency and correctness.

### 2. Testing Constraints & Execution Environment
- **Live Environments Only (D-04):** Tests must run against the deployed Vercel URL with user intervention. We are NOT testing against a local `vercel dev` server.
- **Playwright Configuration:** We must update `playwright.config.ts` to point to the Vercel staging/deployed URL instead of `localhost`.
- **Demo Account Enforcement (D-01):** The suite must specifically target the Capital.com demo account endpoint. We must never connect to a live account.
- **Strictly No Mocks (D-02):** The `MSW` setup currently in the codebase must be bypassed or disabled for these tests. All E2E interactions must hit the real Capital.com demo API.

### 3. Data Stitching & UI Error Handling
- **Timestamp Validation (D-05):** We must write strict assertions checking that REST historical timestamps perfectly align with WebSocket real-time ticks without gaps.
- **Error States & Visibility (D-07 & UI-SPEC):** We must test that the application surfaces explicit UI errors for data gaps or API failures. The specific error format defined in the UI-SPEC is: `Data Stitching Error: [Exact issue description] - [Why it happened]`. Silent failures are strictly prohibited.
- **Edge Case Resilience (D-06):** Tests need to simulate or handle unpredictable Capital.com backend responses.

### 4. Stress Testing & Architecture Insights
- **Discovery via Stress Testing (D-03):** We need to create scripts/tests that push the real demo API to its limits to discover rate limits and erratic behaviors. These findings will become fundamental rules applied to the main application proxy/frontend.
- **Teardown Process (D-08):** We do not need to implement cleanup steps for test orders created in the demo account; they can be left pending.

## Validation Architecture

### Testing Approach
- **E2E Strategy:** Playwright will simulate real user actions (placing orders, switching charts) exclusively against the live deployed Vercel environment.
- **Data Integrity Checks:** The testing suite will actively monitor the proxy payload, specifically focusing on the intersection between the REST history response and the real-time WebSocket tick stream, ensuring timestamps are contiguous.
- **Stress & Load Validations:** We will generate high-frequency requests to map out the bounds (e.g., rate-limits) of the Capital.com demo API.

### Edge Cases
- WebSocket connection drops, timeouts, or delayed messages causing potential timestamp gaps.
- Hitting Capital.com API rate limits during high-frequency chart switching.
- Application behavior when the proxy fails to sync or interpret Capital.com backend errors.

### Boundaries
- **In Scope:** End-to-end user journeys (critical path), strict data stitching validation against real live environment endpoints, stress-testing the proxy connection.
- **Out of Scope:** Mocked test setups, local Vercel testing (`vercel dev`), teardown scripts for test orders, and UI aesthetic tests unrelated to explicit data stitching errors.

### Verification Strategy
- E2E tests must pass entirely via the Vercel deployment.
- The UI MUST display the specific string `Data Stitching Error: ...` if data inconsistencies are detected during failure tests.
- Execution relies on user intervention for URL inputs to run E2E correctly.
