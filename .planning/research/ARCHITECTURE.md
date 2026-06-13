# Architecture Research

**Domain:** Testing, Security Hardening, and UI Polish
**Researched:** 2026-06-13
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                       [Testing Layer]                       │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐             ┌─────────────────────┐    │
│  │ Playwright E2E  │             │  Vitest API Tests   │    │
│  │ (UI & Flows)    │             │  (Proxy Hardening)  │    │
│  └───────┬─────────┘             └──────────┬──────────┘    │
│          │                                  │               │
├──────────┴──────────────────────────────────┴───────────────┤
│                        [Application]                        │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐    │
│  │                 React 18 SPA (UI)                   │    │
│  │             [Modified: Polished & Fixed]            │    │
│  └───────┬─────────────────────────────────────────────┘    │
│          │ (API Requests)                                   │
├──────────┴──────────────────────────────────────────────────┤
│                       [Backend Proxy]                       │
│  ┌─────────────────────────────────────────────────────┐    │
│  │         Vercel Serverless Functions (`api/`)        │    │
│  │           [Modified: Hardened & Validated]          │    │
│  └───────┬─────────────────────────────────────────────┘    │
│          │ (Secure API Calls)                               │
└──────────┴──────────────────────────────────────────────────┘
           ↓
    [Capital.com API]
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| **Playwright E2E** | Validates critical user journeys (chart switching, order placement). | `playwright.config.ts`, `tests/e2e/` |
| **API Tests** | Ensures proxy functions handle credentials, validation, and errors correctly. | `vitest`, `tests/api/` |
| **React UI** | Presents polished, bug-free components. | TailwindCSS, framer-motion (optional for micro-animations) |
| **Backend Proxy** | Securely routes requests to Capital.com, enforcing input validation and structured errors. | Vercel Serverless (`api/`), Zod for schema validation |

## Recommended Project Structure

```
trading-terminal/
├── tests/
│   ├── e2e/                     # Playwright end-to-end tests
│   │   ├── order-placement.spec.ts
│   │   └── chart-switching.spec.ts
│   └── api/                     # Vitest API proxy tests
│       └── proxy.test.ts
├── src/
│   ├── components/              # Modified UI components (Polish, Bug Fixes)
│   ├── lib/                     # Existing sync-coordinator and Map cache
│   └── styles/                  # Tailwind/CSS adjustments (Dark Mode)
├── api/                         # Modified Vercel Serverless Functions
│   └── [...].ts                 # Hardened endpoints with Zod validation
└── playwright.config.ts         # Playwright setup
```

### Structure Rationale

- **`tests/e2e/` & `tests/api/`:** Separating E2E from API tests isolates concerns. Playwright runs full-stack flows (optionally with mocked API), while API tests ensure the Vercel proxy functions are secure and reliable independent of the UI.
- **`api/`:** Maintained in the root to conform with Vercel's automatic serverless deployment conventions. The functions here will be hardened with input validation schemas.
- **`src/components/`:** The existing components will be targeted for UI bug fixes (e.g., arrow indicators) and visual polish.

## Architectural Patterns

### Pattern 1: Proxy Hardening with Schema Validation

**What:** Implementing strict input validation (e.g., using Zod) and structured error handling at the entry point of Vercel Serverless Functions.
**When to use:** All proxy endpoints accepting client requests.
**Trade-offs:** Introduces minor validation overhead per request, but drastically increases system reliability and security against malformed data.

**Example:**
```typescript
// api/order.ts
import { z } from 'zod';

const OrderSchema = z.object({
  epic: z.string(),
  direction: z.enum(['BUY', 'SELL']),
  size: z.number().positive()
});

export default async function handler(req, res) {
  const result = OrderSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: 'Invalid payload', details: result.error });
  }
  // Proceed to Capital.com API
}
```

### Pattern 2: E2E Network Mocking vs. Live Testing

**What:** Playwright can intercept and mock `api/` requests or make actual requests to a sandbox environment.
**When to use:** Mocking for deterministic UI/State testing; Live Testing for end-to-end validation.
**Trade-offs:** Mocking is fast and non-flaky but may mask API contract drift. Live testing validates the full stack but is slower and requires test environment credential management.

## Data Flow

### Request Flow (Hardened Proxy)

```
[User Action in UI]
    ↓
[React Component] → [Client Fetch] 
    ↓
[Vercel Proxy] → [Schema Validation] → [Credential Injection] → [Capital.com API]
    ↓                                                                ↓
[Response] ← [Proxy Error Handling & Transform] ←────────────────────┘
```

### Key Data Flows

1. **Proxy Validation Flow:** Requests from the SPA hit the Vercel proxy, undergo strict schema validation, are enriched with server-side secrets (credentials/CORS headers), and then forwarded. Errors are caught and returned as structured JSON.
2. **E2E Test Flow:** Playwright drives the browser, interacts with the polished UI, and asserts that the sync-coordinator's in-memory Map correctly reflects the expected state without manual polling.

## Build Order & Dependencies

To ensure a smooth integration of these new features into the existing architecture, the following build order is recommended:

1. **Scaffold Testing Environments (New):**
   - Install Playwright and configure `playwright.config.ts`.
   - Setup Vitest for API testing.
   - *Dependency:* Requires existing build system (Vite).

2. **Backend Proxy Hardening & API Tests (Modified):**
   - Introduce schema validation (e.g., Zod) in `api/`.
   - Write API tests in `tests/api/` to verify proxy endpoints (error handling, successful forwarding).
   - *Dependency:* Forms the reliable foundation for the UI to interact with.

3. **Core E2E Tests (New):**
   - Write Playwright tests for existing critical flows (Order Placement, Chart Switching).
   - *Dependency:* Relies on the hardened proxy. These tests act as a safety net before modifying the UI.

4. **UI Polishing & Bug Fixes (Modified):**
   - Fix specific bugs (e.g., entry price indicator).
   - Apply general dark mode polish and micro-animations.
   - *Dependency:* Safely executed because E2E tests are now in place to catch any regressions.

## Anti-Patterns

### Anti-Pattern 1: Leaking Internal Errors to the Client

**What people do:** Directly piping Capital.com API errors or unhandled proxy exceptions back to the React app (`res.status(500).json(error)`).
**Why it's wrong:** Exposes internal stack traces, confusing the user, and potentially leaking security context.
**Do this instead:** Catch errors in the Vercel proxy, log them internally, and return a sanitized, standardized error structure to the React app.

### Anti-Pattern 2: Flaky UI-based Waits in E2E

**What people do:** Using `page.waitForTimeout(1000)` in Playwright before making assertions.
**Why it's wrong:** Causes slow tests and intermittent failures on different CI runners.
**Do this instead:** Await specific network responses (`page.waitForResponse`) or exact UI state changes (`await expect(locator).toBeVisible()`) leveraging Playwright's auto-retrying assertions.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Capital.com API | Secure Proxy Forwarding | Credentials injected purely server-side. Ensure strict timeout handling in the Vercel proxy. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| React SPA ↔ Vercel Proxy | REST API (Fetch) | Explicit contract mapping. Proxy handles CORS. SPA must gracefully handle standardized errors from proxy. |
| Playwright ↔ React SPA | DOM/Network Hooks | Playwright interacts via data-test-ids and intercepts network routes for deterministic testing. |

---
*Architecture research for: Testing, Security Hardening, and UI Polish*
*Researched: 2026-06-13*
