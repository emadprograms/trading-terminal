# Project: Capital.com Trading Terminal

## What This Is
A professional-grade live trading terminal connected to Capital.com, designed for high-efficiency stock trading. It transforms a previous market-playback tool into a live execution platform, allowing the user to monitor live Bid/Ask tick data, manage multiple account types (Live/Demo), and execute trades via dedicated keyboard shortcuts.

## Core Value
**Zero-friction execution.** The ability to move from a chart pattern to a live trade (with automated Stop Loss) using a single keyboard shortcut, powered by real-time WebSocket data and a lightweight, ephemeral backend.

## Requirements

### Validated
(Existing infrastructure from previous version)
- ✓ **Multi-Chart Workspace**: Grid layout of charts with synchronized viewing.
- ✓ **High-Performance Rendering**: Use of `lightweight-charts` for fluid financial visualization.
- ✓ **State Management**: Workspace persistence and ticker management via Zustand.
- ✓ **Component Architecture**: Decoupled UI, Orchestration, and Data layers.

### Active
- [ ] **Capital.com Integration**:
    - [ ] Implement session-based authentication (cst_token flow) via backend.
    - [ ] Integrate REST API for historical data loading on chart mount.
    - [ ] Integrate WebSocket API for live Bid/Ask tick updates.
- [ ] **Live Execution Layer**:
    - [ ] Implement Market Order placement.
    - [ ] Implement Limit Order placement.
    - [ ] Implement automated Stop Loss (SL) placement at a user-defined fixed distance.
- [ ] **Trading Shortcuts**:
    - [ ] `Ctrl + 1`: Buy full default size.
    - [ ] `Ctrl + 2`: Buy half default size.
    - [ ] `Alt + 1`: Sell full default size.
    - [ ] `Alt + 2`: Sell half default size.
- [ ] **Trading UI Enhancements**:
    - [ ] "Default Size" and "Fixed SL Distance" configuration in top bar.
    - [ ] Active Account toggle (Live vs. Demo).
    - [ ] Visual trade markers (Green/Red arrows) on candles upon execution.
- [ ] **Ephemeral Backend**:
    - [ ] Develop a lightweight backend for API proxying and auth.
    - [ ] Configure deployment via GitHub Actions (scheduled/timed runs).
    - [ ] Implement frontend-to-backend discovery/connection logic.

### Out of Scope
- **Complex Macros**: No multi-step trade sequences.
- **Take Profit (TP)**: Initial version focuses on SL and entry.
- **Advanced Order Types**: OCO, Trailing Stops, etc., are deferred.
- **Multi-Account Simultaneous Monitoring**: Only one active account at a time.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| **Bid/Ask Ticks** | Live trading requires spread visibility; moving away from single-price bars. | — Pending |
| **GitHub Actions Backend** | Leverages existing user workflow for "ephemeral" server hosting. | — Pending |
| **Fixed SL distance** | Simplest implementation for high-speed shortcut trading. | — Pending |
| **Shares-based Sizing** | Direct alignment with stock trading (Number of shares). | — Pending |

## Evolution
This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-06-03 after initialization*
