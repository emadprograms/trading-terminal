# Stack Research

**Domain:** UI Polishing, E2E Testing, Backend Proxy Hardening
**Researched:** 2026-06-13
**Confidence:** HIGH

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `@playwright/test` | ^1.60.0 | Robust E2E and API testing | Blazing fast, natively supports multiple contexts (essential for complex trading platforms with Web Workers/WebSockets), and provides built-in `APIRequestContext` which is perfect for testing Vercel Serverless proxy routes. |
| `zod` | ^4.4.3 | TypeScript schema validation | Crucial for backend proxy hardening. Safely validates incoming API requests and Capital.com payload structures, preventing malformed data and security vulnerabilities before execution. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `framer-motion` | ^12.40.0 | Fluid micro-animations | Adding premium aesthetic polish to the UI (e.g., smooth state transitions, hover effects, modal pops) without introducing jank that would affect the main thread. |
| `lucide-react` | ^1.18.0 | Crisp, scalable iconography | Fixing UI visual bugs and implementing polished assets, such as replacing the entry price indicator dash with a precise arrow. |
| `clsx` | ^2.1.1 | Conditional class joining | Whenever dynamically constructing CSS classes based on component state. |
| `tailwind-merge` | ^3.6.0 | Conflict-free class merging | Used alongside `clsx` to ensure dynamic Tailwind utility classes (like active/inactive trading states) do not conflict and are applied deterministically. |
| `@vercel/node` | ^5.8.17 | Serverless function types | To enforce strict typings on request/response objects within the `api/` directory for robust backend development. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| `Playwright UI Mode` | Visual test debugging | Run `npx playwright test --ui` for an interactive time-travel debugger. Invaluable for diagnosing complex asynchronous trading flows and WebSocket state. |
| `Vercel CLI` | Local backend proxy environment | Run `vercel dev` locally to spin up the API routes, allowing Playwright to target `http://localhost:3000/api` for comprehensive end-to-end and integration testing. |

## Installation

```bash
# Core
npm install zod

# Supporting
npm install framer-motion lucide-react clsx tailwind-merge

# Dev dependencies
npm install -D @playwright/test @vercel/node
npx playwright install --with-deps
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| `@playwright/test` | `Cypress` | If the team is heavily invested in Cypress. However, Cypress struggles with Web Workers (used by `sql.js`) and multi-tab scenarios compared to Playwright. |
| Playwright API Testing | `Supertest` + `Jest` | If backend API tests must be completely isolated from frontend E2E logic. Playwright is chosen here to unify the testing stack and reduce overhead. |
| `zod` | `joi` or `yup` | If maintaining legacy, non-TypeScript schemas. `zod` is fundamentally superior for strict TypeScript inference. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `Cypress` | Suboptimal handling of Web Workers, multiple contexts, and external cross-origin proxy network interception, which are all fundamental to the Trading Terminal's architecture. | `@playwright/test` |
| `GSAP` or Heavy Animators | Can introduce main-thread blocking or overhead that violates the core requirement of "zero lag" for chart rendering. | `framer-motion` (sparingly) or CSS transitions. |
| `Supertest` | Requires spinning up a separate mock server runner for Serverless functions. Increases context-switching for developers. | Playwright's `request.get`/`request.post` |

## Stack Patterns by Variant

**If testing the backend proxy (`api/`):**
- Use Playwright's API request context (`request.fetch`)
- Because it shares the same test configuration and authentication helpers as the UI tests, making it easy to validate e2e proxy hardening.

**If managing dynamic Tailwind styling for complex trade states:**
- Use the `cn()` utility pattern combining `clsx` and `tailwind-merge`
- Because it prevents CSS cascade bugs where base classes override state-specific classes (e.g., ensuring a `bg-red-500` loss state overrides a `bg-gray-800` default state).

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `@playwright/test@^1.60.0` | `Node.js >= 18` | Aligns perfectly with Vercel's default serverless runtime environment. |
| `framer-motion@^12.40.0` | `React 18` | Requires React 18 for optimum concurrent features which Vite is already using in this project. |

## Sources

- Context7 (Local Execution Environment) — Verified current 2026 dist-tags for `@playwright/test`, `zod`, `framer-motion`, `clsx`, `tailwind-merge`, and `lucide-react`.
- Official Playwright Docs — Verified unified API testing features.
- `PROJECT.md` — Verified architectural constraints (React 18, Vite, Vercel Serverless, Web Workers) requiring specialized handling in the chosen stack.

---
*Stack research for: UI Polishing, E2E Testing, Backend Proxy Hardening*
*Researched: 2026-06-13*
