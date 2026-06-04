# Architecture

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
│  `src/hooks/useChartData.ts` `src/lib/ws-manager.ts`         │
│  `src/api/market.ts` `src/lib/data-adapter.ts`              │
└────────┬──────────────────────┬──────────────────────┬───────┘
         │                      │                      │
         ▼                      ▼                      ▼
┌─────────────────────────────────────────────────────────────┐
│                   State & Storage Layer                     │
│  `src/store/useWorkspaceStore.ts` `src/store/usePriceStore.ts`
│  `src/store/useSessionStore.ts`                             │
└─────────────────────────────────────────────────────────────┘
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

**Overall:** Live-Market Terminal with Hooks-based Orchestration and Real-time WebSocket updates.

**Key Characteristics:**
- **Centralized State:** Uses Zustand stores for global workspace, live pricing, and session tokens.
- **Decoupled Logic:** Market API interaction, WebSocket management, and data transformation are isolated in `src/api/` and `src/lib/`.
- **Lifecyle Management:** `useChartLifecycle` manages the interaction between React state and the imperative `lightweight-charts` API.
- **REST + WS Sync:** Historical data is fetched via REST on mount; real-time updates are pushed via WebSocket to a global price store.

## Layers

**UI Layer:**
- Purpose: Render the visual interface and handle user input.
- Location: `src/components/`
- Contains: React components.
- Depends on: Orchestration Layer (hooks).

**Orchestration Layer:**
- Purpose: Bridge the gap between UI and data, managing state transitions and side effects.
- Location: `src/hooks/`
- Contains: Custom React hooks.
- Depends on: Data Layer and State Layer.

**Data & Logic Layer:**
- Purpose: Handle API communication, WebSocket lifecycle, and data normalization.
- Location: `src/api/` and `src/lib/`
- Contains: `marketApi`, `wsManager`, and `data-adapter`.
- Depends on: Ky (HTTP) and Native WebSockets.

**State & Storage Layer:**
- Purpose: Maintain global application state, price feeds, and authentication tokens.
- Location: `src/store/`
- Contains: Zustand stores (`useSessionStore`, `usePriceStore`, `useWorkspaceStore`).
- Depends on: Browser LocalStorage.

## Data Flow

### Primary Request Path (Chart Loading)

1. `ChartUnit` mounts and invokes `useChartData` (`src/hooks/useChartData.ts`).
2. `useChartData` fetches historical bars from `marketApi.fetchCandles` via `src/lib/db.ts` (proxied to REST API).
3. Data is transformed into the internal `RawBar` format via `src/lib/data-adapter.ts`.
4. `useChartLifecycle` receives the processed `chartData` and updates the chart series.

### Real-time Update Flow

1. `wsManager` receives a price update for a subscribed epic.
2. `wsManager` calls `usePriceStore.getState().updatePrice()`.
3. `ChartHeader` (and other components) observing the price store re-render to show the live Bid/Ask.
4. (Optional) Latest candle on the chart is updated with the new price tick.

## Key Abstractions

**Market API:**
- Purpose: Centralized gateway for all REST communication with Capital.com.
- Location: `src/api/market.ts`

**WebSocket Manager:**
- Purpose: Singleton managing the lifecycle, authentication, and subscription of market data streams.
- Location: `src/lib/ws-manager.ts`

**Data Adapter:**
- Purpose: Normalizes external API shapes (Capital.com) into the terminal's internal formats (`RawBar`, `FormattedBar`).
- Location: `src/lib/data-adapter.ts`

## Entry Points

**App Component:**
- Location: `src/App.tsx`
- Triggers: Page load / Authentication.
- Responsibilities: Session handshake, global layout, and high-level routing (Splash -> SessionConfig -> Workspace).

## Architectural Constraints

- **Ephemeral Proxy:** The terminal depends on a healthy Proxy URL provided by the GHA Tunnel to bypass CORS and handle auth headers.
- **WebSocket Throttling:** Subscriptions are managed per epic to avoid overloading the socket connection.

## Error Handling

**Strategy:** Boundary-based isolation and Stability Traces.

**Patterns:**
- `ErrorBoundary` around each `ChartUnit`.
- `[StabilityTrace]` logs for critical auth and connection events.
