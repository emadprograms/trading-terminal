# Phase 1: Auth & Infrastructure - Execution Plan

## Goal
Establish a secure connection to Capital.com and synchronize account state.

## Wave Structure

| Wave | Plan | Type | Objective |
|------|------|------|-----------|
| 0 | [01-00-PLAN.md](01-00-PLAN.md) | setup | Test scaffolding & mocking infrastructure |
| 1 | [01-01-PLAN.md](01-01-PLAN.md) | execute | Hono proxy & GHA tunnel setup |
| 2 | [01-02-PLAN.md](01-02-PLAN.md) | execute | Auth handshake & Ky integration |
| 3 | [01-03-PLAN.md](01-03-PLAN.md) | execute | UI components & account synchronization |

## Success Criteria
1. Ephemeral backend proxy (Hono) is deployed and reachable.
2. Frontend successfully completes the CST/X-SECURITY-TOKEN handshake.
3. User can toggle between Demo and Live environments.
4. Real-time account equity and margin are visible in the header.

## Verification Strategy
The phase uses a "Test-First" approach (Wave 0). Each subsequent wave is verified by automated tests (Vitest + MSW) and a final human checkpoint (Wave 3) to verify the UI integration.
