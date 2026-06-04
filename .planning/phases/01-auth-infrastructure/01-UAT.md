# Phase 1 UAT: Auth & Infrastructure

## Test Suite Overview
This document tracks the User Acceptance Testing for the authentication and infrastructure layer. The goal is to verify the "Launch and Trade" experience from the user's perspective.

## Test Cases

| ID | Feature | Test Scenario | Expected Result | Status | Notes |
|----|---------|---------------|-----------------|--------|--------|
| UAT-01 | Initial State | Open terminal with no session/proxy configured | "Launch Terminal" splash screen is displayed | ✅ PASS | Verified by user. |
| UAT-02 | Env Switching | Toggle between DEMO and LIVE | UI highlights selected env; loading overlay appears during handshake | ✅ PASS | Verified by user. |
| UAT-03 | Connection | Establish session via GHA proxy | Teal "ONLINE" dot appears in header; session established | ⏳ PENDING | |
| UAT-04 | Account Data | View account metrics in header | Equity, Margin, and Available funds displayed and formatted as currency | ⏳ PENDING | |
| UAT-05 | Real-time Sync | Observe account data over 30 seconds | Values update automatically via polling without page refresh | ⏳ PENDING | |
| UAT-06 | Session Security | Refresh browser page | Session is cleared from RAM; brief re-handshake restores state | ⏳ PENDING | |

## Findings & Fixes
*No issues found yet.*
