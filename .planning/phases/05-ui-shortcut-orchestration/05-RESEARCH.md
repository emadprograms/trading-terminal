# Phase 5: UI & Shortcut Orchestration - Research

**Researched:** 2024-06-05
**Domain:** UI/UX, Keyboard Orchestration, Financial Charting
**Confidence:** HIGH

## Summary

Phase 5 delivers a "Zero-Friction" trading experience by integrating rapid keyboard execution and visual feedback. The architecture centers around extending the existing keyboard orchestrator to map specialized keybindings (Ctrl+1, Alt+1, etc.) to the `useTradeStore` (Capital.com API), and a marker synchronization system that renders executed trades directly on the financial charts.

**Primary recommendation:** Extend the existing `useKeyboardShortcuts` hook to include trade execution logic and leverage the native `setMarkers` API of Lightweight Charts via a new `useChartMarkers` hook.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Shortcut Listening | Browser / Client | `useKeyboardShortcuts` | Captured via `addEventListener('keydown')` within the chart unit context. |
| Trade Orchestration | `useTradeStore` | `tradeApi` | Dispatches orders to the Capital.com backend proxy. |
| Visual Markers | `useChartMarkers` | Chart Layer | Direct rendering on the Canvas via Lightweight Charts `setMarkers` API. |
| Size Management | `useSettingsStore` | Local Storage | Persists user preferences for "default sizes" across sessions using Zustand `persist`. |
| Feedback (Toasts) | `sonner` | — | Already integrated; provides immediate non-blocking confirmation. |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Native Events | — | Keyboard shortcuts | Existing `useKeyboardShortcuts` already uses manual keydown listeners; extending it minimizes dependencies. |
| `lightweight-charts` | 4.2.1 | Financial Charting | Already integrated; provides optimized Canvas rendering for markers. |
| `sonner` | 2.0.7 | Notifications | Already integrated; used for immediate visual feedback on trade execution. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|--------------|
| `zustand` | 5.0.x | State Management | Persisting default sizes and tracking active chart selection. |

## Architecture Patterns

### Recommended Project Structure
```
src/
├── hooks/
│   ├── useChartMarkers.ts     # NEW: Marker synchronization
│   └── useKeyboardShortcuts.ts # EXTEND: Add trade shortcuts
├── store/
│   └── useSettingsStore.ts    # NEW: Persisted UI/Trade settings
└── components/
    └── AccountHeader.tsx      # EXTEND: Add Default Size input
```

### Pattern 1: Shortcut Orchestration (Extending `useKeyboardShortcuts.ts`)
The existing hook should be updated to accept `defaultSize` and `placeOrder` as params.

```typescript
// Inside handleKeyDown in useKeyboardShortcuts.ts
if (e.ctrlKey && e.key === '1') {
  e.preventDefault();
  placeOrder({ epic: ticker, size: defaultSize, direction: 'BUY', type: 'MARKET' });
}
```

### Pattern 2: Marker Synchronization (`useChartMarkers.ts`)
Markers must be synchronized with the chart series. Since `setMarkers` replaces the entire set, subscribe to `useTradeStore`.

```typescript
// Important: Convert ms to seconds for Lightweight Charts
const markers = positions
  .filter(p => p.epic === ticker)
  .map(p => ({
    time: Math.floor(p.timestamp / 1000), 
    position: p.direction === 'BUY' ? 'belowBar' : 'aboveBar',
    color: p.direction === 'BUY' ? '#26a69a' : '#ef5350',
    shape: p.direction === 'BUY' ? 'arrowUp' : 'arrowDown',
    text: `${p.direction === 'BUY' ? 'B' : 'S'} ${p.size}`,
  }));
```

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| State Persistence | Custom `localStorage` | Zustand `persist` | Handles hydration and serialization automatically. |
| Notification Queue | Custom Toast system | `sonner` | Already integrated and used in `useTradeStore`. |

## Common Pitfalls

### Pitfall 1: Browser Default Overrides
**What goes wrong:** `Ctrl+1` through `Ctrl+9` are standard shortcuts in Chrome/Firefox to switch tabs.
**How to avoid:** Use `e.preventDefault()` in the keydown handler.
**Warning signs:** Pressing the shortcut switches tabs instead of placing a trade.

### Pitfall 2: Time Precision Mismatch
**What goes wrong:** `Date.now()` (used in `useTradeStore`) returns milliseconds, but Lightweight Charts expects seconds.
**How to avoid:** Always `Math.floor(timestamp / 1000)`.

### Pitfall 3: Shortcut Conflict with Input
**What goes wrong:** Typing in the "Default Size" input or Ticker input triggers a trade.
**How to avoid:** Keep the existing check for `(e.target as HTMLElement).tagName === 'INPUT'`.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `useTradeStore` is the target for shortcuts | Summary | Phase 5 might also apply to replay mode (local trades), but requirements imply real execution. |
| A2 | Markers should be global to the ticker | Architecture | Multiple charts for same ticker will all show same markers (standard behavior). |

## Open Questions

1. **Replay Mode Support:**
   - Should shortcuts also work for `useTradeManager` (local/replay trades)?
   - Recommendation: Start with `useTradeStore` (Real) as per requirements, but allow future toggle.

2. **Marker Customization:**
   - Should users be able to hide markers?
   - Recommendation: Add a toggle in `useSettingsStore` later.

## Environment Availability

- **Existing Hooks:** `useKeyboardShortcuts` (ready), `useTradeStore` (ready), `usePriceStore` (ready).
- **Lightweight Charts:** Native marker support confirmed.

## Validation Architecture

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command |
|--------|----------|-----------|-------------------|
| UI-01 | Ctrl+1 triggers `placeOrder` | unit | `npm test src/hooks/useKeyboardShortcuts.test.ts` |
| UI-03 | Markers update when position added | integration | `npm test src/hooks/useChartMarkers.test.ts` |
