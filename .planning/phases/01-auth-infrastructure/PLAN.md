# Phase 1: Auth & Infrastructure - Execution Plan

This phase delivers the secure connectivity bridge between the Trading Terminal and Capital.com. It utilizes an ephemeral GHA-hosted proxy to protect secrets and a modern React frontend for session management.

## Phase Goal
**Establish a secure connection to Capital.com and synchronize account state.**

## Execution Waves

| Wave | Plan | Title | Objective |
|------|------|-------|-----------|
| 1 | 01-01 | Infrastructure | Setup Hono proxy and GHA tunnel automation. |
| 2 | 01-02 | Authentication | Implement dual-token handshake, token management, and Ky client. |
| 3 | 01-03 | UI & Sync | Build account toggle, header metrics, and state synchronization. |

## Requirement Coverage
- **AUTH-01**: Dual-token handshake sequence -> `01-02-PLAN.md`
- **AUTH-02**: Environment Toggle logic -> `01-03-PLAN.md`
- **AUTH-03**: Secure Secret Management (Proxy) -> `01-01-PLAN.md`
- **DATA-03**: Real-time Account State Sync -> `01-03-PLAN.md`

## Verification Strategy

### Automated Verification
- **Backend**: Hono proxy logic verified with Vitest (mocking Capital.com API).
- **Handshake**: `useSession` hook tested with MSW (Mock Service Worker).
- **State**: Zustand store unit tests for in-memory isolation.
- **UI**: Component tests for `EnvToggle` and `AccountHeader`.

### Manual Verification
- **Discovery**: Confirm GHA workflow outputs a reachable tunnel URL.
- **Handshake**: Verify successful login to Capital.com via the proxy.
- **Switching**: Confirm account toggle correctly resets session and re-authenticates.

## Trust Boundaries & Security
- All sensitive credentials (API Key, Password) are stored in GitHub Secrets.
- Session tokens (`CST`, `X-SECURITY-TOKEN`) are held strictly in RAM.
- Proxy origin is restricted via CORS to prevent unauthorized access.

## Next Steps
1. Execute `01-01-PLAN.md` to establish the backend.
2. Execute `01-02-PLAN.md` to wire the authentication.
3. Execute `01-03-PLAN.md` to complete the UI and synchronization.
