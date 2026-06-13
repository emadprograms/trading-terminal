# Testing

**Mapped:** 2026-06-13
**Scope:** Full codebase

## Frameworks & Tools
- **Unit/Component Testing:** Vitest paired with React Testing Library (`@testing-library/react`). Configured in `vitest.config.ts`.
- **E2E Testing:** Playwright (`@playwright/test`), configured in `playwright.config.ts`.
- **Network Mocking:** MSW (Mock Service Worker) is installed to intercept and mock API requests during tests.

## Structure
- Tests are currently located in the `tests/` directory (E2E) and co-located with components/logic (Vitest).

## Current Coverage & Practices
- **E2E:** Minimal coverage currently exists. The project is transitioning into a "hardening" phase where E2E tests for critical paths (order placement, chart rendering) are a high priority.
- **Backend:** Testing Vercel serverless functions locally requires careful mocking or the use of `vercel dev`.
