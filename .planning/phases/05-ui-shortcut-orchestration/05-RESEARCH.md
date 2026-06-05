# Phase 5: UI & Shortcut Orchestration - Research

**Researched:** 2024-06-05
**Domain:** UI/UX, Keyboard Orchestration, Financial Charting
**Confidence:** HIGH

## Summary

Phase 5 delivers a "Zero-Friction" trading experience by integrating rapid keyboard execution and visual feedback. The architecture centers around a global shortcut orchestrator that maps specialized keybindings (Ctrl+1, Alt+1, etc.) to the existing order execution layer, and a marker synchronization system that renders executed trades directly on the financial charts.

**Primary recommendation:** Use `react-hotkeys-hook` for robust, platform-aware keyboard orchestration and leverage the native `setMarkers` API of Lightweight Charts for performant visual feedback.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Shortcut Listening | Browser / Client | — | Must capture native OS/Browser events and prevent defaults. |
| Trade Orchestration | Frontend Store | — | Maps shortcuts to specific tickers/sizes and triggers execution. |
| Visual Markers | Chart Layer | — | Direct rendering on the Canvas via Lightweight Charts API. |
| Size Management | Frontend Store | Local Storage | Persists user preferences for "default sizes" across sessions. |
| Feedback (Toasts) | Browser / Client | — | Provides immediate non-blocking confirmation of shortcut actions. |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `react-hotkeys-hook` | 5.3.2 | Keyboard shortcuts | Industry standard for React; handles focus, dependencies, and complex modifiers correctly. |
| `lightweight-charts` | 4.2.1 | Financial Charting | Already integrated; provides optimized Canvas rendering for markers. |
| `sonner` | 2.0.7 | Notifications | Already integrated; used for immediate visual feedback on trade execution. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|--------------|
| `zustand` | 5.0.14 | State Management | Persisting default sizes and tracking active chart selection. |

**Installation:**
```bash
npm install react-hotkeys-hook
```

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| `react-hotkeys-hook` | npm | 7 yrs | 1.2M/wk | github.com/JohannesKlauss/react-hotkeys-hook | [OK] | Approved |
| `sonner` | npm | 2 yrs | 300k/wk | github.com/emilkowalski/sonner | [OK] | Approved |

## Architecture Patterns

### Recommended Project Structure
```
src/
├── hooks/
│   ├── ui/
│   │   ├── useTradeShortcuts.ts   # Keyboard orchestrator
│   │   └── useChartMarkers.ts     # Marker synchronization
├── store/
│   └── useSettingsStore.ts        # Persisted UI/Trade settings
└── components/
    └── TradeMarkers/              # (Optional) marker helper logic
```

### Pattern 1: Shortcut Orchestration
Use `react-hotkeys-hook` to bind global shortcuts that are context-aware (dependent on the selected chart).

```typescript
// Source: https://react-hotkeys-hook.vercel.app/docs/basic-usage
import { useHotkeys } from 'react-hotkeys-hook';

export function useTradeShortcuts() {
  const selectedChartId = useWorkspaceStore(s => s.selectedId);
  const ticker = getTickerById(selectedChartId);
  const { defaultSize } = useSettingsStore();
  const placeOrder = useTradeStore(s => s.placeOrder);

  // Ctrl + 1: Buy full size
  useHotkeys('ctrl+1', () => {
    placeOrder({ epic: ticker, size: defaultSize, direction: 'BUY', type: 'MARKET' });
  }, { preventDefault: true }, [ticker, defaultSize]);

  // Alt + 1: Sell full size
  useHotkeys('alt+1', () => {
    placeOrder({ epic: ticker, size: defaultSize, direction: 'SELL', type: 'MARKET' });
  }, { preventDefault: true }, [ticker, defaultSize]);
}
```

### Pattern 2: Marker Synchronization
Markers must be synchronized with the chart series. Since `setMarkers` replaces the entire set, use a subscription pattern.

