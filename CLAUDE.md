<!-- GSD:project-start source:PROJECT.md -->

## Project

**Project: Capital.com Trading Terminal**

A professional-grade live trading terminal connected to Capital.com, designed for high-efficiency stock trading. It transforms a previous market-playback tool into a live execution platform, allowing the user to monitor live Bid/Ask tick data, manage multiple account types (Live/Demo), and execute trades via dedicated keyboard shortcuts.

**Core Value:** **Zero-friction execution.** The ability to move from a chart pattern to a live trade (with automated Stop Loss) using a single keyboard shortcut, powered by real-time WebSocket data and a lightweight, ephemeral backend.
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->

## Technology Stack

## Languages

- TypeScript 6.0.3 - Frontend application logic and types
- Python - Backend data archival and synchronization scripts (`backend/`)

## Runtime

- Node.js (Frontend/Build)
- Python 3.x (Backend)
- npm (Frontend)
- pip (Backend - `requirements.txt`)
- Lockfile: `package-lock.json` (implied by npm)

## Frameworks

- React 18.3.1 - UI Framework
- Vite 5.4.10 - Build tool and development server
- Vitest 4.1.7 - Unit and integration testing
- Playwright 1.60.0 - E2E testing
- MSW 2.14.6 - API mocking for tests
- TypeScript 6.0.3 - Static typing

## Key Dependencies

- `lightweight-charts` 4.2.1 - Financial charting engine
- `zustand` 5.0.14 - Lightweight state management
- `sql.js` 1.10.3 - SQLite compiled to WebAssembly for client-side data querying
- `lucide-react` 0.453.0 - Icon set
- `polygon-api-client` - Accessing Polygon.io market data
- `infisicalsdk` - Secret and environment variable management
- `libsql-client` / `libsql` - Connection to Turso (LibSQL) databases

## Configuration

- Frontend: Managed via Vite environment variables.
- Backend: Managed via Infisical and `.env` files (using `python-dotenv`).
- `vite.config.ts` - Vite configuration
- `tsconfig.json` - TypeScript compiler options

## Platform Requirements

- Node.js
- Python 3.x
- Vercel (Frontend deployment)
- Turso (Database hosting)

<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->

## Conventions

## Naming Patterns

- Components: PascalCase (e.g., `src/components/ChartCanvas.tsx`)
- Hooks: camelCase with `use` prefix (e.g., `src/hooks/useChartLifecycle.ts`)
- Stores: camelCase with `use` prefix (e.g., `src/store/useWorkspaceStore.ts`)
- Utilities/Lib: camelCase (e.g., `src/lib/resampling.ts`)
- Types: `index.ts` in `src/types/` for central type definitions.
- React Components: PascalCase
- Hooks/Utility functions: camelCase (e.g., `getEffectiveTicker`, `syncViewport`)
- Event handlers: camelCase, often prefixed with `on` (e.g., `onUpdateDrawings`)
- camelCase for local variables and state.
- PascalCase for Types and Interfaces (e.g., `ChartBar`, `ActiveTrade`).
- UPPER_SNAKE_CASE for constants (e.g., `TF_MINUTES`, `BORDER_COLORS` in `src/types/index.ts`).
- Interfaces used for object shapes (e.g., `ChartUnitProps`, `RawBar`).
- Type aliases used for unions or simple mappings (e.g., `Timeframe`, `GroupColor`).

## Code Style

- Not explicitly configured via `.prettierrc` or `.eslintrc` in root (checked, files missing), but follows standard TypeScript/React conventions.
- 2-space indentation is observed.
- No explicit lint configuration files found in the root.

## Import Organization

- Relative imports are primarily used (e.g., `../../src/store/useWorkspaceStore`).

## Error Handling

- `ErrorBoundary` component used for UI-level crash prevention (`src/components/ErrorBoundary.tsx`).
- Try-catch blocks used in cleanup functions and sensitive logic (e.g., `useChartLifecycle.ts` during unsubscribe).
- Use of `null` or empty strings/arrays as fallback values.

## Logging

- Use of stability traces for debugging complex lifecycle events (e.g., `[StabilityTrace]` in `src/hooks/useChartLifecycle.ts`).

## Comments

- Used to mark sections of a file (e.g., `// --- Market Data ---` in `src/types/index.ts`).
- Used to explain complex logic or stability fixes (e.g., `// The AUTO_REVEAL_THRESHOLD is now inside useChartViewport`).

