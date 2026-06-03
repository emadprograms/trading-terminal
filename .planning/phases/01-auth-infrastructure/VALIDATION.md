# Phase 1: Auth & Infrastructure - Validation Strategy

## Overview
This document defines the validation strategy for Phase 1. The goal is to ensure the auth proxy is secure and functional, and the frontend correctly implements the dual-token handshake and account state synchronization.

## Verification Tiers

### Tier 1: Automated Unit/Integration Tests
- **Frontend Store**: Validate Zustand state transitions for session management.
- **Ky Client**: Verify header injection and response header capture.
- **Hono Proxy**: Mock Capital.com API and verify header pass-through and CORS configuration.
- **Env Toggle**: Unit test for UI state and environment switching.

### Tier 2: End-to-End (E2E) Verification
- **Handshake Flow**: Trigger the GHA proxy, connect the frontend, and verify successful login.
- **Environment Toggle**: Verify that switching to 'LIVE' correctly updates the proxy target and resets the session.

### Tier 3: Security Audit
- **Secret Protection**: Ensure no Capital.com credentials are logged or exposed in the frontend bundle.
- **Token Storage**: Verify that `CST` and `X-SECURITY-TOKEN` are stored only in RAM.

## Automated Test Map

| Target | Command | Requirement |
|--------|---------|-------------|
| Proxy Logic | `npm test server/proxy.test.ts` | AUTH-01 |
| Auth Handshake | `npm test src/hooks/useSession.test.ts` | AUTH-02 |
| Store Logic | `npm test src/store/useSessionStore.test.ts` | AUTH-02 |
| Env Toggle | `npm test src/components/EnvToggle.test.tsx` | AUTH-03 |

## Success Criteria Checklist
- [ ] Ephemeral backend proxy (Hono) is reachable.
- [ ] Frontend successfully completes the CST/X-SECURITY-TOKEN handshake.
- [ ] User can toggle between Demo and Live environments.
- [ ] Real-time account equity and margin are visible.
