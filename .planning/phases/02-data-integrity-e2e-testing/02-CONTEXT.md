# Phase 2: Data Integrity & E2E Testing - Context

**Gathered:** 2026-06-13
**Status:** Ready for planning

## Phase Boundary

Implement a comprehensive Playwright testing suite to guarantee state integrity and prevent regressions on the critical path.

## Implementation Decisions

### Testing Environment & Mocking
- **D-01:** Strictly use the Capital.com demo account (different endpoint, ~$42k balance) for all tests. Absolutely DO NOT connect to the live account.
- **D-02:** Do not rely on mocks. All tests must hit the real Capital.com demo environment via the proxy.
- **D-03:** Write stress-testing scripts against the real demo API to discover real-world limitations (e.g., rate limits, erratic conditions). Apply these findings as fundamental rules to the main application.
- **D-04:** Do not test against a local Vercel dev server. Run E2E tests against the deployed Vercel URL with user intervention.

### Data Stitching Integrity
- **D-05:** Validate data stitching by asserting that timestamps between REST history and WebSocket ticks match perfectly without gaps.
- **D-06:** Test edge cases where the API fails to return proper data or behaves unpredictably.
- **D-07:** NO SILENT FAILURES. If data stitching fails or has gaps, the application must explicitly inform the user of the exact issue and why it happened.

### Order Cleanup
- **D-08:** No teardown or cleanup script is required for test orders. Test orders can be left pending in the demo account.

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project & Roadmap
- `.planning/ROADMAP.md` — Defines phase goal and requirements (TEST-01, TEST-02).

### Architecture & Integrations
- `.planning/codebase/TESTING.md` — Current testing setup and Playwright tools.
- `.planning/codebase/INTEGRATIONS.md` — Details on Capital.com REST and WS behavior.

## Existing Code Insights

### Reusable Assets
- `playwright.config.ts` - Existing configuration (needs to be updated to point to the Vercel staging URL).

### Integration Points
- Tests will exercise the entire stack by interacting with the live Vercel deployment.

## Specific Ideas

- "Since the code is written by the ai, it even writes the mocks in a way that will pass it wrong written code. We must test it with capital.com's demo test account."
- "There should be NO silent failures. when it doesnt' work or there is a problem. the user must be informed that there was this issue and that is why this has happened."

## Deferred Ideas
None
