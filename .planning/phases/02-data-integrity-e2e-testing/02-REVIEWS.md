---
phase: 02
reviewers: [antigravity]
reviewed_at: 2026-06-13T15:25:00Z
plans_reviewed: [02-01-PLAN.md, 02-02-PLAN.md]
---

# Cross-AI Plan Review — Phase 02

## Antigravity Review

**Summary**
The implementation plans for Phase 02 provide a rigorous and structured approach to validating data integrity by prioritizing real-world, unmocked testing against the live Vercel deployment and the Capital.com demo API. Plan 02-01 effectively tackles the foundational environment configuration and introduces an explicit UI error boundary to prevent silent synchronization failures. Plan 02-02 leverages this foundation to build out critical path E2E verification and explicitly introduces load/stress testing. The strict mandate to avoid mocks and the intentional omission of test data cleanup simplify the testing architecture while strictly enforcing real-environment guarantees.

**Strengths**
- **Strict Adherence to Real-World Conditions**: Banning local mocks (e.g., MSW) and enforcing integration tests against the live API via Vercel ensures that the testing suite accurately mimics production behavior.
- **Explicit Failure Modes**: The creation of `StitchingErrorBanner.tsx` ensures that data synchronization gaps are surfaced explicitly to the user, strictly preventing the system from silently failing. 
- **Clear Scope Boundaries**: By intentionally omitting cleanup and teardown logic for test orders (Decision D-08), test complexity and execution time are heavily reduced, which is highly practical given the use of a demo account.
- **Proactive Boundary Discovery**: Including a dedicated stress-testing script in Phase 02 sets a strong foundation for uncovering Capital.com's rate limits and edge-case behavior before Phase 03.

**Concerns**
- **Developer Loop Bottleneck (HIGH)**: The rigid constraint to test *only* against a deployed Vercel URL (banning `vercel dev` entirely) creates a massive bottleneck. Developers must wait for a full remote deployment to validate E2E tests, severely impacting development velocity.
- **Missing Negative Path E2E Tests (MEDIUM)**: While Plan 02-01 implements the `StitchingErrorBanner.tsx` and Plan 02-02 tests the "happy path," there are no explicitly planned E2E tests designed to intentionally trigger a data gap to verify that the banner actually renders correctly under failure conditions.
- **Rate Limit & IP Block Risks (MEDIUM)**: Plan 02-02 introduces `stress-test.ts` to push the API to its limits. If executed irresponsibly or concurrently with the main E2E suite, this could trigger IP bans or temporary blocks from Capital.com, breaking the primary testing suite.
- **Playwright Configuration Overwrites (LOW)**: Modifying `playwright.config.ts` to globally target the Vercel URL might break the ability to test purely local UI components in the future if not handled via environment variables or isolated project configurations.

**Suggestions**
- **Refine the Testing Environment Constraint**: Modify the constraints to allow local E2E validation against `vercel dev` for the developer feedback loop, while strictly enforcing the live Vercel URL for final validation and CI/CD pipelines.
- **Add Explicit Negative Path Testing**: Update Plan 02-02 to include a test case that specifically validates the UI error state. This can be achieved using Playwright's `page.route()` to intentionally delay or drop WebSocket ticks or REST responses to trigger the `StitchingErrorBanner`.
- **Isolate the Stress Test**: Ensure `stress-test.ts` is thoroughly isolated from the standard `critical-path.spec.ts`. It should be an opt-in script run manually by developers, rather than an automated CI task, to prevent accidental demo API blocks.
- **Utilize Playwright Projects**: Instead of globally modifying the base URL in the Playwright config, utilize Playwright's `projects` array or `.env` variables to define a specific `live-staging` environment, leaving room for a local `dev` configuration.

**Risk Assessment**: **MEDIUM**
**Justification**: The fundamental approach to ensuring data integrity is excellent; however, the absolute ban on local `vercel dev` testing creates a severe developer experience risk that will drastically slow down the implementation of these tests. Furthermore, running stress tests against a third-party API carries inherent risks of rate-limiting or blocking the primary testing environment. By adjusting the developer feedback loop constraints and isolating the stress tests, the overall risk level can easily be downgraded to LOW.

---

## Consensus Summary

Overall the plans provide a robust strategy for verifying data integrity with strict environment boundaries. The major shared concern revolves around the developer experience bottleneck of strictly testing against Vercel without local overrides.

### Agreed Strengths
- Uncompromised realism by avoiding mocks
- Explicit non-silent failure handling via Error Banner
- Reduced execution time by skipping cleanup logic

### Agreed Concerns
- **Developer loop bottleneck (HIGH)**: Enforcing Vercel staging deployment for every test iteration slows down developer velocity.
- **Negative Path Validation (MEDIUM)**: E2E suite does not intentionally trigger gaps to verify the new error boundary UI.
- **Rate Limits (MEDIUM)**: Unisolated stress tests might unintentionally throttle demo accounts.

### Divergent Views
None (single reviewer).
