# Coding Conventions

**Analysis Date:** 2026-08-12

## Naming Patterns

**Files:**
- React Components: PascalCase (e.g. `App.tsx`, `src/components/TradeBadge.tsx`)
- Hooks: camelCase starting with `use` (e.g. `src/hooks/useSession.ts`, `src/hooks/useDatabase.ts`)
- Config/Lib/Stores: camelCase (e.g. `vite.config.ts`, `src/store/useTradeStore.ts`, `src/services/client.ts`)

**Functions:**
- camelCase (e.g. `login`, `handleUpdateDrawings`)
- React Components: PascalCase (e.g. `TradeBadge`, `App`)

**Variables:**
- camelCase for standard variables (e.g. `isLoggingIn`, `currentPriceData`)

**Types:**
- PascalCase for interfaces/types (e.g. `TradeBadgeProps`, `ChartMarker`)

## Code Style

**Formatting:**
- Standard TypeScript and React styling applies (2 space indent).

**Linting:**
- TypeScript compiler is used heavily for type-checking.

## Import Organization

**Order:**
1. React and third-party libraries (e.g. `import React, { useEffect } from 'react';`, `import { Activity } from 'lucide-react';`)
2. Custom Hooks (e.g. `import { useDatabase } from '../hooks/useDatabase';`)
3. Components (e.g. `import { Sidebar } from './components/Sidebar';`)
4. Stores/Lib (e.g. `import { useSessionStore } from '../store/useSessionStore';`)

**Path Aliases:**
- Relative paths are mostly used (e.g. `../store/useSessionStore`, `./components/Sidebar`).

## Error Handling

**Patterns:**
- React Error Boundaries (`<ErrorBoundary>`) wrap major UI sections.
- Async operations use `try/catch` and throw or return errors for hooks (e.g., in `src/hooks/useSession.ts`, `loginMutation` uses `onError` and `try/catch`).

## Logging

**Framework:** `console`

**Patterns:**
- Heavy use of `console.log` and `console.error` prefixed with tags like `[StabilityTrace]` or `[App]` for tracing flows.

## Comments

**When to Comment:**
- Section headers in large files (e.g. `// Hooks`, `// Components`)
- Explanation of complex effects or state syncing (e.g. `// Keep-alive ping (heartbeat)`)

## Function Design

**Size:** Moderate, utilizing custom hooks to abstract complex logic out of components.

**Parameters:**
- Components use structured props interfaces (e.g. `interface TradeBadgeProps { ... }` in `src/components/TradeBadge.tsx`).
- Functions use optional parameter objects (e.g. `params?: { credentials?: ... }`).

**Return Values:**
- Custom hooks return objects containing state and handler functions.

## Module Design

**Exports:**
- Named exports are preferred for components and hooks (`export function TradeBadge`, `export function useSession`).
- `export default` is used for root components like `src/App.tsx`.

---

*Convention analysis: 2026-08-12*
