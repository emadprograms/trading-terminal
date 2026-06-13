# Codebase Structure

**Analysis Date:** 2026-06-13

## Directory Layout

```
[project-root]/
├── .agent/             # GSD workflows, agent settings, and local skills
├── public/             # Static public assets (including sql-wasm.wasm)
├── server/             # Hono node server proxy and proxy tests
├── src/                # Frontend application source
│   ├── api/            # ky-client and broker endpoint implementations
│   ├── components/     # React presentation components
│   ├── hooks/          # React hooks for lifecycle, chart, and state management
│   ├── lib/            # Chart canvas plugins, WASM DB adapters, Web Workers
│   ├── store/          # Zustand global state stores
│   └── types/          # Shared TypeScript domain interfaces
├── tests/              # Multi-level test suites (unit, integration, regression)
├── package.json        # NPM package configuration and script registry
└── vite.config.ts      # Vite bundler options
```

## Directory Purposes

**server/**
- Purpose: Broker API proxy server to bypass CORS restriction policies.
- Contains: `index.ts` (Hono proxy app), `proxy.test.ts`.
- Key files: `server/index.ts` - routes calls and injects default secrets.

**src/components/**
- Purpose: UI components modularized by concern.
- Contains: `ChartCanvas.tsx`, `TradeControls.tsx`, `Watchlist.tsx`, etc.
- Key files:
  - `ChartCanvas.tsx` - Lightweight Charts viewport initialization.
  - `TradeControls.tsx` - Rewind playback control interface.

**src/hooks/**
- Purpose: Application hooks layer separating rendering from side effects.
- Contains: `useChartLifecycle.ts`, `useChartData.ts`, `useTradeManager.ts`, etc.
- Key files: `src/hooks/useChartLifecycle.ts` - mounts/unmounts charts.

**src/lib/**
- Purpose: Analytical plugins, DB adapters, and worker orchestration.
- Contains: `TradePlugin.ts`, `db.ts`, `sync-coordinator.ts`, `workers/`.
- Key files:
  - `src/lib/db.ts` - Communication proxy to sqlite-wasm worker.
  - `src/lib/workers/db.worker.ts` - Dedicated sqlite WASM thread.
  - `src/lib/TradePlugin.ts` - Custom canvas renderer for order levels.

**src/store/**
- Purpose: React State management stores.
- Contains: `useTradeStore.ts`, `usePlaybackStore.ts`, `useWorkspaceStore.ts`, etc.
- Key files: `src/store/useTradeStore.ts` - CFD account, margins, and orders state.

**tests/**
- Purpose: Testing organization.
- Contains: `unit/`, `integration/`, `performance/`, `regression/`, `setup.ts`.

## Key File Locations

**Entry Points:**
- `server/index.ts` - Backend Hono entry.
- `src/main.tsx` - Frontend React entry.

**Configuration:**
- `package.json` - Dependency declarations.
- `vite.config.ts` - Frontend asset loader configuration.
- `vitest.config.ts` - Testing configuration.
- `.env.local` - Environment secrets.

## Naming Conventions

**Files:**
- `PascalCase.tsx` - React components (`ChartCanvas.tsx`, `AccountHeader.tsx`).
- `camelCase.ts` - Utility hooks and functions (`useChartData.ts`, `data-adapter.ts`).
- `*.test.ts` / `*.test.tsx` - Unit tests placed next to their implementation files or inside `tests/`.

**Directories:**
- `camelCase` / lowercase directories for features and groupings (`store/`, `hooks/`, `components/`).

## Where to Add New Code

**New UI Component:**
- Implementation: `src/components/[Component].tsx`
- Types if component-specific: Inside same file, otherwise `src/types/index.ts`
- Tests: `src/components/[Component].test.tsx` (next to file) or in `tests/`.

**New Chart Plugin / Analytical Overlay:**
- Implementation: `src/lib/[PluginName]Plugin.ts`
- Registry hook update: `src/hooks/chart/useChartPlugins.ts`

**New API Endpoint Bindings:**
- Implementation: `src/api/[domain].ts`
- Client usage: Import `client` from `src/api/client.ts`

**New Playback/Analytical State:**
- Store implementation: `src/store/use[State]Store.ts`

## Special Directories

**public/**
- Purpose: Stores assets served directly.
- Key files: `public/sql-wasm.wasm` - Copied on postinstall from `sql.js` to run client database engine.

---

*Structure analysis: 2026-06-13*
*Update when directory structure changes*
