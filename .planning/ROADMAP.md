# Roadmap: Capital.com Trading Terminal

## Phases

- [x] **Phase 1: Auth & Infrastructure** - Secure backend proxy, dual-token handshake, and account state synchronization.
- [x] **Phase 2: Market Data Engine** - Real-time Bid/Ask streaming via WebSocket and historical candle data integration. (completed 2026-06-04)
- [x] **Phase 2.1: Market Data Synchronization** - Eliminate gaps between REST history and live WebSocket streams with atomic buffering and bridging. (completed 2026-06-05)

- [/] **Phase 3: Order Execution Layer** - Implementation of market/limit orders, position flattening, and automated risk management.
- [ ] **Phase 4: Risk & Position Management** - Advanced risk protection and multi-position management.
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

**Plans**: 7 plans

- [x] 01-00-PLAN.md — Setup the test scaffolding and mocking infrastructure.
- [x] 01-01-PLAN.md — Setup the Hono proxy and tunnel automation in GitHub Actions.
- [x] 01-02-PLAN.md — Implement the auth handshake, token management, and Ky integration.
- [ ] 01.2-01-PLAN.md — Secure Proxy Implementation
- [ ] 01.2-02-PLAN.md — Store & API Hardening
- [ ] 01.2-03-PLAN.md — UI Cleanup & Test Updates
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

**Plans**: 3 plans

- [x] 02-00-PLAN.md — REST/WS Foundation
- [x] 02-01-PLAN.md — Historical Data Integration
- [x] 02-02-PLAN.md — WebSocket Integration & UI Refinement

### Phase 2.1: Market Data Synchronization

**Goal**: Eliminate the "Data Gap" between historical REST data and live WebSocket streams.
**Depends on**: Phase 2
**Requirements**: DATA-01, DATA-02
**Success Criteria** (what must be TRUE):

  1. No visual gaps appear when loading a chart (Handover from REST to WS is seamless).
  2. The system fetches missing "Bridge" data if the REST API lags behind the current time.
  3. WebSocket ticks are buffered during initial load to prevent out-of-order updates.

**Plans**: 3 plans (completed)

### Phase 3: Order Execution Layer

**Goal**: Enable core trading capabilities with automated risk guards and rapid exit logic.
**Depends on**: Phase 2
**Requirements**: EXEC-01, EXEC-02, EXEC-03, UI-02
**Success Criteria** (what must be TRUE):

  1. User can place Market and Limit orders with an automated Stop Loss (`guaranteedStop`).
  2. Order status transitions (Pending -> Accepted/Rejected) are visible and tracked in real-time.
  3. User can "Flatten" a single position or cancel a working order with one click.
  4. The system recovers order status within 2 seconds if WebSocket messages are missed.

**Plans**: 4 plans

- [x] 03-00-PLAN.md — Store & API Foundation
- [x] 03-01-PLAN.md — Hybrid Sync & Watchdog
- [x] 03-02-PLAN.md — UI & Management
- [ ] 03-05-PLAN.md — Revised Execution Hardening & Orchestration

**UI hint**: yes

### Progress Table

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Auth & Infrastructure | 3/7 | In progress | - |
| 2. Market Data Engine | 3/3 | Completed | Yes |
| 2.1 Market Data Sync | 3/3 | Completed | Yes |
| 3. Order Execution Layer | 3/4 | In Progress | - |
| 4. Risk & Position Management | 0/0 | Not started | - |
| 5. UI & Shortcut Orchestration | 0/0 | Not started | - |
