# Codebase Concerns

**Analysis Date:** 2025-05-22

## Tech Debt

**Chart Lifecycle Complexity:**
- Issue: The `useChartLifecycle` hook in `src/hooks/useChartLifecycle.ts` is becoming a "god hook," coordinating initialization, plugins, viewport synchronization, drawings, and replay logic. It contains numerous `useEffect` blocks that are highly interdependent.
- Files: `src/hooks/useChartLifecycle.ts`
- Impact: High risk of "effect loops" or synchronization bugs when adding new chart features. Difficult to test in isolation.
- Fix approach: Further decompose the hook into smaller, domain-specific hooks (e.g., `useChartDataSync`, `useChartReplay`) and move orchestration to a dedicated Chart Controller or a State Machine.

**DB Worker Proxy Logic:**
- Issue: `DatabaseWorkerProxy` in `src/lib/db.ts` implements a manual request/response mapping using UUIDs and timeouts. While functional, it reimplements a basic RPC mechanism.
- Files: `src/lib/db.ts`
- Impact: Potential for memory leaks if timeouts aren't handled perfectly or if the worker crashes without notifying the proxy.
- Fix approach: Consider using a more robust worker communication library or refining the proxy to handle worker termination/restart automatically.

## Known Bugs

**Not detected** (No explicit TODOs or BUG markers found in source code).

## Security Considerations

**API Key Management in Backend:**
- Issue: The `historical_archiver` relies on `InfisicalClient` for secrets. While this is a good pattern, the `main.py` script prints the number of keys found and the current worker's key index, which is safe, but any logging of the keys themselves would be a critical risk.
- Files: `backend/historical_archiver/main.py`
- Current mitigation: Secrets are fetched via `InfisicalClient` and not logged.
- Recommendations: Ensure that `MassiveFetcher` does not log raw API keys during error handling or debugging.

## Performance Bottlenecks

**Main Thread Chart Updates:**
- Issue: While data fetching is offloaded to a worker (`src/lib/db.ts`), the formatting of `chartData` into Lightweight Charts format happens on the main thread inside `useChartLifecycle.ts`.
- Files: `src/hooks/useChartLifecycle.ts`
- Cause: `chartData.map(...)` is called every time `chartData` changes, which could be expensive for very large datasets.
- Improvement path: Move data formatting/transformation into the DB worker so the main thread receives ready-to-render arrays.

**Large Data Memory Footprint:**
- Issue: The application maintains `localMasterData` and `chartData` in memory. For high-frequency data over long periods, this could lead to significant memory pressure.
- Files: `src/hooks/useChartLifecycle.ts`
- Impact: Potential browser tab crashes or sluggishness on lower-end machines.
- Improvement path: Implement a sliding window or virtualization for the data stored in the frontend state.

## Fragile Areas

**Chart Viewport Synchronization:**
- Issue: The synchronization of viewports across multiple charts (implemented via `useChartViewport`) is a complex interaction between the `lightweight-charts` API and React's render cycle.
- Files: `src/hooks/chart/useChartViewport.ts`
- Why fragile: Small changes in `barSpacing` or data length can cause "jitter" or incorrect offsets during sync.
- Safe modification: Always update viewport sync logic in tandem with the performance tests in `tests/performance/render.perf.test.tsx` to ensure no regression in render counts.
- Test coverage: Covered by integration and performance tests, but remains the most complex part of the UI.

## Scaling Limits

**Parallel Backfill Throughput:**
- Issue: The `historical_archiver` is limited by the number of API keys and the mandatory cooldown (default 60s) per key.
- Files: `backend/historical_archiver/main.py`
- Current capacity: Linear scaling with number of keys.
- Limit: The bottleneck is the external API rate limit.
- Scaling path: If throughput needs to increase, the only path is adding more API keys or negotiating a higher rate limit with the provider.

## Missing Critical Features

**Not detected**

## Test Coverage Gaps

**Backend Archiver Testing:**
- What's not tested: The `historical_archiver` logic (fetching, cooldowns, Turso writing) has no corresponding test suite.
- Files: `backend/historical_archiver/`
- Risk: Regressions in the backfill process could lead to data corruption or missing bars in the database.
- Priority: Medium.

---

*Concerns audit: 2025-05-22*