## Function Design

- Hooks are decomposed into smaller specialized hooks (e.g., `useChartLifecycle` calls `useChartInit`, `useChartPlugins`, `useChartViewport`, `useChartDrawings`).
- Destructuring pattern used for complex parameter objects (e.g., `UseChartLifecycleParams` in `src/hooks/useChartLifecycle.ts`).
- Hooks return objects containing state and control functions.

## Module Design

- Named exports are preferred.
- `src/types/index.ts` acts as a central registry for all domain types.

<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->

## Architecture

## System Overview

```text

```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| `App` | Main entry point, session orchestration, and top-level layout | `src/App.tsx` |
| `ChartWorkspace` | Manages the grid layout of charts and resizing logic | `src/components/ChartWorkspace.tsx` |
| `ChartUnit` | Encapsulates a single chart instance, its data, and lifecycle | `src/components/ChartUnit.tsx` |
| `ChartCanvas` | Lightweight-charts rendering surface | `src/components/ChartCanvas.tsx` |
| `ChartHeader` | Chart-specific controls (ticker, timeframe, drawings) and Live Price display | `src/components/ChartHeader.tsx` |
| `AccountHeader` | Global account metrics (Equity, Margin, PnL) | `src/components/AccountHeader.tsx` |
| `Sidebar` | Layout selection and session configuration | `src/components/Sidebar.tsx` |

## Pattern Overview

- **Centralized State**: Uses Zustand stores for workspace, pricing (`usePriceStore`), and sessions.
- **Live Data Flow**: `useChartData` fetches from the Capital.com API via `marketApi` (REST).
- **Real-time Updates**: `wsManager` handles WebSocket connections for tick data, updating the global price store.
- **Ephemeral Infrastructure**: Backend proxy handles auth tokens and CORS bypass.

## Layers

- Purpose: Render the visual interface and handle user input.
- Location: `src/components/`
- Contains: React components.
- Depends on: Orchestration Layer (hooks).
- Used by: `App.tsx`.
- Purpose: Bridge the gap between UI and data, managing state transitions and side effects.
- Location: `src/hooks/`
- Contains: Custom React hooks.
- Depends on: Data Layer and State Layer.
- Used by: UI Layer.
- Purpose: Handle raw data processing, database queries, and mathematical transformations.
- Location: `src/lib/`
- Contains: Utility functions, DB clients, and Web Workers.
- Depends on: External libraries.
- Used by: Orchestration Layer.
- Purpose: Maintain global application state and persistence.
- Location: `src/store/`
- Contains: Zustand stores.
- Depends on: Browser LocalStorage.
- Used by: Orchestration Layer and UI Layer.

## Data Flow

### Primary Request Path (Chart Loading)

### Playback Flow

- **Workspace State:** Managed by `useWorkspaceStore` (persisted in LocalStorage). Controls tickers, groups, and active chart ID.
- **Playback State:** Managed by `usePlaybackStore`. Controls current time, playback speed, and playback status.

## Key Abstractions

- Purpose: A self-contained trading chart with its own ticker, timeframe, and toolset.
- Examples: `src/components/ChartUnit.tsx`
- Pattern: Composite Component.
- Purpose: Synchronizes the declarative React world with the imperative Lightweight Charts API.
- Examples: `src/hooks/useChartLifecycle.ts`
- Pattern: Lifecycle Bridge.

## Entry Points

- Location: `src/App.tsx`
- Triggers: Page load.
- Responsibilities: Initialize database, session management, and root layout.

## Architectural Constraints

- **Imperative Chart API:** `lightweight-charts` requires manual DOM manipulation and method calls, necessitating the use of `useRef` and `useEffect` in `useChartLifecycle`.
- **Data Volume:** Large historical datasets are handled via "Infinite Scroll" (fetching chunks) and a dedicated Web Worker (`src/lib/workers/db.worker.ts`) to prevent UI blocking.
- **Global Time:** The playback system relies on a single source of truth (`currentTime`) that triggers re-renders across multiple chart units.

## Error Handling

- `ErrorBoundary` is used around each `ChartUnit` in `ChartWorkspace.tsx` to prevent a single chart crash from taking down the entire workspace.

## Cross-Cutting Concerns

<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->

## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->

## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:

- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->

## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
