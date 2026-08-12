# Codebase Structure

**Analysis Date:** 2026-08-12

## Directory Layout

```
trading-terminal/
├── api/            # Serverless backend API proxies (Vercel Functions)
├── public/         # Static assets (images, icons, etc.)
└── src/            # Frontend application source code
    ├── components/ # React UI components (co-located tests)
    ├── hooks/      # Custom React hooks and React Query integrations
    ├── lib/        # Shared utilities, adapters, and plugins
    ├── services/   # Frontend API client modules
    ├── store/      # Zustand global state stores
    └── types/      # TypeScript interfaces and types
```

## Directory Purposes

**`api/`:**
- Purpose: Backend serverless endpoints handling API proxying, secrets, and initial validation.
- Contains: Node.js/TypeScript endpoint files (e.g., `order.ts`, `session.ts`) and shared backend utils (`_utils.ts`).
- Key files: `api/_utils.ts`, `api/order.ts`, `api/market.ts`

**`src/components/`:**
- Purpose: Reusable and feature-specific React UI components.
- Contains: `.tsx` files for components, co-located `.test.tsx` files.
- Key files: `src/components/ChartWorkspace.tsx`, `src/components/TradeControls.tsx`

**`src/hooks/`:**
- Purpose: Abstractions for React state and lifecycles, and data-fetching hooks (React Query).
- Contains: Custom hooks (`.ts`), often integrating `useQuery` or `useMutation`.
- Key files: `src/hooks/useChartData.ts`, `src/hooks/useSession.ts`

**`src/store/`:**
- Purpose: Global client-side state management.
- Contains: Zustand stores representing different application domains.
- Key files: `src/store/useTradeStore.ts`, `src/store/useSessionStore.ts`

**`src/services/`:**
- Purpose: Wrappers for frontend-to-backend API communication.
- Contains: Axios/Fetch API client functions.
- Key files: `src/services/trade.ts`, `src/services/account.ts`, `src/services/client.ts`

**`src/types/`:**
- Purpose: Centralized TypeScript types used across the frontend.
- Contains: Interfaces, enums, type aliases.
- Key files: `src/types/index.ts`, `src/types/trade.ts`

## Key File Locations

**Entry Points:**
- `src/main.tsx`: Frontend React application entry point.
- `src/App.tsx`: Main React component wiring providers and layout.

**Configuration:**
- `vite.config.ts`: Vite bundler configuration.
- `tsconfig.json`: TypeScript compiler configuration.
- `vercel.json`: Vercel deployment configuration.

**Core Logic:**
- `src/store/useTradeStore.ts`: Core trade execution and position management state.
- `src/store/useSessionStore.ts`: Authentication and session management state.

**Testing:**
- `vitest.config.ts`: Vitest configuration.
- `src/**/*.test.tsx?`: Unit tests are co-located next to their source files.

## Naming Conventions

**Files:**
- React Components: PascalCase (`TradeControls.tsx`)
- Hooks: camelCase starting with `use` (`useChartData.ts`)
- Services & Stores: camelCase (`trade.ts`, `useTradeStore.ts`)
- Tests: `[name].test.ts` or `[name].test.tsx`

**Directories:**
- camelCase or all-lowercase (`components`, `hooks`, `chart`)

## Where to Add New Code

**New UI Feature:**
- Primary code: `src/components/[FeatureName].tsx`
- State (if global): `src/store/use[Feature]Store.ts`
- Tests: `src/components/[FeatureName].test.tsx`

**New API Endpoint (Backend):**
- Implementation: `api/[endpoint].ts`

**New API Client Wrapper (Frontend):**
- Implementation: `src/services/[domain].ts`
- Query Hooks: `src/hooks/use[Domain].ts`

**Utilities:**
- Shared helpers: `src/lib/[utility-name].ts`

## Special Directories

**`dist/`:**
- Purpose: Compiled production frontend build output.
- Generated: Yes
- Committed: No

**`node_modules/`:**
- Purpose: npm dependencies.
- Generated: Yes
- Committed: No

---

*Structure analysis: 2026-08-12*
