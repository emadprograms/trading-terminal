# Technology Stack

**Analysis Date:** 2026-06-13

## Languages

**Primary:**
- TypeScript 6.0.3 - Used for all application frontend code, store, backend server proxy, and test suites.

**Secondary:**
- JavaScript - Build scripts, config files (e.g. `vite.config.ts`, `vitest.config.ts`, `playwright.config.ts`).

## Runtime

**Environment:**
- Node.js 20.x+ - Server environment for running the Hono proxy server and local build environment.
- Modern Web Browsers - Application execution environment with standard ES modules, Web Workers, WebAssembly (WASM), and OPFS (Origin Private File System) capabilities.

**Package Manager:**
- npm 10.x
- Lockfile: `package-lock.json` present

## Frameworks

**Core:**
- React 18.3.1 - UI library for the frontend.
- Hono 4.12.23 - Web framework for the proxy server (`server/index.ts`).
- Vite 5.4.10 - Bundler and dev server.

**Testing:**
- Vitest 4.1.7 - Unit and integration test runner.
- Playwright 1.60.0 - End-to-end testing library.
- Testing Library React 16.3.2 - React component rendering and assertion utilities for tests.
- MSW (Mock Service Worker) 2.14.6 - Mock API network layer for unit/integration tests.

**Build/Dev:**
- TypeScript 6.0.3 - Compilation to JavaScript.
- tsx 4.22.4 - TypeScript execution without build step (used for running backend proxy).

## Key Dependencies

**Critical:**
- `sql.js` 1.10.3 - SQLite library compiled to WebAssembly for client-side storage of market data.
- `lightweight-charts` 4.2.1 - TradingView financial charts library.
- `zustand` 5.0.14 - Frontend state management library.
- `@tanstack/react-query` 5.101.0 - Async data synchronization and state caching.
- `ky` 2.0.2 - HTTP client for browser requests.
- `@hono/node-server` 2.0.4 - Node adapter server for Hono proxy.

**Infrastructure:**
- `undici` 8.4.0 - Node fetch HTTP client.
- `dotenv` 17.4.2 - Environment configuration loader.
- `lucide-react` 0.453.0 - Icons.
- `sonner` 2.0.7 - Toast notifications.

## Configuration

**Environment:**
- `.env` & `.env.local` - Environment variables configuration (such as API keys, ports, staging vs live modes).
- `vercel.json` - Serverless runtime routing configurations for deployments.

**Build:**
- `tsconfig.json` & `tsconfig.node.json` - TypeScript compiler configurations.
- `vite.config.ts` - Bundling and assets pipeline configuration.
- `vitest.config.ts` - Unit and component test runner configuration.

## Platform Requirements

**Development:**
- Windows/macOS/Linux with Node.js LTS (>= 20).
- Standard web browser with WASM and OPFS support.

**Production:**
- Vercel or Node.js server container hosting environment (Hono proxy port is configurable).
- Frontend assets built statically and served via CDN/hosting.

---

*Stack analysis: 2026-06-13*
*Update after major dependency changes*
