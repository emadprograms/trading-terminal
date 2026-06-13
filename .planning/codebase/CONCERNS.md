# Codebase Concerns

**Analysis Date:** 2026-06-13

## Tech Debt

**Hardcoded WebAssembly asset path:**
- Issue: In `src/lib/workers/db.worker.ts`, the WASM binary url is fetched from `/sql-wasm.wasm`.
- Files: `src/lib/workers/db.worker.ts` (line ~18)
- Why: Simple path configuration for local development.
- Impact: If the project is hosted in a subdirectory (e.g. `github.io/trading-terminal/`), the browser won't be able to fetch the WASM and SQLite features will completely fail.
- Fix approach: Support dynamic base paths or asset resolution in worker config.

## Known Bugs

- None currently documented.

## Security Considerations

**Smart fallback credentials injection in proxy:**
- Risk: The backend proxy server automatically falls back to `process.env.CAPITAL_USER` and `process.env.CAPITAL_PASSWORD` if credentials are not sent in request body.
- Files: `server/index.ts` (lines ~58-65)
- Current mitigation: The fallback is intended for automated GHA tests and simple demo setups.
- Recommendations: Restrict fallback behavior exclusively to the testing environment (`process.env.NODE_ENV === 'test'`).

## Performance Bottlenecks

**Web Worker serialization overhead:**
- Problem: Large tick chunks returned from local SQLite database can cause main thread lag due to structured cloning serialization of arrays over postMessage.
- Files: `src/lib/db.ts`, `src/lib/workers/db.worker.ts`
- Cause: SQLite queries returning hundreds of thousands of candlesticks.
- Improvement path: Paginate query limits or use transferable ArrayBuffers.

## Fragile Areas

**Hybrid Mock & Live Store mixing:**
- Files: `src/store/useTradeStore.ts`
- Why fragile: The single Zustand store handles both real broker order tracking and local simulation/mock trades (play-by-play market rewind).
- Common failures: High risk of executing mock orders on live environments if context flags are set incorrectly.
- Safe modification: Check trade store test configs (`useTradeStore.hybrid.test.ts`, `useTradeStore.risk.test.ts`) before edits.

## Test Coverage Gaps

**Playwright dependency on active proxy:**
- What's not tested: Playwright runs against active local servers. If proxy fails to run in `test` mode, it will hit live broker endpoints.
- Risk: Running E2E tests could perform unauthorized API calls to Capital.com.
- Priority: High
- Fix: Ensure `process.env.NODE_ENV === 'test'` is set before invoking Playwright commands.

---

*Concerns audit: 2026-06-13*
*Update as issues are fixed or new ones discovered*
