# Project Research Summary

**Project:** Trading Terminal
**Domain:** UI Polishing, E2E Testing, Backend Proxy Hardening
**Researched:** 2026-06-13
**Confidence:** HIGH

## Executive Summary

The Trading Terminal v1.0 phase is focused on hardening, reliability, and UI polishing for a high-frequency trading interface that relies heavily on low latency and accurate execution. The research recommends an architecture centered around a Vercel Serverless proxy securely communicating with Capital.com APIs, combined with a polished React SPA that leverages Web Workers to keep the main thread unblocked.

The recommended approach emphasizes establishing a robust backend proxy foundation, then implementing a comprehensive Playwright E2E testing framework to validate the critical path (order execution, chart switching) before addressing UI visual bugs and premium micro-animations using `framer-motion`.

The most critical risks involve introducing latency during proxy calls, causing main-thread stuttering with heavy UI animations, and flaky E2E tests due to network or WebSocket timing issues. These risks are mitigated by optimizing serverless functions (using HTTP keep-alive agents), restricting CSS animations to non-layout properties (transform/opacity), and relying exclusively on Playwright's web-first assertions over arbitrary timeouts.

## Key Findings

### Recommended Stack

The recommended stack focuses on robust testing and validation with minimal overhead for the UI.

**Core technologies:**
- `@playwright/test`: Robust E2E and API testing — Blazing fast, natively supports multiple contexts, and provides built-in `APIRequestContext` for testing Vercel Serverless proxy routes.
- `zod`: TypeScript schema validation — Crucial for backend proxy hardening, safely validating incoming API requests and preventing security vulnerabilities.
- `framer-motion`: Fluid micro-animations — Adds premium aesthetic polish to the UI without introducing main-thread jank.

### Expected Features

**Must have (table stakes):**
- Bug-Free Critical UI — Accurate visual cues, such as the entry price indicator pointing correctly.
- Reliable Order Execution — Instant trades without silent failures or CORS issues (requires Vercel Serverless proxy hardening).
- Non-blocking UI State — App must not freeze during high-frequency data updates (relies on Web Worker cache).

**Should have (competitive):**
- Premium Aesthetic Polish — State-of-the-art dark mode with fluid micro-animations.
- Robust E2E Test Suite — Playwright tests guaranteeing zero regressions in latency or execution paths.
- Resilient Proxy Layer — Seamless handling of Capital.com backend blips and credential injection.

**Defer (v2+):**
- Heavy Client-Side Analytics
- Advanced Order Types & Strategies

### Architecture Approach

A split testing and application architecture ensures the backend proxy is robust and strictly validated independent of the UI.

**Major components:**
1. **Playwright E2E & Vitest API Tests** — Validates critical user journeys (chart switching, order placement) and proxy function reliability independently.
2. **React UI (SPA)** — Presents polished, bug-free components utilizing the existing `sync-coordinator` and Map cache.
3. **Backend Proxy (Vercel Serverless)** — Securely routes requests to Capital.com, enforcing input validation (Zod) and structured error handling.

### Critical Pitfalls

1. **Flaky E2E Tests on Time-Sensitive Features** — Avoid by using Playwright's auto-retrying web-first assertions and awaiting specific network/WebSocket responses instead of arbitrary timeouts.
2. **Serverless Function Cold Starts & Timeouts (Vercel)** — Avoid by keeping the proxy dependencies minimal, using HTTP `keep-alive` agents, and ensuring the serverless region matches the API server location.
3. **Performance Regressions from UI Polish** — Avoid by sticking strictly to `transform` and `opacity` for animations, and leveraging `requestAnimationFrame` for custom UI updates to prevent layout thrashing.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Backend Proxy Hardening & API Tests
**Rationale:** Reliable order execution is the most critical feature. Hardening the proxy forms the reliable foundation for the entire application and must happen first.
**Delivers:** Hardened Vercel Serverless functions with Zod validation, structured error handling, and Vitest API tests.
**Addresses:** Reliable Order Execution, Resilient Proxy Layer.
**Avoids:** Serverless Function Cold Starts & Timeouts.

### Phase 2: Robust End-to-End Testing (Playwright)
**Rationale:** Before polishing the UI and risking regressions, we must have solid tests covering the critical user journeys.
**Delivers:** Core Playwright E2E tests for order placement and chart switching.
**Uses:** `@playwright/test`
**Implements:** Testing Layer (Playwright E2E).

### Phase 3: UI Polishing & Bug Fixes
**Rationale:** Can be safely executed because E2E tests are now in place to catch any regressions.
**Delivers:** Critical bug fixes (e.g., entry price indicator), general dark mode polish, and fluid micro-animations.
**Uses:** `framer-motion`, `lucide-react`, `clsx`, `tailwind-merge`
**Implements:** Application React UI.

### Phase Ordering Rationale

- **Backend first:** Building backend validation (`zod`) and proxy error handling first ensures data reliability and network resilience.
- **Tests before UI:** Establishing E2E tests before UI changes acts as a safety net and safeguards against regressions during styling updates.
- **Mitigating risks sequentially:** This order naturally addresses latency and functional risks before moving on to aesthetic improvements.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 1:** May need deeper research into Vercel-specific HTTP keep-alive agent implementations for Node.js serverless functions.

Phases with standard patterns (skip research-phase):
- **Phase 2 & Phase 3:** Standard Playwright setup and React UI polishing patterns apply; no deep research required.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Verified current 2026 packages and their architectural fit for this specific environment. |
| Features | HIGH | Clear differentiation between core table stakes and nice-to-haves. |
| Architecture | HIGH | Standard modern React + Serverless pattern. |
| Pitfalls | HIGH | Known and documented issues with Vercel latency and UI rendering performance. |

**Overall confidence:** HIGH

### Gaps to Address

- Vercel `keep-alive` configuration: Need to ensure exact implementation details for reusing TCP connections to Capital.com are defined during Phase 1 planning.

## Sources

### Primary (HIGH confidence)
- Context7 (Local Execution Environment) — Verified current 2026 dist-tags for `@playwright/test`, `zod`, `framer-motion`, `clsx`, `tailwind-merge`, and `lucide-react`.
- Official Playwright Docs — Verified unified API testing features and web-first assertions.
- `PROJECT.md` — Verified architectural constraints (React 18, Vite, Vercel Serverless, Web Workers).

### Secondary (MEDIUM confidence)
- Vercel Serverless Function Optimization Guidelines — Guidelines for minimizing cold starts.
- React Performance Tuning & Rendering Strategies — Best practices for avoiding main-thread blocking.

---
*Research completed: 2026-06-13*
*Ready for roadmap: yes*
