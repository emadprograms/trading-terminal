# Feature Research: Capital.com Trading Terminal

**Domain:** Professional Trading Terminal / Execution Layer
**Researched:** 2024-05-24
**Confidence:** HIGH

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist in any trading environment. Missing these makes the terminal unusable for live capital.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Real-time Bid/Ask Stream** | CFD trading is spread-sensitive; traders must see the exact executable price, not just "mid-price." | MEDIUM | Requires stable WebSocket connection to `OHLCMarketData`. |
| **Market/Limit Execution** | Basic entry mechanisms. Limit orders are essential for avoiding slippage on entry. | HIGH | Requires robust handling of "Accepted," "Rejected," and "Partial" states. |
| **Position Management** | Ability to see active trades, current P&L, and close positions instantly. | MEDIUM | Needs real-time updates of position state via `POSITIONS` socket. |
| **Account Equity Sync** | Knowing available margin and total equity before placing trades. | LOW | Periodic polling or socket updates for `ACCOUNTS`. |
| **Historical Price Data** | Context for current price action. | MEDIUM | Fetching OHLVC data via REST on symbol change. |
| **Demo/Live Environment Toggle** | Testing strategies in Demo before committing real capital. | LOW | Simple base URL and API key switching. |

### Differentiators (Competitive Advantage)

Features that provide the "Zero-Friction" edge described in the project goals.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Keyboard Shortcut Execution** | Eliminates the "eye-to-mouse-to-click" latency. Speed is a competitive edge in scalping. | LOW | `Ctrl+1` (Full), `Ctrl+2` (Half), `Alt+1` (Sell Full), etc. |
| **Automated Fixed Stop-Loss** | Ensures every trade has risk protection *immediately* upon entry without manual input. | MEDIUM | Programmatic attachment of SL to the entry order or immediate secondary order. |
| **Ephemeral Backend (GHA)** | Zero-cost, privacy-first infrastructure. User owns the "server" via GitHub Actions. | HIGH | Proxying auth/data through a GitHub Action runner to bypass CORS and hide IP. |
| **Visual Trade Markers** | Immediate visual feedback on the chart where entry occurred. Reduces cognitive load. | LOW | Custom `lightweight-charts` plugin to draw arrows/badges at execution price. |
| **Spread Visualization** | Highlighting the "gap" between bid and ask on the price scale. | LOW | Essential for identifying high-cost trading periods (e.g., news). |

### Anti-Features (Commonly Requested, Often Problematic)

Features to deliberately avoid to maintain focus on the "Execution Layer" core value.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Take Profit (TP) Orders** | Standard "set and forget" trading. | Encourages "fixed" mindset; scalpers often exit based on price action rather than a hard target. | Manual "Flatten" hotkey or deferred to a later phase. |
| **Multi-Step Macros** | "If price hits X, buy Y and then sell Z." | Massive complexity in state management and risk of "ghost" trades. | Focus on single-action execution. |
| **Complex Indicators** | "I need 10 indicators to trade." | Degrades performance and creates "analysis paralysis." | Support for basic price-action tools (VWAP, EMA) only. |
| **Social/News Feeds** | "Keep up with the market." | Distraction from the chart and execution speed. | Use external sources; keep terminal for execution. |

## Feature Dependencies

```
[Authentication (CST/Token)]
    └──requires──> [Ephemeral Backend]
                       └──enables──> [REST/WS API Access]

[REST/WS API Access]
    ├──enables──> [Real-time Bid/Ask Stream]
    └──enables──> [Order Execution Engine]
                       └──requires──> [Automated SL Logic]

[Order Execution Engine] ──enhances──> [Keyboard Shortcuts]

[Real-time Bid/Ask Stream] ──enhances──> [Visual Trade Markers]
```

### Dependency Notes

- **Order Execution requires Auth:** The Capital.com API requires a valid CST and X-SECURITY-TOKEN for any trade-related action.
- **Automated SL requires Order Execution:** The logic must wait for a successful "Position ID" from the broker before attaching the Stop Loss.
- **Keyboard Shortcuts enhance Execution Engine:** The engine handles the logic, but shortcuts provide the trigger mechanism.

## MVP Definition

### Launch With (v1) - "The Executioner"

Minimum viable product focused purely on high-speed entry and risk management.

- [x] **Real-time Ticks** — Essential for spread visibility.
- [x] **Market Order Execution** — Fundamental entry.
- [x] **Automated Stop Loss** — Core risk protection.
- [x] **Full/Half Size Shortcuts** — Primary differentiator.
- [x] **Position Closing** — Basic management.

### Add After Validation (v1.x) - "The Multi-Tasker"

- [ ] **Limit Orders** — For precise entry without slippage.
- [ ] **Multi-Chart Grid** — Monitoring multiple tickers simultaneously.
- [ ] **Live/Demo Toggle** — Moving from sandbox to real capital.
- [ ] **Visual Trade History** — Seeing past performance on the chart.

### Future Consideration (v2+) - "The Advanced Terminal"

- [ ] **Take Profit (TP) Integration** — Adding the second half of trade automation.
- [ ] **Performance Journaling** — Automated logging of trades to a database.
- [ ] **OCO (One-Cancels-Other) Orders** — Advanced bracket trading.

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Market Orders | CRITICAL | HIGH | P1 |
| Automated SL | HIGH | MEDIUM | P1 |
| Keyboard Shortcuts | HIGH | LOW | P1 |
| Real-time Ticks | CRITICAL | MEDIUM | P1 |
| Limit Orders | MEDIUM | HIGH | P2 |
| Multi-Chart Grid | MEDIUM | MEDIUM | P2 |
| Visual Trade History | LOW | MEDIUM | P3 |

**Priority key:**
- P1: Must have for launch (The "Zero-Friction" promise)
- P2: Should have, add when core is stable
- P3: Nice to have, future consideration

## Competitor Feature Analysis

| Feature | Capital.com Web | TradingView (Connected) | Our Approach |
|---------|-----------------|-------------------------|--------------|
| **Execution Speed** | Moderate (Click-heavy) | Moderate (UI overhead) | **Maximum (Shortcut-first)** |
| **Risk Entry** | Manual SL input | Manual/Drag | **Automated (Fixed distance)** |
| **Layout** | Single-focus | Powerful but complex | **Lightweight Multi-grid** |
| **Infrastructure** | Proprietary | SaaS | **Ephemeral (User-owned)** |

## Sources

- [Capital.com API Documentation](https://capital.com/api-websocket)
- [Professional Trading Terminal Standards (Bloomberg/TWS Analysis)](https://www.interactivebrokers.com/en/trading/tws.php)
- [Capital.com Community Feedback (Reddit/Trustpilot)](https://www.reddit.com/r/CapitalCom/)

---
*Feature research for: Capital.com Trading Terminal*
*Researched: 2024-05-24*
