# Feature Research

**Domain:** Trading Terminal Hardening & Polishing (v1.0)
**Researched:** 2026-06-13
**Confidence:** HIGH

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Bug-Free Critical UI** | Traders rely on accurate visual cues (e.g., entry price indicator pointing correctly). | LOW | Fixes like changing dash to arrow for entry price are non-negotiable for trust. |
| **Reliable Order Execution** | Users expect trades to execute instantly without silent failures or CORS issues. | HIGH | Requires comprehensive hardening of the Vercel Serverless Functions (`api/`). |
| **Non-blocking UI State** | The app must not freeze during high-frequency data updates. | MEDIUM | Relies on the existing sql.js Web Worker cache to keep the main thread clear. |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valuable.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Premium Aesthetic Polish** | A state-of-the-art dark mode with fluid micro-animations reduces fatigue and builds professional trust. | MEDIUM | Focus on exact interaction states; avoid over-animation that distracts. |
| **Robust E2E Test Suite** | Guarantees zero regressions in latency or execution paths on every deploy. | HIGH | Using Playwright to simulate real user flows, specifically order placement and chart switching. |
| **Resilient Proxy Layer** | Seamless handling of Capital.com backend blips, credential injection, and edge cases. | HIGH | Streamlines the proxy to remove any middlemen latency while ensuring reliability. |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Heavy Client-Side Analytics** | Users want real-time portfolio performance stats. | Blocking the main thread introduces unacceptable latency for a day trader. | Defer to a separate offline dashboard or future v2 milestone. |
| **Over-Mocked Tests** | Devs want fast, 100% test coverage. | Mocking the proxy obscures real network latency, CORS, or Capital.com API issues. | Focus Playwright on critical paths (order execution) using staging environments. |

## Feature Dependencies

```text
[E2E Testing (Playwright)]
    ├──requires──> [Existing: Proxy Direct Order Placement]
    ├──requires──> [Existing: Chart Switching with pre-fetching]
    └──requires──> [UI Polishing & Bug Fixes]

[Backend Proxy Hardening]
    └──enhances──> [Existing: Proxy Direct Order Placement]

[UI Polishing & Bug Fixes]
    ├──enhances──> [Existing: Chart Switching]
    └──requires──> [Existing: Fast In-memory map cache]
```

### Dependency Notes

- **[E2E Testing] requires [Existing: Proxy Direct Order Placement]:** We must test the actual proxy path for order placement to guarantee absolute reliability.
- **[E2E Testing] requires [Existing: Chart Switching with pre-fetching]:** Playwright must verify that switching markets accurately pre-fetches data and stitches REST/WebSocket without lag.
- **[E2E Testing] requires [UI Polishing & Bug Fixes]:** Tests need stable, accurate UI elements (like the fixed entry price indicator) to avoid flaky assertions.
- **[Backend Proxy Hardening] enhances [Existing: Proxy Direct Order Placement]:** Hardening adds error handling, retries, and edge-case management to the existing Vercel proxy.
- **[UI Polishing] enhances [Existing: Chart Switching]:** Premium animations and state indicators make the fast chart switching experience feel truly professional.
- **[UI Polishing] requires [Existing: Fast In-memory map cache]:** Fluid micro-animations depend on the main thread not being blocked by data operations.

## MVP Definition

### Launch With (v1.0 Hardening)

Minimum viable product — what's needed to validate the concept.

- [x] **UI Bug Fixes (Entry price indicator)** — Essential for accurate user information and trust.
- [x] **Backend Proxy Hardening** — Essential for reliable, low-latency trade execution without CORS/credential issues.
- [x] **Core Playwright E2E Tests** — Essential to prevent regressions on the order placement critical path.

### Add After Validation (v1.x)

Features to add once core is working.

- [ ] **Advanced UI Micro-animations** — Premium feel is important, but accuracy/bugs come first.
- [ ] **Edge Case E2E Tests** — Expand Playwright test coverage once the main happy path is perfectly stable.

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] **Advanced Order Types & Strategies** — Out of scope for this hardening phase.
- [ ] **Portfolio Analytics & Performance History** — Out of scope for this hardening phase.

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Backend Proxy Hardening | HIGH | HIGH | P1 |
| Core E2E Tests (Playwright) | HIGH | MEDIUM | P1 |
| Critical UI Bug Fixes | HIGH | LOW | P1 |
| Premium Aesthetic Polish | MEDIUM | MEDIUM | P2 |
| Comprehensive Edge E2E | MEDIUM | HIGH | P2 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

## Competitor Feature Analysis

| Feature | Competitor A (Typical Broker) | Competitor B (Pro Terminal) | Our Approach |
|---------|-------------------------------|-----------------------------|--------------|
| **Order Proxy** | Heavy monolith, slow execution. | Direct API, fast but high setup complexity. | Minimal Vercel Serverless proxy for low latency and zero setup. |
| **E2E Reliability** | Manual QA, prone to human error. | Selenium, often flaky. | Modern Playwright suite focused purely on latency and critical paths. |
| **UI Polish** | Clunky, standard web interface. | Desktop application. | Fluid web UI with micro-animations in dark mode, powered by Web Workers. |

## Sources

- PROJECT.md
- General best practices for High-Frequency Trading interfaces
- Playwright and Vercel documentation

---
*Feature research for: Trading Terminal Hardening & Polishing*
*Researched: 2026-06-13*
