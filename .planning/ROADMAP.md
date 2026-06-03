# Roadmap: Capital.com Trading Terminal

## Phases

- [ ] **Phase 1: Auth & Infrastructure** - Secure backend proxy, dual-token handshake, and account state synchronization.
- [ ] **Phase 2: Market Data Engine** - Real-time Bid/Ask streaming via WebSocket and historical candle data integration.
- [ ] **Phase 3: Order Execution Layer** - Implementation of market and limit order execution with state tracking.
- [ ] **Phase 4: Risk & Position Management** - Position flattening and automated stop-loss placement logic.
- [ ] **Phase 5: UI & Shortcut Orchestration** - Keyboard shortcut integration, visual trade markers, and execution optimization.

## Phase Details

### Phase 1: Auth & Infrastructure
**Goal**: Establish a secure connection to Capital.com and synchronize account state.
**Depends on**: Nothing
**Requirements**: AUTH-01, AUTH-02, AUTH-03, DATA-03
**Success Criteria** (what must be TRUE):
  1. Ephemeral backend proxy (Hono) is deployed and reachable by the frontend.
  2. Frontend successfully completes the CST/X-SECURITY-TOKEN handshake for both Demo and Live environments.
  3. User can toggle between Demo and Live environments with immediate visual confirmation of the active account.
  4. Real-time account equity and margin are visible in the terminal header.
**Plans**: 3 plans
- [ ] 01-01-PLAN.md — Setup the Hono proxy and tunnel automation in GitHub Actions.
- [ ] 01-02-PLAN.md — Implement the auth handshake, token management, and Ky integration.
- [ ] 01-03-PLAN.md — Build the UI components for account toggling and state synchronization.
**UI hint**: yes

### Phase 2: Market Data Engine
**Goal**: Power the terminal with high-frequency live data and historical context.
**Depends on**: Phase 1
**Requirements**: DATA-01, DATA-02
**Success Criteria** (what must be TRUE):
  1. Charts populate with historical OHLVC data immediately upon ticker selection.
  2. Live Bid/Ask price ticks are streamed via WebSocket and update the UI with sub-second latency.
  3. Price feeds correctly switch between Demo and Live streams when the account toggle is flipped.
**Plans**: TBD
**UI hint**: yes

### Phase 3: Order Execution Layer
**Goal**: Enable the core ability to open trades with state-aware feedback.
**Depends on**: Phase 2
**Requirements**: EXEC-01, EXEC-02
**Success Criteria** (what must be TRUE):
  1. User can place Market and Limit orders via the UI.
  2. Order state is tracked and displayed (e.g., Pending -> Accepted or Rejected).
  3. Trade confirmation messages (Success/Failure) are visible to the user.
**Plans**: TBD
**UI hint**: yes

### Phase 4: Risk & Position Management
**Goal**: Automate risk protection and provide rapid exit capabilities.
**Depends on**: Phase 3
**Requirements**: EXEC-03, UI-02
**Success Criteria** (what must be TRUE):
  1. Every new trade entry automatically triggers the placement of a fixed-distance Stop Loss order.
  2. User can define the default Stop Loss distance in the terminal settings.
  3. "One-Click" flatten button instantly closes all active positions for the current symbol.
**Plans**: TBD
**UI hint**: yes

### Phase 5: UI & Shortcut Orchestration
**Goal**: Deliver the "Zero-Friction" experience via keyboard and visual feedback.
**Depends on**: Phase 4
**Requirements**: UI-01, UI-03
**Success Criteria** (what must be TRUE):
  1. Keyboard shortcuts (Ctrl+1, Alt+1, etc.) trigger trades with the correct pre-configured sizing.
  2. Visual markers (arrows/badges) appear on the chart at the exact fill price and time.
  3. Default trade size can be adjusted via a dedicated input in the navigation bar.
**Plans**: TBD
**UI hint**: yes

## Progress Table

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Auth & Infrastructure | 0/3 | Not started | - |
| 2. Market Data Engine | 0/0 | Not started | - |
| 3. Order Execution Layer | 0/0 | Not started | - |
| 4. Risk & Position Management | 0/0 | Not started | - |
| 5. UI & Shortcut Orchestration | 0/0 | Not started | - |
