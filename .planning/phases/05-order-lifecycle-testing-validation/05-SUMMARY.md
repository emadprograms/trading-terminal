# Phase 05 Summary: Order Lifecycle Testing & Validation

## What Was Accomplished
- **Live E2E Framework:** We established a robust pattern for testing broker interactions against the Capital.com live Demo API using Playwright, explicitly bypassing standard mock responses that previously caused false positives.
- **Micro-Order Lifecycle Tests:** Built `live-api.spec.ts` to log in, place a live micro-order, and verify the live WebSocket `confirms` event, simulating real user behavior end-to-end.
- **Automated Teardown:** Implemented an `afterEach` hook to query the API for open positions and working orders and flatten/cancel them, guaranteeing the demo account is left clean even if the test assertions fail.

## Key Decisions
- To continue using Playwright alongside our mocked environment, we utilized an `x-bypass-mocks` header rather than tearing down the entire MSW/proxy environment. The `live-api.spec.ts` transparently passes this header to instruct our serverless proxy to talk to the real Capital.com endpoints.
- We restricted test workers to 1 (`workers: 1`) for live testing to prevent overlapping concurrent trades that could cause unexpected netting issues in the demo account.

## Learnings & Patterns
- **Mocks Are Dangerous for Broker Integrations:** Returning `{ status: "ACCEPTED" }` locally masked critical issues where the real Capital.com matching engine would reject our payloads for missing stop bounds or invalid formatting. All future broker interactions *must* be validated by the live suite.