```typescript
// Source: https://tradingview.github.io/lightweight-charts/docs/api/interfaces/ISeriesApi#setmarkers
useEffect(() => {
  if (!priceSeriesRef.current) return;

  const markers = positions
    .filter(p => p.epic === ticker)
    .map(p => ({
      time: Math.floor(p.timestamp / 1000), // Convert to seconds
      position: p.direction === 'BUY' ? 'belowBar' : 'aboveBar',
      color: p.direction === 'BUY' ? '#26a69a' : '#ef5350',
      shape: p.direction === 'BUY' ? 'arrowUp' : 'arrowDown',
      text: `${p.direction === 'BUY' ? 'B' : 'S'} ${p.size}`,
    }));

  priceSeriesRef.current.setMarkers(markers);
}, [positions, ticker]);
```

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Shortcut Collision | Custom `keydown` listeners | `react-hotkeys-hook` | Handling `preventDefault` and browser-specific overrides (like Ctrl+1 switching tabs) is brittle. |
| Notification Queue | Custom Toast system | `sonner` | Handles stacking, auto-dismiss, and accessibility out of the box. |

## Common Pitfalls

### Pitfall 1: Browser Default Overrides
**What goes wrong:** `Ctrl+1` through `Ctrl+9` are standard shortcuts in Chrome/Firefox to switch tabs.
**How to avoid:** Use `preventDefault: true` in the hotkey configuration.
**Warning signs:** Pressing the shortcut switches tabs instead of placing a trade.

### Pitfall 2: Time Precision Mismatch
**What goes wrong:** `Date.now()` returns milliseconds, but Lightweight Charts expects seconds for UNIX timestamps.
**How to avoid:** Always `Math.floor(timestamp / 1000)` before sending to `setMarkers`.

### Pitfall 3: Marker Overlap
**What goes wrong:** Multiple trades in the same bar (same minute/day) will overlap markers.
**How to avoid:** Lightweight Charts handles vertical stacking of markers at the same time automatically in recent versions, but check version compatibility.

## Code Examples

### Verified Pattern: Persistent Settings Store
```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  defaultTradeSize: number;
  setDefaultTradeSize: (size: number) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      defaultTradeSize: 1,
      setDefaultTradeSize: (size) => set({ defaultTradeSize: size }),
    }),
    { name: 'terminal-settings' }
  )
);
```

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `react-hotkeys-hook` is preferred over native implementation | Standard Stack | Minimal; native implementation is possible but more complex. |
| A2 | Markers should be placed above/below bars | Architecture Patterns | Traders might prefer markers at exact price levels (requires different implementation). |

## Open Questions

1. **Trade Markers for Multiple Timeframes:**
   - What happens if a trade is executed on 1min chart but viewed on 1D chart?
   - Recommendation: Markers should be visible on all timeframes where the execution time exists. Lightweight Charts handles this if the time matches exactly.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| npm | Package install | ✓ | 10.x | — |
| Chrome/Firefox | Shortcut testing | ✓ | Latest | — |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest + Testing Library |
| Config file | `vitest.config.ts` |
| Quick run command | `npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command |
|--------|----------|-----------|-------------------|
| UI-01 | Shortcut triggers `placeOrder` with correct size | unit | `npm test src/hooks/ui/useTradeShortcuts.test.ts` |
| UI-03 | Markers are updated on chart when position added | integration | `npm test src/hooks/chart/useChartMarkers.test.ts` |

## Security Domain

### Known Threat Patterns for React/JS

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| UI Redressing | Tampering | Ensure shortcuts only trigger when terminal is active and not in a background tab. |
| Input Injection | Tampering | Sanitize `defaultTradeSize` to ensure it's a positive number before execution. |

## Sources

### Primary (HIGH confidence)
- `lightweight-charts` - `ISeriesApi.setMarkers` API reference.
- `react-hotkeys-hook` - Official documentation (v5.x).
- `sonner` - Official documentation (v2.x).

### Secondary (MEDIUM confidence)
- User experience patterns in professional trading platforms (Bloomberg, TradingView).
