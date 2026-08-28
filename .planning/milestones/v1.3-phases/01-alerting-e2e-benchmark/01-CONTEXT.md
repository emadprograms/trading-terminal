# Phase 1: Alerting E2E Benchmark (TDD) - Context

**Gathered:** 2026-08-18
**Status:** Ready for planning
**Mode:** Auto-generated

<domain>
## Phase Boundary

Build the strict Playwright E2E test that validates the full alert lifecycle from UI creation to trigger. Requirement: ALERT-01.
</domain>

<decisions>
## Implementation Decisions

### Testing Approach
We are using strict TDD. The E2E test `tests/e2e/alerts.spec.ts` must be written first. It should:
1. Open the app.
2. Set a real-time price alert via the UI (mocking the UI interactions).
3. Wait or simulate the condition being met.
4. Verify the alert triggers visually.
This test will intentionally fail at the end of Phase 1, serving as the benchmark for Phases 2 and 3.

### Mocks
We need to mock the real-time data feed (similar to what was done in v1.2) to reliably trigger the alert.
</decisions>

<code_context>
## Existing Code Insights

- Playwright tests are in `tests/e2e/`.
- We have existing mocks in `tests/e2e/order-history-real.spec.ts` that we can use as a reference for mocking the websocket/data feed.
</code_context>

<specifics>
## Specific Ideas

- The test should use `page.evaluate` to push a mock price tick that triggers the alert.
</specifics>

<deferred>
## Deferred Ideas

- Implementation of the alert engine itself (Phase 2).
- Implementation of the actual UI components (Phase 3).
</deferred>
