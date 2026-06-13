# Pitfalls Research

**Domain:** Trading Terminal - UI Polishing, Playwright E2E, Serverless Proxy Hardening
**Researched:** 2026-06-13
**Confidence:** HIGH

## Critical Pitfalls

### Pitfall 1: Flaky E2E Tests on Time-Sensitive Features

**What goes wrong:**
Playwright tests for order execution or real-time chart updates fail intermittently in CI/CD pipelines due to network latency, animation timings, or asynchronous WebSocket streams.

**Why it happens:**
Asserting on UI states before the WebSocket stream has pushed the update, before backend proxies have returned the result, or before CSS animations have fully completed.

**How to avoid:**
Use Playwright's auto-retrying web-first assertions (`expect(locator).toBeVisible()`). Await specific network responses (`page.waitForResponse()`) or WebSocket frames instead of arbitrary timeouts. Disable UI animations globally during testing.

**Warning signs:**
E2E tests pass locally but fail randomly in CI/CD pipelines. Using `page.waitForTimeout()` instead of deterministic waiting.

**Phase to address:**
Robust End-to-End Testing (Playwright) Phase

---

### Pitfall 2: Serverless Function Cold Starts & Timeouts (Vercel)

**What goes wrong:**
Proxying real-time REST requests via Vercel Serverless Functions introduces high latency or timeouts during order placement, directly violating the low-latency core requirement of the application.

**Why it happens:**
Serverless environments can sleep and require cold starts. Long-running or poorly optimized proxy requests block the function and hit timeout limits. Opening new TCP connections to Capital.com for every request adds significant overhead.

**How to avoid:**
Optimize the Vercel functions for speed by keeping dependencies minimal. Use HTTP `keep-alive` agents to reuse TCP connections to Capital.com API. Ensure the Vercel serverless region matches the geographical location of Capital.com's servers.

**Warning signs:**
Intermittent slow order placements (e.g., >1000ms latency), 504 Gateway Timeout errors from Vercel, or lag complaints from high-frequency traders.

**Phase to address:**
Backend Proxy Hardening Phase

---

### Pitfall 3: Performance Regressions from UI Polish

**What goes wrong:**
Adding micro-animations, complex CSS, and exact interaction states degrades the rendering performance, causing main thread blocking and stuttering charts.

**Why it happens:**
Animatable non-transform/opacity CSS properties (like `width`, `height`, `margin`, `box-shadow`) trigger layout recalculations and repaints. Over-reliance on React state for transient UI effects (like hover) causes whole-component tree re-renders.

**How to avoid:**
Stick strictly to `transform` and `opacity` for animations. Leverage `requestAnimationFrame` for custom UI updates. Profile React re-renders rigorously when polishing states. Use CSS `:hover` instead of React `onMouseEnter`/`onMouseLeave`.

**Warning signs:**
Frame rates drop below 60fps during UI interactions or the Lightweight Chart starts to feel sluggish after styling updates.

**Phase to address:**
UI Polishing & Bug Fixes Phase

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Mocking all network in E2E tests | Fast, deterministic tests | Missing actual integration issues and proxy misconfigurations with Capital.com | Only for pure UI logic/component tests |
| Skipping error handling in Vercel proxies | Faster implementation | Silent failures on order placement or generic 500 errors | Never in financial/trading apps |
| Using timeouts (`page.waitForTimeout()`) in tests | Fixes flakiness temporarily | Tests become slow and remain flaky across different environments | Never (use Playwright Web-First Assertions) |

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Playwright + Capital.com API | Hitting live rate limits during CI runs | Implement a dedicated sandbox/test account or robust caching for non-critical paths |
| Vercel Serverless + Capital.com | Creating a new connection per request | Use HTTP keep-alive agents to reuse connections to Capital.com API |
| React + Lightweight Charts | Re-mounting chart component on style changes | Update chart options dynamically via `api.applyOptions()` without unmounting |

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Over-rendering in React | UI inputs (like order forms) feel sluggish | Use Zustand selectors properly to prevent whole-tree re-renders | High frequency market updates |
| Vercel Function memory bloat | High latency on proxy requests | Keep proxy minimal, avoid loading large SDKs just to forward REST requests | At high request concurrency |
| Animation layout thrashing | UI stutters when sidebars/modals open | Only animate `transform` and `opacity`. Avoid animating layout properties. | When rendering heavy charts simultaneously |

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Exposing Capital.com API keys in client | Total account compromise | Always route authenticated requests via Vercel Proxy and keep secrets in env variables |
| Logging sensitive order details in Vercel | PII/Financial data leak | Implement strict log scrubbing in the proxy for headers, bodies, and query params |
| Missing rate limiting on Proxy | DDoS and Capital.com API bans | Add basic rate limiting at the Vercel edge/proxy layer to protect upstream limits |

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Ambiguous error messages on order failure | Panic and loss of trust | Forward clear, actionable errors from Capital.com (e.g., "Insufficient margin" vs "Order rejected") |
| Indistinguishable loading states | User clicks multiple times (duplicate orders) | Disable order buttons and show clear, immediate visual feedback upon submission |
| Disconnected dark mode palette | Eye strain / unpolished feel | Use a consistent, scientifically checked contrast ratio tailored for numerical trading data |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **E2E Tests:** Often missing edge cases like network disconnects — verify tests handle simulated offline states or API 500s.
- [ ] **Proxy Error Handling:** Often missing precise error forwarding — verify Vercel proxy doesn't just return generic 500s but actual Capital.com error details.
- [ ] **UI Polish:** Often missing focus states for keyboard navigation — verify all interactive elements have visible `:focus-visible` styles.
- [ ] **Latency Mitigation:** Often missing Vercel region configuration — verify Vercel function region is configured to be geographically close to Capital.com servers.

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Capital.com API Ban due to E2E test loop | HIGH | Stop CI, rotate credentials, request unban, implement better test mocking/sandbox |
| Bad UI push causing trade execution lag | HIGH | Immediate rollback, profile React renders, fix, re-test, and deploy |
| Flaky E2E tests blocking deployment | MEDIUM | Temporarily mark flaky tests as `.skip` or `.soft`, deploy hotfix, fix test assertions |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Performance Regressions from UI Polish | UI Polishing & Bug Fixes | Run Chrome Lighthouse and React Profiler during chart interaction |
| Serverless Function Latency | Backend Proxy Hardening | Monitor Vercel analytics and log execution times under load |
| Flaky E2E Tests | Robust End-to-End Testing (Playwright) | Run Playwright tests with `--repeat-each 10` locally to ensure stability |

## Sources

- Playwright Best Practices Documentation
- Vercel Serverless Function Optimization Guidelines
- React Performance Tuning & Rendering Strategies
- General high-frequency trading UI engineering principles

---
*Pitfalls research for: Trading Terminal - v1.0 Hardening & Polishing*
*Researched: 2026-06-13*
