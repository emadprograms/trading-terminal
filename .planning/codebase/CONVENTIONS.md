# Coding Conventions

**Analysis Date:** 2025-06-03

## Naming Patterns

**Files:**
- Components: PascalCase (e.g., `src/components/ChartCanvas.tsx`)
- Hooks: camelCase with `use` prefix (e.g., `src/hooks/useChartLifecycle.ts`)
- Stores: camelCase with `use` prefix (e.g., `src/store/useWorkspaceStore.ts`)
- Utilities/Lib: camelCase (e.g., `src/lib/resampling.ts`)
- Types: `index.ts` in `src/types/` for central type definitions.

**Functions:**
- React Components: PascalCase
- Hooks/Utility functions: camelCase (e.g., `getEffectiveTicker`, `syncViewport`)
- Event handlers: camelCase, often prefixed with `on` (e.g., `onUpdateDrawings`)

**Variables:**
- camelCase for local variables and state.
- PascalCase for Types and Interfaces (e.g., `ChartBar`, `ActiveTrade`).
- UPPER_SNAKE_CASE for constants (e.g., `TF_MINUTES`, `BORDER_COLORS` in `src/types/index.ts`).

**Types:**
- Interfaces used for object shapes (e.g., `ChartUnitProps`, `RawBar`).
- Type aliases used for unions or simple mappings (e.g., `Timeframe`, `GroupColor`).

## Code Style

**Formatting:**
- Not explicitly configured via `.prettierrc` or `.eslintrc` in root (checked, files missing), but follows standard TypeScript/React conventions.
- 2-space indentation is observed.

**Linting:**
- No explicit lint configuration files found in the root.

## Import Organization

**Order:**
1. React and core libraries.
2. Third-party dependencies (e.g., `lightweight-charts`, `zustand`).
3. Project types.
4. Local hooks and utilities.
5. Local components.

**Path Aliases:**
- Relative imports are primarily used (e.g., `../../src/store/useWorkspaceStore`).

## Error Handling

**Patterns:**
- `ErrorBoundary` component used for UI-level crash prevention (`src/components/ErrorBoundary.tsx`).
- Try-catch blocks used in cleanup functions and sensitive logic (e.g., `useChartLifecycle.ts` during unsubscribe).
- Use of `null` or empty strings/arrays as fallback values.

## Logging

**Framework:** `console`

**Patterns:**
- Use of stability traces for debugging complex lifecycle events (e.g., `[StabilityTrace]` in `src/hooks/useChartLifecycle.ts`).

## Comments

**When to Comment:**
- Used to mark sections of a file (e.g., `// --- Market Data ---` in `src/types/index.ts`).
- Used to explain complex logic or stability fixes (e.g., `// The AUTO_REVEAL_THRESHOLD is now inside useChartViewport`).

## Function Design

**Size:**
- Hooks are decomposed into smaller specialized hooks (e.g., `useChartLifecycle` calls `useChartInit`, `useChartPlugins`, `useChartViewport`, `useChartDrawings`).

**Parameters:**
- Destructuring pattern used for complex parameter objects (e.g., `UseChartLifecycleParams` in `src/hooks/useChartLifecycle.ts`).

**Return Values:**
- Hooks return objects containing state and control functions.

## Module Design

**Exports:**
- Named exports are preferred.

**Barrel Files:**
- `src/types/index.ts` acts as a central registry for all domain types.

---

*Convention analysis: 2025-06-03*
