# Codebase Structure

**Analysis Date:** 2025-06-03

## Directory Layout

```
src/
├── components/       # UI components (ChartUnit, Workspace, Playback, etc.)
├── hooks/            # Business logic and orchestration
│   └── chart/        # Chart-specific lifecycle and viewport hooks
├── lib/              # Pure logic, utilities, and API clients
│   └── workers/      # Web Workers for heavy data processing
├── store/            # Global state management (Zustand)
└── types/            # TypeScript interfaces and type definitions
```

## Directory Purposes

**components/:**
- Purpose: View layer of the application.
- Contains: React components focused on rendering and user interaction.
- Key files: `ChartUnit.tsx`, `ChartWorkspace.tsx`, `App.tsx`.

**hooks/:**
- Purpose: Orchestration layer that connects UI to data.
- Contains: Custom hooks for session management, database interaction, and chart lifecycles.
- Key files: `useChartLifecycle.ts`, `useChartData.ts`, `useWorkspace.ts`.

**hooks/chart/:**
- Purpose: Specialized hooks for the `lightweight-charts` integration.
- Contains: Logic for initialization, plugins, drawings, and viewport synchronization.
- Key files: `useChartInit.ts`, `useChartPlugins.ts`, `useChartViewport.ts`.

**lib/:**
- Purpose: Shared logic and infrastructure that is independent of React.
- Contains: Database access logic, resampling algorithms, timezone helpers, and chart plugins.
- Key files: `db.ts`, `resampling.ts`, `timezones.ts`.

**store/:**
- Purpose: Global application state.
- Contains: Zustand stores for persistence and cross-component communication.
- Key files: `useWorkspaceStore.ts`, `usePlaybackStore.ts`.

**types/:**
- Purpose: Type safety across the application.
- Contains: Shared TypeScript definitions for market data, drawings, and app state.
- Key files: `index.ts`.

## Key File Locations

**Entry Points:**
- `src/main.tsx`: React root mounting.
- `src/App.tsx`: Main application orchestrator.

**Configuration:**
- `tsconfig.json`: TypeScript configuration.
- `vite.config.ts`: Build and dev server configuration.

**Core Logic:**
- `src/lib/db.ts`: Market data retrieval.
- `src/lib/resampling.ts`: Timeframe conversion logic.
- `src/hooks/useChartLifecycle.ts`: Chart rendering engine.

**Testing:**
- `tests/`: Contains unit, integration, and performance tests.

## Naming Conventions

**Files:**
- Components: PascalCase (e.g., `ChartUnit.tsx`).
- Hooks: camelCase with `use` prefix (e.g., `useChartData.ts`).
- Utilities: camelCase (e.g., `resampling.ts`).

**Directories:**
- Plural descriptive names (e.g., `components`, `hooks`, `store`).

## Where to Add New Code

**New Feature:**
- UI: Add components to `src/components/`.
- Logic: Create a new hook in `src/hooks/`.
- Data: Update `src/lib/db.ts` or add a new utility in `src/lib/`.

**New Component/Module:**
- Implementation: `src/components/`.
- Logic separation: Move complex state/lifecycle logic into a custom hook in `src/hooks/`.

**Utilities:**
- Shared helpers: `src/lib/`.

## Special Directories

**lib/workers/:**
- Purpose: Offloads heavy database queries and data processing to a separate thread to maintain 60fps UI.
- Generated: No.
- Committed: Yes.

---

*Structure analysis: 2025-06-03*
