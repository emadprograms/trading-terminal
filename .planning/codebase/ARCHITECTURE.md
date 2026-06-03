<!-- refreshed: 2025-06-03 -->
# Architecture

**Analysis Date:** 2025-06-03

## System Overview

```text
┌─────────────────────────────────────────────────────────────┐
│                        UI Layer                             │
│    `src/App.tsx`  `src/components/ChartWorkspace.tsx`        │
└────────┬──────────────────────┬──────────────────────┬───────┘
         │                      │                      │
         ▼                      ▼                      ▼
┌─────────────────────────────────────────────────────────────┐
│                    Orchestration Layer                      │
│  `src/hooks/useWorkspace.ts` `src/hooks/useSession.ts`       │
│  `src/hooks/useChartLifecycle.ts`                           │
└────────┬──────────────────────┬──────────────────────┬───────┘
         │                      │                      │
         ▼                      ▼                      ▼
┌─────────────────────────────────────────────────────────────┐
│                      Data & Logic Layer                      │
│  `src/hooks/useChartData.ts` `src/lib/resampling.ts`         │
│  `src/lib/db.ts` `src/lib/workers/db.worker.ts`             │
└────────┬──────────────────────┬──────────────────────┬───────┘
         │                      │                      │
         ▼                      ▼                      ▼
┌─────────────────────────────────────────────────────────────┐
│                   State & Storage Layer                     │
│  `src/store/useWorkspaceStore.ts` `src/store/usePlaybackStore.ts`
└─────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| `App` | Main entry point, session orchestration, and top-level layout | `src/App.tsx` |
| `ChartWorkspace` | Manages the grid layout of charts and resizing logic | `src/components/ChartWorkspace.tsx` |
| `ChartUnit` | Encapsulates a single chart instance, its data, and lifecycle | `src/components/ChartUnit.tsx` |
| `ChartCanvas` | Lightweight-charts rendering surface | `src/components/ChartCanvas.tsx` |
| `ChartHeader` | Chart-specific controls (ticker, timeframe, drawings) | `src/components/ChartHeader.tsx` |
| `PlaybackBar` | Global playback controls and PnL display | `src/components/PlaybackBar.tsx` |
| `Sidebar` | Database management and session configuration | `src/components/Sidebar.tsx` |

## Pattern Overview

**Overall:** Layered Architecture with Hooks-based Orchestration.

**Key Characteristics:**
- **Centralized State:** Uses Zustand stores for global workspace and playback state.
- **Decoupled Logic:** Business logic (resampling, DB access, timezones) is isolated in `src/lib/`.
- **Lifecyle Management:** `useChartLifecycle` manages the complex interaction between React state and the imperative `lightweight-charts` API.
- **Atomic Data Fetching:** Each `ChartUnit` manages its own data requirements via `useChartData`.

## Layers

**UI Layer:**
- Purpose: Render the visual interface and handle user input.
- Location: `src/components/`
- Contains: React components.
- Depends on: Orchestration Layer (hooks).
- Used by: `App.tsx`.

**Orchestration Layer:**
- Purpose: Bridge the gap between UI and data, managing state transitions and side effects.
- Location: `src/hooks/`
- Contains: Custom React hooks.
- Depends on: Data Layer and State Layer.
- Used by: UI Layer.

**Data & Logic Layer:**
- Purpose: Handle raw data processing, database queries, and mathematical transformations.
- Location: `src/lib/`
- Contains: Utility functions, DB clients, and Web Workers.
- Depends on: External libraries.
- Used by: Orchestration Layer.

**State & Storage Layer:**
- Purpose: Maintain global application state and persistence.
- Location: `src/store/`
- Contains: Zustand stores.
- Depends on: Browser LocalStorage.
- Used by: Orchestration Layer and UI Layer.

## Data Flow

### Primary Request Path (Chart Loading)

1. `ChartUnit` mounts and invokes `useChartData` (`src/hooks/useChartData.ts`).
2. `useChartData` fetches raw bars from `fetchMarketData` in `src/lib/db.ts`.
3. Raw data is filtered (REG vs ETH) and resampled using `resampleData` in `src/lib/resampling.ts`.
4. `useChartLifecycle` receives the processed `chartData` and calls `priceSeries.setData()` on the `lightweight-charts` instance.
5. UI updates to reflect the loaded chart.

### Playback Flow

1. `PlaybackBar` triggers `tick()` or `stepForward()` in `usePlaybackStore` (`src/store/usePlaybackStore.ts`).
2. `usePlaybackStore` updates `currentTime`.
3. All `useChartData` hooks observing `globalTime` re-filter their `localMasterData` to simulate a real-time feed.
4. `useChartLifecycle` updates the chart series with the new filtered data.

**State Management:**
- **Workspace State:** Managed by `useWorkspaceStore` (persisted in LocalStorage). Controls tickers, groups, and active chart ID.
- **Playback State:** Managed by `usePlaybackStore`. Controls current time, playback speed, and playback status.

## Key Abstractions

**Chart Unit:**
- Purpose: A self-contained trading chart with its own ticker, timeframe, and toolset.
- Examples: `src/components/ChartUnit.tsx`
- Pattern: Composite Component.

**Chart Lifecycle:**
- Purpose: Synchronizes the declarative React world with the imperative Lightweight Charts API.
- Examples: `src/hooks/useChartLifecycle.ts`
- Pattern: Lifecycle Bridge.

## Entry Points

**App Component:**
- Location: `src/App.tsx`
- Triggers: Page load.
- Responsibilities: Initialize database, session management, and root layout.

## Architectural Constraints

- **Imperative Chart API:** `lightweight-charts` requires manual DOM manipulation and method calls, necessitating the use of `useRef` and `useEffect` in `useChartLifecycle`.
- **Data Volume:** Large historical datasets are handled via "Infinite Scroll" (fetching chunks) and a dedicated Web Worker (`src/lib/workers/db.worker.ts`) to prevent UI blocking.
- **Global Time:** The playback system relies on a single source of truth (`currentTime`) that triggers re-renders across multiple chart units.

## Error Handling

**Strategy:** Boundary-based isolation.

**Patterns:**
- `ErrorBoundary` is used around each `ChartUnit` in `ChartWorkspace.tsx` to prevent a single chart crash from taking down the entire workspace.

## Cross-Cutting Concerns

**Logging:** Standard `console.log` used for stability traces (`[StabilityTrace]`).
**Validation:** Tickers are validated and sanitized in `useWorkspaceStore.ts`.
**Authentication:** Not detected (client-side tool).

---

*Architecture analysis: 2025-06-03*
