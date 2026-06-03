---
phase: 01-auth-infrastructure
plan: 00
subsystem: auth
tags: [tdd, msw, scaffolding]
requires: []
provides: [test-infrastructure]
affects: [src/store, src/hooks, server, src/components]
tech-stack: [msw, vitest, hono, react-testing-library]
key-files: [tests/setup.ts, src/store/useSessionStore.test.ts, src/hooks/useSession.test.ts, server/proxy.test.ts, src/components/EnvToggle.test.tsx, src/components/AccountHeader.test.tsx]
decisions:
  - Use MSW for mocking Capital.com API endpoints (/session, /accounts, /ping).
  - Adopt Hono as the framework for the ephemeral backend proxy.
  - Establish TDD scaffolding for all critical Auth paths (Store, Hook, Proxy, UI).
metrics:
  duration: 30m
  completed_date: 2026-06-03
---

# Phase 01 Plan 00: Auth Infrastructure Scaffolding Summary

Setup the test scaffolding and mocking infrastructure for Phase 1. This ensures that all subsequent implementation waves can be verified with automated tests.

## Key Changes

### Test Infrastructure
- **MSW Configuration:** Configured `tests/setup.ts` with MSW handlers for the Capital.com session handshake and account data.
- **Verification Test:** Added `tests/verify-msw.test.ts` to ensure MSW is correctly intercepting requests.

### TDD Scaffolding (RED Phase)
- **Session Store:** Created `src/store/useSessionStore.test.ts` with tests for token management and environment switching.
- **Auth Hook:** Created `src/hooks/useSession.test.ts` to test the login/logout handshake logic.
- **Proxy Server:** Created `server/proxy.test.ts` to verify Hono routing and header forwarding.
- **UI Components:** Created scaffolding tests for `EnvToggle` and `AccountHeader` to ensure correct rendering of auth state.

## Decisions Made

- **D-01: MSW for API Mocking.** MSW was chosen to provide a reliable and consistent mock for the Capital.com API, allowing frontend development to proceed without a live backend connection.
- **D-02: Scaffolding-First TDD.** By creating all test files upfront with `@ts-ignore` on missing imports, we established a clear roadmap for the implementation phase and verified the test runner detects all failures.

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED

- [x] MSW configured in `tests/setup.ts`.
- [x] All 5 test suites (Store, Hook, Proxy, EnvToggle, AccountHeader) created.
- [x] All tests verified to fail (RED) due to missing implementations.
- [x] All changes committed with proper prefixes.
