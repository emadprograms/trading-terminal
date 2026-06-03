---
phase: 01-auth-infrastructure
plan: 02
status: complete
date: 2026-06-03
---

# Summary: 01-02 Implement Auth Handshake

Implemented the authentication handshake and session management logic on the frontend. This ensures the terminal can securely acquire and use Capital.com session tokens.

## Key Files Created/Modified
- `src/store/useSessionStore.ts`: Zustand store for in-memory token management.
- `src/api/client.ts`: Configured Ky client with dual-token handshake hooks.
- `src/hooks/useSession.ts`: Extended hook with login, logout, and keep-alive logic.
- `package.json`: Added `@tanstack/react-query`.

## Tasks Completed
- **Task 0: Package legitimacy audit check**: Approved by user. Verified `ky`, `zustand`, and `@tanstack/react-query` are reputable.
- **Task 1: Create Session Store**: Implemented in-memory store with `isAuthenticated` and token management.
- **Task 2: Configure Ky Client**: Implemented `beforeRequest` and `afterResponse` hooks for session header orchestration.
- **Task 3: Implement useSession Hook**: Integrated login mutation and background heartbeat for session maintenance.

## Verification Results
- `src/api/client.test.ts`: PASSED
- `src/hooks/useSession.test.tsx`: PASSED
- `src/store/useSessionStore.test.ts`: PASSED

## Notable Deviations
- Renamed `src/hooks/useSession.test.ts` to `.tsx` to support JSX in test wrappers.
- Handled Ky v2.0.2 hook signature change (single object argument).

## Self-Check: PASSED
