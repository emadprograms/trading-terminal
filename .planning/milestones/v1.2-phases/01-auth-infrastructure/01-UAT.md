# Phase 1 UAT: Auth & Infrastructure

## Test Suite Overview
This document tracks the User Acceptance Testing for the authentication and infrastructure layer. The goal is to verify the "Launch and Trade" experience from the user's perspective.

## Test Cases

| ID | Feature | Test Scenario | Expected Result | Status | Notes |
|----|---------|---------------|-----------------|--------|--------|
| UAT-01 | Initial State | Open terminal with no session/proxy configured | "Launch Terminal" splash screen is displayed | ✅ PASS | Verified by user. |
| UAT-02 | Env Switching | Toggle between DEMO and LIVE | UI highlights selected env; loading overlay appears during handshake | ✅ PASS | Verified by user. |
| UAT-03 | Connection | Establish session via GHA proxy | Teal "ONLINE" dot appears in header; session established | ✅ PASS | Verified by user. |
| UAT-04 | Account Data | View account metrics in header | Equity, Margin, and Available funds displayed and formatted as currency | ✅ PASS | Verified by user. |
| UAT-05 | Real-time Sync | Observe account data over 30 seconds | Values update automatically via polling without page refresh | ❌ FAIL | Polling is too slow; user requires true real-time updates for PnL. |
| UAT-06 | Session Security | Refresh browser page | Session is cleared from RAM; brief re-handshake restores state | ❌ FAIL | Proxy URL is lost on refresh; user must re-enter it. |

## Findings & Fixes
- **Issue 1 (UAT-05)**: Account data (specifically PnL) uses polling (10s), which is not real-time.
- **Fix 1**: Transition account state synchronization from polling to WebSockets in Phase 2 (or as a Phase 1 gap closure).
- **Issue 2 (UAT-06)**: Proxy URL and session state are not persisted across page refreshes.
- **Fix 2**: Implement `localStorage` persistence for the `proxyUrl` in `useSessionStore.ts`.
