# Coding Conventions

**Analysis Date:** 2026-06-13

## Naming Patterns

**Files:**
- `PascalCase.tsx` for all React components (e.g. `ChartCanvas.tsx`, `WatchlistManager.tsx`).
- `camelCase.ts` for hooks, stores, libraries, and utilities (e.g. `useTradeStore.ts`, `data-adapter.ts`).
- `*.test.ts` / `*.test.tsx` placed in the same directory alongside their source files or inside `tests/`.

**Functions:**
- `camelCase` for all functions.
- Event handlers prefixed with `handle` (e.g. `handleFileUpload`, `handleClosePosition`).
- Async functions do not have special prefixes.

**Variables:**
- `camelCase` for standard variables.
- `UPPER_SNAKE_CASE` for global constants.

**Types:**
- Interfaces named using `PascalCase` with no special prefix (e.g. `SessionState`).
- Types named using `PascalCase` (e.g. `Timeframe`).

## Code Style

**Formatting:**
- Semicolons used consistently in source code.
- Single quotes `'` preferred for strings and import declarations.
- 2-space indentation.

**TypeScript Configuration:**
- Strict type-checking enabled (`"strict": true` in tsconfig).
- Path alias `@/*` configured for `src/*` folder roots.

## Import Organization

**Order:**
1. React / core hook imports.
2. Third-party packages (Zustand, Lightweight Charts, Hono, etc.).
3. Relative imports or path-aliased modules (`@/*`).
4. Type imports.

## Error Handling

**Patterns:**
- Core actions (API, DB) wrapped in `try/catch` blocks.
- Smart fallbacks and recovery loops in API requests (e.g. retries after 1s timeouts).
- Warnings surfaced using toast alerts (via `sonner`) or printed via console logs.

## Logging

**Patterns:**
- Custom logging messages prefixed with `[StabilityTrace]` for backend API proxy monitoring.
- Browser logs prefixed with `[DBWorker]` inside worker modules for isolation trace tracking.

## Module Design

**Exports:**
- Named exports preferred for utilities, hooks, libraries, and sub-actions.
- React components exported via named function patterns or default exports.
- Global instances (like `db` or `client`) constructed and exported as singletons from library boundaries.

---

*Convention analysis: 2026-06-13*
*Update when patterns change*
