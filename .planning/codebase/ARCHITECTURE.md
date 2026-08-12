<!-- refreshed: 2026-08-12 -->
# Architecture

**Analysis Date:** 2026-08-12

## System Overview

```text
┌─────────────────────────────────────────────────────────────┐
│                      UI Components                           │
├──────────────────┬──────────────────┬───────────────────────┤
│   ChartCanvas    │  TradeControls   │    Watchlist          │
│  `src/components`│  `src/components`│   `src/components`    │
└────────┬─────────┴────────┬─────────┴──────────┬────────────┘
         │                  │                     │
         ▼                  ▼                     ▼
┌─────────────────────────────────────────────────────────────┐
│                  State & Logic Hooks                        │
│         `src/store` & `src/hooks`                           │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│                    API Client Services                       │
│         `src/services`                                       │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Serverless API Proxy                      │
│         `api/` (Vercel Functions)                            │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│               External Trading Provider (Capital.com)        │
└─────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| `App` | Main application layout and providers | `src/App.tsx` |
| `ChartWorkspace` | Manages the chart area and toolbars | `src/components/ChartWorkspace.tsx` |
| `TradeControls` | Input form for placing trades | `src/components/TradeControls.tsx` |
| `TradeLog` | Displays active positions and history | `src/components/TradeLog.tsx` |
| `WatchlistManager` | Manages list of tracked instruments | `src/components/WatchlistManager.tsx` |

## Pattern Overview

**Overall:** Client-Side SPA with Serverless Proxy

**Key Characteristics:**
- **Component-Based UI:** React is used for building encapsulated, reusable UI components.
- **Global State Management:** Zustand handles complex client-side state across the app.
- **Serverless API Proxy:** Vercel serverless functions in `api/` proxy requests to the external trading provider, handling CORS, secrets, and validation.

## Layers

**UI Layer:**
- Purpose: Renders the user interface and captures user interactions.
- Location: `src/components/`
- Contains: React `.tsx` components
- Depends on: `src/store/`, `src/hooks/`, `src/types/`
- Used by: `src/App.tsx`

**State & Logic (Store/Hooks):**
- Purpose: Manages global state, derived data, and complex business logic.
- Location: `src/store/` and `src/hooks/`
- Contains: Zustand stores, custom React hooks
- Depends on: `src/services/`
- Used by: `src/components/`

**API Services Layer (Client):**
- Purpose: Wraps API calls to backend endpoints.
- Location: `src/services/`
- Contains: TypeScript `.ts` modules
- Depends on: `src/lib/api-utils.ts`
- Used by: `src/store/`, `src/components/`

**API Proxy Layer (Serverless):**
- Purpose: Securely proxies requests to external providers (Capital.com), validates input schemas.
- Location: `api/`
- Contains: Node.js serverless handlers (`.ts`)
- Depends on: `api/_utils.ts`
- Used by: Frontend HTTP client

## Data Flow

### Primary Request Path (Placing a Trade)

1. Trade form submission (`src/components/TradeControls.tsx`)
2. Store action triggered (`src/store/useTradeStore.ts`)
3. API client called (`src/services/trade.ts`)
4. Proxy validates & forwards request (`api/order.ts`)

### State Management Flow

1. External data fetched via React Query or Zustand actions.
2. Store state mutated.
3. Components re-render based on selected state slices.

**State Management:**
- Zustand for global application state (`useTradeStore`, `useSessionStore`, `usePriceStore`).
- React Query (TanStack Query) for remote data fetching and caching (used in hooks).
- Local component state via `useState`.

## Key Abstractions

**API Utilities:**
- Purpose: Shared HTTP request wrappers and token management.
- Examples: `src/lib/api-utils.ts`
- Pattern: Axios/Fetch wrappers with interceptors.

**Proxy Utilities:**
- Purpose: Serverless request proxying to Capital.com.
- Examples: `api/_utils.ts`
- Pattern: HTTP stream proxying and error mapping.

## Entry Points

**Frontend Application:**
- Location: `src/main.tsx`
- Triggers: Browser load
- Responsibilities: Initializes React, mounts App, provides QueryClient.

**Backend Proxy:**
- Location: `api/*.ts` (e.g., `api/order.ts`, `api/market.ts`)
- Triggers: HTTP requests to `/api/*`
- Responsibilities: Input validation (Zod), request forwarding, error handling.

## Architectural Constraints

- **Threading:** Single-threaded JavaScript execution on frontend and backend serverless endpoints.
- **Global state:** Handled centrally by Zustand to avoid prop drilling and scattered context providers.
- **Security:** Credentials and API keys must remain backend-only, hence the proxy layer.

## Anti-Patterns

### Direct External API Calls from Client

**What happens:** Client code makes HTTP requests directly to Capital.com.
**Why it's wrong:** Exposes API keys, causes CORS errors, circumvents centralized request/response mapping.
**Do this instead:** Route calls through the `api/` proxy.

## Error Handling

**Strategy:** Centralized and typed error reporting.

**Patterns:**
- UI displays errors via Toaster (`sonner`).
- API proxy catches request errors, normalizes them, and returns standard JSON responses with `errorCode` and `developerMessage`.

## Cross-Cutting Concerns

**Logging:** Backend uses `console.log` with `[StabilityTrace]` prefixes for tracking request lifecycles.
**Validation:** Backend endpoints use Zod for schema validation on incoming payloads (e.g., `marketOrderSchema` in `api/order.ts`).
**Authentication:** Managed via session tokens handled by `src/store/useSessionStore.ts` and `api/session.ts`.

---

*Architecture analysis: 2026-08-12*
