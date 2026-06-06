# Requirements: Capital.com Trading Terminal

## v1 Requirements (The "Executioner" MVP)

### Authentication & Infrastructure (AUTH)

- [x] **AUTH-01**: Implement an ephemeral backend proxy using Hono (deployed via GitHub Actions) to securely manage API Secrets.
- [x] **AUTH-02**: Implement the dual-token session handshake (CST/X-SECURITY-TOKEN) for both REST and WebSocket authentication.
- [x] **AUTH-03**: Implement a global toggle for switching between "Demo" and "Live" account environments.

### Data Layer (DATA)

- [x] **DATA-01**: Integrate the Capital.com WebSocket API for direct-to-client streaming of real-time Bid/Ask ticks.
- [x] **DATA-02**: Implement REST API integration for fetching historical OHLVC candle data on chart initialization.
- [x] **DATA-03**: Implement real-time account equity and margin synchronization to display available funds before trading.

### Execution Layer (EXEC)

- [x] **EXEC-01**: Implement Market Order execution with state tracking (Pending -> Accepted/Rejected).
- [x] **EXEC-02**: Implement Limit Order execution for precise entry points.
- [ ] **EXEC-03**: Implement "One-Click" position closing (Flatten) for instant exits from active trades.

### Professional UI & Risk (UI)

- [ ] **UI-01**: Implement keyboard shortcut orchestration for rapid execution:
    - `Ctrl + 1`: Buy full default size.
    - `Ctrl + 2`: Buy half default size.
    - `Alt + 1`: Sell full default size.
    - `Alt + 2`: Sell half default size.
- [ ] **UI-02**: Implement automated fixed Stop-Loss (SL) placement at a user-defined distance immediately upon trade entry.
- [ ] **UI-03**: Implement visual trade markers (Arrows/Badges) on the chart at the exact execution price and time.

---

## v2 Requirements (Deferred)

- [ ] **TP-01**: Automated Take Profit (TP) placement.
- [ ] **JOURNAL-01**: Automated trade journaling and performance tracking.
- [ ] **OCO-01**: One-Cancels-Other (OCO) bracket orders for advanced strategy management.

---

## Out of Scope

- **Complex Macros**: No multi-step automated trade sequences.
- **Social Features**: No chat or social sharing within the terminal.
- **Full-Scale Backend**: No persistent database or user account system outside of Capital.com.

---

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Complete |
| AUTH-02 | Phase 1 | Complete |
| AUTH-03 | Phase 1 | Complete |
| DATA-01 | Phase 2 | Complete |
| DATA-02 | Phase 2 | Complete |
| DATA-03 | Phase 1 | Complete |
| EXEC-01 | Phase 3 | Pending |
| EXEC-02 | Phase 3 | Pending |
| EXEC-03 | Phase 3 | Pending |
| UI-01 | Phase 5 | Pending |
| UI-02 | Phase 3 | Pending |
| UI-03 | Phase 5 | Pending |
